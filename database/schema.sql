CREATE DATABASE IF NOT EXISTS `athstack_digital_hub` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `athstack_digital_hub`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('customer', 'admin', 'super_admin') NOT NULL DEFAULT 'customer',
    `status` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `type` ENUM('product', 'service', 'course') NOT NULL DEFAULT 'product',
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Products Table
CREATE TABLE IF NOT EXISTS `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(150) NOT NULL UNIQUE,
    `description` TEXT NOT NULL,
    `price` DECIMAL(10,2) NOT NULL,
    `discount_price` DECIMAL(10,2) DEFAULT NULL,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `main_image` VARCHAR(255) NOT NULL,
    `rating` DECIMAL(3,2) DEFAULT 5.00,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
    INDEX `idx_product_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Product Images (Gallery)
CREATE TABLE IF NOT EXISTS `product_images` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `image_path` VARCHAR(255) NOT NULL,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Maintenance Services Table
CREATE TABLE IF NOT EXISTS `services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(150) NOT NULL,
    `category` ENUM('computer', 'phone') NOT NULL,
    `description` TEXT NOT NULL,
    `base_price` DECIMAL(10,2) NOT NULL,
    `icon_class` VARCHAR(50) DEFAULT 'fa-tools'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Service Bookings Table
CREATE TABLE IF NOT EXISTS `bookings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `service_id` INT NOT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_email` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `appointment_date` DATETIME NOT NULL,
    `device_details` TEXT NOT NULL,
    `status` ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =========================================================
-- SEED DATA (For immediate testing/rendering)
-- =========================================================

-- Insert Base Categories
INSERT INTO `categories` (`id`, `name`, `slug`, `type`, `description`) VALUES
(1, 'Phone Accessories', 'phone-accessories', 'product', 'Premium gear for mobile units'),
(2, 'Computer Accessories', 'computer-accessories', 'product', 'High performance computing peripherals'),
(3, 'Smart Watches', 'smart-watches', 'product', 'Wearable digital ecosystems');

-- Insert Sample Products
INSERT INTO `products` (`category_id`, `name`, `slug`, `description`, `price`, `discount_price`, `stock_quantity`, `main_image`, `rating`) VALUES
(1, 'Anker PowerPort 65W Charger', 'anker-powerport-65w', 'Ultra-fast GaN tech wall charger.', 49.99, 39.99, 25, 'charger65w.png', 4.8),
(2, 'MX Master 3S Wireless Mouse', 'mx-master-3s', 'Ergonomic precision speed mouse.', 99.99, NULL, 15, 'mxmaster3s.png', 4.9),
(3, 'CyberWatch Series X', 'cyberwatch-series-x', 'AMOLED always-on tracking array wearable.', 199.99, 179.99, 10, 'cyberwatch.png', 4.5);

-- Insert Sample Maintenance Services
INSERT INTO `services` (`title`, `category`, `description`, `base_price`, `icon_class`) VALUES
('OS Clean Installation', 'computer', 'Fresh installations of optimized Windows or macOS setups.', 45.00, 'fa-compact-disc'),
('Hardware Dynamic Recovery', 'computer', 'Deep data salvage from compromised or failing HDDs/SSDs.', 120.00, 'fa-database'),
('Premium Screen Replacement', 'phone', 'OLED/LCD display module swaps with genuine hardware.', 85.00, 'fa-mobile-screen-button'),
('Battery Structural Swaps', 'phone', 'Degraded power cell replacements.', 40.00, 'fa-battery-full');