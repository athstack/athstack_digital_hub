USE athstack_digital_hub;

INSERT INTO users (id, first_name, last_name, email, phone, password, role, status) VALUES
(1, 'Athanas', 'Kayombo', 'versionversion1964@gmail.com', '+255782303971', '$2a$10$9E4FOXKj6O2RhxilFSCmseHcvR3n1CBGVSTqe3l5Gosq3QMUErgOG', 'admin', 'active'),
(2, 'James', 'Mwangi', 'tech1@athstack.com', '+255712345678', '$2a$10$9E4FOXKj6O2RhxilFSCmseHcvR3n1CBGVSTqe3l5Gosq3QMUErgOG', 'technician', 'active'),
(3, 'Sarah', 'Kimani', 'tech2@athstack.com', '+255723456789', '$2a$10$9E4FOXKj6O2RhxilFSCmseHcvR3n1CBGVSTqe3l5Gosq3QMUErgOG', 'technician', 'active'),
(4, 'John', 'Doe', 'customer@athstack.com', '+255734567890', '$2a$10$9E4FOXKj6O2RhxilFSCmseHcvR3n1CBGVSTqe3l5Gosq3QMUErgOG', 'customer', 'active'),
(5, 'Grace', 'Otieno', 'customer2@athstack.com', '+255745678901', '$2a$10$9E4FOXKj6O2RhxilFSCmseHcvR3n1CBGVSTqe3l5Gosq3QMUErgOG', 'customer', 'active');

INSERT INTO product_categories (id, name, slug, description, icon, sort_order) VALUES
(1, 'USB Flash Drives', 'usb-flash-drives', 'High-speed portable storage devices', 'fa-usb', 1),
(2, 'Phone Chargers', 'phone-chargers', 'Fast charging adapters and cables', 'fa-plug', 2),
(3, 'Earbuds', 'earbuds', 'Wireless and wired audio earbuds', 'fa-headphones', 3),
(4, 'Headphones', 'headphones', 'Over-ear and on-ear premium headphones', 'fa-headphones', 4),
(5, 'Smart Watches', 'smart-watches', 'Wearable smart technology', 'fa-clock', 5),
(6, 'Phone Cases', 'phone-cases', 'Protective and stylish phone cases', 'fa-mobile-screen', 6),
(7, 'Screen Protectors', 'screen-protectors', 'Tempered glass and film protectors', 'fa-shield-halved', 7),
(8, 'Memory Cards', 'memory-cards', 'SD and microSD storage cards', 'fa-sd-card', 8),
(9, 'Power Banks', 'power-banks', 'Portable battery packs', 'fa-battery-full', 9),
(10, 'Data Cables', 'data-cables', 'USB-C and Lightning cables', 'fa-plug', 10),
(11, 'Bluetooth Speakers', 'bluetooth-speakers', 'Portable wireless speakers', 'fa-volume-high', 11),
(12, 'Computer Accessories', 'computer-accessories', 'Keyboards, mice, and peripherals', 'fa-keyboard', 12),
(13, 'SSDs', 'ssds', 'Solid state drives', 'fa-hard-drive', 13),
(14, 'Hard Drives', 'hard-drives', 'HDD storage', 'fa-hard-drive', 14),
(15, 'Routers', 'routers', 'WiFi routers and networking', 'fa-wifi', 15);

INSERT INTO services (id, title, slug, category, description, base_price, icon_class) VALUES
(1, 'OS Installation', 'os-installation', 'computer', 'Clean installation of Windows, macOS, or Linux with driver setup.', 45.00, 'fa-compact-disc'),
(2, 'Data Recovery', 'data-recovery', 'computer', 'Recover lost data from failing or damaged drives.', 120.00, 'fa-database'),
(3, 'Hardware Diagnostic', 'hardware-diagnostic', 'computer', 'Complete system diagnostic to identify hardware faults.', 35.00, 'fa-microchip'),
(4, 'Software Troubleshooting', 'software-troubleshooting', 'computer', 'Fix software issues, malware removal, and optimization.', 40.00, 'fa-bug'),
(5, 'Screen Replacement', 'screen-replacement', 'phone', 'Professional screen replacement for all major phone brands.', 85.00, 'fa-mobile-screen-button'),
(6, 'Battery Replacement', 'battery-replacement', 'phone', 'Replace degraded phone batteries with genuine parts.', 40.00, 'fa-battery-full'),
(7, 'Liquid Damage Repair', 'liquid-damage-repair', 'phone', 'Advanced cleaning and repair for water-damaged devices.', 95.00, 'fa-droplet'),
(8, 'Network Configuration', 'network-configuration', 'computer', 'Setup WiFi routers, LAN networks, and firewall rules.', 55.00, 'fa-wifi');

INSERT INTO training_courses (id, instructor_id, title, slug, description, duration, level, price, status) VALUES
(1, 2, 'Web Development Fundamentals', 'web-development-fundamentals', 'Learn HTML, CSS, JavaScript and basic backend development.', '8 weeks', 'Beginner', 199.00, 'active'),
(2, 2, 'Advanced JavaScript and Node.js', 'advanced-javascript-nodejs', 'Master ES6+, async patterns, Express.js, REST APIs, and MySQL.', '10 weeks', 'Intermediate', 299.00, 'active'),
(3, 3, 'Mobile App Development', 'mobile-app-development', 'Build cross-platform mobile applications using React Native.', '12 weeks', 'Intermediate', 349.00, 'active'),
(4, 3, 'Cybersecurity Fundamentals', 'cybersecurity-fundamentals', 'Network security, ethical hacking, and vulnerability assessment.', '6 weeks', 'Beginner', 249.00, 'active');

INSERT INTO products (technician_id, category_id, name, slug, description, price, discount_price, stock_quantity, main_image, rating, total_sales, status, featured, sku) VALUES
(2, 1, 'Kingston DataTraveler 128GB', 'kingston-datatraveler-128gb', 'High-speed USB 3.2 flash drive with 128GB capacity.', 25.99, 19.99, 50, 'usb-kingston.jpg', 4.70, 120, 'active', 1, 'USB-KDT-128'),
(2, 2, 'Anker Nano II 65W Charger', 'anker-nano-ii-65w', 'Compact GaN USB-C charger with 65W power delivery.', 49.99, 39.99, 30, 'charger-anker.jpg', 4.85, 89, 'active', 1, 'CHG-ANK-65W'),
(2, 12, 'Logitech MX Master 3S', 'logitech-mx-master-3s', 'Ergonomic wireless mouse with 8K DPI precision tracking.', 99.99, NULL, 25, 'mouse-mxmaster.jpg', 4.95, 67, 'active', 1, 'MOUSE-LOG-MX3S'),
(2, 13, 'Samsung T7 Portable SSD 1TB', 'samsung-t7-ssd-1tb', 'Ultra-fast portable SSD with read speeds up to 1050 MB/s.', 109.99, 89.99, 20, 'ssd-samsung-t7.jpg', 4.90, 45, 'active', 0, 'SSD-SAM-T7-1TB'),
(3, 3, 'Samsung Galaxy Buds2 Pro', 'samsung-galaxy-buds2-pro', 'True wireless earbuds with active noise cancellation.', 149.99, 129.99, 35, 'earbuds-galaxy.jpg', 4.75, 78, 'active', 1, 'EAR-SAM-BUDS2P'),
(3, 5, 'Apple Watch SE 2nd Gen', 'apple-watch-se-2nd-gen', 'Smartwatch with health tracking and GPS.', 249.99, 229.99, 15, 'watch-apple-se.jpg', 4.80, 56, 'active', 1, 'WATCH-APL-SE2'),
(3, 9, 'Anker PowerCore 20000mAh', 'anker-powercore-20000', 'High-capacity portable power bank with dual USB ports.', 39.99, 34.99, 40, 'powerbank-anker.jpg', 4.65, 92, 'active', 0, 'PWR-ANK-20K'),
(2, 15, 'TP-Link Archer AX73 Router', 'tp-link-archer-ax73', 'WiFi 6 dual-band router with speeds up to 5400 Mbps.', 139.99, 119.99, 12, 'router-tplink.jpg', 4.70, 34, 'active', 0, 'NET-TPL-AX73'),
(3, 11, 'JBL Flip 6 Speaker', 'jbl-flip-6', 'Portable Bluetooth speaker with IP67 waterproof rating.', 79.99, NULL, 28, 'speaker-jbl.jpg', 4.80, 103, 'active', 0, 'SPK-JBL-FL6'),
(2, 4, 'Sony WH-1000XM5 Headphones', 'sony-wh1000xm5', 'Industry-leading noise canceling headphones with 30-hour battery.', 299.99, 279.99, 18, 'headphones-sony.jpg', 4.92, 41, 'active', 1, 'HPH-SNY-XM5'),
(3, 8, 'SanDisk Extreme 256GB microSD', 'sandisk-extreme-256gb', 'V30 A2 microSD card with up to 160 MB/s read speed.', 32.99, 27.99, 60, 'sdcard-sandisk.jpg', 4.75, 88, 'active', 0, 'SD-SDK-256'),
(2, 10, 'Anker USB-C to USB-C Cable 6ft', 'anker-usbc-cable-6ft', 'Braided nylon USB-C cable supporting 100W charging.', 14.99, NULL, 100, 'cable-anker.jpg', 4.60, 156, 'active', 0, 'CBL-ANK-USBC6');

INSERT INTO settings (setting_key, setting_value, setting_group) VALUES
('site_name', 'Athstack Digital Hub', 'general'),
('contact_email', 'info@athstack.com', 'general'),
('contact_phone', '+255 782 303 971', 'general'),
('whatsapp_number', '255782303971', 'general'),
('business_hours', 'Mon-Fri: 08:00 AM - 06:00 PM | Sat: 09:00 AM - 02:00 PM', 'general'),
('currency', 'USD', 'payment'),
('currency_symbol', '$', 'payment');
