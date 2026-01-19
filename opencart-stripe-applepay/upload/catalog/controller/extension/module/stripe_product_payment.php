<?php
class ControllerExtensionModuleStripeProductPayment extends Controller {

    public function getConfig() {
        $json = array();

        // Check if extension is enabled
        $enabled = $this->config->get('payment_stripe_applepay_status');
        $product_button = $this->config->get('payment_stripe_applepay_product_button');
        $publishable_key = $this->config->get('payment_stripe_applepay_publishable_key');

        $json['enabled'] = $enabled && $product_button;
        $json['publishable_key'] = $enabled && $product_button ? $publishable_key : '';

        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }

    public function process() {
        // Start output buffering to catch any unexpected output
        ob_start();

        $this->load->language('extension/payment/stripe_applepay');

        $json = array();

        // Verify that the extension is enabled
        if (!$this->config->get('payment_stripe_applepay_status')) {
            $json['error'] = 'Payment method not available';
            // Clear any output buffer
            $buffer = ob_get_clean();
            if (!empty($buffer)) {
                $this->log->write('[Stripe Apple Pay] WARNING: Unexpected output captured: ' . substr($buffer, 0, 200));
            }
            $this->response->addHeader('Content-Type: application/json');
            $this->response->setOutput(json_encode($json));
            return;
        }

        // Get POST data
        $post_data = json_decode(file_get_contents('php://input'), true);

        if (!$post_data) {
            $post_data = $this->request->post;
        }

        $action = isset($post_data['action']) ? $post_data['action'] : '';

        switch ($action) {
            case 'create_payment_intent':
                $json = $this->createPaymentIntent($post_data);
                break;
            case 'confirm_payment':
                $json = $this->confirmPayment($post_data);
                break;
            case 'get_shipping':
                $json = $this->getShippingOptions($post_data);
                break;
            default:
                $json['error'] = 'Invalid action';
        }

        // Clear any output buffer before sending JSON
        $buffer = ob_get_clean();
        if (!empty($buffer)) {
            $this->log->write('[Stripe Apple Pay] WARNING: Unexpected output captured in process(): ' . substr($buffer, 0, 200));
        }

        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }

    private function createPaymentIntent($data) {
        $json = array();

        $this->log->write('[Stripe Apple Pay] createPaymentIntent called with data: ' . print_r($data, true));

        try {
            $this->load->model('catalog/product');
            $this->load->model('account/customer');

            $product_id = isset($data['product_id']) ? (int)$data['product_id'] : 0;
            $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 1;
            $option = isset($data['option']) ? $data['option'] : array();
            $country_code = isset($data['country']) ? strtoupper($data['country']) : '';

            if (!$product_id) {
                $json['error'] = 'Invalid product';
                return $json;
            }

            $product_info = $this->model_catalog_product->getProduct($product_id);

            if (!$product_info) {
                $json['error'] = 'Product not found';
                return $json;
            }

            // Calculate product price
            $price = $this->tax->calculate($product_info['price'], $product_info['tax_class_id'], $this->config->get('config_tax'));

            // Check for special price
            if ((float)$product_info['special']) {
                $price = $this->tax->calculate($product_info['special'], $product_info['tax_class_id'], $this->config->get('config_tax'));
            }

            // Add option prices
            if ($option) {
                foreach ($option as $product_option_id => $option_value_id) {
                    // Get product option value info using direct database query
                    $query = $this->db->query("
                        SELECT pov.option_value_id, pov.price, pov.price_prefix
                        FROM " . DB_PREFIX . "product_option_value pov
                        WHERE pov.product_id = '" . (int)$product_id . "'
                        AND pov.product_option_id = '" . (int)$product_option_id . "'
                        AND pov.option_value_id = '" . (int)$option_value_id . "'
                    ");

                    if ($query->num_rows) {
                        $product_option_value_info = $query->row;

                        if ($product_option_value_info['price_prefix'] == '+') {
                            $price += $this->tax->calculate($product_option_value_info['price'], $product_info['tax_class_id'], $this->config->get('config_tax'));
                        } elseif ($product_option_value_info['price_prefix'] == '-') {
                            $price -= $this->tax->calculate($product_option_value_info['price'], $product_info['tax_class_id'], $this->config->get('config_tax'));
                        }
                    }
                }
            }

            $subtotal = $price * $quantity;

            // Calculate shipping
            $shipping_cost = 0;
            $shipping_country = '';

            if ($country_code) {
                $this->load->model('localisation/country');

                // Get country by ISO code 2 using direct query
                $query = $this->db->query("SELECT * FROM " . DB_PREFIX . "country WHERE iso_code_2 = '" . $this->db->escape($country_code) . "' LIMIT 1");

                if ($query->num_rows) {
                    $country_info = $query->row;

                    if ($country_info && $country_info['country_id'] == 195) {
                        // Spain - add fixed shipping
                        $shipping_cost = 4.95;
                        $shipping_country = 'ES';
                        $this->log->write('[Stripe Apple Pay] createPaymentIntent - Shipping added for Spain: ' . $shipping_cost . '€');
                    }
                }
            }

            $total = $subtotal + $shipping_cost;

            $this->log->write('[Stripe Apple Pay] createPaymentIntent - Subtotal: ' . $subtotal . '€, Shipping: ' . $shipping_cost . '€, Total: ' . $total . '€');

            // Create Stripe Payment Intent with shipping included
            $secret_key = $this->config->get('payment_stripe_applepay_secret_key');
            $amount = (int)($total * 100); // Convert to cents

            // Get currency with fallback to avoid PHP Notice
            $currency = 'eur'; // Default
            if (isset($this->session->data['currency'])) {
                $currency = strtolower($this->session->data['currency']);
            } elseif ($this->config->get('config_currency')) {
                $currency = strtolower($this->config->get('config_currency'));
            }

            $payment_intent = $this->stripeRequest('payment_intents', array(
                'amount' => $amount,
                'currency' => $currency,
                'payment_method_types' => array('card'),
                'metadata' => array(
                    'product_id' => $product_id,
                    'quantity' => $quantity,
                    'product_name' => $product_info['name'],
                    'subtotal' => number_format($subtotal, 2, '.', ''),
                    'shipping_cost' => number_format($shipping_cost, 2, '.', ''),
                    'shipping_country' => $shipping_country
                )
            ));

            // Check for Stripe API errors
            if (isset($payment_intent->error)) {
                $error_msg = isset($payment_intent->error->message) ? $payment_intent->error->message : 'Unknown Stripe error';
                $this->log->write('[Stripe Apple Pay] Stripe API ERROR: ' . $error_msg);
                $json['error'] = 'Payment error: ' . $error_msg;
                return $json;
            }

            if (isset($payment_intent->id)) {
                $json['client_secret'] = $payment_intent->client_secret;
                $json['amount'] = $amount;
                $json['currency'] = $currency;
                $json['product_name'] = $product_info['name'];
                $json['shipping_cost'] = $shipping_cost;
                $this->log->write('[Stripe Apple Pay] Payment intent created: ' . $payment_intent->id . ' - Amount: ' . $amount . ' cents');
            } else {
                $this->log->write('[Stripe Apple Pay] ERROR: Failed to create payment intent - Response: ' . print_r($payment_intent, true));
                $json['error'] = 'Failed to create payment intent';
            }

        } catch (Exception $e) {
            $this->log->write('[Stripe Apple Pay] ERROR in createPaymentIntent: ' . $e->getMessage());
            $json['error'] = $e->getMessage();
        }

        return $json;
    }

    private function confirmPayment($data) {
        $json = array();

        try {
            $payment_intent_id = isset($data['payment_intent_id']) ? $data['payment_intent_id'] : '';
            $product_id = isset($data['product_id']) ? (int)$data['product_id'] : 0;
            $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 1;
            $option = isset($data['option']) ? $data['option'] : array();
            $shipping_address = isset($data['shipping_address']) ? $data['shipping_address'] : array();
            $billing_address = isset($data['billing_address']) ? $data['billing_address'] : array();

            if (!$payment_intent_id) {
                $json['error'] = 'Invalid payment intent';
                return $json;
            }

            $this->log->write('[Stripe Apple Pay] confirmPayment - Retrieving payment intent: ' . $payment_intent_id);

            // Retrieve payment intent from Stripe
            $payment_intent = $this->stripeRequest('payment_intents/' . $payment_intent_id, array(), 'GET');

            // Check for Stripe API errors
            if (isset($payment_intent->error)) {
                $error_msg = isset($payment_intent->error->message) ? $payment_intent->error->message : 'Unknown Stripe error';
                $this->log->write('[Stripe Apple Pay] confirmPayment - Stripe API ERROR: ' . $error_msg);
                $json['error'] = 'Payment verification error: ' . $error_msg;
                return $json;
            }

            $this->log->write('[Stripe Apple Pay] confirmPayment - Payment intent status: ' . (isset($payment_intent->status) ? $payment_intent->status : 'unknown'));

            if (isset($payment_intent->status) && $payment_intent->status == 'succeeded') {
                // Create order
                $order_id = $this->createOrder($product_id, $quantity, $option, $shipping_address, $billing_address, $payment_intent);

                if ($order_id) {
                    $json['success'] = true;
                    $json['order_id'] = $order_id;
                    $json['redirect'] = $this->url->link('checkout/success', '', true);
                    $this->log->write('[Stripe Apple Pay] confirmPayment - Order created successfully: ' . $order_id);
                } else {
                    $this->log->write('[Stripe Apple Pay] confirmPayment - ERROR: Failed to create order');
                    $json['error'] = 'Failed to create order';
                }
            } else {
                $payment_status = isset($payment_intent->status) ? $payment_intent->status : 'unknown';
                $this->log->write('[Stripe Apple Pay] confirmPayment - ERROR: Payment not completed, status: ' . $payment_status);
                $json['error'] = 'Payment not completed';
            }

        } catch (Exception $e) {
            $this->log->write('[Stripe Apple Pay] confirmPayment - EXCEPTION: ' . $e->getMessage());
            $json['error'] = $e->getMessage();
        }

        return $json;
    }

    private function getShippingOptions($data) {
        $json = array();

        try {
            // Get country code from Apple Pay (e.g., 'ES')
            $country_code = isset($data['country']) ? strtoupper($data['country']) : '';

            $this->log->write('[Stripe Apple Pay] getShippingOptions - Country: ' . $country_code);

            if (!$country_code) {
                $this->log->write('[Stripe Apple Pay] ERROR: No country code provided');
                $json['error'] = 'Country required';
                return $json;
            }

            // Load country model to convert code to ID
            $this->load->model('localisation/country');

            // Get country by ISO code 2 using direct query
            $query = $this->db->query("SELECT * FROM " . DB_PREFIX . "country WHERE iso_code_2 = '" . $this->db->escape($country_code) . "' LIMIT 1");

            if (!$query->num_rows) {
                $this->log->write('[Stripe Apple Pay] ERROR: Unknown country code: ' . $country_code);
                $json['error'] = 'Shipping not available for this country';
                return $json;
            }

            $country_info = $query->row;
            $country_id = $country_info['country_id'];

            // Only support Spain (country_id = 195)
            if ($country_id != 195) {
                $this->log->write('[Stripe Apple Pay] ERROR: Shipping not available for country_id: ' . $country_id . ' (' . $country_info['name'] . ')');
                $json['error'] = 'Currently we only ship to Spain';
                return $json;
            }

            // Return fixed shipping for Spain
            $json['shipping_options'] = array(
                array(
                    'id' => 'flat_rate_spain',
                    'label' => 'Envío estándar',
                    'amount' => 495,  // 4.95€ in cents
                    'detail' => 'Entrega en 3-5 días laborables'
                )
            );

            $this->log->write('[Stripe Apple Pay] Shipping options returned for Spain: 4.95€');

        } catch (Exception $e) {
            $this->log->write('[Stripe Apple Pay] ERROR in getShippingOptions: ' . $e->getMessage());
            $json['error'] = $e->getMessage();
        }

        return $json;
    }

    private function createOrder($product_id, $quantity, $option, $shipping_address, $billing_address, $payment_intent) {
        $this->load->model('catalog/product');
        $this->load->model('checkout/order');
        $this->load->model('localisation/country');

        $product_info = $this->model_catalog_product->getProduct($product_id);

        if (!$product_info) {
            $this->log->write('[Stripe Apple Pay] ERROR: Product not found: ' . $product_id);
            return false;
        }

        // Calculate totals
        $price = $this->tax->calculate($product_info['price'], $product_info['tax_class_id'], $this->config->get('config_tax'));

        if ((float)$product_info['special']) {
            $price = $this->tax->calculate($product_info['special'], $product_info['tax_class_id'], $this->config->get('config_tax'));
        }

        $subtotal = $price * $quantity;

        // Get shipping cost from payment intent metadata
        $shipping_cost = isset($payment_intent->metadata->shipping_cost) ? (float)$payment_intent->metadata->shipping_cost : 0;
        $total = $subtotal + $shipping_cost;

        $this->log->write('[Stripe Apple Pay] createOrder - Subtotal: ' . $subtotal . '€, Shipping: ' . $shipping_cost . '€, Total: ' . $total . '€');
        $this->log->write('[Stripe Apple Pay] createOrder - Shipping address received: ' . print_r($shipping_address, true));
        $this->log->write('[Stripe Apple Pay] createOrder - Billing address received: ' . print_r($billing_address, true));

        // Prepare order data
        $order_data = array();

        // Store details
        $order_data['invoice_prefix'] = $this->config->get('config_invoice_prefix');
        $order_data['store_id'] = $this->config->get('config_store_id');
        $order_data['store_name'] = $this->config->get('config_name');
        $order_data['store_url'] = $this->config->get('config_url');

        // Customer details
        if ($this->customer->isLogged()) {
            $order_data['customer_id'] = $this->customer->getId();
            $order_data['customer_group_id'] = $this->customer->getGroupId();
            $order_data['firstname'] = $this->customer->getFirstName();
            $order_data['lastname'] = $this->customer->getLastName();
            $order_data['email'] = $this->customer->getEmail();
            $order_data['telephone'] = $this->customer->getTelephone();
        } else {
            $order_data['customer_id'] = 0;
            $order_data['customer_group_id'] = $this->config->get('config_customer_group_id');
            $order_data['firstname'] = isset($billing_address['name']) ? $billing_address['name'] : 'Guest';
            $order_data['lastname'] = '';
            $order_data['email'] = isset($billing_address['email']) ? $billing_address['email'] : '';
            $order_data['telephone'] = isset($billing_address['phone']) ? $billing_address['phone'] : '';
        }

        // Map billing address from Stripe PaymentMethod billing_details format
        $billing_name_parts = explode(' ', isset($billing_address['name']) ? $billing_address['name'] : '', 2);
        $order_data['payment_firstname'] = isset($billing_name_parts[0]) ? $billing_name_parts[0] : 'Guest';
        $order_data['payment_lastname'] = isset($billing_name_parts[1]) ? $billing_name_parts[1] : '';
        $order_data['payment_company'] = '';
        $order_data['payment_address_1'] = isset($billing_address['address']['line1']) ? $billing_address['address']['line1'] : '';
        $order_data['payment_address_2'] = isset($billing_address['address']['line2']) ? $billing_address['address']['line2'] : '';
        $order_data['payment_city'] = isset($billing_address['address']['city']) ? $billing_address['address']['city'] : '';
        $order_data['payment_postcode'] = isset($billing_address['address']['postal_code']) ? $billing_address['address']['postal_code'] : '';
        $order_data['payment_zone'] = isset($billing_address['address']['state']) ? $billing_address['address']['state'] : '';
        $order_data['payment_zone_id'] = 0;
        $order_data['payment_country'] = isset($billing_address['address']['country']) ? $billing_address['address']['country'] : '';
        $order_data['payment_country_id'] = 0;

        // Convert billing country code to country_id
        if ($order_data['payment_country']) {
            $query = $this->db->query("SELECT * FROM " . DB_PREFIX . "country WHERE iso_code_2 = '" . $this->db->escape($order_data['payment_country']) . "' LIMIT 1");
            if ($query->num_rows) {
                $country_info = $query->row;
                $order_data['payment_country_id'] = $country_info['country_id'];
                $order_data['payment_country'] = $country_info['name'];
            }
        }

        $order_data['payment_address_format'] = '';
        $order_data['payment_method'] = 'Stripe Apple Pay';
        $order_data['payment_code'] = 'stripe_applepay';

        // Map shipping address from Apple Pay format
        $shipping_name = isset($shipping_address['name']) ? trim($shipping_address['name']) : '';

        // If shipping name is empty, use billing name as fallback
        if (empty($shipping_name)) {
            $shipping_name = isset($billing_address['name']) ? trim($billing_address['name']) : 'Guest Customer';
            $this->log->write('[Stripe Apple Pay] createOrder - Shipping name was empty, using fallback: ' . $shipping_name);
        }

        $shipping_name_parts = explode(' ', $shipping_name, 2);
        $order_data['shipping_firstname'] = !empty($shipping_name_parts[0]) ? $shipping_name_parts[0] : 'Guest';
        $order_data['shipping_lastname'] = isset($shipping_name_parts[1]) && !empty($shipping_name_parts[1]) ? $shipping_name_parts[1] : 'Customer';
        $order_data['shipping_company'] = '';

        // Apple Pay provides addressLines array
        $address_lines = isset($shipping_address['addressLines']) ? $shipping_address['addressLines'] : array();

        // Use billing address as fallback when shipping address is incomplete
        $order_data['shipping_address_1'] = !empty($address_lines[0]) ? $address_lines[0] :
                                            (isset($billing_address['address']['line1']) ? $billing_address['address']['line1'] : '');
        $order_data['shipping_address_2'] = !empty($address_lines[1]) ? $address_lines[1] :
                                            (isset($billing_address['address']['line2']) ? $billing_address['address']['line2'] : '');
        $order_data['shipping_city'] = !empty($shipping_address['locality']) ? $shipping_address['locality'] :
                                       (isset($billing_address['address']['city']) ? $billing_address['address']['city'] : '');
        $order_data['shipping_postcode'] = !empty($shipping_address['postalCode']) ? $shipping_address['postalCode'] :
                                           (isset($billing_address['address']['postal_code']) ? $billing_address['address']['postal_code'] : '');
        $order_data['shipping_zone'] = !empty($shipping_address['administrativeArea']) ? $shipping_address['administrativeArea'] :
                                       (isset($billing_address['address']['state']) ? $billing_address['address']['state'] : '');
        $order_data['shipping_zone_id'] = 0;
        $order_data['shipping_country'] = !empty($shipping_address['countryCode']) ? $shipping_address['countryCode'] :
                                          (isset($billing_address['address']['country']) ? $billing_address['address']['country'] : '');
        $order_data['shipping_country_id'] = 0;

        // Log if we used billing as fallback
        if (empty($address_lines[0]) && !empty($billing_address['address']['line1'])) {
            $this->log->write('[Stripe Apple Pay] createOrder - Using billing address as fallback for empty shipping address');
        }

        // Convert shipping country code to country_id
        if ($order_data['shipping_country']) {
            $query = $this->db->query("SELECT * FROM " . DB_PREFIX . "country WHERE iso_code_2 = '" . $this->db->escape($order_data['shipping_country']) . "' LIMIT 1");
            if ($query->num_rows) {
                $country_info = $query->row;
                $order_data['shipping_country_id'] = $country_info['country_id'];
                $order_data['shipping_country'] = $country_info['name'];
            }
        }

        $order_data['shipping_address_format'] = '';

        // Set shipping method
        if ($shipping_cost > 0) {
            $order_data['shipping_method'] = 'Envío estándar';
            $order_data['shipping_code'] = 'flat_rate_spain';
        } else {
            $order_data['shipping_method'] = '';
            $order_data['shipping_code'] = '';
        }

        $this->log->write('[Stripe Apple Pay] Order addresses - Shipping: ' . $order_data['shipping_firstname'] . ' ' . $order_data['shipping_lastname'] . ', ' . $order_data['shipping_address_1'] . ', ' . $order_data['shipping_city'] . ', ' . $order_data['shipping_country']);

        // Products
        $order_data['products'] = array();

        $order_data['products'][] = array(
            'product_id' => $product_id,
            'name' => $product_info['name'],
            'model' => $product_info['model'],
            'option' => $option,
            'download' => array(),
            'quantity' => $quantity,
            'subtract' => $product_info['subtract'],
            'price' => $price,
            'total' => $subtotal,
            'tax' => $this->tax->getTax($price, $product_info['tax_class_id']),
            'reward' => $product_info['reward']
        );

        // Totals
        $order_data['totals'] = array();

        $order_data['totals'][] = array(
            'code' => 'sub_total',
            'title' => 'Sub-Total',
            'value' => $subtotal,
            'sort_order' => 1
        );

        // Add shipping to totals
        if ($shipping_cost > 0) {
            $order_data['totals'][] = array(
                'code' => 'shipping',
                'title' => 'Envío estándar',
                'value' => $shipping_cost,
                'sort_order' => 3
            );
        }

        $order_data['totals'][] = array(
            'code' => 'total',
            'title' => 'Total',
            'value' => $total,
            'sort_order' => 9
        );

        $order_data['total'] = $total;

        // Other details
        $order_data['affiliate_id'] = 0;
        $order_data['commission'] = 0;
        $order_data['marketing_id'] = 0;
        $order_data['tracking'] = '';
        $order_data['language_id'] = $this->config->get('config_language_id');

        // Get currency with fallback to avoid PHP Notice
        $currency_code = 'EUR'; // Default
        if (isset($this->session->data['currency'])) {
            $currency_code = $this->session->data['currency'];
        } elseif ($this->config->get('config_currency')) {
            $currency_code = $this->config->get('config_currency');
        }

        $order_data['currency_id'] = $this->currency->getId($currency_code);
        $order_data['currency_code'] = $currency_code;
        $order_data['currency_value'] = $this->currency->getValue($currency_code);
        $order_data['ip'] = $this->request->server['REMOTE_ADDR'];
        $order_data['forwarded_ip'] = '';
        $order_data['user_agent'] = isset($this->request->server['HTTP_USER_AGENT']) ? $this->request->server['HTTP_USER_AGENT'] : '';
        $order_data['accept_language'] = isset($this->request->server['HTTP_ACCEPT_LANGUAGE']) ? $this->request->server['HTTP_ACCEPT_LANGUAGE'] : '';

        $order_data['comment'] = 'Paid via Apple Pay (Stripe) - Payment Intent: ' . $payment_intent->id;

        // Add order
        $order_id = $this->model_checkout_order->addOrder($order_data);

        // Update order status
        $order_status_id = $this->config->get('payment_stripe_applepay_order_status_id');

        if ($order_status_id) {
            $this->model_checkout_order->addOrderHistory($order_id, $order_status_id, 'Payment completed via Stripe Apple Pay', true);
        }

        // Note: Stock is automatically managed by OpenCart when order is created
        $this->log->write('[Stripe Apple Pay] Order created successfully: ' . $order_id);

        return $order_id;
    }

    private function stripeRequest($endpoint, $data = array(), $method = 'POST') {
        $secret_key = $this->config->get('payment_stripe_applepay_secret_key');

        if (!$secret_key) {
            $this->log->write('[Stripe Apple Pay] ERROR: No secret key configured');
            return (object)array('error' => array('message' => 'Stripe not configured'));
        }

        $url = 'https://api.stripe.com/v1/' . $endpoint;

        $this->log->write('[Stripe Apple Pay] Stripe API Request - Method: ' . $method . ', Endpoint: ' . $endpoint);

        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $secret_key . ':');

        if ($method == 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($this->flattenArray($data)));
        } elseif ($method == 'GET') {
            curl_setopt($ch, CURLOPT_HTTPGET, true);
        }

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);

        curl_close($ch);

        $this->log->write('[Stripe Apple Pay] Stripe API Response - HTTP Code: ' . $http_code);

        // Check for curl errors
        if ($response === false) {
            $this->log->write('[Stripe Apple Pay] CURL ERROR: ' . $curl_error);
            return (object)array('error' => array('message' => 'Network error: ' . $curl_error));
        }

        // Check HTTP status code
        if ($http_code >= 400) {
            $this->log->write('[Stripe Apple Pay] HTTP ERROR ' . $http_code . ': ' . $response);
        }

        $decoded = json_decode($response);

        // Check for JSON decode errors
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            $this->log->write('[Stripe Apple Pay] JSON DECODE ERROR: ' . json_last_error_msg() . ' - Response: ' . substr($response, 0, 500));
            return (object)array('error' => array('message' => 'Invalid API response'));
        }

        return $decoded;
    }

    private function flattenArray($array, $prefix = '') {
        $result = array();

        foreach ($array as $key => $value) {
            $new_key = $prefix . $key;

            if (is_array($value)) {
                $result = array_merge($result, $this->flattenArray($value, $new_key . '['));
                if (substr($new_key, -1) !== '[') {
                    $new_key .= ']';
                }
            } else {
                $result[$new_key] = $value;
            }
        }

        return $result;
    }
}
