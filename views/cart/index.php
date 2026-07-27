<div class="container py-5">
    <div class="row mb-4">
        <div class="col-12">
            <span class="text-primary fw-bold text-uppercase tracking-widest small">Procurement Pipeline</span>
            <h1 class="fw-bold text-white mt-1">Staged Assets Cart</h1>
        </div>
    </div>

    <div class="glass-card p-4 border border-secondary text-center py-5">
        <?php if (empty($cart)): ?>
            <div class="py-4 text-muted">
                <i class="fa-solid fa-cart-flatbed d-block fs-1 mb-3 text-secondary"></i>
                <p class="fs-5 mb-3">Your staging matrix is currently empty.</p>
                <a href="<?= URLROOT; ?>/shop" class="btn btn-premium-primary btn-sm rounded-pill px-4">Browse Hardware Store</a>
            </div>
        <?php else: ?>
            <!-- Active cart item loop goes here later -->
            <p class="text-white">Active assets detected in staging session.</p>
        <?php endif; ?>
    </div>
</div>