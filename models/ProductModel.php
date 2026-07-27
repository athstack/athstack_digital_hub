<?php
class ProductModel {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    // --- EXISTING METHODS ---
    public function getFilteredProducts(?string $categorySlug, ?string $search, float $minPrice, float $maxPrice): array {
        $sql = "SELECT p.*, c.name as category_name FROM products p 
                JOIN categories c ON p.category_id = c.id 
                WHERE p.status = 'active' AND p.price BETWEEN :min_price AND :max_price";
        
        if ($categorySlug) { $sql .= " AND c.slug = :category_slug"; }
        if ($search) { $sql .= " AND (p.name LIKE :search OR p.description LIKE :search)"; }

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':min_price', $minPrice);
        $stmt->bindValue(':max_price', $maxPrice);
        if ($categorySlug) { $stmt->bindValue(':category_slug', $categorySlug); }
        if ($search) { $stmt->bindValue(':search', "%$search%"); }
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getCategories(string $type): array {
        $stmt = $this->db->prepare("SELECT * FROM categories WHERE type = ?");
        $stmt->execute([$type]);
        return $stmt->fetchAll();
    }

    public function getBySlug(string $slug): ?array {
        $stmt = $this->db->prepare("SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.slug = ? AND p.status = 'active'");
        $stmt->execute([$slug]);
        return $stmt->fetch() ?: null;
    }

    public function getGalleryImages(int $productId): array {
        $stmt = $this->db->prepare("SELECT image_path FROM product_images WHERE product_id = ?");
        $stmt->execute([$productId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function getSearchSuggestions(string $term): array {
        $stmt = $this->db->prepare("SELECT name, slug, price, main_image FROM products WHERE name LIKE ? AND status = 'active' LIMIT 5");
        $stmt->execute(["%$term%"]);
        return $stmt->fetchAll();
    }

    // --- FULL CRUD METHODS ---
    
    // NEW METHOD ADDED HERE
    public function slugExists(string $slug): bool {
        $stmt = $this->db->prepare("SELECT id FROM products WHERE slug = :slug");
        $stmt->execute([':slug' => $slug]);
        return $stmt->rowCount() > 0;
    }

    public function getAllProducts(): array {
        $stmt = $this->db->query("SELECT * FROM products ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function getProductById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function addProduct(array $data): bool {
        $sql = "INSERT INTO products (category_id, name, slug, description, price, stock_quantity, main_image) 
                VALUES (:category_id, :name, :slug, :description, :price, :stock_quantity, :main_image)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':category_id'    => $data['category_id'],
            ':name'           => $data['name'],
            ':slug'           => $data['slug'],
            ':description'    => $data['description'],
            ':price'          => $data['price'],
            ':stock_quantity' => $data['stock_quantity'],
            ':main_image'     => $data['main_image']
        ]);
    }

    public function updateProduct(array $data, int $id): bool {
        $sql = "UPDATE products SET category_id = :category_id, name = :name, slug = :slug, 
                description = :description, price = :price, stock_quantity = :stock_quantity" . 
                ($data['main_image'] ? ", main_image = :main_image" : "") . 
                " WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        $params = [
            ':category_id'    => $data['category_id'],
            ':name'           => $data['name'],
            ':slug'           => $data['slug'],
            ':description'    => $data['description'],
            ':price'          => $data['price'],
            ':stock_quantity' => $data['stock_quantity'],
            ':id'             => $id
        ];
        if ($data['main_image']) $params[':main_image'] = $data['main_image'];
        
        return $stmt->execute($params);
    }

    public function deleteProduct(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM products WHERE id = ?");
        return $stmt->execute([$id]);
    }
}