/**
 * Stripe Express Checkout (Apple Pay, Google Pay, Link) for OpenCart Product Page
 * Handles direct purchase from product page using Stripe Express Checkout
 */

var StripeProductApplePay = (function() {
    'use strict';

    var config = {
        stripe: null,
        elements: null,
        expressCheckoutElement: null,
        productData: {},
        publishableKey: ''
    };

    var state = {
        selectedShippingAddress: null,
        selectedShippingOption: null,
        shippingCost: 4.95,
        expressCheckoutMounted: false
    };

    /**
     * Initialize Express Checkout
     */
    function init(productData) {
        config.productData = productData;

        // Get Stripe publishable key from meta tag or config
        var metaKey = document.querySelector('meta[name="stripe-publishable-key"]');
        if (metaKey) {
            config.publishableKey = metaKey.getAttribute('content');
        }

        // If key is available, initialize Stripe
        if (config.publishableKey && typeof Stripe !== 'undefined') {
            config.stripe = Stripe(config.publishableKey);
            setupExpressCheckout();
        } else {
            console.warn('Stripe publishable key not found or Stripe.js not loaded');
        }
    }

    /**
     * Get current product quantity
     */
    function getQuantity() {
        var quantityInput = document.querySelector(config.productData.quantity_selector || '#input-quantity');
        return quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    }

    /**
     * Get selected product options
     */
    function getOptions() {
        var options = {};
        var optionInputs = document.querySelectorAll('input[name^="option"], select[name^="option"], textarea[name^="option"]');

        optionInputs.forEach(function(input) {
            var name = input.name;
            var match = name.match(/option\[(\d+)\]/);

            if (match) {
                var optionId = match[1];

                if (input.type === 'radio' || input.type === 'checkbox') {
                    if (input.checked) {
                        options[optionId] = input.value;
                    }
                } else {
                    options[optionId] = input.value;
                }
            }
        });

        return options;
    }

    /**
     * Get product name from page
     */
    function getProductName() {
        // Try multiple selectors for product name
        var nameElement = document.querySelector('h1.product-name, h1.title, .product-info h1, #content h1');
        if (nameElement) {
            return nameElement.textContent.trim();
        }
        return 'Producto';
    }

    /**
     * Get selected options text for display
     */
    function getSelectedOptionsText() {
        var optionsText = [];
        var optionSelects = document.querySelectorAll('select[name^="option"]');

        optionSelects.forEach(function(select) {
            if (select.value && select.value !== '') {
                var selectedOption = select.options[select.selectedIndex];
                var label = select.closest('.form-group').querySelector('label');
                if (label && selectedOption && selectedOption.text !== '--- Seleccionar ---') {
                    optionsText.push(label.textContent.trim() + ': ' + selectedOption.text);
                }
            }
        });

        // Handle radio buttons
        var optionRadios = document.querySelectorAll('input[name^="option"][type="radio"]:checked');
        optionRadios.forEach(function(radio) {
            var label = radio.closest('.form-group').querySelector('label.control-label');
            var radioLabel = document.querySelector('label[for="' + radio.id + '"]');
            if (label && radioLabel) {
                optionsText.push(label.textContent.trim() + ': ' + radioLabel.textContent.trim());
            }
        });

        return optionsText.length > 0 ? optionsText.join(', ') : '';
    }

    /**
     * Validate required options are selected
     */
    function validateRequiredOptions() {
        var requiredOptions = document.querySelectorAll('.product-option-select.required select, .product-option-radio.required, .product-option-checkbox.required');
        var allValid = true;
        var missingOptions = [];

        requiredOptions.forEach(function(optionGroup) {
            var isValid = false;

            if (optionGroup.tagName === 'SELECT') {
                // For select dropdowns
                isValid = optionGroup.value !== '';
                if (!isValid) {
                    var label = optionGroup.closest('.form-group').querySelector('label');
                    missingOptions.push(label ? label.textContent.trim() : 'Option');
                }
            } else {
                // For radio/checkbox groups
                var inputs = optionGroup.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                inputs.forEach(function(input) {
                    if (input.checked) {
                        isValid = true;
                    }
                });
                if (!isValid) {
                    var label = optionGroup.querySelector('label');
                    missingOptions.push(label ? label.textContent.trim() : 'Option');
                }
            }

            if (!isValid) {
                allValid = false;
            }
        });

        return {
            valid: allValid,
            missing: missingOptions
        };
    }

    /**
     * Get current product price
     */
    function getPrice() {
        var priceElement = document.querySelector(config.productData.price_element);
        if (priceElement) {
            var priceText = priceElement.textContent.trim();
            // Remove currency symbols and convert to number
            var price = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.'));
            return isNaN(price) ? 0 : price;
        }
        return 0;
    }

    /**
     * Calculate total amount
     */
    function calculateTotal() {
        var price = getPrice();
        var quantity = getQuantity();
        return price * quantity;
    }

    /**
     * Get line items for display
     */
    function getLineItems() {
        var productTotal = calculateTotal();
        var shippingCost = state.shippingCost;

        var productName = getProductName();
        var selectedOptions = getSelectedOptionsText();
        var productLabel = productName;

        if (selectedOptions) {
            productLabel += ' (' + selectedOptions + ')';
        }

        var quantity = getQuantity();
        if (quantity > 1) {
            productLabel += ' x' + quantity;
        }

        return [
            {
                name: productLabel,
                amount: Math.round(productTotal * 100)
            },
            {
                name: 'Envío estándar a España',
                amount: Math.round(shippingCost * 100)
            }
        ];
    }

    /**
     * Setup Express Checkout Element
     */
    function setupExpressCheckout() {
        var productTotal = calculateTotal();
        var shippingCost = state.shippingCost;
        var totalWithShipping = productTotal + shippingCost;

        console.log('[Stripe] Setting up Express Checkout - Product: €' + productTotal + ', Shipping: €' + shippingCost + ', Total: €' + totalWithShipping);

        // Create Elements instance
        config.elements = config.stripe.elements({
            mode: 'payment',
            amount: Math.round(totalWithShipping * 100),
            currency: config.productData.currency.toLowerCase() || 'eur'
        });

        // Create Express Checkout Element
        config.expressCheckoutElement = config.elements.create('expressCheckout', {
            buttonType: {
                applePay: 'buy',
                googlePay: 'buy',
                paypal: 'buynow'
            },
            layout: {
                maxColumns: 1,
                maxRows: 1
            }
        });

        // Attach event listeners
        attachEventListeners();

        // Display the button
        displayExpressCheckout();
    }

    /**
     * Display Express Checkout button
     */
    function displayExpressCheckout() {
        var container = document.getElementById('stripe-applepay-button-container');

        // If container doesn't exist, create it and inject before cart button
        if (!container) {
            var cartButton = document.getElementById('button-cart');
            if (cartButton) {
                // Create container
                container = document.createElement('div');
                container.id = 'stripe-applepay-button-container';
                container.style.marginBottom = '15px';

                // Create divider
                var divider = document.createElement('div');
                divider.id = 'stripe-applepay-divider';
                divider.style.textAlign = 'center';
                divider.style.margin = '15px 0';
                divider.style.display = 'none';
                divider.innerHTML = '<span style="background: #fff; padding: 0 10px; color: #999;">O</span>';

                // Insert before cart button
                var parent = cartButton.parentNode;
                parent.insertBefore(divider, cartButton);
                parent.insertBefore(container, divider);
            } else {
                console.warn('Cart button not found, cannot inject Express Checkout button');
                return;
            }
        }

        if (!container) return;

        // Check if required options are valid before mounting
        updateButtonVisibility();
    }

    /**
     * Update button visibility based on required options
     */
    function updateButtonVisibility() {
        if (!config.expressCheckoutElement) return;

        var validation = validateRequiredOptions();
        var container = document.getElementById('stripe-applepay-button-container');
        var divider = document.getElementById('stripe-applepay-divider');

        if (validation.valid) {
            // Mount button if not already mounted
            if (!state.expressCheckoutMounted) {
                console.log('[Stripe] Mounting Express Checkout - all required options selected');
                config.expressCheckoutElement.mount('#stripe-applepay-button-container');
                state.expressCheckoutMounted = true;

                if (divider) {
                    divider.style.display = 'block';
                }
            }
        } else {
            // Unmount button if mounted
            if (state.expressCheckoutMounted) {
                console.log('[Stripe] Unmounting Express Checkout - missing required options:', validation.missing);
                config.expressCheckoutElement.unmount();
                state.expressCheckoutMounted = false;

                if (divider) {
                    divider.style.display = 'none';
                }
            }
        }
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Update total when quantity changes
        var quantityInput = document.querySelector(config.productData.quantity_selector || '#input-quantity');
        if (quantityInput) {
            quantityInput.addEventListener('change', updateExpressCheckout);
        }

        // Update total when options change
        var optionInputs = document.querySelectorAll('input[name^="option"], select[name^="option"]');
        optionInputs.forEach(function(input) {
            input.addEventListener('change', function() {
                updateButtonVisibility();
                updateExpressCheckout();
            });
        });

        // Express Checkout events
        config.expressCheckoutElement.on('click', handleClick);
        config.expressCheckoutElement.on('confirm', handleConfirm);
        config.expressCheckoutElement.on('shippingaddresschange', handleShippingAddressChange);
        config.expressCheckoutElement.on('shippingratechange', handleShippingRateChange);
    }

    /**
     * Update Express Checkout with new amounts
     */
    function updateExpressCheckout() {
        var productTotal = calculateTotal();
        var shippingCost = state.shippingCost;
        var totalWithShipping = productTotal + shippingCost;

        config.elements.update({
            amount: Math.round(totalWithShipping * 100)
        });

        console.log('[Stripe] Updated Express Checkout - Product: €' + productTotal + ', Shipping: €' + shippingCost + ', Total: €' + totalWithShipping);
    }

    /**
     * Handle click event
     */
    function handleClick(event) {
        console.log('[Stripe] Express Checkout clicked');

        // Validate required options
        var validation = validateRequiredOptions();
        if (!validation.valid) {
            console.error('[Stripe] ERROR: Required options not selected:', validation.missing);
            event.resolve({error: 'Por favor, selecciona todas las opciones requeridas: ' + validation.missing.join(', ')});
            return;
        }

        // Resolve with shipping options and line items
        var lineItems = getLineItems();
        var shippingRates = [{
            id: 'flat_rate_spain',
            displayName: 'Envío estándar',
            amount: 495,
            detail: 'Entrega en 3-5 días laborables'
        }];

        event.resolve({
            lineItems: lineItems,
            shippingRates: shippingRates,
            shippingAddressRequired: true,
            emailRequired: true,
            phoneNumberRequired: true
        });
    }

    /**
     * Handle shipping address change
     */
    function handleShippingAddressChange(event) {
        var address = event.address;
        console.log('[Stripe] Shipping address changed:', address);

        // Store shipping address
        state.selectedShippingAddress = address;

        // Validate country is Spain
        if (address.country !== 'ES') {
            console.log('[Stripe] Invalid country:', address.country, '- Only Spain (ES) is supported');
            event.resolve({
                error: 'Solo enviamos a España'
            });
            return;
        }

        // Return shipping rates for Spain
        event.resolve({
            shippingRates: [{
                id: 'flat_rate_spain',
                displayName: 'Envío estándar',
                amount: 495,
                detail: 'Entrega en 3-5 días laborables'
            }]
        });
    }

    /**
     * Handle shipping rate change
     */
    function handleShippingRateChange(event) {
        console.log('[Stripe] Shipping rate selected:', event.shippingRate);
        state.selectedShippingOption = event.shippingRate;
        event.resolve();
    }

    /**
     * Handle confirm (payment method received)
     */
    function handleConfirm(event) {
        console.log('[Stripe] Payment confirmed, processing...');
        console.log('[Stripe] Event details:', event);

        // Validate required options one more time
        var validation = validateRequiredOptions();
        if (!validation.valid) {
            console.error('[Stripe] ERROR: Required options not selected:', validation.missing);
            event.resolve({error: 'Por favor, selecciona todas las opciones requeridas: ' + validation.missing.join(', ')});
            return;
        }

        // Get shipping info from event
        if (!state.selectedShippingAddress) {
            console.error('[Stripe] ERROR: No shipping address selected');
            event.resolve({error: 'Por favor, selecciona una dirección de envío'});
            return;
        }

        var shippingCost = state.shippingCost;
        var productTotal = calculateTotal();
        var total = productTotal + shippingCost;

        console.log('[Stripe] Creating payment intent with shipping - Product: €' + productTotal + ', Shipping: €' + shippingCost + ', Total: €' + total);

        // Create payment intent WITH shipping included
        fetch(config.productData.ajax_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'create_payment_intent',
                product_id: config.productData.product_id,
                quantity: getQuantity(),
                option: getOptions(),
                country: state.selectedShippingAddress.country
            })
        })
        .then(function(response) {
            // Capture raw text first to debug
            return response.text().then(function(text) {
                console.log('[Stripe] Raw response from server:', text);
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('[Stripe] Failed to parse JSON:', e);
                    console.error('[Stripe] Response text (first 500 chars):', text.substring(0, 500));
                    throw new Error('Invalid JSON response from server');
                }
            });
        })
        .then(function(data) {
            if (data.error) {
                console.error('[Stripe] Payment intent error:', data.error);
                event.resolve({error: data.error});
                return;
            }

            console.log('[Stripe] Payment intent created, confirming payment...');

            // Confirm payment with Stripe
            return config.stripe.confirmPayment({
                elements: config.elements,
                clientSecret: data.client_secret,
                confirmParams: {
                    return_url: window.location.origin + '/success',
                },
                redirect: 'if_required'
            });
        })
        .then(function(result) {
            if (result.error) {
                console.error('[Stripe] Payment confirmation error:', result.error);
                event.resolve({error: result.error.message});
                return;
            }

            console.log('[Stripe] Payment confirmed, creating order...');

            // Payment successful, create order
            return fetch(config.productData.ajax_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'confirm_payment',
                    payment_intent_id: result.paymentIntent.id,
                    product_id: config.productData.product_id,
                    quantity: getQuantity(),
                    option: getOptions(),
                    // Shipping address
                    shipping_address: {
                        name: (state.selectedShippingAddress.name || '').trim() ||
                              ((state.selectedShippingAddress.givenName || '') + ' ' + (state.selectedShippingAddress.familyName || '')).trim() ||
                              'Guest',
                        addressLines: state.selectedShippingAddress.addressLines ||
                                     (state.selectedShippingAddress.line1 ? [state.selectedShippingAddress.line1, state.selectedShippingAddress.line2 || ''] : []),
                        locality: state.selectedShippingAddress.locality || state.selectedShippingAddress.city || '',
                        administrativeArea: state.selectedShippingAddress.administrativeArea || state.selectedShippingAddress.state || '',
                        postalCode: state.selectedShippingAddress.postalCode || state.selectedShippingAddress.postal_code || '',
                        countryCode: state.selectedShippingAddress.country || ''
                    },
                    // Billing address (Express Checkout provides this)
                    billing_address: {
                        name: event.billingDetails?.name || state.selectedShippingAddress.name || 'Guest',
                        email: event.billingDetails?.email || '',
                        phone: event.billingDetails?.phone || event.phone || '',
                        address: event.billingDetails?.address || {
                            line1: state.selectedShippingAddress.line1 || '',
                            line2: state.selectedShippingAddress.line2 || '',
                            city: state.selectedShippingAddress.city || '',
                            postal_code: state.selectedShippingAddress.postal_code || '',
                            state: state.selectedShippingAddress.state || '',
                            country: state.selectedShippingAddress.country || ''
                        }
                    }
                })
            });
        })
        .then(function(response) {
            // Capture raw text first for debugging
            return response.text().then(function(text) {
                console.log('[Stripe] Raw response from order creation:', text);
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('[Stripe] Failed to parse JSON:', e);
                    console.error('[Stripe] Response text (first 500 chars):', text.substring(0, 500));
                    throw new Error('Invalid JSON response from order creation');
                }
            });
        })
        .then(function(data) {
            if (data.success) {
                console.log('[Stripe] Order created successfully:', data.order_id);

                // Complete the payment
                event.resolve();

                // Redirect to success page
                if (data.redirect) {
                    window.location.href = data.redirect;
                }
            } else {
                console.error('[Stripe] Order creation failed:', data.error);
                event.resolve({error: data.error || 'Error al crear el pedido'});
            }
        })
        .catch(function(error) {
            console.error('[Stripe] Payment error:', error);
            event.resolve({error: error.message || 'Error procesando el pago'});
        });
    }

    // Public API
    return {
        init: init
    };
})();
