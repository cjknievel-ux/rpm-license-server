require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN || !ADMIN_USER_ID || !GUILD_ID) {
  console.error('Missing DISCORD_TOKEN, ADMIN_USER_ID, or GUILD_ID in env');
  process.exit(1);
}

function generateCode() {
  const suffix = String(Math.floor(10000 + Math.random() * 90000));
  return 'RPMLU' + suffix;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`Bot logged as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const commands = [
    new SlashCommandBuilder()
      .setName('gencode')
      .setDescription('Generate 10 license codes')
  ];

  rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands })
    .catch(console.error);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName !== 'gencode') return;

  if (interaction.user.id !== ADMIN_USER_ID) {
    return interaction.reply({ content: 'Unauthorized', ephemeral: true });
  }

  await interaction.reply({ content: 'Generating...', ephemeral: true });

  const rawCodes = [];
  for (let i = 0; i < 10; i++) {
    rawCodes.push(generateCode());
  }
  const codes = rawCodes.join('\n');

  const paths = [
    require('path').resolve(__dirname, '..', 'valid_codes.txt'),
    require('path').resolve(__dirname, '..', '..', 'RPMLESSLAGGYLOADER', 'RPMLESSLAGGYLOADER', 'valid_codes.txt')
  ];
  for (const p of paths) {
    try { require('fs').writeFileSync(p, codes + '\n'); } catch {}
  }

  const display = rawCodes.map(c => '`' + c + '`').join('\n');
  try {
    await interaction.user.send('**10 License Codes (saved to valid_codes.txt):**\n' + display);
    await interaction.editReply({ content: 'Codes saved to valid_codes.txt! Check your DMs.', ephemeral: true });
  } catch {
    await interaction.editReply({ content: 'Codes saved to valid_codes.txt!\n\n' + display, ephemeral: true });
  }
});

client.login(DISCORD_TOKEN);