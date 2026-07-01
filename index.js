require('dotenv').config();

const express = require('express');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('crypto');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const GUILD_ID = process.env.GUILD_ID;
const PORT = process.env.PORT || 3000;

if (!DISCORD_TOKEN || !ADMIN_USER_ID || !GUILD_ID) {
  console.error('Missing DISCORD_TOKEN, ADMIN_USER_ID, or GUILD_ID in env');
  process.exit(1);
}

const db = new DatabaseSync('licenses.db');
db.exec(`CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)`);

const insertStmt = db.prepare('INSERT OR IGNORE INTO codes (code) VALUES (?)');
const checkStmt = db.prepare('SELECT used FROM codes WHERE code = ?');
const useStmt = db.prepare('UPDATE codes SET used = 1 WHERE code = ? AND used = 0');

function generateCode() {
  const suffix = String(Math.floor(10000 + Math.random() * 90000));
  return 'RPMLU' + suffix;
}

const app = express();
app.use(express.json());

app.post('/validate', (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.json({ success: false, message: 'Missing code' });
  }

  const row = checkStmt.get(code);
  if (!row) {
    return res.json({ success: false, message: 'Invalid code' });
  }
  if (row.used) {
    return res.json({ success: false, message: 'Code already used' });
  }

  useStmt.run(code);
  res.json({ success: true, message: 'License activated' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`Bot logged as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const commands = [
    new SlashCommandBuilder()
      .setName('gencode')
      .setDescription('Generate a new license code')
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

  const code = generateCode();
  insertStmt.run(code);
  await interaction.reply({ content: `\`${code}\``, ephemeral: true });
});

client.login(DISCORD_TOKEN);

app.listen(PORT, () => {
  console.log(`HTTP server on port ${PORT}`);
  const l = require('localtunnel');
  l(PORT, (err, tunnel) => {
    if (err) return console.log('Tunnel error:', err.message);
    console.log('Public URL:', tunnel.url);
    require('fs').writeFileSync('tunnel-url.txt', tunnel.url);
  });
});
