const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');
const { requirePermission } = require('../middleware/rbac');
const { isActive } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');

router.get('/', repairController.getMaintenance);
router.post('/book', requirePermission('book_repairs'), isActive, validateCsrf, repairController.bookRepair);

module.exports = router;
