/**
 * Stripe Apple Pay for OpenCart Product Page
 * Handles direct purchase from product page using Apple Pay
 */

var StripeProductApplePay = (function() {
    'use strict';

    var config = {
        stripe: null,
        elements: null,
        paymentRequest: null,
        productData: {},
        publishableKey: ''
    };

    /**
     * Initialize the Apple Pay button
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
            setupPaymentRequest();
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
     * Setup Stripe Payment Request
     */
    function setupPaymentRequest() {
        var total = calculateTotal();
        var amount = Math.round(total * 100); // Convert to cents

        config.paymentRequest = config.stripe.paymentRequest({
            country: 'ES',
            currency: config.productData.currency.toLowerCase() || 'eur',
            total: {
                label: 'Total',
                amount: amount
            },
            requestPayerName: true,
            requestPayerEmail: true,
            requestPayerPhone: true,
            requestShipping: true,
            shippingOptions: []
        });

        // Check if Apple Pay is available
        config.paymentRequest.canMakePayment().then(function(result) {
            if (result && result.applePay) {
                displayApplePayButton();
                attachEventListeners();
            } else {
                console.log('Apple Pay not available');
            }
        });
    }

    /**
     * Display Apple Pay button
     */
    function displayApplePayButton() {
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
                console.warn('Cart button not found, cannot inject Apple Pay button');
                return;
            }
        }

        if (!container) return;

        var elements = config.stripe.elements();
        var prButton = elements.create('paymentRequestButton', {
            paymentRequest: config.paymentRequest,
            style: {
                paymentRequestButton: {
                    type: 'buy',
                    theme: 'black',
                    height: '48px'
                }
            }
        });

        // Check if button can be mounted
        config.paymentRequest.canMakePayment().then(function(result) {
            if (result) {
                prButton.mount('#stripe-applepay-button-container');

                // Show divider
                var divider = document.getElementById('stripe-applepay-divider');
                if (divider) {
                    divider.style.display = 'block';
                }
            }
        });
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Update total when quantity changes
        var quantityInput = document.querySelector(config.productData.quantity_selector || '#input-quantity');
        if (quantityInput) {
            quantityInput.addEventListener('change', updatePaymentRequest);
        }

        // Update total when options change
        var optionInputs = document.querySelectorAll('input[name^="option"], select[name^="option"]');
        optionInputs.forEach(function(input) {
            input.addEventListener('change', updatePaymentRequest);
        });

        // Handle shipping address change
        config.paymentRequest.on('shippingaddresschange', handleShippingAddressChange);

        // Handle shipping option change
        config.paymentRequest.on('shippingoptionchange', handleShippingOptionChange);

        // Handle payment method
        config.paymentRequest.on('paymentmethod', handlePaymentMethod);
    }

    /**
     * Update payment request with new total
     */
    function updatePaymentRequest() {
        var total = calculateTotal();
        var amount = Math.round(total * 100);

        config.paymentRequest.update({
            total: {
                label: 'Total',
                amount: amount
            }
        });
    }

    /**
     * Handle shipping address change
     */
    function handleShippingAddressChange(event) {
        var shippingAddress = event.shippingAddress;

        // Fetch shipping options from server
        fetch(config.productData.ajax_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'get_shipping',
                product_id: config.productData.product_id,
                quantity: getQuantity(),
                country: shippingAddress.country,
                postcode: shippingAddress.postalCode
            })
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.shipping_options && data.shipping_options.length > 0) {
                var total = calculateTotal();
                var shippingCost = data.shipping_options[0].amount / 100;
                var newTotal = Math.round((total + shippingCost) * 100);

                event.updateWith({
                    status: 'success',
                    shippingOptions: data.shipping_options,
                    total: {
                        label: 'Total',
                        amount: newTotal
                    }
                });
            } else {
                event.updateWith({
                    status: 'invalid_shipping_address'
                });
            }
        })
        .catch(function(error) {
            console.error('Error fetching shipping:', error);
            event.updateWith({
                status: 'fail'
            });
        });
    }

    /**
     * Handle shipping option change
     */
    function handleShippingOptionChange(event) {
        var shippingOption = event.shippingOption;
        var total = calculateTotal();
        var shippingCost = shippingOption.amount / 100;
        var newTotal = Math.round((total + shippingCost) * 100);

        event.updateWith({
            status: 'success',
            total: {
                label: 'Total',
                amount: newTotal
            }
        });
    }

    /**
     * Handle payment method
     */
    function handlePaymentMethod(event) {
        var paymentMethod = event.paymentMethod;

        // Create payment intent
        fetch(config.productData.ajax_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'create_payment_intent',
                product_id: config.productData.product_id,
                quantity: getQuantity(),
                option: getOptions()
            })
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.error) {
                event.complete('fail');
                alert('Error: ' + data.error);
                return;
            }

            // Confirm payment with Stripe
            return config.stripe.confirmCardPayment(
                data.client_secret,
                { payment_method: paymentMethod.id },
                { handleActions: false }
            );
        })
        .then(function(result) {
            if (result.error) {
                event.complete('fail');
                alert('Payment failed: ' + result.error.message);
                return;
            }

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
                    shipping_address: event.shippingAddress,
                    billing_address: event.payerName
                })
            });
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                event.complete('success');

                // Redirect to success page
                if (data.redirect) {
                    window.location.href = data.redirect;
                }
            } else {
                event.complete('fail');
                alert('Order creation failed: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(function(error) {
            console.error('Payment error:', error);
            event.complete('fail');
            alert('Payment processing failed');
        });
    }

    // Public API
    return {
        init: init
    };
})();
