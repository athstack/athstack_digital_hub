const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');
const { validateCsrf } = require('../middleware/csrf');

router.get('/', repairController.getMaintenance);
router.post('/book', validateCsrf, repairController.bookRepair);

module.exports = router;
