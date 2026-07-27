<?php
class UserModel {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Find an existing user by their email address
     */
    public function findUserByEmail(string $email): ?array {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Register a new customer into the database architecture
     */
    public function register(array $data): bool {
        $stmt = $this->db->prepare("
            INSERT INTO users (first_name, last_name, email, phone, password, role, status) 
            VALUES (?, ?, ?, ?, ?, 'customer', 'active')
        ");
        
        return $stmt->execute([
            $data['first_name'],
            $data['last_name'],
            $data['email'],
            $data['phone'],
            $data['password']
        ]);
    }

    /**
     * Get total number of registered users
     */
    public function getTotalUsers(): int {
        $stmt = $this->db->query("SELECT COUNT(*) FROM users");
        return (int) $stmt->fetchColumn();
    }

    /**
     * Fetch all users for the Directory
     */
    public function getAllUsers(): array {
        $stmt = $this->db->query("SELECT id, first_name, last_name, email, phone, role, status FROM users ORDER BY id DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update user role (admin, customer, or seller)
     */
    public function updateUserRole(int $id, string $role): bool {
        $stmt = $this->db->prepare("UPDATE users SET role = ? WHERE id = ?");
        return $stmt->execute([$role, $id]);
    }

    /**
     * Fetch a single user by ID
     */
    public function getUserById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Update user details (First Name, Last Name, Email)
     */
    public function updateUserDetails(array $data): bool {
        $stmt = $this->db->prepare("
            UPDATE users 
            SET first_name = ?, last_name = ?, email = ? 
            WHERE id = ?
        ");
        
        return $stmt->execute([
            $data['first_name'],
            $data['last_name'],
            $data['email'],
            $data['id']
        ]);
    }

    /**
     * Fetch courses registered by a specific user
     */
    public function getUserRegisteredCourses(int $userId): array {
        $stmt = $this->db->prepare("
            SELECT training_courses.* 
            FROM training_courses 
            JOIN course_registrations ON training_courses.id = course_registrations.course_id 
            WHERE course_registrations.user_id = ?
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}