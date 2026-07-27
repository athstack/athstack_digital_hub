<div class="container mt-5">
    <div class="mb-4">
        <a href="<?php echo URLROOT; ?>/admin/index" class="btn btn-outline-secondary btn-sm">
            <i class="fa-solid fa-arrow-left"></i> Back to Dashboard
        </a>
        <a href="<?php echo URLROOT; ?>/admin/addModule" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-plus"></i> Add New Module
        </a>
    </div>

    <h1 class="text-white mb-4">Training Academy Modules</h1>

    <div class="card bg-dark border-secondary shadow-sm">
        <div class="table-responsive">
            <table class="table table-dark table-hover mb-0 align-middle">
                <thead>
                    <tr class="text-muted border-secondary">
                        <th class="px-4">ID</th>
                        <th>Course Title</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th class="text-end px-4">Actions</th>
                    </tr>
                </thead>
                <tbody class="border-secondary">
                    <?php 
                    $modules = $data['modules'] ?? [];
                    
                    if(empty($modules)): ?>
                        <tr>
                            <td colspan="5" class="text-center py-4 text-muted">No academy modules registered.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach($modules as $module): ?>
                            <tr>
                                <td class="px-4 text-secondary">#<?php echo htmlspecialchars($module['id']); ?></td>
                                <td class="fw-medium"><?php echo htmlspecialchars($module['title']); ?></td>
                                <td class="text-white"><?php echo htmlspecialchars($module['duration']); ?></td>
                                <td>
                                    <span class="badge <?php echo ($module['status'] ?? '') === 'active' ? 'bg-success' : 'bg-secondary'; ?>">
                                        <?php echo htmlspecialchars(ucfirst($module['status'] ?? 'draft')); ?>
                                    </span>
                                </td>
                                <td class="text-end px-4">
                                    <!-- Edit Action -->
                                    <a href="<?php echo URLROOT; ?>/admin/editModule/<?php echo $module['id']; ?>" class="btn btn-sm btn-outline-primary">Edit</a>
                                    
                                    <!-- Delete Action -->
                                    <form action="<?php echo URLROOT; ?>/admin/deleteModule/<?php echo $module['id']; ?>" method="POST" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete this module?');">
                                        <button type="submit" class="btn btn-sm btn-outline-danger">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>