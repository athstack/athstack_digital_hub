const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const repairController = require('../controllers/repairController');

router.get('/search', shopController.searchSuggestions);
router.get('/repair/status/:ref', repairController.checkRepairStatus);

module.exports = router;
