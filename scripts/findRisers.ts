import { supabase } from '../packages/database/supabase'

type PriceRow = {
  card_id: string
  market_price: number | null
  collected_at: string
  cards: {
    name: string
    set_name: string | null
    rarity: string | null
  } | null
}

async function findRisers() {
  const { data, error } = await supabase
    .from('card_prices')
    .select(`
      card_id,
      market_price,
      collected_at,
      cards (
        name,
        set_name,
        rarity
      )
    `)
    .order('collected_at', { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  const latestByCard = new Map<string, PriceRow>()

  for (const row of data as unknown as PriceRow[]) {
    if (!row.market_price) continue

    if (!latestByCard.has(row.card_id)) {
      latestByCard.set(row.card_id, row)
    }
  }

  const bulkCandidates = [...latestByCard.values()]
    .filter((row) => row.market_price !== null && row.market_price <= 2)
    .sort((a, b) => (b.market_price ?? 0) - (a.market_price ?? 0))

  console.log('\nBulk Buster Candidates\n')

  for (const row of bulkCandidates.slice(0, 25)) {
    console.log(
      `${row.cards?.name} | ${row.cards?.set_name} | $${row.market_price}`
    )
  }
}

findRisers().catch((error) => {
  console.error(error)
  process.exit(1)
})