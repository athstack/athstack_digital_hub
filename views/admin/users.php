<div class="container py-5">
    <div class="mb-4">
    <a href="<?php echo URLROOT; ?>/admin/index" class="btn btn-outline-secondary btn-sm">
        <i class="fa-solid fa-arrow-left"></i> Back to Dashboard
    </a>
</div>
    <h2 class="text-white mb-4">User Directories</h2>
    
    <div class="table-responsive">
        <table class="table table-dark table-hover align-middle">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($users)): ?>
                    <?php foreach($users as $user): ?>
                    <tr>
                        <td>#<?= htmlspecialchars($user['id']); ?></td>
                        <td><?= htmlspecialchars($user['first_name'] . ' ' . $user['last_name']); ?></td>
                        <td><?= htmlspecialchars($user['email']); ?></td>
                        <td><?= htmlspecialchars($user['phone']); ?></td>
                        <td>
                            <!-- Form to update role instantly -->
                            <form action="<?= URLROOT; ?>/user/updateRole" method="POST">
                                <input type="hidden" name="id" value="<?= $user['id']; ?>">
                                <select name="role" class="form-select form-select-sm bg-dark text-white border-secondary" onchange="this.form.submit()">
                                    <option value="customer" <?= $user['role'] === 'customer' ? 'selected' : ''; ?>>Customer</option>
                                    <option value="seller"   <?= $user['role'] === 'seller'   ? 'selected' : ''; ?>>Seller</option>
                                    <option value="admin"    <?= $user['role'] === 'admin'    ? 'selected' : ''; ?>>Admin</option>
                                </select>
                            </form>
                        </td>
                        <td>
                            <a href="<?= URLROOT ?>/user/edit/<?= $user['id'] ?>" class="btn btn-sm btn-outline-primary">Profile</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="6" class="text-center text-muted">No users found in directory.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>