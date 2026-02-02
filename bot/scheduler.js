const cron = require('node-cron');
const config = require('../config/config');

let scheduledTask = null;

async function sendScheduledMessage(client) {
  try {
    const channel = await client.channels.fetch(config.channelId);
    await channel.send('⚔️ Arena in 15 minutes ⚔️ @everyone');
    console.log(`[${new Date().toISOString()}] Daily message sent`);
  } catch (error) {
    console.error('Error sending scheduled message:', error);
  }
}

function startScheduler(client, cronTime = config.scheduleTime) {
  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(cronTime, () => {
    sendScheduledMessage(client);
  }, {
    timezone: config.timezone
  });

  console.log(`Scheduler started: ${cronTime} (${config.timezone})`);
  return scheduledTask;
}

function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('Scheduler stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  sendScheduledMessage
};