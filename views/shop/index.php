<div class="container py-5">
    <!-- Shop Header Section -->
    <div class="row mb-5">
        <div class="col-md-8">
            <span class="text-primary fw-bold text-uppercase tracking-widest small">Hardware Procurement Grid</span>
            <h1 class="fw-bold text-white mt-1">Premium Tech & Accessories Store</h1>
            <p class="text-muted">Equip your digital workspace with high-performance peripherals, chargers, and smart tech devices curated for professionals.</p>
        </div>
    </div>

    <!-- Products Core Layout -->
    <div class="row g-4">
        <?php if (empty($products)): ?>
            <div class="col-12 py-5 text-center text-muted">
                <i class="fa-solid fa-basket-shopping d-block fs-1 mb-3 text-secondary"></i>
                <p class="fs-5 mb-0">Our digital catalog is currently updating. Check back shortly!</p>
            </div>
        <?php else: ?>
            <?php foreach ($products as $product): ?>
                <div class="col-md-6 col-lg-4">
                    <div class="glass-card h-100 d-flex flex-column justify-content-between p-3 border border-secondary transition-hover">
                        <div>
                            <!-- Product Image Container -->
                            <div class="bg-dark rounded-3 mb-3 position-relative" style="height: 220px; overflow: hidden;">
                                
                                <!-- Product Image -->
                                <img src="<?= URLROOT; ?>/uploads/products/<?= htmlspecialchars($product['main_image']); ?>" 
                                     class="img-fluid" 
                                     alt="<?= htmlspecialchars($product['name']); ?>" 
                                     style="object-fit: cover; height: 100%; width: 100%;">

                                <!-- Text Overlay -->
                                <div class="position-absolute top-50 start-50 translate-middle w-100 p-3 text-center">
                                    <span class="badge bg-secondary mb-1 rounded-pill small px-3">
                                        <?= htmlspecialchars($product['category_name'] ?? 'Accessory'); ?>
                                    </span>
                                    <h5 class="text-white fw-bold mb-0 mt-1"><?= htmlspecialchars($product['name']); ?></h5>
                                </div>
                            </div>
                            
                            <!-- Muted, Truncated Product Description -->
                            <div class="mb-3">
                                <small class="text-secondary" style="font-size: 0.85rem; opacity: 0.8;">
                                    <?= htmlspecialchars(substr($product['description'], 0, 30)) . (strlen($product['description']) > 30 ? '...' : ''); ?>
                                </small>
                            </div>
                        </div>

                        <div>
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <div>
                                    <?php if (!empty($product['discount_price'])): ?>
                                        <span class="text-muted text-decoration-line-through small me-2">$<?= number_format($product['price'], 2); ?></span>
                                        <span class="text-white fw-bold fs-5">$<?= number_format($product['discount_price'], 2); ?></span>
                                    <?php else: ?>
                                        <span class="text-white fw-bold fs-5">$<?= number_format($product['price'], 2); ?></span>
                                    <?php endif; ?>
                                </div>
                                <div class="text-warning small">
                                    <i class="fa-solid fa-star"></i> <span class="text-white"><?= number_format($product['rating'] ?? 0, 2); ?></span>
                                </div>
                            </div>

                            <form action="<?= URLROOT; ?>/cart/add" method="POST">
                                <input type="hidden" name="product_id" value="<?= $product['id']; ?>">
                                <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?? ''; ?>">
                                <button type="submit" class="btn btn-premium-primary w-100 btn-sm rounded-pill py-2">
                                    <i class="fa-solid fa-cart-plus me-2"></i>Provision Asset
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>