<?php
abstract class Controller {
    
    // Renders complete layout injecting specified page views
    protected function view(string $view, array $data = []): void {
        $viewFile = APPROOT . "/views/{$view}.php";
        if (!file_exists($viewFile)) {
            die("Target view resource error: '{$view}' cannot be found.");
        }
        
        // Extract data context array elements directly to variables
        extract($data);
        
        // Require global app wrapper layouts
        require_once APPROOT . '/views/includes/header.php';
        require_once $viewFile;
        require_once APPROOT . '/views/includes/footer.php';
    }

    // Handles JSON API responses cleanly
    protected function jsonResponse(array $data, int $statusCode = 200): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);
        exit;
    }

    // Dynamic Input Validation Sanitation Filter
    protected function sanitizeInput(array $data): array {
        $sanitized = [];
        foreach ($data as $key => $value) {
            $sanitized[$key] = is_string($value) ? htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8') : $value;
        }
        return $sanitized;
    }

    // Cross-Site Request Forgery Protection Token Validation
    protected function validateCSRF(string $token): bool {
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }
}