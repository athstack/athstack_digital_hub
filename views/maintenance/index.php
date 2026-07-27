<div class="container py-5">
    <div class="text-center max-w-2xl mx-auto mb-5">
        <span class="text-primary fw-bold text-uppercase tracking-widest">Hardware & Infrastructure Support</span>
        <h1 class="fw-bold text-white mt-2">Enterprise Maintenance Services</h1>
        <p class="text-muted">Select your diagnostic path and schedule system support with our certified engineers.</p>
    </div>

    <!-- Pricing / Service Catalog Structural Panels Grid -->
    <div class="row g-4 mb-5">
        <div class="col-md-6">
            <h3 class="fw-bold text-white mb-4"><i class="fa-solid fa-laptop text-primary me-2"></i> Computer Systems Support</h3>
            <div class="row g-3">
                <?php if (!empty($data['computerServices']) && is_array($data['computerServices'])): ?>
                    <?php foreach($data['computerServices'] as $cs): ?>
                        <div class="col-12">
                            <div class="glass-card p-4 d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="fs-3 text-primary"><i class="fa-solid <?= htmlspecialchars($cs['icon_class']); ?>"></i></div>
                                    <div>
                                        <h6 class="text-white fw-bold mb-1"><?= htmlspecialchars($cs['title']); ?></h6>
                                        <small class="text-muted d-block"><?= htmlspecialchars($cs['description']); ?></small>
                                    </div>
                                </div>
                                <span class="badge bg-primary rounded-pill">From $<?= number_format($cs['base_price'], 0); ?></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="col-12"><p class="text-muted small">No computer support services mapped at this time.</p></div>
                <?php endif; ?>
            </div>
        </div>

        <div class="col-md-6">
            <h3 class="fw-bold text-white mb-4"><i class="fa-solid fa-mobile-screen text-primary me-2"></i> Smart Device Operations</h3>
            <div class="row g-3">
                <?php if (!empty($data['phoneServices']) && is_array($data['phoneServices'])): ?>
                    <?php foreach($data['phoneServices'] as $ps): ?>
                        <div class="col-12">
                            <div class="glass-card p-4 d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="fs-3 text-primary"><i class="fa-solid <?= htmlspecialchars($ps['icon_class']); ?>"></i></div>
                                    <div>
                                        <h6 class="text-white fw-bold mb-1"><?= htmlspecialchars($ps['title']); ?></h6>
                                        <small class="text-muted d-block"><?= htmlspecialchars($ps['description']); ?></small>
                                    </div>
                                </div>
                                <span class="badge bg-primary rounded-pill">From $<?= number_format($ps['base_price'], 0); ?></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="col-12"><p class="text-muted small">No mobile support services mapped at this time.</p></div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Booking Form Core Interactive Node -->
    <div class="row justify-content-center">
        <div class="col-lg-8">
            <div class="glass-card p-5">
                <h3 class="fw-bold text-white mb-4 text-center">Schedule Diagnostics & Maintenance</h3>
                <form id="appointmentSchedulingForm">
                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?? ''; ?>">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label text-muted small">Full Name</label>
                            <input type="text" name="name" class="form-control bg-dark border-secondary text-white" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small">Email Address</label>
                            <input type="email" name="email" class="form-control bg-dark border-secondary text-white" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small">Contact Phone Number</label>
                            <input type="tel" name="phone" class="form-control bg-dark border-secondary text-white" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small">Target Appointment Frame</label>
                            <input type="datetime-local" name="appointment_date" class="form-control bg-dark border-secondary text-white" required>
                        </div>
                        <div class="col-12">
                            <label class="form-label text-muted small">Select Requested Support Category Service Node</label>
                            <select name="service_id" class="form-select bg-dark border-secondary text-white" required>
                                <option value="" selected disabled>Choose operational service...</option>
                                
                                <optgroup label="Computer Systems Architecture">
                                    <?php if (!empty($data['computerServices']) && is_array($data['computerServices'])): ?>
                                        <?php foreach($data['computerServices'] as $cs): ?>
                                            <option value="<?= $cs['id']; ?>"><?= htmlspecialchars($cs['title']); ?></option>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </optgroup>
                                
                                <optgroup label="Mobile Device Configurations">
                                    <?php if (!empty($data['phoneServices']) && is_array($data['phoneServices'])): ?>
                                        <?php foreach($data['phoneServices'] as $ps): ?>
                                            <option value="<?= $ps['id']; ?>"><?= htmlspecialchars($ps['title']); ?></option>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </optgroup>
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label text-muted small">Provide Device Specifics & Structural Failure Fault Context</label>
                            <textarea name="device_details" rows="4" class="form-control bg-dark border-secondary text-white" placeholder="Include serial matrix codes, system error indicators, or peripheral logs..."></textarea>
                        </div>
                        <div class="col-12 text-center mt-4">
                            <button type="submit" class="btn btn-premium-primary px-5">File Infrastructure Ticket</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>