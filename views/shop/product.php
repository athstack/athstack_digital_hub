<div class="container py-5">
    <div class="row mb-4">
        <div class="col-12">
            <a href="<?= URLROOT; ?>/shop" class="text-muted text-decoration-none small">
                <i class="fa-solid fa-arrow-left me-2"></i>Back to Hardware Inventory
            </a>
        </div>
    </div>

    <div class="row g-5">
        <!-- Asset Visual Staging Node -->
        <div class="col-md-6">
            <div class="glass-card p-5 text-center border border-secondary bg-dark-smooth">
                <i class="fa-solid fa-microchip text-primary display-1 py-5 opacity-50"></i>
            </div>
        </div>
        
        <!-- Asset Procurement Description Matrix -->
        <div class="col-md-6">
            <span class="badge bg-primary-subtle text-primary border border-primary-subtle mb-2"><?= htmlspecialchars($data['product']['category_name'] ?? 'Component'); ?></span>
            <h1 class="fw-bold text-white mb-2"><?= htmlspecialchars($data['product']['name'] ?? 'Product Asset'); ?></h1>
            
            <div class="fs-3 fw-bold text-success mb-4">
                $<?= htmlspecialchars($data['product']['price'] ?? '0.00'); ?>
            </div>
            
            <p class="text-muted mb-4"><?= htmlspecialchars($data['product']['description'] ?? 'No resource breakdown provided.'); ?></p>
            
            <form action="<?= URLROOT; ?>/cart/add" method="POST" class="mt-4">
                <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?? ''; ?>">
                <input type="hidden" name="product_id" value="<?= $data['product']['id'] ?? 0; ?>">
                
                <div class="d-flex gap-3 align-items-center">
                    <div class="input-group styling-quantity" style="width: 130px;">
                        <input type="number" name="quantity" class="form-control bg-dark border-secondary text-white text-center" value="1" min="1">
                    </div>
                    <button type="submit" class="btn btn-premium-primary rounded-pill px-4 flex-grow-1 py-2">
                        <i class="fa-solid fa-cart-plus me-2"></i>Stage to Procurement Cart
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>