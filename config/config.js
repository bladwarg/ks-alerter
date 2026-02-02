require('dotenv').config();

module.exports = {
  botToken: process.env.BOT_TOKEN,
  channelId: process.env.CHANNEL_ID,
  scheduleTime: process.env.SCHEDULE_TIME || '0 9 * * *',
  timezone: process.env.TIMEZONE || 'Europe/Madrid'
};