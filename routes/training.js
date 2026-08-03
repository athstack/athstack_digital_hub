const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');
const { isAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateCsrf } = require('../middleware/csrf');

router.get('/', trainingController.getCourses);
router.get('/:slug', trainingController.getCourse);
router.post('/enroll/:id', requirePermission('buy_products'), validateCsrf, trainingController.enrollInCourse);

module.exports = router;
