exports.getAbout = (req, res) => {
  res.render('about/index', {
    title: req.t('about:index.title')
  });
};
