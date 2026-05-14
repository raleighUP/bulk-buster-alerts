import { supabase } from '../packages/database/supabase'

async function test() {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .limit(1)

  if (error) {
    console.error(error)
    return
  }

  console.log('Connected successfully')
  console.log(data)
}

test()