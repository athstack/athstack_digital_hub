<?php
class ContactController extends Controller {
    // Explicitly declare the property to fix the deprecation warning
    private $contactModel;

    public function __construct() {
        // Correct path construction to locate the models folder 
        // relative to the ATHSTACK_DIGITAL_HUB root
        require_once dirname(__DIR__) . '/models/Contact.php';
        
        // Instantiate the Contact model directly
        $this->contactModel = new Contact();
    }

    public function index() {
        // Load the contact view
        $this->view('contact/index');
    }

    public function send() {
        if ($_SERVER['REQUEST_METHOD'] == 'POST') {
            // Sanitize inputs
            $data = [
                'name'    => filter_var($_POST['name'], FILTER_SANITIZE_SPECIAL_CHARS),
                'email'   => filter_var($_POST['email'], FILTER_SANITIZE_EMAIL),
                'message' => filter_var($_POST['message'], FILTER_SANITIZE_SPECIAL_CHARS)
            ];

            // Save to database using your model
            if ($this->contactModel->addMessage($data)) {
                // Redirect back to contact page with a success signal
                header('Location: ' . URLROOT . '/contact?status=success');
            } else {
                // Handle failure
                header('Location: ' . URLROOT . '/contact?status=error');
            }
            exit();
        }
    }
}