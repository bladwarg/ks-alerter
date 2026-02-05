const cron = require('node-cron');
const config = require('../config/config');

let arenaTask = null;
let bear1Task = null;
let bear2Task = null;

async function sendArenaMessage(client) {
  try {
    const channel = await client.channels.fetch(config.channelId);
    await channel.send('⚔️ Arena in 15 minutes ⚔️ @everyone');
    console.log(`[${new Date().toISOString()}] Daily message sent`);
  } catch (error) {
    console.error('Error sending scheduled message:', error);
  }
}

async function sendBear1Message(client) {
  try {
    const channel = await client.channels.fetch(config.channelId);
    await channel.send('🐻 Bear 1 Trap in 30 minutes 🐻 @everyone');
    console.log(`[${new Date().toISOString()}] Bear 1 trap message sent`);
  } catch (error) {
    console.error('Error sending bear 1 message:', error);
  }
}

async function sendBear2Message(client) {
  try {
    const channel = await client.channels.fetch(config.channelId);
    await channel.send('🐻 Bear 2 Trap in 30 minutes 🐻 @everyone');
    console.log(`[${new Date().toISOString()}] Bear 2 trap message sent`);
  } catch (error) {
    console.error('Error sending bear 2 message:', error);
  }
}

function startScheduler(client, cronTime = config.scheduleTime) {
  if (arenaTask) {
    arenaTask.stop();
  }

  arenaTask = cron.schedule(cronTime, () => {
    sendArenaMessage(client);
  }, {
    timezone: config.timezone
  });

  console.log(`Scheduler started: ${cronTime} (${config.timezone})`);

  // Bear task 1 - Every 2 days at 0:30 AM
  if (bear1Task) bear1Task.stop();

  bear1Task = cron.schedule(config.bear1Time, () => {
    sendBear1Message(client);
  }, {
    timezone: config.timezone
  });

  console.log(`Bear 1 started: ${config.bear1Time} (${config.timezone})`);

  // Bear task 2 - Every 2 days at 19:00
  if (bear2Task) bear2Task.stop();
  
  bear2Task = cron.schedule(config.bear2Time, () => {
    sendBear2Message(client);
  }, {
    timezone: config.timezone
  });
  
  console.log(`Bear 2 started: ${config.bear2Time} (${config.timezone})`);
}

function stopScheduler() {
  if (arenaTask) {
    arenaTask.stop();
    console.log('Arena stopped');
  }

  if (bear1Task) {
    bear1Task.stop();
    console.log('Bear 1 stopped');
  }

  if (bear2Task) {
    bear2Task.stop();
    console.log('Bear 2 stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  sendArenaMessage,
  sendBear1Message,
  sendBear2Message
};