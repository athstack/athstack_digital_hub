<?php
// System Errors & Performance Logging (Production-Ready)
error_reporting(E_ALL);
ini_set('display_errors', 1); 
ini_set('log_errors', 1);
ini_set('error_log', dirname(__DIR__) . '/logs/php_errors.log');

// Directory Mappings & Base URLs
define('APPROOT', dirname(__DIR__));
define('URLROOT', 'http://localhost/athstack_digital_hub'); // Adjusted to match your directory name
define('SITENAME', 'Athstack Digital Hub');

// Secure State Configurations
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    session_start();
}

// Global CSRF Token Initialization
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

/**
 * Global Cross-Site Scripting (XSS) Sanitization Clean Engine
 * Wraps text elements to neutralize malicious script strings safely.
 */
function sanitize_echo(?string $rawText): string {
    return htmlspecialchars($rawText ?? '', ENT_QUOTES, 'UTF-8');
}