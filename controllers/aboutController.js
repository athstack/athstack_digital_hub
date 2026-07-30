exports.getAbout = (req, res) => {
  res.render('about/index', {
    title: 'About Us - TechBridge Digital Hub'
  });
};
