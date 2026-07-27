-- ================================================================
-- ATHSTACK DIGITAL HUB — COMPLETE DATABASE SCHEMA
-- MySQL 8+ | InnoDB | utf8mb4_unicode_ci
-- ================================================================

DROP DATABASE IF EXISTS `athstack_digital_hub`;
CREATE DATABASE `athstack_digital_hub` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `athstack_digital_hub`;

-- ================================================================
-- 1. USERS
-- ================================================================
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `phone` VARCHAR(20) DEFAULT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('customer','technician','admin','super_admin') NOT NULL DEFAULT 'customer',
    `status` ENUM('active','suspended','pending') NOT NULL DEFAULT 'active',
    `avatar` VARCHAR(500) DEFAULT NULL,
    `bio` TEXT DEFAULT NULL,
    `specialization` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB;

-- ================================================================
-- 2. PRODUCT CATEGORIES
-- ================================================================
CREATE TABLE `product_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL UNIQUE,
    `description` TEXT DEFAULT NULL,
    `icon` VARCHAR(100) DEFAULT NULL,
    `sort_order` INT DEFAULT 0,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ================================================================
-- 3. PRODUCTS
-- ================================================================
CREATE TABLE `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `technician_id` INT DEFAULT NULL,
    `category_id` INT DEFAULT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL UNIQUE,
    `description` TEXT DEFAULT NULL,
    `price` DECIMAL(10,2) NOT NULL,
    `discount_price` DECIMAL(10,2) DEFAULT NULL,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `main_image` VARCHAR(500) DEFAULT NULL,
    `sku` VARCHAR(100) DEFAULT NULL,
    `rating` DECIMAL(3,2) DEFAULT 0.00,
    `total_sales` INT DEFAULT 0,
    `status` ENUM('active','inactive','out_of_stock') NOT NULL DEFAULT 'active',
    `featured` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE SET NULL,
    INDEX `idx_products_technician` (`technician_id`),
    INDEX `idx_products_category` (`category_id`),
    INDEX `idx_products_status` (`status`),
    INDEX `idx_products_featured` (`featured`),
    INDEX `idx_products_slug` (`slug`)
) ENGINE=InnoDB;

-- ================================================================
-- 4. PRODUCT IMAGES (Gallery)
-- ================================================================
CREATE TABLE `product_images` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `image_path` VARCHAR(500) NOT NULL,
    `sort_order` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    INDEX `idx_pimg_product` (`product_id`)
) ENGINE=InnoDB;

-- ================================================================
-- 5. SERVICES
-- ================================================================
CREATE TABLE `services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL UNIQUE,
    `category` ENUM('computer','phone') NOT NULL,
    `description` TEXT DEFAULT NULL,
    `base_price` DECIMAL(10,2) NOT NULL,
    `icon_class` VARCHAR(100) DEFAULT 'fa-tools',
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ================================================================
-- 6. REPAIR REQUESTS
-- ================================================================
CREATE TABLE `repair_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `technician_id` INT DEFAULT NULL,
    `service_id` INT DEFAULT NULL,
    `reference_number` VARCHAR(50) NOT NULL UNIQUE,
    `customer_name` VARCHAR(255) NOT NULL,
    `customer_email` VARCHAR(255) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `device_type` VARCHAR(100) NOT NULL,
    `device_brand` VARCHAR(100) DEFAULT NULL,
    `device_model` VARCHAR(100) DEFAULT NULL,
    `device_serial` VARCHAR(255) DEFAULT NULL,
    `issue_description` TEXT NOT NULL,
    `diagnostic_notes` TEXT DEFAULT NULL,
    `estimated_cost` DECIMAL(10,2) DEFAULT NULL,
    `actual_cost` DECIMAL(10,2) DEFAULT NULL,
    `appointment_date` DATETIME DEFAULT NULL,
    `status` ENUM('pending','assigned','diagnosing','in_repair','awaiting_parts','completed','cancelled') NOT NULL DEFAULT 'pending',
    `priority` ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL,
    INDEX `idx_repair_user` (`user_id`),
    INDEX `idx_repair_tech` (`technician_id`),
    INDEX `idx_repair_status` (`status`),
    INDEX `idx_repair_ref` (`reference_number`)
) ENGINE=InnoDB;

-- ================================================================
-- 7. REPAIR UPDATES (Timeline)
-- ================================================================
CREATE TABLE `repair_updates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `repair_id` INT NOT NULL,
    `updated_by` INT DEFAULT NULL,
    `status` VARCHAR(50) NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `image_path` VARCHAR(500) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`repair_id`) REFERENCES `repair_requests`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_rup_repair` (`repair_id`)
) ENGINE=InnoDB;

-- ================================================================
-- 8. ORDERS
-- ================================================================
CREATE TABLE `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `order_reference` VARCHAR(50) NOT NULL UNIQUE,
    `total_amount` DECIMAL(10,2) NOT NULL,
    `shipping_address` TEXT DEFAULT NULL,
    `payment_method` VARCHAR(50) DEFAULT 'cod',
    `payment_status` ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
    `order_status` ENUM('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    INDEX `idx_orders_user` (`user_id`),
    INDEX `idx_orders_ref` (`order_reference`),
    INDEX `idx_orders_status` (`order_status`)
) ENGINE=InnoDB;

-- ================================================================
-- 9. ORDER ITEMS
-- ================================================================
CREATE TABLE `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `technician_id` INT DEFAULT NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `product_image` VARCHAR(500) DEFAULT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10,2) NOT NULL,
    `total_price` DECIMAL(10,2) NOT NULL,
    `status` ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_oitems_order` (`order_id`),
    INDEX `idx_oitems_product` (`product_id`),
    INDEX `idx_oitems_tech` (`technician_id`)
) ENGINE=InnoDB;

-- ================================================================
-- 10. TRAINING COURSES
-- ================================================================
CREATE TABLE `training_courses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `instructor_id` INT DEFAULT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL UNIQUE,
    `description` TEXT DEFAULT NULL,
    `duration` VARCHAR(100) DEFAULT NULL,
    `level` ENUM('Beginner','Intermediate','Advanced') NOT NULL DEFAULT 'Beginner',
    `price` DECIMAL(10,2) NOT NULL,
    `image_path` VARCHAR(500) DEFAULT NULL,
    `status` ENUM('active','draft','archived') NOT NULL DEFAULT 'draft',
    `max_enrollments` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_course_status` (`status`),
    INDEX `idx_course_slug` (`slug`)
) ENGINE=InnoDB;

-- ================================================================
-- 11. ENROLLMENTS
-- ================================================================
CREATE TABLE `enrollments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `course_id` INT NOT NULL,
    `enrollment_status` ENUM('enrolled','completed','dropped') NOT NULL DEFAULT 'enrolled',
    `payment_status` ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
    `progress` INT DEFAULT 0,
    `enrolled_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `completed_at` TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY `uniq_enrollment` (`user_id`, `course_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`course_id`) REFERENCES `training_courses`(`id`) ON DELETE CASCADE,
    INDEX `idx_enroll_user` (`user_id`),
    INDEX `idx_enroll_course` (`course_id`)
) ENGINE=InnoDB;

-- ================================================================
-- 12. REVIEWS
-- ================================================================
CREATE TABLE `reviews` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `product_id` INT DEFAULT NULL,
    `technician_id` INT DEFAULT NULL,
    `repair_id` INT DEFAULT NULL,
    `rating` INT NOT NULL,
    `comment` TEXT DEFAULT NULL,
    `type` ENUM('product','technician','service') NOT NULL,
    `status` ENUM('active','hidden','flagged') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`repair_id`) REFERENCES `repair_requests`(`id`) ON DELETE SET NULL,
    INDEX `idx_reviews_product` (`product_id`),
    INDEX `idx_reviews_tech` (`technician_id`),
    INDEX `idx_reviews_type` (`type`)
) ENGINE=InnoDB;

-- ================================================================
-- 13. NOTIFICATIONS
-- ================================================================
CREATE TABLE `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) DEFAULT NULL,
    `link` VARCHAR(500) DEFAULT NULL,
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_notif_user` (`user_id`),
    INDEX `idx_notif_read` (`is_read`)
) ENGINE=InnoDB;

-- ================================================================
-- 14. CONTACT MESSAGES
-- ================================================================
CREATE TABLE `contact_messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `subject` VARCHAR(255) DEFAULT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('unread','read','replied') NOT NULL DEFAULT 'unread',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ================================================================
-- 15. SETTINGS
-- ================================================================
CREATE TABLE `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(255) NOT NULL UNIQUE,
    `setting_value` TEXT DEFAULT NULL,
    `setting_group` VARCHAR(100) DEFAULT 'general',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ================================================================
-- 16. WISHLISTS
-- ================================================================
CREATE TABLE `wishlists` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_wishlist` (`user_id`, `product_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
