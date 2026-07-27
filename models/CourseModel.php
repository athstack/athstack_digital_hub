<?php
class CourseModel {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Fetch all courses for the Admin dashboard
     */
    public function getAllCourses(): array {
        $stmt = $this->db->query("SELECT * FROM training_courses ORDER BY id DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Fetch only active courses for public display
     */
    public function getActiveCourses(): array {
        $stmt = $this->db->query("SELECT * FROM training_courses WHERE status = 'active' ORDER BY id ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Fetch course by identifier
     */
    public function getCourseById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM training_courses WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $course = $stmt->fetch(PDO::FETCH_ASSOC);
        return $course ?: null;
    }

    /**
     * Save a new training module
     */
    public function addCourse(array $data): bool {
        $sql = "INSERT INTO training_courses (title, slug, description, duration, status, level, price, instructor, image_path) 
                VALUES (:title, :slug, :description, :duration, :status, :level, :price, :instructor, :image_path)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'title'       => $data['title'],
            'slug'        => $data['slug'],
            'description' => $data['description'],
            'duration'    => $data['duration'],
            'status'      => $data['status'],
            'level'       => $data['level'],
            'price'       => $data['price'],
            'instructor'  => $data['instructor'],
            'image_path'  => $data['image_path']
        ]);
    }

    /**
     * Update an existing module
     */
    public function updateCourse(array $data, int $id): bool {
        $sql = "UPDATE training_courses 
                SET title = :title, 
                    description = :description, 
                    duration = :duration, 
                    status = :status, 
                    level = :level, 
                    price = :price 
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'id'          => $id,
            'title'       => $data['title'],
            'description' => $data['description'],
            'duration'    => $data['duration'],
            'status'      => $data['status'],
            'level'       => $data['level'],
            'price'       => $data['price']
        ]);
    }

    /**
     * Delete a module
     */
    public function deleteCourse(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM training_courses WHERE id = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Register a user for a specific course with a duplicate check
     */
    public function enrollUser(int $userId, int $courseId): bool {
        // 1. Check if the registration already exists
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM course_registrations WHERE user_id = ? AND course_id = ?");
        $stmt->execute([$userId, $courseId]);
        
        if ($stmt->fetchColumn() > 0) {
            return true; // Already registered, no need to insert again
        }

        // 2. If not, insert the new registration
        $stmt = $this->db->prepare("
            INSERT INTO course_registrations (user_id, course_id, payment_status) 
            VALUES (?, ?, 'unpaid')
        ");
        
        return $stmt->execute([$userId, $courseId]);
    }
}