'use server'

import { createServerSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function admin() {
  const s = await createServerSupabase()

  const {
    data: { user },
  } = await s.auth.getUser()

  if (!user) throw new Error('Ikke autoriseret')

  const { data: p } = await s
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!p?.is_admin) throw new Error('Ikke administrator')

  return { s, user }
}

export async function createMatch(fd: FormData) {
  const { s, user } = await admin()

  const row = {
    home_team: String(fd.get('home_team')),
    away_team: String(fd.get('away_team')),
    date: String(fd.get('date') || '') || null,
    kickoff_time: String(fd.get('kickoff_time') || '') || null,
    stadium: String(fd.get('stadium') || '') || null,
    competition: String(fd.get('competition') || '9. divisionen'),
    status: String(fd.get('status') || 'Kommende'),
  }

  const { error } = await s.from('matches').insert(row)

  if (error) throw error

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Oprettede kamp ${row.home_team} vs ${row.away_team}`,
  })

  revalidatePath('/')
  revalidatePath('/kampe')
  revalidatePath('/admin/kampe')
}

export async function updateMatch(fd: FormData) {
  const { s, user } = await admin()

  const id = String(fd.get('id'))

  const row = {
    date: String(fd.get('date') || '') || null,
    kickoff_time: String(fd.get('kickoff_time') || '') || null,
    stadium: String(fd.get('stadium') || '') || null,
    status: String(fd.get('status') || 'Kommende'),
  }

  const { error } = await s
    .from('matches')
    .update(row)
    .eq('id', id)

  if (error) {
    console.error('UPDATE MATCH ERROR:', error)
    throw new Error('Kunne ikke opdatere kampen')
  }

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Redigerede kamp ${id}`,
  })

  revalidatePath('/')
  revalidatePath('/kampe')
  revalidatePath('/admin/kampe')
}

export async function updateOrder(fd: FormData) {
  const { s, user } = await admin()

  const id = String(fd.get('id'))
  const status = String(fd.get('status'))

  const { error } = await s
    .from('orders')
    .update({
      order_status: status,
      payment_status: status === 'Betalt' ? 'Betalt' : undefined,
    })
    .eq('id', id)

  if (error) throw error

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Ændrede ordre ${id} til ${status}`,
  })

  revalidatePath('/admin/ordrer')
}

export async function createAnnouncement(fd: FormData) {
  const { s, user } = await admin()

  const row = {
    title: String(fd.get('title')),
    body: String(fd.get('body')),
    type: String(fd.get('type') || 'Information'),
    active: true,
  }

  const { error } = await s.from('announcements').insert(row)

  if (error) throw error

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Oprettede meddelelse: ${row.title}`,
  })

  revalidatePath('/')
  revalidatePath('/admin/meddelelser')
}