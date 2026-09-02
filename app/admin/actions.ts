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

export async function createPlayer(fd: FormData) {
  const { s, user } = await admin()

  const first_name = String(fd.get('first_name') || '').trim()
  const last_name = String(fd.get('last_name') || '').trim()
  const position = String(fd.get('position') || '').trim()
  const shirt_number = Number(fd.get('shirt_number'))

  if (!first_name || !last_name) {
    throw new Error('Spilleren skal have fornavn og efternavn')
  }

  if (!Number.isInteger(shirt_number)) {
    throw new Error('Trøjenummer skal være et tal')
  }

  const { error } = await s.from('players').insert({
    first_name,
    last_name,
    position: position || null,
    shirt_number,
    active: true,
  })

  if (error) {
    console.error('CREATE PLAYER ERROR:', error)
    throw new Error('Kunne ikke oprette spilleren')
  }

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Oprettede spiller ${first_name} ${last_name} #${shirt_number}`,
  })

  revalidatePath('/trup')
  revalidatePath('/admin/spillere')
}

export async function updatePlayer(fd: FormData) {
  const { s, user } = await admin()

  const id = String(fd.get('id'))
  const first_name = String(fd.get('first_name') || '').trim()
  const last_name = String(fd.get('last_name') || '').trim()
  const position = String(fd.get('position') || '').trim()
  const shirt_number = Number(fd.get('shirt_number'))

  const { error } = await s
    .from('players')
    .update({
      first_name,
      last_name,
      position: position || null,
      shirt_number,
    })
    .eq('id', id)

  if (error) {
    console.error('UPDATE PLAYER ERROR:', error)
    throw new Error('Kunne ikke opdatere spilleren')
  }

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Redigerede spiller ${first_name} ${last_name}`,
  })

  revalidatePath('/trup')
  revalidatePath('/admin/spillere')
}

export async function removePlayer(fd: FormData) {
  const { s, user } = await admin()

  const id = String(fd.get('id'))

  const { data: player } = await s
    .from('players')
    .select('first_name,last_name')
    .eq('id', id)
    .single()

  const { error } = await s
    .from('players')
    .update({
      active: false,
    })
    .eq('id', id)

  if (error) {
    console.error('REMOVE PLAYER ERROR:', error)
    throw new Error('Kunne ikke fjerne spilleren')
  }

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Fjernede spiller ${player?.first_name || ''} ${player?.last_name || ''} fra truppen`,
  })

  revalidatePath('/trup')
  revalidatePath('/admin/spillere')
}export async function updateLiveScore(fd: FormData) {
  const { s, user } = await admin()

  const id = String(fd.get('id'))
  const home_score = Number(fd.get('home_score'))
  const away_score = Number(fd.get('away_score'))

  const { error } = await s
    .from('matches')
    .update({
      home_score,
      away_score,
    })
    .eq('id', id)

  if (error) {
    console.error('UPDATE SCORE ERROR:', error)
    throw new Error('Kunne ikke opdatere stillingen')
  }

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Opdaterede stillingen i kamp ${id} til ${home_score}-${away_score}`,
  })

  revalidatePath('/admin/kampe')
  revalidatePath('/kampe')
  revalidatePath(`/kampe/${id}`)
}

export async function createMatchEvent(fd: FormData) {
  const { s, user } = await admin()

  const match_id = String(fd.get('match_id'))
  const event_type = String(fd.get('event_type'))
  const team = String(fd.get('team'))
  const player_id = String(fd.get('player_id') || '')
  const assist_player_id = String(fd.get('assist_player_id') || '')
  const minute = Number(fd.get('minute'))

  const row = {
    match_id,
    event_type,
    team,
    player_id: player_id || null,
    assist_player_id: assist_player_id || null,
    minute,
  }

  const { error } = await s
    .from('match_events')
    .insert(row)

 if (error) {
  console.error('CREATE MATCH EVENT ERROR:', error)
  throw new Error(
    `Supabase-fejl: ${error.code} - ${error.message}`
  )
}

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Registrerede ${event_type} i kamp ${match_id} (${minute}')`,
  })

  revalidatePath('/admin/kampe')
  revalidatePath('/kampe')
  revalidatePath(`/kampe/${match_id}`)
} export async function updateMatchEvent(fd: FormData) {
  const { s, user } = await admin()

  const id = String(fd.get('id'))
  const match_id = String(fd.get('match_id'))
  const minute = Number(fd.get('minute'))

  if (!Number.isInteger(minute) || minute < 1 || minute > 60) {
    throw new Error('Kampminuttet skal være mellem 1 og 60')
  }

  const { error } = await s
    .from('match_events')
    .update({
      minute,
    })
    .eq('id', id)

  if (error) {
    console.error('UPDATE MATCH EVENT ERROR:', error)
    throw new Error('Kunne ikke ændre kampminuttet')
  }

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Ændrede kamphændelse ${id} til minut ${minute}`,
  })

  revalidatePath('/admin/kampe')
  revalidatePath(`/kampe/${match_id}`)
}

export async function deleteMatchEvent(fd: FormData) {
  const { s, user } = await admin()

  const id = String(fd.get('id'))
  const match_id = String(fd.get('match_id'))

  const { error } = await s
    .from('match_events')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('DELETE MATCH EVENT ERROR:', error)
    throw new Error('Kunne ikke slette kamphændelsen')
  }

  await s.from('audit_logs').insert({
    admin_id: user.id,
    action: `Slettede kamphændelse ${id}`,
  })

  revalidatePath('/admin/kampe')
  revalidatePath(`/kampe/${match_id}`)
}