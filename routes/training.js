const express = require('express');
const router = express.Router();
const CourseModel = require('../models/CourseModel');

router.get('/', async (req, res) => {
  try {
    const courses = await CourseModel.getActive();
    res.render('training/index', {
      title: 'Professional Engineering Academy - Athstack',
      courses
    });
  } catch (err) {
    console.error(err);
    res.render('training/index', {
      title: 'Professional Engineering Academy - Athstack',
      courses: []
    });
  }
});

router.get('/view/:slug', async (req, res) => {
  try {
    const courses = await CourseModel.getActive();
    const course = courses.find(c => c.slug === req.params.slug);
    if (!course) return res.redirect('/training');
    res.render('training/view', { title: course.title, course });
  } catch (err) {
    console.error(err);
    res.redirect('/training');
  }
});

module.exports = router;
