const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const repairController = require('../controllers/repairController');
const reviewController = require('../controllers/reviewController');
const NotificationModel = require('../models/NotificationModel');
const { isAuthenticated, isActive } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateCsrf } = require('../middleware/csrf');

// Public endpoints (no auth required)
router.get('/search', shopController.searchSuggestions);
router.get('/repair/status/:ref', repairController.checkRepairStatus);
router.get('/reviews/product/:id', reviewController.getProductReviewsApi);

// Authenticated customer actions
router.post('/reviews/:id/helpful', isAuthenticated, requirePermission('manage_reviews'), validateCsrf, reviewController.toggleHelpful);
router.post('/reviews/:id/report', isAuthenticated, requirePermission('manage_reviews'), validateCsrf, reviewController.reportReview);

router.get('/notifications', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const notifications = await NotificationModel.getByUser(req.user.id, 20);
    const unread = await NotificationModel.countUnread(req.user.id);
    res.json({ notifications, unread });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/notifications/read', isAuthenticated, validateCsrf, async (req, res) => {
  try {
    const { id } = req.body;
    if (id) {
      await NotificationModel.markAsRead(id);
    } else {
      await NotificationModel.markAllAsRead(req.user.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const ContactModel = require('../models/ContactModel');

router.get('/messages/unread-count', requirePermission('manage_messages'), async (req, res) => {
  try {
    const count = await ContactModel.getUnreadRepliesCountByUser(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

router.post('/messages/:id/read', requirePermission('manage_messages'), validateCsrf, async (req, res) => {
  try {
    const message = await ContactModel.getById(req.params.id);
    if (!message || Number(message.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await ContactModel.markAsReadByCustomer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
