const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startSchedulersForServer } = require('./scheduler');

const configPath = path.join(__dirname, '../config/servers.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return { servers: {} };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Convert HH:mm to cron format
function timeToCron(time) {
  const timeRegex = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;
  const match = time.match(timeRegex);
  
  if (!match) {
    return null;
  }
  
  const hour = parseInt(match[1]);
  const minute = parseInt(match[2]);
  
  return `${minute} ${hour} * * *`;
}

// Convert cron format to HH:mm for display
function cronToTime(cron) {
  const parts = cron.split(' ');
  if (parts.length >= 2) {
    const minute = parts[0].padStart(2, '0');
    const hour = parts[1].padStart(2, '0');
    return `${hour}:${minute}`;
  }
  return cron;
}

// Command definitions
const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Initial setup for the bot (Admin only)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel for notifications')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to mention (leave empty for @everyone)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('timezone')
        .setDescription('Timezone (e.g., UTC, Europe/Madrid, America/New_York)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Configure event schedules (Admin only)')
    .addStringOption(option =>
      option.setName('event')
        .setDescription('Event type')
        .setRequired(true)
        .addChoices(
          { name: 'Arena Reset', value: 'arena' },
          { name: 'Bear Trap 1', value: 'bear1' },
          { name: 'Bear Trap 2', value: 'bear2' }
        ))
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Time in HH:mm format (e.g., 09:00, 23:45)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('startdate')
        .setDescription('Start date for bi-daily events (YYYY-MM-DD)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Enable or disable an event (Admin only)')
    .addStringOption(option =>
      option.setName('event')
        .setDescription('Event type')
        .setRequired(true)
        .addChoices(
          { name: 'Arena Reset', value: 'arena' },
          { name: 'Bear Trap 1', value: 'bear1' },
          { name: 'Bear Trap 2', value: 'bear2' }
        ))
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable or disable')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('View current bot configuration'),

  new SlashCommandBuilder()
    .setName('test')
    .setDescription('Send a test notification (Admin only)')
    .addStringOption(option =>
      option.setName('event')
        .setDescription('Event type to test')
        .setRequired(true)
        .addChoices(
          { name: 'Arena Reset', value: 'arena' },
          { name: 'Bear Trap 1', value: 'bear1' },
          { name: 'Bear Trap 2', value: 'bear2' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// Command handlers
async function handleSetup(interaction, client) {
  const channel = interaction.options.getChannel('channel');
  const role = interaction.options.getRole('role');
  const timezone = interaction.options.getString('timezone') || 'UTC';
  
  // Validate timezone (basic check)
  try {
    new Date().toLocaleString('en-US', { timeZone: timezone });
  } catch (error) {
    await interaction.reply({
      content: `❌ Invalid timezone: "${timezone}". Examples: UTC, Europe/Madrid, America/New_York`,
      ephemeral: true
    });
    return;
  }
  
  const config = loadConfig();
  const serverId = interaction.guildId;
  
  config.servers[serverId] = {
    channelId: channel.id,
    roleId: role?.id || null,
    timezone: timezone,
    schedules: {
      arena: {
        enabled: false,
        cronTime: '45 23 * * *'
      },
      bear1: {
        enabled: false,
        cronTime: '30 0 * * *',
        startDate: new Date().toISOString().split('T')[0]
      },
      bear2: {
        enabled: false,
        cronTime: '30 18 * * *',
        startDate: new Date().toISOString().split('T')[0]
      }
    }
  };
  
  if (saveConfig(config)) {
    await interaction.reply({
      content: `✅ **Setup Complete!**\n` +
               `📢 Channel: ${channel}\n` +
               `👥 Role: ${role || '@everyone'}\n` +
               `🌍 Timezone: ${timezone}\n\n` +
               `Use \`/schedule\` to configure event times and \`/toggle\` to enable events.`,
      ephemeral: true
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to save configuration. Please try again.',
      ephemeral: true
    });
  }
}

async function handleSchedule(interaction, client) {
  const event = interaction.options.getString('event');
  const time = interaction.options.getString('time');
  const startDate = interaction.options.getString('startdate');
  
  // Convert HH:mm to cron
  const cronTime = timeToCron(time);
  
  if (!cronTime) {
    await interaction.reply({
      content: '❌ Invalid time format. Please use HH:mm format (e.g., 09:00, 23:45)',
      ephemeral: true
    });
    return;
  }
  
  const config = loadConfig();
  const serverId = interaction.guildId;
  
  if (!config.servers[serverId]) {
    await interaction.reply({
      content: '❌ Server not configured. Run `/setup` first.',
      ephemeral: true
    });
    return;
  }
  
  // Validate start date if provided
  if (startDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      await interaction.reply({
        content: '❌ Invalid date format. Please use YYYY-MM-DD format (e.g., 2026-02-27)',
        ephemeral: true
      });
      return;
    }
    
    const date = new Date(startDate);
    if (isNaN(date.getTime())) {
      await interaction.reply({
        content: '❌ Invalid date. Please check the date and try again.',
        ephemeral: true
      });
      return;
    }
  }
  
  config.servers[serverId].schedules[event].cronTime = cronTime;
  
  if (startDate && (event === 'bear1' || event === 'bear2')) {
    config.servers[serverId].schedules[event].startDate = startDate;
  }
  
  if (saveConfig(config)) {
    // Restart schedulers for this server
    startSchedulersForServer(client, serverId, config.servers[serverId]);
    
    const eventNames = {
      arena: 'Arena Reset',
      bear1: 'Bear Trap 1',
      bear2: 'Bear Trap 2'
    };
    
    let message = `✅ **Schedule Updated for ${eventNames[event]}**\n` +
                  `⏰ Time: ${time} (${config.servers[serverId].timezone})`;
    
    if (startDate) {
      message += `\n📅 Start Date: ${startDate}`;
      
      // Calculate next occurrence
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0) {
        const daysUntilNext = daysDiff % 2 === 0 ? 0 : 1;
        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + daysUntilNext);
        message += `\n🔮 Next occurrence: ${nextDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
      }
    }
    
    const isEnabled = config.servers[serverId].schedules[event].enabled;
    if (!isEnabled) {
      message += `\n\n⚠️ Event is currently **disabled**. Use \`/toggle event:${event} enabled:True\` to enable.`;
    } else {
      message += `\n\n✅ Event is **enabled** and will run automatically.`;
    }
    
    await interaction.reply({ content: message, ephemeral: true });
  } else {
    await interaction.reply({
      content: '❌ Failed to save configuration.',
      ephemeral: true
    });
  }
}

async function handleToggle(interaction, client) {
  const event = interaction.options.getString('event');
  const enabled = interaction.options.getBoolean('enabled');
  
  const config = loadConfig();
  const serverId = interaction.guildId;
  
  if (!config.servers[serverId]) {
    await interaction.reply({
      content: '❌ Server not configured. Run `/setup` first.',
      ephemeral: true
    });
    return;
  }
  
  config.servers[serverId].schedules[event].enabled = enabled;
  
  if (saveConfig(config)) {
    // Restart schedulers for this server
    startSchedulersForServer(client, serverId, config.servers[serverId]);
    
    const eventNames = {
      arena: 'Arena Reset',
      bear1: 'Bear Trap 1',
      bear2: 'Bear Trap 2'
    };
    
    const eventConfig = config.servers[serverId].schedules[event];
    const time = cronToTime(eventConfig.cronTime);
    
    let message = `✅ **${eventNames[event]}** has been **${enabled ? 'enabled' : 'disabled'}**.`;
    
    if (enabled) {
      message += `\n⏰ Scheduled for: ${time} (${config.servers[serverId].timezone})`;
      
      if (eventConfig.startDate && (event === 'bear1' || event === 'bear2')) {
        message += `\n📅 Starting from: ${eventConfig.startDate} (every 2 days)`;
      }
    }
    
    await interaction.reply({
      content: message,
      ephemeral: true
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to save configuration.',
      ephemeral: true
    });
  }
}

async function handleStatus(interaction) {
  const config = loadConfig();
  const serverId = interaction.guildId;
  
  if (!config.servers[serverId]) {
    await interaction.reply({
      content: '❌ Server not configured. Run `/setup` first.',
      ephemeral: true
    });
    return;
  }
  
  const serverConfig = config.servers[serverId];
  const channel = await interaction.guild.channels.fetch(serverConfig.channelId);
  const role = serverConfig.roleId ? await interaction.guild.roles.fetch(serverConfig.roleId) : null;
  
  const eventNames = {
    arena: 'Arena Reset',
    bear1: 'Bear Trap 1',
    bear2: 'Bear Trap 2'
  };
  
  let status = `📊 **Bot Configuration Status**\n\n` +
               `📢 Channel: ${channel}\n` +
               `👥 Role: ${role || '@everyone'}\n` +
               `🌍 Timezone: ${serverConfig.timezone}\n\n` +
               `**Event Schedules:**\n`;
  
  for (const [eventName, eventConfig] of Object.entries(serverConfig.schedules)) {
    const emoji = eventConfig.enabled ? '✅' : '❌';
    const time = cronToTime(eventConfig.cronTime);
    
    status += `\n${emoji} **${eventNames[eventName]}**: ${eventConfig.enabled ? 'Enabled' : 'Disabled'}\n`;
    status += `   ⏰ Time: ${time}\n`;
    
    if (eventConfig.startDate && (eventName === 'bear1' || eventName === 'bear2')) {
      status += `   📅 Start Date: ${eventConfig.startDate} (every 2 days)\n`;
      
      if (eventConfig.enabled) {
        // Calculate next occurrence
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(eventConfig.startDate);
        start.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 0) {
          const daysUntilNext = daysDiff % 2 === 0 ? 0 : 1;
          const nextDate = new Date(today);
          nextDate.setDate(nextDate.getDate() + daysUntilNext);
          status += `   🔮 Next: ${nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${time}\n`;
        }
      }
    }
  }
  
  await interaction.reply({ content: status, ephemeral: true });
}

async function handleTest(interaction, client) {
  const event = interaction.options.getString('event');
  const config = loadConfig();
  const serverId = interaction.guildId;
  
  if (!config.servers[serverId]) {
    await interaction.reply({
      content: '❌ Server not configured. Run `/setup` first.',
      ephemeral: true
    });
    return;
  }
  
  const eventNames = {
    arena: 'Arena Reset',
    bear1: 'Bear Trap 1',
    bear2: 'Bear Trap 2'
  };
  
  await interaction.reply({
    content: `🧪 Sending test notification for **${eventNames[event]}**...`,
    ephemeral: true
  });
  
  const { sendArenaMessage, sendBear1Message, sendBear2Message } = require('./scheduler');
  
  try {
    if (event === 'arena') {
      await sendArenaMessage(client, serverId, config.servers[serverId]);
    } else if (event === 'bear1') {
      await sendBear1Message(client, serverId, config.servers[serverId]);
    } else if (event === 'bear2') {
      await sendBear2Message(client, serverId, config.servers[serverId]);
    }
  } catch (error) {
    console.error('Test notification error:', error);
    await interaction.followUp({
      content: '❌ Failed to send test notification. Check bot permissions.',
      ephemeral: true
    });
  }
}

module.exports = {
  commands,
  handleSetup,
  handleSchedule,
  handleToggle,
  handleStatus,
  handleTest
};