<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-lg-8">
            <a href="<?= URLROOT; ?>/maintenance" class="text-muted text-decoration-none small d-block mb-3">
                <i class="fa-solid fa-arrow-left me-2"></i>Cancel Diagnostic Matrix
            </a>
            
            <div class="glass-card p-4 border border-secondary">
                <h2 class="fw-bold text-white mb-1">Mount Device to Diagnostic Bench</h2>
                <p class="text-muted small mb-4">Configure system parameters to spin up target troubleshooting tracking.</p>
                
                <form action="<?= URLROOT; ?>/maintenance/create_ticket" method="POST">
                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?? ''; ?>">
                    <input type="hidden" name="service_id" value="<?= $data['service']['id'] ?? 0; ?>">
                    
                    <div class="mb-3">
                        <label class="form-label text-muted small">Target Hardware Model / Name</label>
                        <input type="text" name="device_model" class="form-control bg-dark border-secondary text-white" placeholder="e.g., MacBook Pro M2, Custom Desktop Node" required>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label text-muted small">Hardware Serial / Asset Tag</label>
                        <input type="text" name="serial_number" class="form-control bg-dark border-secondary text-white" placeholder="Optional identifier code">
                    </div>
                    
                    <div class="mb-4">
                        <label class="form-label text-muted small">Diagnostic Fault Manifest Logs</label>
                        <textarea name="fault_description" class="form-control bg-dark border-secondary text-white" rows="5" placeholder="Detail error behaviors, crash dumps, or physical faults..." required></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-premium-primary w-100 rounded-pill py-2">
                        Initialize Bench Diagnostics Matrix ($<?= htmlspecialchars($data['service']['base_price'] ?? '0.00'); ?>)
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>