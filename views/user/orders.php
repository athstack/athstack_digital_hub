<div class="container py-5">
    <h2 class="fw-bold text-white mb-1">Procurement History</h2>
    <p class="text-muted small mb-4">Monitor your active hardware asset shipments and invoices.</p>

    <div class="glass-card p-4 border border-secondary">
        <div class="table-responsive">
            <table class="table table-dark table-hover mb-0 alignment-middle">
                <thead>
                    <tr class="text-muted small border-secondary">
                        <th>Invoice Node</th>
                        <th>Date Mapped</th>
                        <th>Status State</th>
                        <th>Total Settlement</th>
                    </tr>
                </thead>
                <tbody class="small border-secondary">
                    <?php if(empty($data['orders'])): ?>
                        <tr>
                            <td colspan="4" class="text-center py-4 text-muted">No historical transactions indexed to this profile node.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach($data['orders'] as $order): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($order['reference_id']); ?></td>
                                <td><?php echo htmlspecialchars($order['created_at']); ?></td>
                                <td><?php echo htmlspecialchars($order['payment_status']); ?></td>
                                <td><?php echo htmlspecialchars($order['total_amount']); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>