<div class="container py-5">
    <!-- Hero Header -->
    <div class="row align-items-center mb-5 g-4">
        <div class="col-lg-7">
            <span class="text-primary fw-bold text-uppercase tracking-widest small">Athstack Learning Systems</span>
            <h1 class="fw-bold text-white mt-1 display-5">Modern Engineering & Systems Architecture Academy</h1>
            <p class="text-muted fs-5 mt-3">Advance your engineering portfolio with intense, structured, production-focused full-stack web development pipelines and corporate systems strategy courses.</p>
        </div>
    </div>

    <!-- Training Programs Grid -->
    <div class="row g-4">
        <?php if (!empty($courses)): ?>
            <?php foreach($courses as $course): ?>
                <div class="col-md-6">
                    <div class="glass-card p-4 border border-secondary h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <!-- Dynamic badge based on course level -->
                                <span class="badge bg-primary px-3 py-1 rounded-pill small"><?php echo htmlspecialchars($course['level']); ?></span>
                                <span class="text-muted small"><i class="fa-regular fa-clock text-primary me-2"></i><?php echo htmlspecialchars($course['duration']); ?></span>
                            </div>
                            <h4 class="text-white fw-bold mb-2"><?php echo htmlspecialchars($course['title']); ?></h4>
                            <p class="text-muted small"><?php echo htmlspecialchars($course['description']); ?></p>
                        </div>
                        <div class="pt-4 border-top border-secondary mt-3 d-flex align-items-center justify-content-between">
                            <div>
                                <small class="text-muted d-block text-uppercase tracking-wider">Tuition Investment</small>
                                <span class="text-white fw-bold fs-4">$<?php echo number_format($course['price'], 2); ?></span>
                            </div>
                            <a href="<?= URLROOT; ?>/auth/register" class="btn btn-premium-primary btn-sm rounded-pill px-4">Enroll Program</a>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="col-12">
                <p class="text-muted text-center">No active training modules are currently available.</p>
            </div>
        <?php endif; ?>
    </div>
</div>