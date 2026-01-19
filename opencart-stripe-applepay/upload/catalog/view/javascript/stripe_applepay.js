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

    var state = {
        selectedShippingAddress: null,
        selectedShippingOption: null,
        shippingCost: 4.95
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
        var productTotal = calculateTotal();
        var shippingCost = state.shippingCost;
        var totalWithShipping = productTotal + shippingCost;
        var amount = Math.round(totalWithShipping * 100); // Convert to cents

        console.log('[Stripe] Setting up payment request - Product: €' + productTotal + ', Shipping: €' + shippingCost + ', Total: €' + totalWithShipping);

        config.paymentRequest = config.stripe.paymentRequest({
            country: 'ES',
            currency: config.productData.currency.toLowerCase() || 'eur',
            total: {
                label: 'Total (incl. envío)',
                amount: amount
            },
            displayItems: [
                {
                    label: 'Producto',
                    amount: Math.round(productTotal * 100)
                },
                {
                    label: 'Envío estándar',
                    amount: Math.round(shippingCost * 100)
                }
            ],
            requestPayerName: true,
            requestPayerEmail: true,
            requestPayerPhone: true,
            requestShipping: true,
            shippingOptions: [
                {
                    id: 'flat_rate_spain',
                    label: 'Envío estándar',
                    amount: 495,  // 4.95€
                    detail: 'Entrega en 3-5 días laborables'
                }
            ]
        });

        // Check if Apple Pay is available
        config.paymentRequest.canMakePayment().then(function(result) {
            if (result && result.applePay) {
                console.log('[Stripe] Apple Pay is available');
                displayApplePayButton();
                attachEventListeners();
            } else {
                console.log('[Stripe] Apple Pay not available');
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
                    theme: 'dark',
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

        console.log('[Stripe] Shipping address changed:', shippingAddress);

        // Store shipping address for later use
        state.selectedShippingAddress = shippingAddress;

        // Validate country is Spain
        if (shippingAddress.country !== 'ES') {
            console.log('[Stripe] Invalid country:', shippingAddress.country, '- Only Spain (ES) is supported');
            event.updateWith({
                status: 'invalid_shipping_address',
                shippingOptions: []
            });
            return;
        }

        // Return fixed shipping for Spain
        var productTotal = calculateTotal();
        var shippingCost = state.shippingCost;
        var total = productTotal + shippingCost;

        console.log('[Stripe] Valid Spain address, returning fixed shipping - Product: €' + productTotal + ', Shipping: €' + shippingCost + ', Total: €' + total);

        event.updateWith({
            status: 'success',
            shippingOptions: [
                {
                    id: 'flat_rate_spain',
                    label: 'Envío estándar',
                    amount: 495,
                    detail: 'Entrega en 3-5 días laborables'
                }
            ],
            total: {
                label: 'Total (incl. envío)',
                amount: Math.round(total * 100)
            },
            displayItems: [
                {
                    label: 'Producto',
                    amount: Math.round(productTotal * 100)
                },
                {
                    label: 'Envío estándar',
                    amount: 495
                }
            ]
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
        console.log('[Stripe] Payment method received:', event.paymentMethod);

        var paymentMethod = event.paymentMethod;

        // Get shipping info from state
        if (!state.selectedShippingAddress) {
            console.error('[Stripe] ERROR: No shipping address selected');
            event.complete('fail');
            alert('Please select a shipping address');
            return;
        }

        var shippingCost = state.shippingCost;  // Fixed 4.95€
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
                country: state.selectedShippingAddress.country  // Pass country for shipping calculation
            })
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.error) {
                console.error('[Stripe] Payment intent error:', data.error);
                event.complete('fail');
                alert('Error: ' + data.error);
                return;
            }

            console.log('[Stripe] Payment intent created, confirming payment...');

            // Confirm payment with Stripe
            return config.stripe.confirmCardPayment(
                data.client_secret,
                { payment_method: paymentMethod.id },
                { handleActions: false }
            );
        })
        .then(function(result) {
            if (result.error) {
                console.error('[Stripe] Payment confirmation error:', result.error);
                event.complete('fail');
                alert('Payment failed: ' + result.error.message);
                return;
            }

            console.log('[Stripe] Payment confirmed, creating order...');

            // Payment successful, create order with CORRECT address mapping
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
                    // Shipping address from Apple Pay (stored in state)
                    shipping_address: {
                        name: (state.selectedShippingAddress.givenName || '') + ' ' + (state.selectedShippingAddress.familyName || ''),
                        addressLines: state.selectedShippingAddress.addressLines || [],
                        locality: state.selectedShippingAddress.locality || '',
                        administrativeArea: state.selectedShippingAddress.administrativeArea || '',
                        postalCode: state.selectedShippingAddress.postalCode || '',
                        countryCode: state.selectedShippingAddress.country || ''
                    },
                    // Billing address from Stripe PaymentMethod
                    billing_address: {
                        name: paymentMethod.billing_details.name || '',
                        email: paymentMethod.billing_details.email || '',
                        phone: paymentMethod.billing_details.phone || '',
                        address: paymentMethod.billing_details.address || {}
                    }
                })
            });
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                console.log('[Stripe] Order created successfully:', data.order_id);
                event.complete('success');

                // Redirect to success page
                if (data.redirect) {
                    window.location.href = data.redirect;
                }
            } else {
                console.error('[Stripe] Order creation failed:', data.error);
                event.complete('fail');
                alert('Order creation failed: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(function(error) {
            console.error('[Stripe] Payment error:', error);
            event.complete('fail');
            alert('Payment processing failed');
        });
    }

    // Public API
    return {
        init: init
    };
})();
