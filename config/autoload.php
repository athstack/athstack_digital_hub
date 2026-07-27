<?php
spl_autoload_register(function (string $className) {
    // Standardize the base directory path
    $baseDir = dirname(__DIR__);

    // Core system directories to crawl for class declarations
    $directories = [
        $baseDir . DIRECTORY_SEPARATOR . 'config',
        $baseDir . DIRECTORY_SEPARATOR . 'controllers',
        $baseDir . DIRECTORY_SEPARATOR . 'models'
    ];

    foreach ($directories as $directory) {
        $file = $directory . DIRECTORY_SEPARATOR . $className . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});