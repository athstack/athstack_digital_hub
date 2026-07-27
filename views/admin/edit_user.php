<div class="container py-5">
    <h2 class="text-white mb-4">Edit User: <?= htmlspecialchars($user['first_name'] . ' ' . $user['last_name']); ?></h2>
    
    <div class="bg-dark p-4 rounded text-white">
        <!-- Form to save profile changes -->
        <form action="<?= URLROOT; ?>/user/updateProfile" method="POST">
            <input type="hidden" name="id" value="<?= $user['id']; ?>">
            
            <div class="mb-3">
                <label>First Name</label>
                <input type="text" name="first_name" class="form-control" value="<?= htmlspecialchars($user['first_name']); ?>">
            </div>
            
            <div class="mb-3">
                <label>Last Name</label>
                <input type="text" name="last_name" class="form-control" value="<?= htmlspecialchars($user['last_name']); ?>">
            </div>
            
            <div class="mb-3">
                <label>Email</label>
                <input type="email" name="email" class="form-control" value="<?= htmlspecialchars($user['email']); ?>">
            </div>

            <button type="submit" class="btn btn-primary">Save Changes</button>
            <a href="<?= URLROOT; ?>/user/adminUsers" class="btn btn-secondary">Back to Directory</a>
        </form>
    </div>
</div>