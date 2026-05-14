import { supabase } from '../packages/database/supabase'

type PokemonTcgPrice = {
  low?: number
  mid?: number
  high?: number
  market?: number
  directLow?: number
}

type PokemonCardResponse = {
  data: {
    id: string
    tcgplayer?: {
      prices?: Record<string, PokemonTcgPrice>
    }
  }
}

function getBestPrice(prices?: Record<string, PokemonTcgPrice>) {
  if (!prices) return null

  const priceOptions = Object.values(prices)

  const marketPrice =
    priceOptions.find((price) => price.market !== undefined)?.market ?? null

  const lowPrice =
    priceOptions.find((price) => price.low !== undefined)?.low ?? null

  const midPrice =
    priceOptions.find((price) => price.mid !== undefined)?.mid ?? null

  const highPrice =
    priceOptions.find((price) => price.high !== undefined)?.high ?? null

  const directLowPrice =
    priceOptions.find((price) => price.directLow !== undefined)?.directLow ?? null

  return {
    market_price: marketPrice,
    low_price: lowPrice,
    mid_price: midPrice,
    high_price: highPrice,
    direct_low_price: directLowPrice,
  }
}

async function fetchCardPrices() {
  const { data: cards, error } = await supabase
    .from('cards')
    .select('id, name')
    .limit(50)

  if (error) {
    console.error(error)
    return
  }

  if (!cards || cards.length === 0) {
    console.log('No cards found.')
    return
  }

  let saved = 0

  for (const card of cards) {
    console.log(`Fetching price for ${card.name}...`)

    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards/${card.id}`
    )

    if (!response.ok) {
      console.log(`Failed to fetch ${card.name}`)
      continue
    }

    const json: PokemonCardResponse = await response.json()
    const prices = getBestPrice(json.data.tcgplayer?.prices)

    if (!prices || prices.market_price === null) {
      console.log(`No market price found for ${card.name}`)
      continue
    }

    const { error: insertError } = await supabase.from('card_prices').insert({
      card_id: card.id,
      ...prices,
    })

    if (insertError) {
      console.error(insertError)
      continue
    }

    saved++
    console.log(`Saved price for ${card.name}: $${prices.market_price}`)
  }

  console.log(`Finished. Saved ${saved} price snapshots.`)
}

fetchCardPrices().catch((error) => {
  console.error(error)
  process.exit(1)
})