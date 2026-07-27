<div class="container py-5 my-5">
    <div class="row justify-content-center">
        <div class="col-md-6 col-lg-5">
            <div class="glass-card p-4 p-md-5 border border-secondary text-center">
                <div class="text-primary fs-1 mb-3">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <h3 class="fw-bold text-white mb-2">Credential Reset Request</h3>
                <p class="text-muted small mb-4">Input your indexed profile email below. If verified inside our record database, an automated reset dispatch link will trace to your account inbox.</p>
                
                <form action="<?= URLROOT; ?>/auth/forgot" method="POST">
                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token']; ?>">
                    <div class="mb-4 text-start">
                        <label class="form-label text-muted small">Profile Account Email</label>
                        <input type="email" name="email" class="form-control bg-dark border-secondary text-white" placeholder="name@domain.com" required>
                    </div>
                    <button type="submit" class="btn btn-premium-primary w-100 rounded-pill py-2 mb-3">Dispatch Reset Sequence</button>
                    <a href="<?= URLROOT; ?>/auth/login" class="text-muted small text-decoration-none d-block"><i class="fa-solid fa-chevron-left me-2"></i>Return to Portal Entry</a>
                </form>
            </div>
        </div>
    </div>
</div>