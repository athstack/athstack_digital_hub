<?php
class AdminController extends Controller {

    public function __construct() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        
        if (!isset($_SESSION['user_role']) || !in_array(strtolower($_SESSION['user_role']), ['admin', 'super_admin'])) {
            header('Location: ' . URLROOT . '/auth/login');
            exit;
        }
    }

    public function index(): void {
        $userModel = new UserModel;
        $metrics = [
            'revenue'          => 0.00, 
            'pending_orders'   => 0, 
            'pending_bookings' => 0, 
            'total_clients'    => $userModel->getTotalUsers() 
        ];

        $this->view('admin/dashboard', [
            'title'   => 'Admin Control Matrix', 
            'metrics' => $metrics
        ]);
    }

    // --- Training Academy Methods ---

    public function training(): void {
        $courseModel = new CourseModel;
        $modules = $courseModel->getAllCourses();
        
        $this->view('admin/training', [
            'title'   => 'Training Academy Modules - Athstack',
            'modules' => $modules
        ]);
    }

    public function addModule(): void {
        if ($_SERVER['REQUEST_METHOD'] == 'POST') {
            $courseModel = new CourseModel;
            
            $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $_POST['title'])));
            
            $data = [
                'title'       => $_POST['title'],
                'slug'        => $slug,
                'description' => $_POST['description'],
                'duration'    => $_POST['duration'],
                'status'      => 'draft',
                'level'       => $_POST['level'] ?? 'Beginner',
                'price'       => $_POST['price'] ?? 0.00,
                'instructor'  => $_POST['instructor'] ?? 'Athanas Kayombo',
                'image_path'  => $_POST['image_path'] ?? 'default.jpg'
            ];
            
            $courseModel->addCourse($data);
            header('Location: ' . URLROOT . '/admin/training');
            exit;
        }
        $this->view('admin/add_module', ['title' => 'Add Training Module']);
    }

    public function editModule($id = null): void {
        if (!$id) {
            header('Location: ' . URLROOT . '/admin/training');
            exit;
        }

        $courseModel = new CourseModel;

        if ($_SERVER['REQUEST_METHOD'] == 'POST') {
            $data = [
                'title'       => $_POST['title'],
                'description' => $_POST['description'],
                'duration'    => $_POST['duration'],
                'status'      => $_POST['status'],
                'level'       => $_POST['level'],
                'price'       => $_POST['price']
            ];
            
            $courseModel->updateCourse($data, (int)$id);
            header('Location: ' . URLROOT . '/admin/training');
            exit;
        }

        $course = $courseModel->getCourseById((int)$id);
        $this->view('admin/edit_module', [
            'title'  => 'Edit Training Module',
            'course' => $course
        ]);
    }

    public function deleteModule($id): void {
        $courseModel = new CourseModel;
        $courseModel->deleteCourse((int)$id);
        header('Location: ' . URLROOT . '/admin/training');
        exit;
    }

    // --- Existing Operational Control Methods ---

    public function bookings(): void {
        $maintenanceModel = new MaintenanceModel;
        $bookings = $maintenanceModel->getAllBookings(); 
        
        $this->view('admin/bookings', [
            'title'    => 'Maintenance Queue - Athstack',
            'bookings' => $bookings
        ]);
    }

    public function updateBookingStatus(): void {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (!isset($_POST['csrf_token']) || !$this->validateCSRF($_POST['csrf_token'])) {
                die("CSRF token validation failed.");
            }

            $id = $_POST['id'] ?? null;
            $status = $_POST['status'] ?? null;

            if ($id && $status) {
                $maintenanceModel = new MaintenanceModel();
                $maintenanceModel->updateBookingStatus((int)$id, $status);
            }
        }
        header('Location: ' . URLROOT . '/admin/bookings');
        exit;
    }

    public function users(): void {
        $userModel = new UserModel;
        $users = $userModel->getAllUsers(); 
        
        $this->view('admin/users', [
            'title' => 'User Directories - Athstack',
            'users' => $users
        ]);
    }

    public function inbox(): void {
        $contactModel = new Contact;
        $messages = $contactModel->getMessages();
        
        $this->view('admin/inbox', [
            'title'    => 'Contact Inbox - Athstack',
            'messages' => $messages
        ]);
    }

    // --- Product/Inventory Management ---

    public function products(): void {
        $productModel = new ProductModel;
        if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['add_product'])) {
            $imageName = 'default.jpg';
            if (!empty($_FILES['product_image']['name'])) {
                $imageName = time() . '_' . basename($_FILES['product_image']['name']);
                move_uploaded_file($_FILES['product_image']['tmp_name'], 'uploads/products/' . $imageName);
            }

            $baseSlug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $_POST['name'])));
            $slug = $productModel->slugExists($baseSlug) ? $baseSlug . '-' . time() : $baseSlug;

            $data = [
                'category_id'    => $_POST['category_id'],
                'name'           => $_POST['name'],
                'slug'           => $slug,
                'description'    => $_POST['description'],
                'price'          => $_POST['price'],
                'stock_quantity' => $_POST['stock_quantity'],
                'main_image'     => $imageName
            ];
            
            $productModel->addProduct($data);
            header('Location: ' . URLROOT . '/admin/products');
            exit;
        }

        $products = $productModel->getAllProducts();
        $this->view('admin/products', [
            'title' => 'Manage Inventory - Athstack', 
            'products' => $products
        ]);
    }

    public function editProduct($id): void {
        $productModel = new ProductModel;
        if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['update_product'])) {
            $imageName = $_POST['existing_image'] ?? 'default.jpg'; 
            if (!empty($_FILES['product_image']['name'])) {
                $imageName = time() . '_' . basename($_FILES['product_image']['name']);
                move_uploaded_file($_FILES['product_image']['tmp_name'], 'uploads/products/' . $imageName);
            }

            $data = [
                'category_id'    => $_POST['category_id'],
                'name'           => $_POST['name'],
                'description'    => $_POST['description'],
                'price'          => $_POST['price'],
                'stock_quantity' => $_POST['stock_quantity'],
                'main_image'     => $imageName
            ];
            
            $productModel->updateProduct($data, (int)$id);
            header('Location: ' . URLROOT . '/admin/products');
            exit;
        }

        $product = $productModel->getProductById((int)$id);
        $this->view('admin/edit_product', [
            'title'   => 'Edit Product - Athstack',
            'product' => $product
        ]);
    }

    public function deleteProduct($id): void {
        $productModel = new ProductModel;
        $productModel->deleteProduct((int)$id);
        header('Location: ' . URLROOT . '/admin/products');
        exit;
    }
}