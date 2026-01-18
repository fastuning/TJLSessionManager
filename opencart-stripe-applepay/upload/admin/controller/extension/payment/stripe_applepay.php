<?php
class ControllerExtensionPaymentStripeApplepay extends Controller {
    private $error = array();

    public function index() {
        $this->load->language('extension/payment/stripe_applepay');

        $this->document->setTitle($this->language->get('heading_title'));

        $this->load->model('setting/setting');

        if (($this->request->server['REQUEST_METHOD'] == 'POST') && $this->validate()) {
            $this->model_setting_setting->editSetting('payment_stripe_applepay', $this->request->post);

            $this->session->data['success'] = $this->language->get('text_success');

            $this->response->redirect($this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=payment', true));
        }

        if (isset($this->error['warning'])) {
            $data['error_warning'] = $this->error['warning'];
        } else {
            $data['error_warning'] = '';
        }

        if (isset($this->error['publishable_key'])) {
            $data['error_publishable_key'] = $this->error['publishable_key'];
        } else {
            $data['error_publishable_key'] = '';
        }

        if (isset($this->error['secret_key'])) {
            $data['error_secret_key'] = $this->error['secret_key'];
        } else {
            $data['error_secret_key'] = '';
        }

        $data['breadcrumbs'] = array();

        $data['breadcrumbs'][] = array(
            'text' => $this->language->get('text_home'),
            'href' => $this->url->link('common/dashboard', 'user_token=' . $this->session->data['user_token'], true)
        );

        $data['breadcrumbs'][] = array(
            'text' => $this->language->get('text_extension'),
            'href' => $this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=payment', true)
        );

        $data['breadcrumbs'][] = array(
            'text' => $this->language->get('heading_title'),
            'href' => $this->url->link('extension/payment/stripe_applepay', 'user_token=' . $this->session->data['user_token'], true)
        );

        $data['action'] = $this->url->link('extension/payment/stripe_applepay', 'user_token=' . $this->session->data['user_token'], true);

        $data['cancel'] = $this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=payment', true);

        if (isset($this->request->post['payment_stripe_applepay_publishable_key'])) {
            $data['payment_stripe_applepay_publishable_key'] = $this->request->post['payment_stripe_applepay_publishable_key'];
        } else {
            $data['payment_stripe_applepay_publishable_key'] = $this->config->get('payment_stripe_applepay_publishable_key');
        }

        if (isset($this->request->post['payment_stripe_applepay_secret_key'])) {
            $data['payment_stripe_applepay_secret_key'] = $this->request->post['payment_stripe_applepay_secret_key'];
        } else {
            $data['payment_stripe_applepay_secret_key'] = $this->config->get('payment_stripe_applepay_secret_key');
        }

        if (isset($this->request->post['payment_stripe_applepay_test_mode'])) {
            $data['payment_stripe_applepay_test_mode'] = $this->request->post['payment_stripe_applepay_test_mode'];
        } else {
            $data['payment_stripe_applepay_test_mode'] = $this->config->get('payment_stripe_applepay_test_mode');
        }

        if (isset($this->request->post['payment_stripe_applepay_product_button'])) {
            $data['payment_stripe_applepay_product_button'] = $this->request->post['payment_stripe_applepay_product_button'];
        } else {
            $data['payment_stripe_applepay_product_button'] = $this->config->get('payment_stripe_applepay_product_button');
        }

        if (isset($this->request->post['payment_stripe_applepay_button_style'])) {
            $data['payment_stripe_applepay_button_style'] = $this->request->post['payment_stripe_applepay_button_style'];
        } else {
            $data['payment_stripe_applepay_button_style'] = $this->config->get('payment_stripe_applepay_button_style');
        }

        if (isset($this->request->post['payment_stripe_applepay_order_status_id'])) {
            $data['payment_stripe_applepay_order_status_id'] = $this->request->post['payment_stripe_applepay_order_status_id'];
        } else {
            $data['payment_stripe_applepay_order_status_id'] = $this->config->get('payment_stripe_applepay_order_status_id');
        }

        $this->load->model('localisation/order_status');

        $data['order_statuses'] = $this->model_localisation_order_status->getOrderStatuses();

        if (isset($this->request->post['payment_stripe_applepay_geo_zone_id'])) {
            $data['payment_stripe_applepay_geo_zone_id'] = $this->request->post['payment_stripe_applepay_geo_zone_id'];
        } else {
            $data['payment_stripe_applepay_geo_zone_id'] = $this->config->get('payment_stripe_applepay_geo_zone_id');
        }

        $this->load->model('localisation/geo_zone');

        $data['geo_zones'] = $this->model_localisation_geo_zone->getGeoZones();

        if (isset($this->request->post['payment_stripe_applepay_status'])) {
            $data['payment_stripe_applepay_status'] = $this->request->post['payment_stripe_applepay_status'];
        } else {
            $data['payment_stripe_applepay_status'] = $this->config->get('payment_stripe_applepay_status');
        }

        if (isset($this->request->post['payment_stripe_applepay_sort_order'])) {
            $data['payment_stripe_applepay_sort_order'] = $this->request->post['payment_stripe_applepay_sort_order'];
        } else {
            $data['payment_stripe_applepay_sort_order'] = $this->config->get('payment_stripe_applepay_sort_order');
        }

        $data['header'] = $this->load->controller('common/header');
        $data['column_left'] = $this->load->controller('common/column_left');
        $data['footer'] = $this->load->controller('common/footer');

        $this->response->setOutput($this->load->view('extension/payment/stripe_applepay', $data));
    }

    protected function validate() {
        if (!$this->user->hasPermission('modify', 'extension/payment/stripe_applepay')) {
            $this->error['warning'] = $this->language->get('error_permission');
        }

        if (!$this->request->post['payment_stripe_applepay_publishable_key']) {
            $this->error['publishable_key'] = $this->language->get('error_publishable_key');
        }

        if (!$this->request->post['payment_stripe_applepay_secret_key']) {
            $this->error['secret_key'] = $this->language->get('error_secret_key');
        }

        return !$this->error;
    }

    public function install() {
        $this->load->model('setting/setting');
        $this->load->model('setting/event');

        // Default settings
        $this->model_setting_setting->editSetting('payment_stripe_applepay', array(
            'payment_stripe_applepay_status' => 0,
            'payment_stripe_applepay_test_mode' => 1,
            'payment_stripe_applepay_product_button' => 1,
            'payment_stripe_applepay_button_style' => 'black',
            'payment_stripe_applepay_sort_order' => 1
        ));

        // Register event to inject publishable key
        $this->model_setting_event->addEvent(
            'stripe_applepay_inject_key',
            'catalog/view/*/after',
            'extension/module/stripe_applepay_event/injectPublishableKey'
        );
    }

    public function uninstall() {
        $this->load->model('setting/setting');
        $this->load->model('setting/event');

        $this->model_setting_setting->deleteSetting('payment_stripe_applepay');

        // Remove event
        $this->model_setting_event->deleteEventByCode('stripe_applepay_inject_key');
    }
}
