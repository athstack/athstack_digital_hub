const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');
const { isAuthenticated } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');

router.get('/', trainingController.getCourses);
router.get('/:slug', trainingController.getCourse);
router.post('/enroll/:id', isAuthenticated, validateCsrf, trainingController.enrollInCourse);

module.exports = router;
