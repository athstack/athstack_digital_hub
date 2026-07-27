<?php
class HomeController extends Controller {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Renders the master home landing view landscape
     */
    public function index(): void {
        // Fetch a few featured products for the home banner showcase
        $stmt = $this->db->query("
            SELECT p.*, c.name as category_name 
            FROM products p 
            JOIN categories c ON p.category_id = c.id 
            WHERE p.status = 'active' 
            LIMIT 3
        ");
        $featuredProducts = $stmt->fetchAll();

        $this->view('home/index', [
            'title' => 'Home - Athstack Digital Hub',
            'featured' => $featuredProducts
        ]);
    }
}