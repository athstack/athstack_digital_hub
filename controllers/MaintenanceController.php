<?php
class MaintenanceController extends Controller {
    private MaintenanceModel $maintenanceModel;

    public function __construct() {
        $this->maintenanceModel = new MaintenanceModel();
    }

    public function index(): void {
        $computerServices = $this->maintenanceModel->getServicesByGroup('computer');
        $phoneServices = $this->maintenanceModel->getServicesByGroup('phone');

        // --- FIXED: Merge services or grab all of them for the dropdown select box ---
        // If your model has an all active services method, you can use that instead, 
        // otherwise merging the two groups guarantees the dropdown gets populated!
        $allOperationalServices = array_merge(
            is_array($computerServices) ? $computerServices : [], 
            is_array($phoneServices) ? $phoneServices : []
        );

        $this->view('maintenance/index', [
            'title' => 'Enterprise IT Maintenance & Device Repair',
            'computerServices' => $computerServices,
            'phoneServices' => $phoneServices,
            'services' => $allOperationalServices // Injected payload variable for the view dropdown loop
        ]);
    }

    public function bookAppointment(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Location: ' . URLROOT . '/maintenance');
            exit;
        }

        $input = $this->sanitizeInput($_POST);

        if (!$this->validateCSRF($input['csrf_token'] ?? '')) {
            $this->jsonResponse(['success' => false, 'message' => 'CSRF Security Violation Verified.'], 403);
        }

        // Basic verification processing block
        if (empty($input['name']) || empty($input['email']) || empty($input['phone']) || empty($input['appointment_date']) || empty($input['service_id'])) {
            $this->jsonResponse(['success' => false, 'message' => 'All mandatory identity and booking criteria fields are required.'], 400);
        }

        $bookingResult = $this->maintenanceModel->createBooking([
            'user_id' => $_SESSION['user_id'] ?? null,
            'service_id' => (int)$input['service_id'],
            'customer_name' => $input['name'],
            'customer_email' => $input['email'],
            'customer_phone' => $input['phone'],
            'appointment_date' => $input['appointment_date'],
            'device_details' => $input['device_details'] ?? ''
        ]);

        if ($bookingResult) {
            $this->jsonResponse(['success' => true, 'message' => 'Your maintenance request has been scheduled successfully.']);
        } else {
            $this->jsonResponse(['success' => false, 'message' => 'Infrastructure error mapping allocation slots.'], 500);
        }
    }
}