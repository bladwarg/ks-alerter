const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

// Store tasks per server
const serverTasks = new Map();

async function sendArenaMessage(client, serverId, serverConfig) {
  try {
    const channel = await client.channels.fetch(serverConfig.channelId);
    
    const embed = new EmbedBuilder()
      .setColor('#ff4444')
      .setTitle('⚔️ ARENA RESET INCOMING ⚔️')
      .setDescription('Prepare yourselves warriors! Arena about to reset!')
      .addFields(
        { name: '⏰ Time Until Reset', value: '**15 Minutes**', inline: true }
      )
      .setFooter({ text: 'Arena Reset Notification System' })
      .setTimestamp();

    await channel.send({ 
      content: serverConfig.roleId ? `<@&${serverConfig.roleId}>` : '@everyone',
      embeds: [embed] 
    });
    
    console.log(`[${new Date().toISOString()}] Arena message sent to server ${serverId}`);
  } catch (error) {
    console.error(`Error sending arena message to server ${serverId}:`, error);
  }
}

async function sendBear1Message(client, serverId, serverConfig) {
  try {
    const channel = await client.channels.fetch(serverConfig.channelId);
    
    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('🐻 BEAR TRAP 1 ALERT 🐻')
      .setDescription('Bear trap 1 is about to start! Get your troops ready!')
      .addFields(
        { name: '⏰ Time Until Trap', value: '**30 Minutes**', inline: true },
        { name: '📍 Zone', value: 'Bear Trap 1', inline: true }
      )
      .setFooter({ text: 'Bear Trap #1' })
      .setTimestamp();

    await channel.send({ 
      content: serverConfig.roleId ? `<@&${serverConfig.roleId}>` : '@everyone',
      embeds: [embed] 
    });
    
    console.log(`[${new Date().toISOString()}] Bear 1 trap message sent to server ${serverId}`);
  } catch (error) {
    console.error(`Error sending bear 1 message to server ${serverId}:`, error);
  }
}

async function sendBear2Message(client, serverId, serverConfig) {
  try {
    const channel = await client.channels.fetch(serverConfig.channelId);
    
    const embed = new EmbedBuilder()
      .setColor('#654321')
      .setTitle('🐻 BEAR TRAP 2 ALERT 🐻')
      .setDescription('Bear trap 2 is about to start! Get your troops ready!')
      .addFields(
        { name: '⏰ Time Until Trap', value: '**30 Minutes**', inline: true },
        { name: '📍 Zone', value: 'Bear Trap 2', inline: true }
      )
      .setFooter({ text: 'Bear Trap #2' })
      .setTimestamp();

    await channel.send({ 
      content: serverConfig.roleId ? `<@&${serverConfig.roleId}>` : '@everyone',
      embeds: [embed] 
    });
    
    console.log(`[${new Date().toISOString()}] Bear 2 trap message sent to server ${serverId}`);
  } catch (error) {
    console.error(`Error sending bear 2 message to server ${serverId}:`, error);
  }
}

function shouldRunBear(startDate) {
  const now = new Date();
  const start = new Date(startDate);
  
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  
  return daysDiff >= 0 && daysDiff % 2 === 0;
}

function startSchedulersForServer(client, serverId, serverConfig) {
  if (!serverTasks.has(serverId)) {
    serverTasks.set(serverId, {});
  }
  
  const tasks = serverTasks.get(serverId);
  const timezone = serverConfig.timezone || 'UTC';
  
  // Arena scheduler
  if (serverConfig.schedules.arena?.enabled) {
    if (tasks.arena) tasks.arena.stop();
    
    tasks.arena = cron.schedule(serverConfig.schedules.arena.cronTime, () => {
      sendArenaMessage(client, serverId, serverConfig);
    }, { timezone });
    
    console.log(`⚔️ [${serverId}] Arena scheduler started: ${serverConfig.schedules.arena.cronTime} (${timezone})`);
  }
  
  // Bear 1 scheduler
  if (serverConfig.schedules.bear1?.enabled) {
    if (tasks.bear1) tasks.bear1.stop();
    
    tasks.bear1 = cron.schedule(serverConfig.schedules.bear1.cronTime, () => {
      if (shouldRunBear(serverConfig.schedules.bear1.startDate)) {
        sendBear1Message(client, serverId, serverConfig);
      } else {
        console.log(`[${new Date().toISOString()}] [${serverId}] Bear 1 skipped`);
      }
    }, { timezone });
    
    console.log(`🐻 [${serverId}] Bear 1 scheduler started: ${serverConfig.schedules.bear1.cronTime}, from ${serverConfig.schedules.bear1.startDate} (${timezone})`);
  }
  
  // Bear 2 scheduler
  if (serverConfig.schedules.bear2?.enabled) {
    if (tasks.bear2) tasks.bear2.stop();
    
    tasks.bear2 = cron.schedule(serverConfig.schedules.bear2.cronTime, () => {
      if (shouldRunBear(serverConfig.schedules.bear2.startDate)) {
        sendBear2Message(client, serverId, serverConfig);
      } else {
        console.log(`[${new Date().toISOString()}] [${serverId}] Bear 2 skipped`);
      }
    }, { timezone });
    
    console.log(`🐻 [${serverId}] Bear 2 scheduler started: ${serverConfig.schedules.bear2.cronTime}, from ${serverConfig.schedules.bear2.startDate} (${timezone})`);
  }
}

function startAllSchedulers(client) {
  // Multi-server mode
  if (Object.keys(config.servers).length > 0) {
    console.log(`Starting schedulers for ${Object.keys(config.servers).length} server(s)...`);
    
    for (const [serverId, serverConfig] of Object.entries(config.servers)) {
      startSchedulersForServer(client, serverId, serverConfig);
    }
  } 
  // Single-server mode (backward compatibility)
  else if (config.channelId) {
    console.log('Starting schedulers in single-server mode...');
    
    const singleServerConfig = {
      channelId: config.channelId,
      roleId: config.roleId,
      timezone: config.timezone,
      schedules: {
        arena: {
          enabled: true,
          cronTime: config.scheduleTime
        },
        bear1: {
          enabled: true,
          cronTime: config.bear1Time,
          startDate: config.bear1start
        },
        bear2: {
          enabled: true,
          cronTime: config.bear2Time,
          startDate: config.bear2start
        }
      }
    };
    
    startSchedulersForServer(client, 'default', singleServerConfig);
  }
}

function stopAllSchedulers() {
  for (const [serverId, tasks] of serverTasks.entries()) {
    if (tasks.arena) {
      tasks.arena.stop();
      console.log(`⚔️ [${serverId}] Arena stopped`);
    }
    if (tasks.bear1) {
      tasks.bear1.stop();
      console.log(`🐻 [${serverId}] Bear 1 stopped`);
    }
    if (tasks.bear2) {
      tasks.bear2.stop();
      console.log(`🐻 [${serverId}] Bear 2 stopped`);
    }
  }
  serverTasks.clear();
}

module.exports = {
  startAllSchedulers,
  stopAllSchedulers,
  startSchedulersForServer,
  sendArenaMessage,  // Add this
  sendBear1Message,  // Add this
  sendBear2Message 
};