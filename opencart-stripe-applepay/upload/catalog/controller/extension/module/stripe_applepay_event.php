<?php
class ControllerExtensionModuleStripeApplePayEvent extends Controller {

    public function injectPublishableKey(&$route, &$data, &$output) {
        // Only inject on product pages
        if ($route !== 'product/product') {
            return;
        }

        // Check if extension is enabled
        if (!$this->config->get('payment_stripe_applepay_status')) {
            return;
        }

        // Check if product button is enabled
        if (!$this->config->get('payment_stripe_applepay_product_button')) {
            return;
        }

        $publishable_key = $this->config->get('payment_stripe_applepay_publishable_key');

        if (!$publishable_key) {
            return;
        }

        // Inject meta tag in header
        $meta_tag = '<meta name="stripe-publishable-key" content="' . $publishable_key . '">' . "\n</head>";
        $output = str_replace('</head>', $meta_tag, $output);
    }
}
