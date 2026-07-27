<div class="container-fluid py-5 px-md-5">
    <!-- Admin Header Banner Component -->
    <div class="glass-card p-4 mb-5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
            <span class="text-primary fw-bold text-uppercase tracking-widest small">Root Operations Core</span>
            <h1 class="fw-bold text-white mt-1 mb-0">Athstack Command Deck</h1>
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-premium-outline btn-sm" onclick="location.reload();"><i class="fa-solid fa-arrows-rotate me-2"></i>Sync Telemetry</button>
            <a href="<?= URLROOT; ?>/auth/logout" class="btn btn-danger btn-sm rounded-pill px-3">Log Out</a>
        </div>
    </div>

    <!-- Telemetry Cards Grid Grid Configuration -->
    <div class="row g-4 mb-5">
        <div class="col-xl-3 col-md-6">
            <div class="glass-card p-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <span class="text-muted small fw-medium uppercase">Settled Gross Income</span>
                    <div class="text-success fs-4"><i class="fa-solid fa-circle-dollar-to-slot"></i></div>
                </div>
                <h2 class="text-white fw-bold mb-1">$<?= number_format($metrics['revenue'], 2); ?></h2>
                <span class="text-muted small"><span class="text-success"><i class="fa-solid fa-arrow-trend-up me-1"></i>Live</span> billing metrics state</span>
            </div>
        </div>

        <div class="col-xl-3 col-md-6">
            <div class="glass-card p-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <span class="text-muted small fw-medium uppercase">Pending Procurement Orders</span>
                    <div class="text-warning fs-4"><i class="fa-solid fa-boxes-packing"></i></div>
                </div>
                <h2 class="text-white fw-bold mb-1"><?= $metrics['pending_orders']; ?></h2>
                <span class="text-muted small">Awaiting inventory packaging allocation</span>
            </div>
        </div>

        <div class="col-xl-3 col-md-6">
            <div class="glass-card p-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <span class="text-muted small fw-medium uppercase">Pending Hardware Tickets</span>
                    <div class="text-primary fs-4"><i class="fa-solid fa-bolt-lightning"></i></div>
                </div>
                <h2 class="text-white fw-bold mb-1"><?= $metrics['pending_bookings']; ?></h2>
                <span class="text-muted small">Open diagnostic bench requests</span>
            </div>
        </div>

        <div class="col-xl-3 col-md-6">
            <div class="glass-card p-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <span class="text-muted small fw-medium uppercase">Registered Users Node</span>
                    <div class="text-info fs-4"><i class="fa-solid fa-users-gear"></i></div>
                </div>
                <h2 class="text-white fw-bold mb-1"><?= $metrics['total_clients']; ?></h2>
                <span class="text-muted small">Active customer account profiles</span>
            </div>
        </div>
    </div>

    <!-- Management Workspace Layout Layout Grid -->
    <div class="row g-4">
        <!-- Sidebar Navigation Directives Module Layout Container -->
        <div class="col-lg-3">
            <div class="glass-card p-4 mb-4">
                <h6 class="text-white fw-bold mb-4 px-2">Operational Controls</h6>
                <div class="list-group list-group-flush bg-transparent admin-management-links">
                    <a href="<?= URLROOT; ?>/admin/products" class="list-group-item bg-transparent text-white border-0 py-2"><i class="fa-solid fa-tag text-primary me-3"></i>Manage Inventory Items</a>
                    <a href="<?= URLROOT; ?>/admin/bookings" class="list-group-item bg-transparent text-white border-0 py-2"><i class="fa-solid fa-screwdriver-wrench text-primary me-3"></i>Maintenance Queue</a>
                    <a href="<?= URLROOT; ?>/admin/training" class="list-group-item bg-transparent text-white border-0 py-2"><i class="fa-solid fa-scroll text-primary me-3"></i>Training Academy Modules</a>
                    <a href="<?= URLROOT; ?>/admin/users" class="list-group-item bg-transparent text-white border-0 py-2"><i class="fa-solid fa-user-gear text-primary me-3"></i>User Directories</a>
                    <!-- Add this link in your dashboard view -->
                    <a href="<?php echo URLROOT; ?>/admin/inbox" class="list-group-item bg-transparent text-white border-0 py-2"><i class="fa-solid fa-envelope text-primary me-3"></i>Manage Contact Messages</a>
                </div>
            </div>
        </div>

        <!-- Realtime Live Ticketing Log Center Panel Components -->
        <div class="col-lg-9">
            <div class="glass-card p-4 h-100">
                <h5 class="fw-bold text-white mb-4"><i class="fa-solid fa-clipboard-list text-primary me-3"></i>Recent Service Bench Registrations</h5>
                <div class="table-responsive">
                    <table class="table table-dark table-hover align-middle mb-0 small text-muted">
                        <thead class="table-light text-dark fw-bold">
                            <tr>
                                <th>Ticket</th>
                                <th>Client Identity Details</th>
                                <th>Assigned Subsystem Node</th>
                                <th>Target Date Window</th>
                                <th>Action Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if(empty($recentBookings)): ?>
                                <tr>
                                    <td colspan="5" class="text-center py-4">No active maintenance tasks registered inside this session view.</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach($recentBookings as $bk): ?>
                                    <tr>
                                        <td class="text-white fw-bold">#ATH-TK-<?= $bk['id']; ?></td>
                                        <td>
                                            <div class="fw-bold text-white"><?= $bk['customer_name']; ?></div>
                                            <small><?= $bk['customer_phone']; ?></small>
                                        </td>
                                        <td class="text-white"><?= $bk['service_title']; ?></td>
                                        <td><?= date('Y-m-d H:i', strtotime($bk['appointment_date'])); ?></td>
                                        <td>
                                            <span class="badge bg-warning text-dark px-2 py-1 rounded-pill"><?= ucfirst($bk['status']); ?></span>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>