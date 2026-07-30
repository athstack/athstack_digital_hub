const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const repairController = require('../controllers/repairController');
const NotificationModel = require('../models/NotificationModel');

router.get('/search', shopController.searchSuggestions);
router.get('/repair/status/:ref', repairController.checkRepairStatus);

router.get('/notifications', async (req, res) => {
  try {
    if (!req.session.userId) return res.json({ notifications: [], unread: 0 });
    const notifications = await NotificationModel.getByUser(req.session.userId, 20);
    const unread = await NotificationModel.countUnread(req.session.userId);
    res.json({ notifications, unread });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/notifications/read', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.body;
    if (id) {
      await NotificationModel.markAsRead(id);
    } else {
      await NotificationModel.markAllAsRead(req.session.userId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
