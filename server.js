require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`TechBridge Digital Hub running at http://localhost:${PORT}`);
  });
}

start();
