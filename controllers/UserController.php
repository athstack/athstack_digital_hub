<?php
class UserController extends Controller {

    public function __construct() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // Auth Gate: Ensure the visitor is a logged-in user
        if (!isset($_SESSION['user_id'])) {
            header('Location: ' . URLROOT . '/auth/login');
            exit;
        }
    }

    /**
     * Renders the standard customer account workspace control deck
     */
    public function index(): void {
        $this->view('user/dashboard', [
            'title' => 'Your Account Dashboard - Athstack'
        ]);
    }

    /**
     * Fetches and renders the order history for the logged-in user
     */
    public function orderHistory(): void {
        $orderModel = new OrderModel();
        $orders = $orderModel->getUserOrders((int)$_SESSION['user_id']);

        $this->view('user/orders', [
            'title'  => 'Order History - Athstack',
            'orders' => $orders
        ]);
    }

    /**
     * Admin: Display all users in the directory
     */
    public function adminUsers(): void {
        $userModel = new UserModel();
        $users = $userModel->getAllUsers();

        $this->view('admin/users', [
            'title' => 'User Management Directory',
            'users' => $users
        ]);
    }

    /**
     * Admin: Update a user's role
     */
    public function updateRole(): void {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = $_POST['id'] ?? null;
            $role = $_POST['role'] ?? null;
            
            if ($id && $role) {
                $userModel = new UserModel();
                if ($userModel->updateUserRole((int)$id, $role)) {
                    header('Location: ' . URLROOT . '/user/adminUsers');
                    exit;
                }
            }
            die("Error updating role.");
        }
    }

    /**
     * Admin: Display the profile edit page for a specific user
     */
    public function edit(int $id): void {
        $userModel = new UserModel();
        $user = $userModel->getUserById($id);

        if (!$user) {
            die("User not found.");
        }

        $this->view('admin/edit_user', [
            'title' => 'Edit User Profile',
            'user'  => $user
        ]);
    }

    /**
     * Admin: Process the user profile update
     */
    public function updateProfile(): void {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $userModel = new UserModel();
            
            $data = [
                'id'         => $_POST['id'],
                'first_name' => $_POST['first_name'],
                'last_name'  => $_POST['last_name'],
                'email'      => $_POST['email']
            ];

            if ($userModel->updateUserDetails($data)) {
                // Redirect back to the user directory upon success
                header('Location: ' . URLROOT . '/user/adminUsers');
                exit;
            } else {
                die("Failed to update profile. Please try again.");
            }
        }
    }
}