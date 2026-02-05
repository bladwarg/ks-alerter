require('dotenv').config();

module.exports = {
  botToken: process.env.BOT_TOKEN,
  channelId: process.env.CHANNEL_ID,
  scheduleTime: process.env.SCHEDULE_TIME || '0 9 * * *',
  bear1Time: process.env.BEAR1_TIME || '30 0 */2 * *',
  bear2Time: process.env.BEAR2_TIME || '30 19 */2 * *',
  timezone: process.env.TIMEZONE || 'Europe/Madrid'
};