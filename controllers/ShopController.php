<?php
class ShopController extends Controller {
    private ProductModel $productModel;

    public function __construct() {
        $this->productModel = new ProductModel();
    }

    public function index(): void {
        // Fetch query criteria metrics safely
        $category = $_GET['category'] ?? null;
        $search = $_GET['search'] ?? null;
        $minPrice = isset($_GET['min_price']) ? (float)$_GET['min_price'] : 0.00;
        $maxPrice = isset($_GET['max_price']) ? (float)$_GET['max_price'] : 99999.00;
        
        $products = $this->productModel->getFilteredProducts($category, $search, $minPrice, $maxPrice);
        $categories = $this->productModel->getCategories('product');

        $this->view('shop/index', [
            'title' => 'Shop Premium Accessories',
            'products' => $products,
            'categories' => $categories,
            'activeCategory' => $category,
            'searchQuery' => $search
        ]);
    }

    public function details(string $slug = ''): void {
        if (empty($slug)) {
            header('Location: ' . URLROOT . '/shop');
            exit;
        }

        $product = $this->productModel->getBySlug($slug);
        if (!$product) {
            die("Target product asset mapping error.");
        }

        $gallery = $this->productModel->getGalleryImages($product['id']);

        $this->view('shop/details', [
            'title' => $product['name'],
            'product' => $product,
            'gallery' => $gallery
        ]);
    }

    // Handle AJAX-based dynamic search requests
    public function apiSearch(): void {
        $search = $_GET['term'] ?? '';
        if (strlen($search) < 2) {
            $this->jsonResponse([]);
        }
        $results = $this->productModel->getSearchSuggestions($search);
        $this->jsonResponse($results);
    }
}