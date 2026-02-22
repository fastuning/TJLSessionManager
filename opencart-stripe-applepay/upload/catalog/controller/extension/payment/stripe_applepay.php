<?php
class ControllerExtensionPaymentStripeApplepay extends Controller {

    public function index() {
        $this->load->language('extension/payment/stripe_applepay');

        $data['button_confirm'] = $this->language->get('button_confirm');
        $data['text_loading'] = $this->language->get('text_loading');

        $data['publishable_key'] = $this->config->get('payment_stripe_applepay_publishable_key');
        $data['test_mode'] = $this->config->get('payment_stripe_applepay_test_mode');

        return $this->load->view('extension/payment/stripe_applepay', $data);
    }

    public function send() {
        $this->load->language('extension/payment/stripe_applepay');

        $json = array();

        if ($this->request->server['REQUEST_METHOD'] == 'POST') {
            $this->load->model('checkout/order');

            $order_info = $this->model_checkout_order->getOrder($this->session->data['order_id']);

            if ($order_info) {
                $secret_key = $this->config->get('payment_stripe_applepay_secret_key');

                $amount = $this->currency->format($order_info['total'], $order_info['currency_code'], $order_info['currency_value'], false);
                $amount = round($amount * 100);

                $currency = strtolower($order_info['currency_code']);

                try {
                    // Create payment intent
                    $payment_intent = $this->stripeRequest('payment_intents', array(
                        'amount' => $amount,
                        'currency' => $currency,
                        'description' => $this->config->get('config_name') . ' - Order #' . $this->session->data['order_id'],
                        'metadata' => array(
                            'order_id' => $this->session->data['order_id']
                        ),
                        'automatic_payment_methods' => array(
                            'enabled' => true,
                        )
                    ));

                    if (isset($payment_intent->id)) {
                        $json['client_secret'] = $payment_intent->client_secret;
                    } else {
                        $json['error'] = $this->language->get('error_payment');
                    }

                } catch (Exception $e) {
                    $json['error'] = $e->getMessage();
                }
            } else {
                $json['error'] = $this->language->get('error_order');
            }
        }

        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }

    public function callback() {
        $this->load->language('extension/payment/stripe_applepay');

        $json = array();

        if (isset($this->request->post['payment_intent_id'])) {
            $this->load->model('checkout/order');

            $payment_intent_id = $this->request->post['payment_intent_id'];

            // Retrieve payment intent from Stripe
            $payment_intent = $this->stripeRequest('payment_intents/' . $payment_intent_id, array(), 'GET');

            if ($payment_intent->status == 'succeeded') {
                $order_id = isset($payment_intent->metadata->order_id) ? $payment_intent->metadata->order_id : $this->session->data['order_id'];

                $order_info = $this->model_checkout_order->getOrder($order_id);

                if ($order_info) {
                    $order_status_id = $this->config->get('payment_stripe_applepay_order_status_id');

                    $this->model_checkout_order->addOrderHistory($order_id, $order_status_id, 'Payment completed via Stripe Apple Pay - Payment Intent: ' . $payment_intent_id, true);

                    $json['success'] = true;
                    $json['redirect'] = $this->url->link('checkout/success', '', true);
                } else {
                    $json['error'] = $this->language->get('error_order');
                }
            } else {
                $json['error'] = $this->language->get('error_payment');
            }
        } else {
            $json['error'] = $this->language->get('error_payment');
        }

        $this->response->addHeader('Content-Type: application/json');
        $this->response->setOutput(json_encode($json));
    }

    private function stripeRequest($endpoint, $data = array(), $method = 'POST') {
        $secret_key = $this->config->get('payment_stripe_applepay_secret_key');

        $url = 'https://api.stripe.com/v1/' . $endpoint;

        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $secret_key . ':');

        if ($method == 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($this->flattenArray($data)));
        }

        $response = curl_exec($ch);

        if (curl_errno($ch)) {
            throw new Exception('Curl error: ' . curl_error($ch));
        }

        curl_close($ch);

        $result = json_decode($response);

        if (isset($result->error)) {
            throw new Exception($result->error->message);
        }

        return $result;
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
