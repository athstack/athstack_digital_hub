const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('about/index', { title: 'About Us - Athstack Digital Hub' });
});

module.exports = router;
