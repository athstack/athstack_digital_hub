const app = require('../app');
const { whenReady } = require('../config/db');

module.exports = (req, res) => {
  Promise.resolve(whenReady).catch(() => {}).then(() => app(req, res));
};
