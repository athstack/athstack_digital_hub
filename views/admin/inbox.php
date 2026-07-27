<!-- views/admin/inbox.php -->
<div class="container-fluid py-5 px-md-5">
    <div class="glass-card p-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="text-white fw-bold m-0">
                <i class="fa-solid fa-envelope text-primary me-3"></i><?php echo $data['title']; ?>
            </h2>
            <a href="<?= URLROOT; ?>/admin" class="btn btn-sm btn-outline-primary">Back to Dashboard</a>
        </div>

        <div class="table-responsive">
            <table class="table table-dark table-hover align-middle mb-0">
                <thead class="table-light text-dark fw-bold">
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Message</th>
                        <th>Received</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($data['messages'])): ?>
                        <?php foreach($data['messages'] as $msg): ?>
                        <tr>
                            <td class="text-white fw-bold"><?php echo htmlspecialchars($msg['name']); ?></td>
                            <td><?php echo htmlspecialchars($msg['email']); ?></td>
                            <!-- Updated Message Column with wrapping and newline support -->
                            <td class="text-info fw-medium text-wrap" style="max-width: 400px; word-wrap: break-word;">
                                <?php echo nl2br(htmlspecialchars($msg['message'])); ?>
                            </td>
                            <td class="small text-muted"><?php echo date('M d, Y H:i', strtotime($msg['created_at'])); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr><td colspan="4" class="text-center py-4">No messages found.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>