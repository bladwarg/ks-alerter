const client = require('./bot/client');
const { startAllSchedulers } = require('./bot/scheduler');
const config = require('./config/config');
const {
  commands,
  handleSetup,
  handleSchedule,
  handleToggle,
  handleStatus,
  handleTest
} = require('./bot/commands');

// Register slash commands
const rest = new REST({ version: '10' }).setToken(config.botToken);

(async () => {
  try {
    console.log('🔄 Registering slash commands...');
    
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands.map(cmd => cmd.toJSON()) }
    );
    
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();

client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(`📊 Connected to ${client.guilds.cache.size} server(s)`);
  startAllSchedulers(client);
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  try {
    switch (interaction.commandName) {
      case 'setup':
        await handleSetup(interaction, client);
        break;
      case 'schedule':
        await handleSchedule(interaction, client);
        break;
      case 'toggle':
        await handleToggle(interaction, client);
        break;
      case 'status':
        await handleStatus(interaction);
        break;
      case 'test':
        await handleTest(interaction, client);
        break;
    }
  } catch (error) {
    console.error('Error handling command:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing your command.',
      ephemeral: true
    });
  }
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