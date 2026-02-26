require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Load server configurations
let serverConfigs = { servers: {} };
try {
  const configPath = path.join(__dirname, 'servers.json');
  if (fs.existsSync(configPath)) {
    serverConfigs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading server configs:', error);
}

module.exports = {
  botToken: process.env.BOT_TOKEN,
  servers: serverConfigs.servers
};