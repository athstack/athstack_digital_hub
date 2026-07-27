-- ====================================================================
-- ATHSTACK DIGITAL HUB SYSTEM SEEDING SCRIPT
-- Target Environment: MySQL / MariaDB Relational Engine
-- ====================================================================

-- 1. SEED SYSTEM CATEGORIES FOR PROCUREMENT INVENTORY
INSERT INTO `categories` (`id`, `name`, `slug`, `created_at`) VALUES
(1, 'Hardware & Accessories', 'hardware-accessories', NOW()),
(2, 'Smart Wearables', 'smart-wearables', NOW()),
(3, 'Power Delivery Components', 'power-delivery', NOW());

-- 2. SEED INITIAL CORE PRODUCT INVENTORY (For views/shop/index.php)
INSERT INTO `products` (`id`, `category_id`, `name`, `description`, `price`, `discount_price`, `rating`, `status`, `created_at`) VALUES
(1, 3, 'Pro GaN 65W Rapid Charger', 'High-performance Gallium Nitride structural power component. Multi-port delivery optimized for premium laptop devices and smart phone hardware architectures.', 45.00, 39.99, 4.80, 'active', NOW()),
(2, 1, 'MX Master 3S Precision Wireless Mouse', 'Ergonomic developer-grade desktop perimeter hardware. Features high-precision 8K DPI tracking and near-silent tactile micro-switches.', 99.00, NULL, 4.95, 'active', NOW()),
(3, 2, 'AeroWatch Cybernetic Edition', 'Next-generation smart wearable featuring low-latency system syncing metrics, notification relays, and persistent tracking displays.', 150.00, 129.00, 4.60, 'active', NOW());

-- 3. SEED DIAGNOSTIC ENGINE SERVICE MATRIX (For views/maintenance/index.php)
INSERT INTO `services` (`id`, `title`, `description`, `base_price`, `icon_class`, `created_at`) VALUES
(1, 'System OS Architecture Restoration', 'Complete clean installation of operating system layouts, secure file mapping recovery, and patch update validation pipelines.', 35.00, 'fa-compact-disc', NOW()),
(2, 'Hardware Module Diagnostic & Clean', 'Full structural cleanup of dust accumulations, component thermal paste re-application, and diagnostic stress analysis.', 50.00, 'fa-microchip', NOW()),
(3, 'Liquid Contamination Decontamination', 'Advanced motherboard ultrasonic bath processing and circuit isolation tracing to counteract active oxidization nodes.', 120.00, 'fa-droplet', NOW()),
(4, 'Structural Layer Mod Replacement', 'Precision installation of replacement modular parts including premium grade laptop display units or battery cells.', 75.00, 'fa-screwdriver-wrench', NOW());

-- 4. SEED ACADEMY TECHNICAL INSTRUCTIONAL MODULES (For controllers/TrainingController.php)
INSERT INTO `training_courses` (`id`, `title`, `description`, `duration_weeks`, `tuition_fee`, `track_type`, `created_at`) VALUES
(1, 'Advanced MVC Framework Engineering', 'Deep-dive into designing scalable full-stack web platforms using custom PHP architecture, advanced PDO, secure cookie tracking engines, and clean relational database engines.', 12, 299.00, 'Full-Stack Track', NOW()),
(2, 'Systems Strategy & Relational Architecture', 'Master structured production optimization. Focuses heavily on structuring highly-scalable databases, indexing keys properly, and deploying micro-routing mechanisms.', 6, 189.00, 'Enterprise Systems', NOW());

-- 5. SEED INITIAL USER NODES (Default Administrative Session Access Point)
-- IMPORTANT: The default password string is cryptographically hashed via BCRYPT using: 'athstack2026'
INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `phone`, `password`, `role`, `status`, `created_at`) VALUES
(1, 'Athanas', 'Kayombo', 'admin@athstack.com', '0782303971', '$2y$10$I6wM3LhBq3vKsc3oR1a6ueM8Ue.k1r9zHms5vUfG3zY9fP5F9g6Sy', 'admin', 'active', NOW());