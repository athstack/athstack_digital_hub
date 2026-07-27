<div class="container py-5">
    <!-- Profile Welcome Banner Section -->
    <div class="glass-card p-5 mb-5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4">
        <div>
            <span class="text-primary fw-bold text-uppercase tracking-widest small">Client Portal Ecosystem</span>
            <h1 class="fw-bold text-white mt-1 mb-2">Welcome Back, <?= $_SESSION['user_name'] ?? 'Authorized User'; ?></h1>
            <p class="text-muted mb-0">Monitor your active hardware maintenance pipelines, review academic class registrations, and track system shipping metrics.</p>
        </div>
        <div>
            <a href="<?= URLROOT; ?>/auth/logout" class="btn btn-premium-outline"><i class="fa-solid fa-arrow-right-from-bracket me-2"></i>Terminate Session</a>
        </div>
    </div>

    <div class="row g-4">
        <!-- Sidebar Navigation Shortcuts Container Component -->
        <div class="col-lg-3">
            <div class="glass-card p-4 sticky-md-top" style="top: 90px; z-index: 10;">
                <div class="text-center mb-4">
                    <div class="bg-dark border border-secondary text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 70px; height: 70px;">
                        <i class="fa-solid fa-user-shield fs-3"></i>
                    </div>
                    <h6 class="text-white fw-bold mb-1"><?= $_SESSION['user_email'] ?? 'user@athstack.com'; ?></h6>
                    <span class="badge bg-primary px-3 py-1 rounded-pill small">Verified Profile Node</span>
                </div>
                <div class="nav flex-column nav-pills dynamic-profile-tabs gap-2" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                    <button class="nav-link active text-start rounded-3 py-2 text-white border-0 bg-transparent" id="v-orders-tab" data-bs-toggle="pill" data-bs-target="#v-orders" type="button" role="tab"><i class="fa-solid fa-box me-3 text-primary"></i>Order Registry</button>
                    <button class="nav-link text-start rounded-3 py-2 text-white border-0 bg-transparent" id="v-bookings-tab" data-bs-toggle="pill" data-bs-target="#v-bookings" type="button" role="tab"><i class="fa-solid fa-wrench me-3 text-primary"></i>Hardware Tickets</button>
                    <button class="nav-link text-start rounded-3 py-2 text-white border-0 bg-transparent" id="v-courses-tab" data-bs-toggle="pill" data-bs-target="#v-courses" type="button" role="tab"><i class="fa-solid fa-graduation-cap me-3 text-primary"></i>Academy Modules</button>
                </div>
            </div>
        </div>

        <!-- Dynamic Registry State Content Target Panels Block -->
        <div class="col-lg-9">
            <div class="tab-content" id="v-pills-tabContent">
                
                <!-- Tab Pane 1: Order History Log Matrix Component -->
                <div class="tab-pane fade show active" id="v-orders" role="tabpanel" aria-labelledby="v-orders-tab">
                    <div class="glass-card p-4">
                        <h4 class="fw-bold text-white mb-4"><i class="fa-solid fa-receipt text-primary me-3"></i>E-Commerce Order History Registry</h4>
                        <div class="table-responsive">
                            <table class="table table-dark table-hover align-middle mb-0 text-muted small">
                                <thead class="table-light text-dark fw-bold">
                                    <tr>
                                        <th>Reference ID</th>
                                        <th>Timestamp</th>
                                        <th>Total Invoice</th>
                                        <th>Payment State</th>
                                        <th>Logistics Routing</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if(empty($orders)): ?>
                                        <tr>
                                            <td colspan="5" class="text-center py-4 text-muted">
                                                <i class="fa-solid fa-folder-open d-block fs-2 mb-2 text-secondary"></i> No historic procurement transactions indexed inside this profile context.
                                            </td>
                                        </tr>
                                    <?php else: ?>
                                        <?php foreach($orders as $order): ?>
                                            <tr>
                                                <td class="text-white fw-bold">#<?= $order['order_reference']; ?></td>
                                                <td><?= date('Y-m-d H:i', strtotime($order['created_at'])); ?></td>
                                                <td class="text-white fw-bold">$<?= number_format($order['total_amount'], 2); ?></td>
                                                <td><span class="badge bg-success rounded-pill"><?= ucfirst($order['payment_status']); ?></span></td>
                                                <td><span class="badge bg-primary rounded-pill"><?= ucfirst($order['order_status']); ?></span></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Tab Pane 2: Maintenance Diagnostic Allocation Slots Logs Component -->
                <div class="tab-pane fade" id="v-bookings" role="tabpanel" aria-labelledby="v-bookings-tab">
                    <div class="glass-card p-4">
                        <h4 class="fw-bold text-white mb-4"><i class="fa-solid fa-screwdriver-wrench text-primary me-3"></i>Active Maintenance Ticket Registries</h4>
                        <div class="table-responsive">
                            <table class="table table-dark table-hover align-middle mb-0 text-muted small">
                                <thead class="table-light text-dark fw-bold">
                                    <tr>
                                        <th>Ticket ID</th>
                                        <th>Allocated Schedule Window</th>
                                        <th>Target Hardware Service Node</th>
                                        <th>Operational Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if(empty($bookings)): ?>
                                        <tr>
                                            <td colspan="4" class="text-center py-4 text-muted">
                                                <i class="fa-solid fa-ticket d-block fs-2 mb-2 text-secondary"></i> No hardware diagnostics records allocated or assigned to this dynamic node state.
                                            </td>
                                        </tr>
                                    <?php else: ?>
                                        <?php foreach($bookings as $booking): ?>
                                            <tr>
                                                <td class="text-white fw-bold">#ATH-TK-<?= $booking['id']; ?></td>
                                                <td><?= date('Y-m-d H:i', strtotime($booking['appointment_date'])); ?></td>
                                                <td class="text-white"><?= $booking['service_title'] ?? 'General Diagnostic Tuning'; ?></td>
                                                <td>
                                                    <span class="badge rounded-pill <?php 
                                                        echo match($booking['status']) {
                                                            'pending'     => 'bg-warning text-dark',
                                                            'confirmed'   => 'bg-info text-dark',
                                                            'in_progress' => 'bg-primary',
                                                            'completed'   => 'bg-success',
                                                            'cancelled'   => 'bg-danger',
                                                        };
                                                    ?>"><?= str_replace('_', ' ', ucfirst($booking['status'])); ?></span>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Tab Pane 3: Academic Class Registrations Modules Component -->
                <div class="tab-pane fade" id="v-courses" role="tabpanel" aria-labelledby="v-courses-tab">
                    <div class="glass-card p-4">
                        <h4 class="fw-bold text-white mb-4"><i class="fa-solid fa-user-graduate text-primary me-3"></i>Academic Enrollment Programs Matrix</h4>
                        <div class="row g-3">
                            <?php if(empty($courses)): ?>
                                <div class="col-12 py-4 text-center text-muted">
                                    <i class="fa-solid fa-book-bookmark d-block fs-2 mb-2 text-secondary"></i> Profile not signed or mapped to any current engineering modules.
                                </div>
                            <?php else: ?>
                                <?php foreach($courses as $course): ?>
                                    <div class="col-md-6">
                                        <div class="p-3 rounded-3 bg-dark border border-secondary d-flex align-items-center justify-content-between">
                                            <div>
                                                <h6 class="text-white fw-bold mb-1"><?= $course['title']; ?></h6>
                                                <small class="text-muted d-block"><i class="fa-regular fa-clock me-2 text-primary"></i><?= $course['duration']; ?></small>
                                            </div>
                                            <span class="badge bg-success rounded-pill px-3">Enrolled</span>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>