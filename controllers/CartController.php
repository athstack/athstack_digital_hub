<?php
class CartController extends Controller {
    
    public function __construct() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (!isset($_SESSION['cart'])) {
            $_SESSION['cart'] = [];
        }
    }

    /**
     * Render the active shopping cart view state
     */
    public function index(): void {
        $this->view('cart/index', [
            'title' => 'Your Shopping Cart Procurement Matrix - Athstack',
            'cart' => $_SESSION['cart']
        ]);
    }

    /**
     * Adds an accessory item node into the session cart matrix
     */
    public function add(): void {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
                die('Security violation: Invalid CSRF token context.');
            }

            $productId = (int)$_POST['product_id'];

            if ($productId > 0) {
                // If the product exists in the cart, increment quantity
                if (isset($_SESSION['cart'][$productId])) {
                    $_SESSION['cart'][$productId]++;
                } else {
                    $_SESSION['cart'][$productId] = 1;
                }
            }
        }
        header('Location: ' . URLROOT . '/shop');
        exit;
    }
}