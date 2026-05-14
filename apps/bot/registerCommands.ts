import 'dotenv/config'
import { REST, Routes, SlashCommandBuilder } from 'discord.js'

const token = process.env.DISCORD_TOKEN
const clientId = process.env.DISCORD_CLIENT_ID
const guildId = process.env.DISCORD_GUILD_ID

if (!token || !clientId || !guildId) {
  throw new Error('Missing Discord environment variables.')
}

const commands = [
  new SlashCommandBuilder()
    .setName('risers')
    .setDescription('Show bulk Pokémon cards rising in price.')
    .toJSON(),
]

const rest = new REST({ version: '10' }).setToken(token)

async function registerCommands() {
  console.log('Registering Discord slash commands...')

  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  )

  console.log('Discord slash commands registered.')
}

registerCommands().catch((error) => {
  console.error(error)
  process.exit(1)
})