<!-- views/admin/add_module.php -->
<div class="container">
    <h2>Add New Training Module</h2>
    <form action="<?= URLROOT; ?>/admin/addModule" method="POST">
        <div class="form-group">
            <label>Course Title</label>
            <input type="text" name="title" class="form-control" required>
        </div>
        
        <div class="form-group">
            <label>Description</label>
            <textarea name="description" class="form-control" required></textarea>
        </div>
        
        <div class="form-group">
            <label>Duration</label>
            <input type="text" name="duration" class="form-control" placeholder="e.g., 4 weeks" required>
        </div>

        <div class="form-group">
            <label>Difficulty Level</label>
            <select name="level" class="form-control">
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
            </select>
        </div>

        <div class="form-group">
            <label>Price (TZS)</label>
            <input type="number" name="price" class="form-control" step="0.01" value="0.00">
        </div>

        <div class="form-group">
            <label>Instructor</label>
            <input type="text" name="instructor" class="form-control" value="Athanas Kayombo">
        </div>

        <div class="form-group">
            <label>Image Filename</label>
            <input type="text" name="image_path" class="form-control" placeholder="default.jpg">
        </div>

        <button type="submit" class="btn btn-primary">Save Training Module</button>
    </form>
</div>