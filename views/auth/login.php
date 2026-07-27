<div class="container py-5 my-5">
    <div class="row justify-content-center">
        <div class="col-md-6 col-lg-5">
            <!-- System Status Messages Tray Container -->
            <?php if (!empty($error)): ?>
                <div class="alert alert-danger bg-dark border-danger text-danger small mb-4" role="alert">
                    <i class="fa-solid fa-triangle-exclamation me-2"></i><?= htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <div class="glass-card p-4 p-md-5 border border-secondary">
                <div class="text-center mb-4">
                    <span class="text-primary fw-bold text-uppercase tracking-widest small">Identity Gate</span>
                    <h3 class="fw-bold text-white mt-1">Access Authorization</h3>
                    <p class="text-muted small">Establish a valid session token to sync profile logs.</p>
                </div>

                <form action="<?= URLROOT; ?>/auth/login" method="POST">
                    <!-- Security Anti-Exploit Guard -->
                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token']; ?>">

                    <div class="mb-3">
                        <label class="form-label text-muted small">Registered Email Node</label>
                        <div class="input-group">
                            <span class="input-group-text bg-dark border-secondary text-muted"><i class="fa-solid fa-envelope"></i></span>
                            <input type="email" name="email" class="form-control bg-dark border-secondary text-white" placeholder="name@domain.com" required autocomplete="email">
                        </div>
                    </div>

                    <div class="mb-4">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="form-label text-muted small mb-0">Secure Access Password</label>
                            <a href="<?= URLROOT; ?>/auth/forgot" class="text-primary small text-decoration-none">Reset Variable?</a>
                        </div>
                        <div class="input-group">
                            <span class="input-group-text bg-dark border-secondary text-muted"><i class="fa-solid fa-lock"></i></span>
                            <input type="password" name="password" class="form-control bg-dark border-secondary text-white" placeholder="••••••••" required autocomplete="current-password">
                        </div>
                    </div>

                    <button type="submit" class="btn btn-premium-primary w-100 rounded-pill py-2 mb-3">
                        <i class="fa-solid fa-right-to-bracket me-2"></i>Authenticate Session
                    </button>
                    
                    <div class="text-center">
                        <span class="text-muted small">New platform node? </span>
                        <a href="<?= URLROOT; ?>/auth/register" class="text-primary small text-decoration-none fw-bold">Register Identity</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>