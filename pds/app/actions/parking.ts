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

  // 🚫 Prevent double booking
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
      user_id: user.id,
    },
  ])

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

//////////////////////////////////////////////////////
// ✅ NEW: Get all occupied spaces
//////////////////////////////////////////////////////

export async function getParkings() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('parking_spot')
    .select('space')

  if (error) {
    return { error: error.message }
  }

  return { data }
}

//////////////////////////////////////////////////////
// ✅ OPTIONAL: Remove parking (free a spot)
//////////////////////////////////////////////////////

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