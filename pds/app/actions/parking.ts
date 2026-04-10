'use server'

import { createClient } from '@/lib/supabase/server'

export async function createParking(space: string, name: string, plate: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

 
  const { data: existing } = await supabase
    .from('parking_spot')
    .select('id')
    .eq('space', space)
    .single()

  if (existing) {
    return { error: 'This spot is already occupied' }
  }

  const { error } = await supabase.from('parking_spot').insert([
  {
    space,
    name,
    plate,
    
  },
])

if (error) {
  if (error.message.includes('unique_space')) {
    return { error: 'This spot is already occupied' }
  }

  return { error: error.message }
}
}



export async function getParkings() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('parking_spot')
    .select('space, name, plate')

  if (error) {
    return { error: error.message }
  }

  return { data }
}



export async function removeParking(space: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('parking_spot')
    .delete()
    .eq('space', space)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}