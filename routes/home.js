const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [featured] = await pool.execute(
      `SELECT p.*, c.name as category_name FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.status = 'active' LIMIT 3`
    );
    res.render('home/index', { title: 'Home - Athstack Digital Hub', featured });
  } catch (err) {
    console.error(err);
    res.render('home/index', { title: 'Home - Athstack Digital Hub', featured: [] });
  }
});

module.exports = router;
