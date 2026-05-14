import 'dotenv/config'
import {
  Client,
  Events,
  GatewayIntentBits,
} from 'discord.js'
import { supabase } from '../../packages/database/supabase'

type CardPriceRow = {
  card_id: string
  market_price: number | string | null
  collected_at: string
  cards:
    | {
        name: string
        set_name: string | null
      }
    | {
        name: string
        set_name: string | null
      }[]
    | null
}

type Snapshot = {
  cardId: string
  name: string
  setName: string
  marketPrice: number
  collectedAt: string
}

function parsePrice(value: number | string | null): number | null {
  if (value === null) return null

  const parsed = Number(value)

  if (Number.isNaN(parsed)) return null

  return parsed
}

function getCardInfo(row: CardPriceRow) {
  const card = Array.isArray(row.cards) ? row.cards[0] : row.cards

  return {
    name: card?.name ?? 'Unknown Card',
    setName: card?.set_name ?? 'Unknown Set',
  }
}

async function getRisers() {
  const { data, error } = await supabase
    .from('card_prices')
    .select(`
      card_id,
      market_price,
      collected_at,
      cards (
        name,
        set_name
      )
    `)
    .order('collected_at', { ascending: true })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as CardPriceRow[]
  const grouped = new Map<string, Snapshot[]>()

  for (const row of rows) {
    const marketPrice = parsePrice(row.market_price)

    if (marketPrice === null) continue

    const cardInfo = getCardInfo(row)

    const snapshot: Snapshot = {
      cardId: row.card_id,
      name: cardInfo.name,
      setName: cardInfo.setName,
      marketPrice,
      collectedAt: row.collected_at,
    }

    const existing = grouped.get(row.card_id) ?? []
    existing.push(snapshot)
    grouped.set(row.card_id, existing)
  }

  const risers = []

  for (const snapshots of grouped.values()) {
    if (snapshots.length < 2) continue

    snapshots.sort(
      (a, b) =>
        new Date(a.collectedAt).getTime() -
        new Date(b.collectedAt).getTime()
    )

    const oldest = snapshots[0]
    const latest = snapshots[snapshots.length - 1]

    if (!oldest || !latest) continue

    const dollarGain = latest.marketPrice - oldest.marketPrice

    const percentGain =
      oldest.marketPrice > 0
        ? (dollarGain / oldest.marketPrice) * 100
        : 0

    const wasBulk = oldest.marketPrice <= 2

    const meaningfulMove =
      percentGain >= 25 &&
      dollarGain >= 0.25

    if (!wasBulk || !meaningfulMove) continue

    risers.push({
      name: latest.name,
      setName: latest.setName,
      oldPrice: oldest.marketPrice,
      newPrice: latest.marketPrice,
      dollarGain,
      percentGain,
    })
  }

  return risers.sort((a, b) => b.percentGain - a.percentGain)
}

const token = process.env.DISCORD_TOKEN

if (!token) {
  throw new Error('Missing DISCORD_TOKEN.')
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  if (interaction.commandName === 'risers') {
    await interaction.deferReply()

    const risers = await getRisers()

    if (risers.length === 0) {
      await interaction.editReply('No bulk risers found yet.')
      return
    }

    const message = risers
      .slice(0, 10)
      .map((card, index) => {
        return [
          `**${index + 1}. ${card.name}**`,
          card.setName,
          `$${card.oldPrice.toFixed(2)} → $${card.newPrice.toFixed(2)}`,
          `+${card.percentGain.toFixed(1)}% / +$${card.dollarGain.toFixed(2)}`,
        ].join('\n')
      })
      .join('\n\n')

    await interaction.editReply(message)
  }
})

client.login(token)