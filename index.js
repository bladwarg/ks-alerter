const client = require('./bot/client');
const { startScheduler } = require('./bot/scheduler');
const config = require('./config/config');

client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  startScheduler(client);
});

client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  client.destroy();
  process.exit(0);
});

client.login(config.botToken);