import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AdminPanel from './AdminPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.is_admin !== true) {
    notFound()
  }

  return <AdminPanel />
}
