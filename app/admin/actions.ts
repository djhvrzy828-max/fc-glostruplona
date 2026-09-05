'use server'

import { createServerSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendPushToAll } from '@/lib/send-push'
import { getMatchState } from '@/lib/match-time'

async function admin() {
  const s = await createServerSupabase()

  const {
    data: { user },
  } = await s.auth.getUser()

  if (!user) {
    throw new Error('Ikke autoriseret')
  }

  const { data: p } = await s
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!p?.is_admin) {
    throw new Error('Ikke administrator')
  }

  return { s, user }
}

function getCopenhagenDate() {
  const parts = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Europe/Copenhagen',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).formatToParts(new Date())

  const values: Record<string, string> = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return `${values.year}-${values.month}-${values.day}`
}

async function syncMatchScore(
  s: Awaited<ReturnType<typeof createServerSupabase>>,
  matchId: string
) {
  const {
    data: goals,
    error: goalsError,
  } = await s
    .from('match_events')
    .select('team')
    .eq('match_id', matchId)
    .eq('event_type', 'goal')

  if (goalsError) {
    console.error(
      'SYNC SCORE GOALS ERROR:',
      goalsError
    )

    throw new Error(
      'Kunne ikke beregne kampens score'
    )
  }

  const homeScore =
    goals?.filter(
      (goal: any) =>
        goal.team === 'home'
    ).length || 0

  const awayScore =
    goals?.filter(
      (goal: any) =>
        goal.team === 'away'
    ).length || 0

  const { error: scoreError } = await s
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
    })
    .eq('id', matchId)

  if (scoreError) {
    console.error(
      'SYNC SCORE ERROR:',
      scoreError
    )

    throw new Error(
      'Kunne ikke synkronisere kampens score'
    )
  }

  return {
    homeScore,
    awayScore,
  }
}

export async function createMatch(
  fd: FormData
) {
  const { s, user } = await admin()

  const row = {
    home_team: String(
      fd.get('home_team')
    ),

    away_team: String(
      fd.get('away_team')
    ),

    date:
      String(
        fd.get('date') || ''
      ) || null,

    kickoff_time:
      String(
        fd.get('kickoff_time') || ''
      ) || null,

    stadium:
      String(
        fd.get('stadium') || ''
      ) || null,

    competition: String(
      fd.get('competition') ||
        '9. divisionen'
    ),

    status: String(
      fd.get('status') ||
        'Kommende'
    ),
  }

  const { error } = await s
    .from('matches')
    .insert(row)

  if (error) {
    throw error
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Oprettede kamp ${row.home_team} vs ${row.away_team}`,
    })

  revalidatePath('/')
  revalidatePath('/kampe')
  revalidatePath('/admin/kampe')
}

export async function updateMatch(
  fd: FormData
) {
  const { s, user } = await admin()

  const id = String(
    fd.get('id')
  )

  const row = {
    date:
      String(
        fd.get('date') || ''
      ) || null,

    kickoff_time:
      String(
        fd.get('kickoff_time') || ''
      ) || null,

    stadium:
      String(
        fd.get('stadium') || ''
      ) || null,

    status: String(
      fd.get('status') ||
        'Kommende'
    ),
  }

  const { error } = await s
    .from('matches')
    .update(row)
    .eq('id', id)

  if (error) {
    console.error(
      'UPDATE MATCH ERROR:',
      error
    )

    throw new Error(
      'Kunne ikke opdatere kampen'
    )
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,
      action:
        `Redigerede kamp ${id}`,
    })

  revalidatePath('/')
  revalidatePath('/kampe')
  revalidatePath('/admin/kampe')
  revalidatePath(
    `/kampe/${id}`
  )
}

export async function updateOrder(
  fd: FormData
) {
  const { s, user } = await admin()

  const id = String(
    fd.get('id')
  )

  const status = String(
    fd.get('status')
  )

  const { error } = await s
    .from('orders')
    .update({
      order_status: status,

      payment_status:
        status === 'Betalt'
          ? 'Betalt'
          : undefined,
    })
    .eq('id', id)

  if (error) {
    throw error
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Ændrede ordre ${id} til ${status}`,
    })

  revalidatePath(
    '/admin/ordrer'
  )
}

export async function createAnnouncement(
  fd: FormData
) {
  const { s, user } = await admin()

  /*
   * ==========================================
   * HENT FELTER
   * ==========================================
   */

  const title = String(
    fd.get('title') || ''
  ).trim()

  const body = String(
    fd.get('body') || ''
  ).trim()

  const type = String(
    fd.get('type') ||
      'Information'
  ).trim()

  /*
   * expires_at kommer fra et
   * datetime-local input på admin-siden.
   *
   * Hvis feltet er tomt, bliver meddelelsen
   * stående indtil admin fjerner den.
   */
  const expiresAtRaw = String(
    fd.get('expires_at') || ''
  ).trim()

  /*
   * ==========================================
   * VALIDERING
   * ==========================================
   */

  if (!title) {
    throw new Error(
      'Meddelelsen skal have en titel'
    )
  }

  if (!body) {
    throw new Error(
      'Meddelelsen skal have en tekst'
    )
  }

  let expiresAt:
    | string
    | null = null

  if (expiresAtRaw) {
    const parsedDate =
      new Date(expiresAtRaw)

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      throw new Error(
        'Ugyldig udløbstid'
      )
    }

    if (
      parsedDate.getTime() <=
      Date.now()
    ) {
      throw new Error(
        'Udløbstiden skal være i fremtiden'
      )
    }

    expiresAt =
      parsedDate.toISOString()
  }

  /*
   * ==========================================
   * OPRET MEDDELELSE
   * ==========================================
   */

  const row = {
    title,
    body,
    type,

    active: true,

    published_at:
      new Date().toISOString(),

    expires_at:
      expiresAt,

    removed_at:
      null,
  }

  const {
    data: announcement,
    error,
  } = await s
    .from('announcements')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    console.error(
      'CREATE ANNOUNCEMENT ERROR:',
      error
    )

    throw new Error(
      'Kunne ikke oprette meddelelsen'
    )
  }

  /*
   * ==========================================
   * AUDIT LOG
   * ==========================================
   */

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Oprettede meddelelse: ${title}`,
    })

  /*
   * ==========================================
   * PUSH-NOTIFIKATION
   *
   * Meddelelsen er allerede gemt på dette
   * tidspunkt. Derfor forsvinder den ikke,
   * hvis push-tjenesten skulle fejle.
   * ==========================================
   */

  try {
    const pushTitle =
      type
        ? `📢 ${type}`
        : '📢 NY MEDDELELSE'

    await sendPushToAll({
      title: pushTitle,

      body:
        `${title} — ${body}`,

      url: '/',
    })

    console.log(
      'ANNOUNCEMENT PUSH SENT:',
      {
        announcementId:
          announcement.id,

        title,
      }
    )
  } catch (pushError) {
    console.error(
      'ANNOUNCEMENT PUSH ERROR:',
      pushError
    )
  }

  /*
   * ==========================================
   * OPDATER SIDER
   * ==========================================
   */

  revalidatePath('/')

  revalidatePath(
    '/admin/meddelelser'
  )
}
export async function removeAnnouncement(
  fd: FormData
) {
  const { s, user } = await admin()

  const id = String(
    fd.get('id') || ''
  ).trim()

  if (!id) {
    throw new Error(
      'Meddelelses-ID mangler'
    )
  }

  const {
    data: announcement,
    error: announcementError,
  } = await s
    .from('announcements')
    .select(
      'id,title'
    )
    .eq('id', id)
    .single()

  if (
    announcementError ||
    !announcement
  ) {
    console.error(
      'REMOVE ANNOUNCEMENT GET ERROR:',
      announcementError
    )

    throw new Error(
      'Kunne ikke finde meddelelsen'
    )
  }

  const {
    error: updateError,
  } = await s
    .from('announcements')
    .update({
      active: false,
      removed_at:
        new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error(
      'REMOVE ANNOUNCEMENT ERROR:',
      updateError
    )

    throw new Error(
      'Kunne ikke fjerne meddelelsen'
    )
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,
      action:
        `Fjernede meddelelse: ${announcement.title}`,
    })

  revalidatePath('/')

  revalidatePath(
    '/admin/meddelelser'
  )
}
export async function createPlayer(
  fd: FormData
) {
  const { s, user } = await admin()

  const first_name = String(
    fd.get('first_name') || ''
  ).trim()

  const last_name = String(
    fd.get('last_name') || ''
  ).trim()

  const position = String(
    fd.get('position') || ''
  ).trim()

  const video_url = String(
    fd.get('video_url') || ''
  ).trim()

  const shirt_number = Number(
    fd.get('shirt_number')
  )

  if (
    !first_name ||
    !last_name
  ) {
    throw new Error(
      'Spilleren skal have fornavn og efternavn'
    )
  }

  if (
    !Number.isInteger(
      shirt_number
    )
  ) {
    throw new Error(
      'Trøjenummer skal være et tal'
    )
  }

  const { error } = await s
    .from('players')
    .insert({
      first_name,
      last_name,

      position:
        position || null,

      shirt_number,

      video_url:
        video_url || null,

      active: true,
    })

  if (error) {
    console.error(
      'CREATE PLAYER ERROR:',
      error
    )

    throw new Error(
      'Kunne ikke oprette spilleren'
    )
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Oprettede spiller ${first_name} ${last_name} #${shirt_number}`,
    })

  revalidatePath('/trup')

  revalidatePath(
    '/admin/spillere'
  )
}

export async function updatePlayer(
  fd: FormData
) {
  const { s, user } = await admin()

  const id = String(
    fd.get('id')
  )

  const first_name = String(
    fd.get('first_name') || ''
  ).trim()

  const last_name = String(
    fd.get('last_name') || ''
  ).trim()

  const position = String(
    fd.get('position') || ''
  ).trim()

  const video_url = String(
    fd.get('video_url') || ''
  ).trim()

  const shirt_number = Number(
    fd.get('shirt_number')
  )

  const { error } = await s
    .from('players')
    .update({
      first_name,
      last_name,

      position:
        position || null,

      shirt_number,

      video_url:
        video_url || null,
    })
    .eq('id', id)

  if (error) {
    console.error(
      'UPDATE PLAYER ERROR:',
      error
    )

    throw new Error(
      'Kunne ikke opdatere spilleren'
    )
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Redigerede spiller ${first_name} ${last_name}`,
    })

  revalidatePath('/trup')
  revalidatePath(`/trup/${id}`)

  revalidatePath(
    '/admin/spillere'
  )
}

export async function uploadPlayerVideo(
  fd: FormData
) {
  const { s, user } = await admin()

  const playerId = String(
    fd.get('player_id') || ''
  ).trim()

  const file = fd.get('video')

  if (!playerId) {
    throw new Error(
      'Spiller-ID mangler'
    )
  }

  if (
    !(file instanceof File) ||
    file.size === 0
  ) {
    throw new Error(
      'Vælg en video først'
    )
  }

  if (
    !file.type.startsWith('video/')
  ) {
    throw new Error(
      'Filen skal være en video'
    )
  }

  /*
   * Hold videoerne små nok til hurtig
   * afspilning på telefon.
   */
  const maxSize =
    20 * 1024 * 1024

  if (file.size > maxSize) {
    throw new Error(
      'Videoen må højst fylde 20 MB'
    )
  }

  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ''
      ) || 'mp4'

  /*
   * Samme spiller får samme filnavn.
   * upsert erstatter derfor den gamle video.
   */
  const storagePath =
    `${playerId}/profile.${extension}`

  const bytes =
    await file.arrayBuffer()

  const {
    error: uploadError,
  } = await s.storage
    .from('player-videos')
    .upload(
      storagePath,
      bytes,
      {
        contentType:
          file.type ||
          'video/mp4',

        upsert: true,

        cacheControl: '3600',
      }
    )

  if (uploadError) {
    console.error(
      'PLAYER VIDEO UPLOAD ERROR:',
      uploadError
    )

    throw new Error(
      'Kunne ikke uploade videoen'
    )
  }

  const {
    data: publicUrlData,
  } = s.storage
    .from('player-videos')
    .getPublicUrl(
      storagePath
    )

  const videoUrl =
    publicUrlData.publicUrl

  const {
    data: player,
    error: playerError,
  } = await s
    .from('players')
    .select(
      'first_name,last_name'
    )
    .eq('id', playerId)
    .single()

  if (playerError || !player) {
    console.error(
      'PLAYER VIDEO PLAYER ERROR:',
      playerError
    )

    /*
     * Fjern filen igen, hvis spilleren
     * ikke kunne findes.
     */
    await s.storage
      .from('player-videos')
      .remove([storagePath])

    throw new Error(
      'Kunne ikke finde spilleren'
    )
  }

  const { error: updateError } =
    await s
      .from('players')
      .update({
        video_url: videoUrl,
      })
      .eq('id', playerId)

  if (updateError) {
    console.error(
      'PLAYER VIDEO URL ERROR:',
      updateError
    )

    throw new Error(
      'Videoen blev uploadet, men kunne ikke gemmes på spilleren'
    )
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Uploadede spillervideo til ${player.first_name} ${player.last_name}`,
    })

  revalidatePath('/trup')
  revalidatePath(
    `/trup/${playerId}`
  )
  revalidatePath(
    '/admin/spillere'
  )
}

export async function removePlayer(
  fd: FormData
) {
  const { s, user } = await admin()

  const id = String(
    fd.get('id')
  )

  const { data: player } = await s
    .from('players')
    .select(
      'first_name,last_name'
    )
    .eq('id', id)
    .single()

  const { error } = await s
    .from('players')
    .update({
      active: false,
    })
    .eq('id', id)

  if (error) {
    console.error(
      'REMOVE PLAYER ERROR:',
      error
    )

    throw new Error(
      'Kunne ikke fjerne spilleren'
    )
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Fjernede spiller ${player?.first_name || ''} ${player?.last_name || ''} fra truppen`,
    })

  revalidatePath('/trup')

  revalidatePath(
    '/admin/spillere'
  )
}

export async function updateLiveScore(
  fd: FormData
) {
  const { s, user } = await admin()

  const id = String(
    fd.get('id')
  )

  const home_score = Number(
    fd.get('home_score')
  )

  const away_score = Number(
    fd.get('away_score')
  )

  const { error } = await s
    .from('matches')
    .update({
      home_score,
      away_score,
    })
    .eq('id', id)

  if (error) {
    console.error(
      'UPDATE SCORE ERROR:',
      error
    )

    throw new Error(
      'Kunne ikke opdatere stillingen'
    )
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Opdaterede stillingen i kamp ${id} til ${home_score}-${away_score}`,
    })

  revalidatePath('/')
  revalidatePath('/admin/kampe')
  revalidatePath('/kampe')

  revalidatePath(
    `/kampe/${id}`
  )
}

export async function createMatchEvent(
  fd: FormData
) {
  const { s, user } = await admin()

  const match_id = String(
    fd.get('match_id')
  )

  const event_type = String(
    fd.get('event_type')
  )

  const team = String(
    fd.get('team')
  )

  const player_id = String(
    fd.get('player_id') || ''
  )

  const assist_player_id = String(
    fd.get('assist_player_id') || ''
  )

  const minute = Number(
    fd.get('minute')
  )

  if (
    !Number.isInteger(minute) ||
    minute < 1 ||
    minute > 120
  ) {
    throw new Error(
      'Kampminuttet skal være mellem 1 og 120'
    )
  }

  /*
   * Hent kampen før eventet gemmes.
   *
   * Vi bruger status/dato/tid til at afgøre,
   * om dette er en rigtig LIVE-hændelse eller
   * bare efterregistrering fra en gammel kamp.
   */
  const {
    data: match,
    error: matchError,
  } = await s
    .from('matches')
    .select(`
      id,
      home_team,
      away_team,
      date,
      kickoff_time,
      status
    `)
    .eq('id', match_id)
    .single()

  if (matchError || !match) {
    console.error(
      'CREATE EVENT MATCH ERROR:',
      matchError
    )

    throw new Error(
      'Kunne ikke finde kampen'
    )
  }

  const row = {
    match_id,
    event_type,
    team,

    player_id:
      player_id || null,

    assist_player_id:
      assist_player_id || null,

    minute,
  }

  const {
    data: createdEvent,
    error,
  } = await s
    .from('match_events')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    console.error(
      'CREATE MATCH EVENT ERROR:',
      error
    )

    throw new Error(
      `Supabase-fejl: ${error.code} - ${error.message}`
    )
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Registrerede ${event_type} i kamp ${match_id} (${minute}')`,
    })

  const normalizedStatus =
    String(match.status || '')
      .trim()
      .toLowerCase()

  const isFinishedMatch =
    normalizedStatus === 'slut'

  let syncedScore:
    | {
        homeScore: number
        awayScore: number
      }
    | undefined

  /*
   * LIVE/kommende kamp:
   * score i matches følger mål-events.
   *
   * GAMMEL FÆRDIG KAMP:
   * behold DBU/slutresultatet i matches.
   * Mål-events bruges kun til spillerstatistik.
   */
  if (
    event_type === 'goal' &&
    !isFinishedMatch
  ) {
    syncedScore =
      await syncMatchScore(
        s,
        match_id
      )
  }

  /*
   * MÅL-PUSH SENDES KUN HVIS KAMPEN
   * FAKTISK ER LIVE LIGE NU.
   *
   * Efterregistrering på gamle kampe giver
   * derfor aldrig en målnotifikation.
   */
  if (
    event_type === 'goal'
  ) {
    const state = getMatchState(
      match.date,
      match.kickoff_time,
      match.status
    )

    const shouldSendGoalPush =
      state.isLive &&
      match.status !== 'Udsat' &&
      match.status !== 'Aflyst' &&
      match.status !== 'Slut'

    if (shouldSendGoalPush) {
      try {
        let scorerName = ''

        if (player_id) {
          const {
            data: player,
            error: playerError,
          } = await s
            .from('players')
            .select(
              'first_name, last_name'
            )
            .eq(
              'id',
              player_id
            )
            .single()

          if (playerError) {
            console.error(
              'PUSH PLAYER ERROR:',
              playerError
            )
          }

          if (player) {
            scorerName =
              `${player.first_name} ${player.last_name}`
          }
        }

        const scoringTeam =
          team === 'home'
            ? match.home_team
            : match.away_team

        const normalizedTeam =
          scoringTeam
            .trim()
            .toLowerCase()

        const scoringForFCG =
          normalizedTeam ===
          'fc glostruplona'

        const homeScore =
          syncedScore
            ?.homeScore ?? 0

        const awayScore =
          syncedScore
            ?.awayScore ?? 0

        const scoreText =
          `${match.home_team} ${homeScore}–${awayScore} ${match.away_team}`

        const title =
          scoringForFCG
            ? '⚽ MÅÅÅL TIL FC GLOSTRUPLONA!'
            : `⚽ Mål til ${scoringTeam}`

        const body =
          scoringForFCG &&
          scorerName
            ? `${scorerName} scorer! ${scoreText} • ${minute}'`
            : `${scoreText} • ${minute}'`

        try {
          await sendPushToAll({
            title,
            body,

            url:
              `/kampe/${match_id}`,
          })

          if (
            createdEvent?.id
          ) {
            console.log(
              `Push sendt for mål-event ${createdEvent.id}`
            )
          }
        } catch (
          pushError
        ) {
          console.error(
            'GOAL PUSH ERROR:',
            pushError
          )
        }
      } catch (
        pushSetupError
      ) {
        console.error(
          'GOAL PUSH SETUP ERROR:',
          pushSetupError
        )
      }
    } else {
      console.log(
        'GOAL PUSH SKIPPED - NOT LIVE:',
        {
          matchId: match_id,
          status: match.status,
          date: match.date,
        }
      )
    }
  }

  revalidatePath('/')
  revalidatePath('/admin/kampe')
  revalidatePath('/kampe')
  revalidatePath('/statistik')
  revalidatePath('/trup')

  revalidatePath(
    `/kampe/${match_id}`
  )
}

export async function updateMatchEvent(
  fd: FormData
) {
  const { s, user } = await admin()

  const id = String(
    fd.get('id')
  )

  const match_id = String(
    fd.get('match_id')
  )

  const minute = Number(
    fd.get('minute')
  )

  if (
    !Number.isInteger(minute) ||
    minute < 1 ||
    minute > 120
  ) {
    throw new Error(
      'Kampminuttet skal være mellem 1 og 120'
    )
  }

  const { error } = await s
    .from('match_events')
    .update({
      minute,
    })
    .eq('id', id)

  if (error) {
    console.error(
      'UPDATE MATCH EVENT ERROR:',
      error
    )

    throw new Error(
      'Kunne ikke ændre kampminuttet'
    )
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Ændrede kamphændelse ${id} til minut ${minute}`,
    })

  revalidatePath('/admin/kampe')
  revalidatePath('/kampe')
  revalidatePath('/statistik')
  revalidatePath('/trup')

  revalidatePath(
    `/kampe/${match_id}`
  )
}

export async function deleteMatchEvent(
  fd: FormData
) {
  const { s, user } = await admin()

  const id = String(
    fd.get('id')
  )

  const match_id = String(
    fd.get('match_id')
  )

  const {
    data: existingEvent,
    error: eventError,
  } = await s
    .from('match_events')
    .select(
      'id, event_type'
    )
    .eq('id', id)
    .single()

  if (eventError) {
    console.error(
      'GET MATCH EVENT ERROR:',
      eventError
    )

    throw new Error(
      'Kunne ikke finde kamphændelsen'
    )
  }

  const { error } = await s
    .from('match_events')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(
      'DELETE MATCH EVENT ERROR:',
      error
    )

    throw new Error(
      'Kunne ikke slette kamphændelsen'
    )
  }

  /*
   * Hvis det er en færdig kamp, bevarer vi
   * det officielle slutresultat fra matches.
   *
   * På live/ikke-færdige kampe beregnes
   * scoren fortsat fra mål-events.
   */
  if (
    existingEvent?.event_type ===
    'goal'
  ) {
    const {
      data: match,
      error: matchError,
    } = await s
      .from('matches')
      .select('status')
      .eq('id', match_id)
      .single()

    if (matchError) {
      console.error(
        'DELETE EVENT MATCH ERROR:',
        matchError
      )
    }

    if (
      match &&
      String(match.status)
        .trim()
        .toLowerCase() !== 'slut'
    ) {
      await syncMatchScore(
        s,
        match_id
      )
    }
  }

  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Slettede kamphændelse ${id}`,
    })

  revalidatePath('/')
  revalidatePath('/admin/kampe')
  revalidatePath('/kampe')
  revalidatePath('/statistik')
  revalidatePath('/trup')

  revalidatePath(
    `/kampe/${match_id}`
  )
}

export async function finishMatch(
  fd: FormData
) {
  const { s, user } = await admin()

  const matchId = String(
    fd.get('match_id') || ''
  )

  if (!matchId) {
    throw new Error(
      'Kamp-ID mangler'
    )
  }

  /*
    Hent kampen først.

    Vi bruger både hold og score til
    slutnotifikationen.
  */
  const {
    data: match,
    error: matchError,
  } = await s
    .from('matches')
    .select(`
      id,
      home_team,
      away_team,
      home_score,
      away_score,
      status
    `)
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    console.error(
      'FINISH MATCH GET ERROR:',
      matchError
    )

    throw new Error(
      'Kunne ikke finde kampen'
    )
  }

  /*
    Hvis kampen allerede er slut,
    gør vi ingenting.

    Det forhindrer bl.a. dobbelt
    slutnotifikation ved dobbeltklik.
  */
  if (
    String(match.status)
      .toLowerCase() === 'slut'
  ) {
    return
  }

  /*
    Sæt kampen til SLUT.

    Fra dette øjeblik skal getMatchState()
    læse status og stoppe live-kampen.
  */
  const { error: updateError } =
    await s
      .from('matches')
      .update({
        status: 'Slut',
      })
      .eq('id', matchId)

  if (updateError) {
    console.error(
      'FINISH MATCH UPDATE ERROR:',
      updateError
    )

    throw new Error(
      'Kunne ikke afslutte kampen'
    )
  }

  /*
    Gem handlingen i audit-loggen.
  */
  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,
      action:
        `Afsluttede kamp ${match.home_team} vs ${match.away_team}`,
    })

  /*
    Send slutresultatet.

    Denne notifikation bliver altså først
    sendt, når admin faktisk trykker
    "AFSLUT KAMP".
  */
  const homeScore =
    Number(match.home_score) || 0

  const awayScore =
    Number(match.away_score) || 0

  const scoreText =
    `${match.home_team} ${homeScore}–${awayScore} ${match.away_team}`

  try {
    await sendPushToAll({
      title: '🏁 KAMPEN ER SLUT',
      body: scoreText,
      url: `/kampe/${matchId}`,
    })
  } catch (pushError) {
    /*
      Kampen skal stadig være afsluttet,
      selv hvis push-notifikationen
      skulle fejle.
    */
    console.error(
      'FINISH MATCH PUSH ERROR:',
      pushError
    )
  }

  revalidatePath('/')
  revalidatePath('/kampe')
  revalidatePath('/admin/kampe')
  revalidatePath('/statistik')
  revalidatePath('/trup')

  revalidatePath(
    `/kampe/${matchId}`
  )
}

export async function setManOfTheMatch(
  fd: FormData
) {
  const { s, user } = await admin()

  const matchId = String(
    fd.get('match_id') || ''
  )

  const playerId = String(
    fd.get('player_id') || ''
  )

  if (!matchId) {
    throw new Error('Kamp-ID mangler')
  }

  /*
   * HENT KAMPEN
   */
  const {
    data: match,
    error: matchError,
  } = await s
    .from('matches')
    .select(`
      id,
      home_team,
      away_team,
      date,
      status
    `)
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    console.error(
      'MOTM MATCH ERROR:',
      matchError
    )

    throw new Error(
      'Kunne ikke finde kampen'
    )
  }

  /*
   * GEM MOTM
   */
  const { error: updateError } =
    await s
      .from('matches')
      .update({
        man_of_match_player_id:
          playerId || null,
      })
      .eq('id', matchId)

  if (updateError) {
    console.error(
      'SET MOTM ERROR:',
      updateError
    )

    throw new Error(
      'Kunne ikke gemme Man of the Match'
    )
  }

  /*
   * HVIS "INGEN VALGT"
   */
  if (!playerId) {
    await s
      .from('audit_logs')
      .insert({
        admin_id: user.id,
        action:
          `Fjernede Man of the Match fra kamp ${matchId}`,
      })

    revalidatePath('/admin/kampe')
    revalidatePath('/kampe')
    revalidatePath(`/kampe/${matchId}`)
    revalidatePath('/trup')
    revalidatePath('/statistik')

    return
  }

  /*
   * HENT SPILLEREN
   */
  const {
    data: player,
    error: playerError,
  } = await s
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      shirt_number
    `)
    .eq('id', playerId)
    .single()

  if (playerError || !player) {
    console.error(
      'MOTM PLAYER ERROR:',
      playerError
    )

    throw new Error(
      'Kunne ikke finde spilleren'
    )
  }

  const playerName =
    `${player.first_name} ${player.last_name}`

  /*
   * AUDIT LOG
   */
  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,
      action:
        `Satte Man of the Match i kamp ${matchId} til ${playerName}`,
    })

  /*
   * MOTM PUSH
   *
   * Send kun push for en kamp, der er spillet
   * I DAG (dansk tid).
   *
   * Så kan gamle kampe efterregistreres uden
   * at sende gamle MOTM-notifikationer.
   */
  const isToday =
    match.date ===
    getCopenhagenDate()

  if (isToday) {
    try {
      const title =
        '⭐ MAN OF THE MATCH'

      const body =
        `#${player.shirt_number} ${playerName} er valgt som kampens spiller efter ${match.home_team} vs ${match.away_team}.`

      console.log(
        'SENDER MOTM PUSH:',
        {
          matchId,
          playerId,
          title,
          body,
        }
      )

      const pushResult =
        await sendPushToAll({
          title,
          body,
          url:
            `/kampe/${matchId}`,
        })

      console.log(
        'MOTM PUSH RESULT:',
        pushResult
      )
    } catch (pushError) {
      console.error(
        'MOTM PUSH ERROR:',
        pushError
      )
    }
  } else {
    console.log(
      'MOTM PUSH SKIPPED - OLD MATCH:',
      {
        matchId,
        matchDate: match.date,
      }
    )
  }

  revalidatePath('/admin/kampe')
  revalidatePath('/kampe')
  revalidatePath(`/kampe/${matchId}`)
  revalidatePath('/trup')
  revalidatePath('/statistik')
}
