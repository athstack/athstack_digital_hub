<div class="container mt-4">
    <div class="mb-3">
    <a href="<?php echo URLROOT; ?>/admin/index" class="btn btn-outline-secondary btn-sm">
        <i class="fa-solid fa-arrow-left"></i> Back to Dashboard
    </a>
</div>
    <h1>Maintenance Queue</h1>
    
    <?php if(empty($data['bookings'])): ?>
        <div class="card bg-dark border-secondary text-center p-5 mt-4">
            <div class="card-body">
                <i class="fa-solid fa-clipboard-list fa-3x text-secondary mb-3"></i>
                <h3 class="text-white">Maintenance Queue Clear</h3>
                <p class="text-muted">No active maintenance tasks are currently registered in this session view.</p>
            </div>
        </div>
    <?php else: ?>
        <table class="table table-dark table-striped">
            <thead>
                <tr>
                    <th>Ticket</th>
                    <th>Client Identity</th>
                    <th>Subsystem Node</th>
                    <th>Target Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach($data['bookings'] as $booking): ?>
                    <tr>
                        <td><?php echo htmlspecialchars($booking['id']); ?></td>
                        <td><?php echo htmlspecialchars($booking['customer_name']); ?></td>
                        <td><?php echo htmlspecialchars($booking['device_details']); ?></td>
                        <td><?php echo htmlspecialchars($booking['appointment_date']); ?></td>
                        <td>
                            <span class="badge <?php echo $booking['status'] === 'pending' ? 'bg-warning' : 'bg-success'; ?>">
                                <?php echo htmlspecialchars($booking['status']); ?>
                            </span>
                        </td>
                        <td>
                            <form action="<?php echo URLROOT; ?>/admin/updateBookingStatus" method="POST">
                                <!-- CSRF Protection Field -->
                                <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
                                
                                <input type="hidden" name="id" value="<?php echo htmlspecialchars($booking['id']); ?>">
                                
                                <?php if($booking['status'] === 'pending'): ?>
                                    <button type="submit" name="status" value="approved" class="btn btn-sm btn-primary">Approve</button>
                                <?php endif; ?>
                                
                                <button type="submit" name="status" value="completed" class="btn btn-sm btn-success">Complete</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>