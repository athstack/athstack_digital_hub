<?php
// 1. Load Environmental Lifecycle Configurations
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/autoload.php'; // Triggers your full config, controller, & model autoloader

// 2. Parse Incoming URL Segments
$url = $_GET['url'] ?? '';
$url = filter_var(rtrim($url, '/'), FILTER_SANITIZE_URL);
$segments = explode('/', $url);

// 3. Establish Core MVC Defaults
$currentController = 'HomeController';
$currentMethod = 'index';
$params = [];

// 4. Resolve Target Controller Dynamic Routing
if (!empty($segments[0])) {
    $controllerName = ucfirst($segments[0]) . 'Controller';
    if (file_exists(APPROOT . '/controllers/' . $controllerName . '.php')) {
        $currentController = $controllerName;
        unset($segments[0]);
    } else {
        http_response_code(404);
        die("404 Route Target Unresolvable inside Athstack Engine.");
    }
}

// 5. Instantiate Controller Instance (Autoloader handles files instantly behind the scenes)
if (class_exists($currentController)) {
    $controllerInstance = new $currentController();
} else {
    http_response_code(404);
    die("System Error: Controller Class definition missing.");
}

// 6. Resolve Controller Action Target Methods
if (!empty($segments[1])) {
    if (method_exists($controllerInstance, $segments[1])) {
        $currentMethod = $segments[1];
        unset($segments[1]);
    }
}

// 7. Re-index remaining array values into structural params array
$params = $segments ? array_values($segments) : [];

// 8. Capture View Outputs and Inject Universal Theme Wrappers
ob_start();
call_user_func_array([$controllerInstance, $currentMethod], $params);
$pageContent = ob_get_clean();

// Render layouts conditionally (Allows skipping global headers for background AJAX actions)
if (isset($_GET['ajax']) || str_contains($currentMethod, 'api')) {
    echo $pageContent;
} else {
    require_once APPROOT . '/views/includes/header.php';
    echo $pageContent;
    require_once APPROOT . '/views/includes/footer.php';
}