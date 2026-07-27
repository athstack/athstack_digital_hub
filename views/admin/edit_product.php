<div class="container-fluid py-5 px-md-5">
    <div class="glass-card p-4">
        <h4 class="text-white mb-4">Edit Product: <?= htmlspecialchars($data['product']['name']); ?></h4>
        <form method="POST" action="<?= URLROOT; ?>/admin/editProduct/<?= $data['product']['id']; ?>" enctype="multipart/form-data">
            <div class="row g-3">
                <div class="col-md-6"><input type="text" name="name" class="form-control" value="<?= $data['product']['name']; ?>" required></div>
                <div class="col-md-6"><input type="number" name="category_id" class="form-control" value="<?= $data['product']['category_id']; ?>" required></div>
                <div class="col-12"><textarea name="description" class="form-control" rows="3"><?= $data['product']['description']; ?></textarea></div>
                <div class="col-md-6"><input type="number" name="price" class="form-control" value="<?= $data['product']['price']; ?>" step="0.01" required></div>
                <div class="col-md-6"><input type="number" name="stock_quantity" class="form-control" value="<?= $data['product']['stock_quantity']; ?>" required></div>
                <div class="col-12">
                    <label class="text-white">Current Image: <?= $data['product']['main_image']; ?></label>
                    <input type="file" name="product_image" class="form-control" accept="image/*">
                </div>
                <div class="col-12">
                    <button type="submit" name="update_product" class="btn btn-warning">Update Product</button>
                    <a href="<?= URLROOT; ?>/admin/products" class="btn btn-secondary">Cancel</a>
                </div>
            </div>
        </form>
    </div>
</div>