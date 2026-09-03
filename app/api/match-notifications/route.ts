import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToAll } from '@/lib/send-push'

export const dynamic = 'force-dynamic'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)

function getCopenhagenNow() {
  const parts = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Europe/Copenhagen',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }
  ).formatToParts(new Date())

  const values: Record<string, string> = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    date:
      `${values.year}-${values.month}-${values.day}`,

    hours:
      Number(values.hour),

    minutes:
      Number(values.minute),

    seconds:
      Number(values.second),
  }
}

function minutesSinceKickoff(
  kickoff: string
) {
  const now = getCopenhagenNow()

  const [kickoffHour, kickoffMinute] =
    kickoff
      .slice(0, 5)
      .split(':')
      .map(Number)

  const nowMinutes =
    now.hours * 60 +
    now.minutes

  const kickoffMinutes =
    kickoffHour * 60 +
    kickoffMinute

  return nowMinutes - kickoffMinutes
}

async function alreadySent(
  matchId: string,
  type: string
) {
  const { data } = await supabase
    .from('match_notifications')
    .select('id')
    .eq('match_id', matchId)
    .eq('notification_type', type)
    .maybeSingle()

  return Boolean(data)
}

async function markAsSent(
  matchId: string,
  type: string
) {
  const { error } = await supabase
    .from('match_notifications')
    .insert({
      match_id: matchId,
      notification_type: type,
    })

  if (error) {
    console.error(
      'NOTIFICATION LOG ERROR:',
      error
    )

    return false
  }

  return true
}

async function getScore(
  matchId: string
) {
  const {
    data: goals,
    error,
  } = await supabase
    .from('match_events')
    .select('team')
    .eq('match_id', matchId)
    .eq('event_type', 'goal')

  if (error) {
    console.error(
      'GET SCORE ERROR:',
      error
    )

    return {
      homeScore: 0,
      awayScore: 0,
    }
  }

  const homeScore =
    goals?.filter(
      (goal) =>
        goal.team === 'home'
    ).length || 0

  const awayScore =
    goals?.filter(
      (goal) =>
        goal.team === 'away'
    ).length || 0

  return {
    homeScore,
    awayScore,
  }
}

async function sendOnce({
  matchId,
  type,
  title,
  body,
}: {
  matchId: string
  type: string
  title: string
  body: string
}) {
  if (
    await alreadySent(
      matchId,
      type
    )
  ) {
    return false
  }

  /*
   * Vi reserverer notifikationen først.
   *
   * Unique constraint i databasen sørger også
   * for, at to samtidige cron-kald ikke sender
   * samme besked to gange.
   */
  const marked =
    await markAsSent(
      matchId,
      type
    )

  if (!marked) {
    return false
  }

  try {
    await sendPushToAll({
      title,
      body,
      url: `/kampe/${matchId}`,
    })

    return true
  } catch (error) {
    console.error(
      'AUTOMATIC PUSH ERROR:',
      error
    )

    /*
     * Hvis push helt fejler, fjerner vi loggen,
     * så cron kan prøve igen næste minut.
     */
    await supabase
      .from('match_notifications')
      .delete()
      .eq('match_id', matchId)
      .eq(
        'notification_type',
        type
      )

    return false
  }
}

export async function POST(
  request: NextRequest
) {
  /*
   * Beskyt endpointet.
   *
   * Vi laver MATCH_CRON_SECRET
   * på Vercel bagefter.
   */
  const secret =
    request.headers.get(
      'x-cron-secret'
    )

  if (
    !process.env.MATCH_CRON_SECRET ||
    secret !==
      process.env.MATCH_CRON_SECRET
  ) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      }
    )
  }

  const now =
    getCopenhagenNow()

  /*
   * Vi behøver kun dagens kampe.
   */
  const {
    data: matches,
    error: matchesError,
  } = await supabase
    .from('matches')
    .select(`
      id,
      date,
      kickoff_time,
      home_team,
      away_team,
      status
    `)
    .eq('date', now.date)

  if (matchesError) {
    console.error(
      'MATCH CRON ERROR:',
      matchesError
    )

    return NextResponse.json(
      {
        error:
          'Could not load matches',
      },
      {
        status: 500,
      }
    )
  }

  let notificationsSent = 0

  for (const match of matches || []) {
    if (
      !match.kickoff_time ||
      match.status === 'Aflyst' ||
      match.status === 'Udsat'
    ) {
      continue
    }

    const elapsed =
      minutesSinceKickoff(
        match.kickoff_time
      )

    const {
      homeScore,
      awayScore,
    } = await getScore(match.id)

    const score =
      `${match.home_team} ${homeScore}–${awayScore} ${match.away_team}`

    /*
     * KAMPSTART
     *
     * Sendes første gang cron ser kampen,
     * når kickoff er nået.
     *
     * Kun inden pause-tidspunktet, så en
     * gammel kamp ikke pludselig får en
     * forsinket kampstart-notifikation.
     */
    if (
      elapsed >= 0 &&
      elapsed < 30
    ) {
      const sent =
        await sendOnce({
          matchId: match.id,
          type: 'kickoff',
          title:
            '🔴 KAMPSTART!',
          body:
            `${match.home_team} vs ${match.away_team} • Kampen er i gang! ⚽`,
        })

      if (sent) {
        notificationsSent++
      }
    }

    /*
     * PAUSE
     *
     * 1. halvleg = 30 minutter.
     * Pausen varer fra minut 30-34.
     */
    if (
      elapsed >= 30 &&
      elapsed < 35
    ) {
      const sent =
        await sendOnce({
          matchId: match.id,
          type: 'halftime',
          title:
            '⏸️ PAUSE',
          body:
            `${score} • Pause.`,
        })

      if (sent) {
        notificationsSent++
      }
    }

    /*
     * SLUT
     *
     * Kampen:
     * 30 min 1. halvleg
     * 5 min pause
     * 30 min 2. halvleg
     *
     * = slut efter 65 minutter
     */
    if (
      elapsed >= 65 &&
      elapsed < 90
    ) {
      const sent =
        await sendOnce({
          matchId: match.id,
          type: 'fulltime',
          title:
            '🏁 SLUT!',
          body:
            `${score} • Kampen er slut.`,
        })

      if (sent) {
        notificationsSent++
      }
    }
  }

  return NextResponse.json({
    success: true,
    checked:
      matches?.length || 0,
    notificationsSent,
    time: now,
  })
}