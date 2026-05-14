import { supabase } from '../packages/database/supabase'

type PokemonCard = {
  id: string
  name: string
  number?: string
  rarity?: string
  set?: {
    id: string
    name: string
  }
  images?: {
    small?: string
    large?: string
  }
  tcgplayer?: {
    url?: string
  }
}

async function importCards() {
  let page = 1
  const pageSize = 250
  let imported = 0

  while (true) {
    console.log(`Fetching page ${page}...`)

    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?page=${page}&pageSize=${pageSize}`
    )

    const json = await response.json()
    const cards: PokemonCard[] = json.data

    if (!cards.length) break

    const cleanedCards = cards.map((card) => ({
      id: card.id,
      name: card.name,
      set_id: card.set?.id ?? null,
      set_name: card.set?.name ?? null,
      number: card.number ?? null,
      rarity: card.rarity ?? null,
      image_small: card.images?.small ?? null,
      image_large: card.images?.large ?? null,
      tcgplayer_url: card.tcgplayer?.url ?? null,
    }))

    const { error } = await supabase
      .from('cards')
      .upsert(cleanedCards)

    if (error) {
      console.error(error)
      return
    }

    imported += cleanedCards.length
    console.log(`Imported: ${imported}`)

    if (cards.length < pageSize) break

    page++
  }

  console.log(`Finished importing ${imported} cards`)
}

importCards()