/**
 * Stripe Express Checkout (Apple Pay, Google Pay, Link) for OpenCart Product Page  
 * Production Version with Conditional Debug Logging
 */

var StripeProductApplePay = (function() {
    'use strict';

    var config = {
        stripe: null,
        elements: null,
        expressCheckoutElement: null,
        productData: {},
        publishableKey: '',
        debugMode: false
    };

    var state = {
        selectedShippingAddress: null,
        selectedShippingOption: null,
        shippingCost: 4.95,
        expressCheckoutMounted: false
    };

    // Conditional logging helper
    function debug(message, data) {
        if (config.debugMode) {
            if (data !== undefined) {
                console.log('[Stripe Express Checkout] ' + message, data);
            } else {
                console.log('[Stripe Express Checkout] ' + message);
            }
        }
    }

    // Always log errors
    function error(message, data) {
        if (data !== undefined) {
            console.error('[Stripe Express Checkout] ' + message, data);
        } else {
            console.error('[Stripe Express Checkout] ' + message);
        }
    }

    function init(productData) {
        config.productData = productData;

        // Get Stripe publishable key from meta tag
        var metaKey = document.querySelector('meta[name="stripe-publishable-key"]');
        if (metaKey) {
            config.publishableKey = metaKey.getAttribute('content');
        }

        // Fetch config including debug mode
        fetch('index.php?route=extension/module/stripe_product_payment/getConfig')
            .then(function(response) { return response.json(); })
            .then(function(serverConfig) {
                config.debugMode = serverConfig.debug_mode || false;
                debug('Configuration loaded', serverConfig);

                if (serverConfig.enabled && serverConfig.publishable_key) {
                    config.publishableKey = serverConfig.publishable_key;
                    
                    if (typeof Stripe !== 'undefined') {
                        config.stripe = Stripe(config.publishableKey);
                        setupExpressCheckout();
                    }
                }
            })
            .catch(function(err) {
                error('Failed to load configuration', err);
            });
    }

    function getQuantity() {
        var quantityInput = document.querySelector(config.productData.quantity_selector || '#input-quantity');
        return quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    }

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

    function getProductName() {
        var nameElement = document.querySelector('h1.product-name, h1.title, .product-info h1, #content h1');
        if (nameElement) {
            return nameElement.textContent.trim();
        }
        return 'Producto';
    }

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

    function validateRequiredOptions() {
        var requiredOptions = document.querySelectorAll('.product-option-select.required select, .product-option-radio.required, .product-option-checkbox.required');
        var allValid = true;
        var missingOptions = [];

        requiredOptions.forEach(function(optionGroup) {
            var isValid = false;

            if (optionGroup.tagName === 'SELECT') {
                isValid = optionGroup.value !== '';
                if (!isValid) {
                    var label = optionGroup.closest('.form-group').querySelector('label');
                    missingOptions.push(label ? label.textContent.trim() : 'Option');
                }
            } else {
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

    function getPrice() {
        var priceElement = document.querySelector(config.productData.price_element);
        if (priceElement) {
            var priceText = priceElement.textContent.trim();
            var price = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.'));
            return isNaN(price) ? 0 : price;
        }
        return 0;
    }

    function calculateTotal() {
        var price = getPrice();
        var quantity = getQuantity();
        return price * quantity;
    }

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

    function setupExpressCheckout() {
        var productTotal = calculateTotal();
        var shippingCost = state.shippingCost;
        var totalWithShipping = productTotal + shippingCost;

        debug('Setting up Express Checkout - Total: €' + totalWithShipping);

        config.elements = config.stripe.elements({
            mode: 'payment',
            amount: Math.round(totalWithShipping * 100),
            currency: config.productData.currency.toLowerCase() || 'eur'
        });

        config.expressCheckoutElement = config.elements.create('expressCheckout', {
            buttonType: {
                applePay: 'buy',
                googlePay: 'buy',
                paypal: 'buynow'
            },
            layout: {
                maxColumns: 1,
                maxRows: 1,
                overflow: 'never'
            }
        });

        attachEventListeners();
        displayExpressCheckout();
    }

    function displayExpressCheckout() {
        var container = document.getElementById('stripe-applepay-button-container');

        if (!container) {
            var cartButton = document.getElementById('button-cart');
            if (cartButton) {
                container = document.createElement('div');
                container.id = 'stripe-applepay-button-container';
                container.style.marginBottom = '15px';

                var divider = document.createElement('div');
                divider.id = 'stripe-applepay-divider';
                divider.style.textAlign = 'center';
                divider.style.margin = '15px 0';
                divider.style.display = 'none';
                divider.innerHTML = '<span style="background: #fff; padding: 0 10px; color: #999;">O</span>';

                var parent = cartButton.parentNode;
                parent.insertBefore(divider, cartButton);
                parent.insertBefore(container, divider);
            } else {
                debug('Cart button not found');
                return;
            }
        }

        if (!container) return;

        updateButtonVisibility();
    }

    function updateButtonVisibility() {
        if (!config.expressCheckoutElement) return;

        var validation = validateRequiredOptions();
        var divider = document.getElementById('stripe-applepay-divider');

        if (validation.valid) {
            if (!state.expressCheckoutMounted) {
                debug('Mounting Express Checkout button');
                config.expressCheckoutElement.mount('#stripe-applepay-button-container');
                state.expressCheckoutMounted = true;

                if (divider) {
                    divider.style.display = 'block';
                }
            }
        } else {
            if (state.expressCheckoutMounted) {
                debug('Unmounting - missing required options', validation.missing);
                config.expressCheckoutElement.unmount();
                state.expressCheckoutMounted = false;

                if (divider) {
                    divider.style.display = 'none';
                }
            }
        }
    }

    function attachEventListeners() {
        var quantityInput = document.querySelector(config.productData.quantity_selector || '#input-quantity');
        if (quantityInput) {
            quantityInput.addEventListener('change', updateExpressCheckout);
        }

        var optionInputs = document.querySelectorAll('input[name^="option"], select[name^="option"]');
        optionInputs.forEach(function(input) {
            input.addEventListener('change', function() {
                updateButtonVisibility();
                updateExpressCheckout();
            });
        });

        config.expressCheckoutElement.on('click', handleClick);
        config.expressCheckoutElement.on('confirm', handleConfirm);
        config.expressCheckoutElement.on('shippingaddresschange', handleShippingAddressChange);
        config.expressCheckoutElement.on('shippingratechange', handleShippingRateChange);
    }

    function updateExpressCheckout() {
        var productTotal = calculateTotal();
        var shippingCost = state.shippingCost;
        var totalWithShipping = productTotal + shippingCost;

        config.elements.update({
            amount: Math.round(totalWithShipping * 100)
        });

        debug('Updated total: €' + totalWithShipping);
    }

    function handleClick(event) {
        debug('Express Checkout clicked');

        var validation = validateRequiredOptions();
        if (!validation.valid) {
            error('Required options not selected', validation.missing);
            event.resolve({error: 'Por favor, selecciona todas las opciones requeridas: ' + validation.missing.join(', ')});
            return;
        }

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

    function handleShippingAddressChange(event) {
        var address = event.address;
        debug('Shipping address changed', address);

        state.selectedShippingAddress = address;

        if (address.country !== 'ES') {
            debug('Invalid country: ' + address.country);
            event.resolve({
                error: 'Solo enviamos a España'
            });
            return;
        }

        event.resolve({
            shippingRates: [{
                id: 'flat_rate_spain',
                displayName: 'Envío estándar',
                amount: 495,
                detail: 'Entrega en 3-5 días laborables'
            }]
        });
    }

    function handleShippingRateChange(event) {
        debug('Shipping rate selected', event.shippingRate);
        state.selectedShippingOption = event.shippingRate;
        event.resolve();
    }

    function handleConfirm(event) {
        debug('Payment confirmed, processing...');

        var validation = validateRequiredOptions();
        if (!validation.valid) {
            error('Required options not selected', validation.missing);
            event.resolve({error: 'Por favor, selecciona todas las opciones requeridas: ' + validation.missing.join(', ')});
            return;
        }

        if (!state.selectedShippingAddress) {
            error('No shipping address selected');
            event.resolve({error: 'Por favor, selecciona una dirección de envío'});
            return;
        }

        fetch(config.productData.ajax_url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'create_payment_intent',
                product_id: config.productData.product_id,
                quantity: getQuantity(),
                option: getOptions(),
                country: state.selectedShippingAddress.country
            })
        })
        .then(function(response) {
            return response.text().then(function(text) {
                debug('Payment intent response', text);
                try {
                    return JSON.parse(text);
                } catch (e) {
                    error('Failed to parse JSON', text.substring(0, 500));
                    throw new Error('Invalid JSON response from server');
                }
            });
        })
        .then(function(data) {
            if (data.error) {
                error('Payment intent error', data.error);
                event.resolve({error: data.error});
                return;
            }

            debug('Payment intent created, confirming...');

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
                error('Payment confirmation error', result.error);
                event.resolve({error: result.error.message});
                return;
            }

            debug('Payment confirmed, creating order...');

            return fetch(config.productData.ajax_url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'confirm_payment',
                    payment_intent_id: result.paymentIntent.id,
                    product_id: config.productData.product_id,
                    quantity: getQuantity(),
                    option: getOptions(),
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
            return response.text().then(function(text) {
                debug('Order creation response', text);
                try {
                    return JSON.parse(text);
                } catch (e) {
                    error('Failed to parse order JSON', text.substring(0, 500));
                    throw new Error('Invalid JSON response from order creation');
                }
            });
        })
        .then(function(data) {
            if (data.success) {
                debug('Order created successfully: ' + data.order_id);

                event.resolve();

                if (data.redirect) {
                    window.location.href = data.redirect;
                }
            } else {
                error('Order creation failed', data.error);
                event.resolve({error: data.error || 'Error al crear el pedido'});
            }
        })
        .catch(function(err) {
            error('Payment error', err);
            event.resolve({error: err.message || 'Error procesando el pago'});
        });
    }

    return {
        init: init
    };
})();
