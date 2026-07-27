<div class="container mt-5">
    <h2>Edit Training Module</h2>
    <form action="<?= URLROOT; ?>/admin/editModule/<?= $data['course']['id']; ?>" method="POST">
        <!-- Keep the ID hidden to pass it through if needed -->
        <input type="hidden" name="id" value="<?= $data['course']['id']; ?>">

        <div class="form-group mb-3">
            <label>Course Title</label>
            <input type="text" name="title" class="form-control" value="<?= htmlspecialchars($data['course']['title']); ?>" required>
        </div>
        
        <div class="form-group mb-3">
            <label>Description</label>
            <textarea name="description" class="form-control" required><?= htmlspecialchars($data['course']['description']); ?></textarea>
        </div>
        
        <div class="form-group mb-3">
            <label>Duration</label>
            <input type="text" name="duration" class="form-control" value="<?= htmlspecialchars($data['course']['duration']); ?>" required>
        </div>

        <div class="form-group mb-3">
            <label>Status</label>
            <select name="status" class="form-control">
                <option value="draft" <?= ($data['course']['status'] == 'draft') ? 'selected' : ''; ?>>Draft</option>
                <option value="active" <?= ($data['course']['status'] == 'active') ? 'selected' : ''; ?>>Active</option>
            </select>
        </div>

        <div class="form-group mb-3">
            <label>Difficulty Level</label>
            <select name="level" class="form-control">
                <option value="Beginner" <?= ($data['course']['level'] == 'Beginner') ? 'selected' : ''; ?>>Beginner</option>
                <option value="Intermediate" <?= ($data['course']['level'] == 'Intermediate') ? 'selected' : ''; ?>>Intermediate</option>
                <option value="Advanced" <?= ($data['course']['level'] == 'Advanced') ? 'selected' : ''; ?>>Advanced</option>
            </select>
        </div>

        <div class="form-group mb-3">
            <label>Price (TZS)</label>
            <input type="number" name="price" class="form-control" step="0.01" value="<?= htmlspecialchars($data['course']['price']); ?>">
        </div>

        <button type="submit" class="btn btn-primary">Update Training Module</button>
        <a href="<?= URLROOT; ?>/admin/training" class="btn btn-secondary">Cancel</a>
    </form>
</div>