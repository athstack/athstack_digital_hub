const ProductModel = require('../models/ProductModel');
const CourseModel = require('../models/CourseModel');
const { pool } = require('../config/db');

exports.getHome = async (req, res, next) => {
  try {
    const { products: allProducts } = await ProductModel.getFiltered({ limit: 6 });
    const featured = allProducts;

    const courses = await CourseModel.getActive();
    const recentCourses = courses.slice(0, 3);

    const [userCount] = await pool.execute(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'customer'"
    );
    const [productCount] = await pool.execute(
      "SELECT COUNT(*) AS count FROM products WHERE status = 'active'"
    );
    const [courseCount] = await pool.execute(
      "SELECT COUNT(*) AS count FROM training_courses WHERE status = 'active'"
    );
    const [repairCount] = await pool.execute(
      "SELECT COUNT(*) AS count FROM repair_requests WHERE status = 'completed'"
    );

    const stats = {
      customers: userCount[0].count,
      products: productCount[0].count,
      courses: courseCount[0].count,
      repairs: repairCount[0].count
    };

    res.render('home/index', {
      title: 'Home - Athstack Digital Hub',
      featured,
      recentCourses,
      stats
    });
  } catch (err) {
    next(err);
  }
};
