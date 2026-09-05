import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createClient,
} from '@supabase/supabase-js'

import {
  sendPushToAll,
} from '@/lib/send-push'

export const dynamic =
  'force-dynamic'

const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL!

const serviceRoleKey =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY!

const supabase =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

/*
 * ==========================================
 * DANSK TID
 * ==========================================
 */

function getCopenhagenNow() {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Europe/Copenhagen',

        year: 'numeric',
        month: '2-digit',
        day: '2-digit',

        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',

        hourCycle: 'h23',
      }
    ).formatToParts(
      new Date()
    )

  const values:
    Record<string, string> =
    {}

  for (
    const part of parts
  ) {
    if (
      part.type !== 'literal'
    ) {
      values[part.type] =
        part.value
    }
  }

  return {
    date:
      `${values.year}-${values.month}-${values.day}`,

    hours:
      Number(
        values.hour
      ),

    minutes:
      Number(
        values.minute
      ),

    seconds:
      Number(
        values.second
      ),
  }
}

/*
 * ==========================================
 * MINUTTER FRA KICKOFF
 *
 * -60 = 60 min til kamp
 * -10 = 10 min til kamp
 * 0   = kickoff
 * 15  = 15 min spillet
 * ==========================================
 */

function minutesSinceKickoff(
  kickoff: string
) {
  const now =
    getCopenhagenNow()

  const [
    kickoffHour,
    kickoffMinute,
  ] = kickoff
    .slice(0, 5)
    .split(':')
    .map(Number)

  const nowMinutes =
    now.hours * 60 +
    now.minutes

  const kickoffMinutes =
    kickoffHour * 60 +
    kickoffMinute

  return (
    nowMinutes -
    kickoffMinutes
  )
}

/*
 * ==========================================
 * FORMAT KLOKKESLÆT
 * ==========================================
 */

function formatKickoff(
  kickoff:
    | string
    | null
) {
  if (!kickoff) {
    return 'Tid ikke fastsat'
  }

  return kickoff.slice(
    0,
    5
  )
}

/*
 * ==========================================
 * ER PUSH ALLEREDE SENDT?
 * ==========================================
 */

async function alreadySent(
  matchId: string,
  type: string
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      'match_notifications'
    )
    .select('id')
    .eq(
      'match_id',
      matchId
    )
    .eq(
      'notification_type',
      type
    )
    .maybeSingle()

  if (error) {
    console.error(
      'CHECK NOTIFICATION ERROR:',
      error
    )

    return false
  }

  return Boolean(data)
}

/*
 * ==========================================
 * RESERVER PUSH
 * ==========================================
 */

async function markAsSent(
  matchId: string,
  type: string
) {
  const {
    error,
  } = await supabase
    .from(
      'match_notifications'
    )
    .insert({
      match_id:
        matchId,

      notification_type:
        type,
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

/*
 * ==========================================
 * SCORE FRA EVENTS
 * ==========================================
 */

async function getScore(
  matchId: string
) {
  const {
    data: goals,
    error,
  } = await supabase
    .from(
      'match_events'
    )
    .select('team')
    .eq(
      'match_id',
      matchId
    )
    .eq(
      'event_type',
      'goal'
    )

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
      (goal: any) =>
        goal.team ===
        'home'
    ).length || 0

  const awayScore =
    goals?.filter(
      (goal: any) =>
        goal.team ===
        'away'
    ).length || 0

  return {
    homeScore,
    awayScore,
  }
}

/*
 * ==========================================
 * SEND PUSH KUN ÉN GANG
 * ==========================================
 */

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
  /*
   * Allerede sendt?
   */
  if (
    await alreadySent(
      matchId,
      type
    )
  ) {
    return false
  }

  /*
   * Vi reserverer pushen først.
   *
   * Det beskytter mod,
   * at to cron-kald sender
   * samme push samtidig.
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

      url:
        `/kampe/${matchId}`,
    })

    return true
  } catch (error) {
    console.error(
      'AUTOMATIC PUSH ERROR:',
      error
    )

    /*
     * Hvis push fejler helt,
     * fjerner vi loggen.
     *
     * Så kan cron prøve igen.
     */
    await supabase
      .from(
        'match_notifications'
      )
      .delete()
      .eq(
        'match_id',
        matchId
      )
      .eq(
        'notification_type',
        type
      )

    return false
  }
}

/*
 * ==========================================
 * CRON
 * ==========================================
 */

export async function POST(
  request: NextRequest
) {
  /*
   * BESKYT ENDPOINT
   */
  const secret =
    request.headers.get(
      'x-cron-secret'
    )

  if (
    !process.env
      .MATCH_CRON_SECRET ||
    secret !==
      process.env
        .MATCH_CRON_SECRET
  ) {
    return NextResponse.json(
      {
        error:
          'Unauthorized',
      },
      {
        status: 401,
      }
    )
  }

  const now =
    getCopenhagenNow()

  /*
   * ==========================================
   * DAGENS KAMPE
   * ==========================================
   */

  const {
    data: matches,
    error:
      matchesError,
  } = await supabase
    .from('matches')
    .select(`
      id,
      date,
      kickoff_time,
      home_team,
      away_team,
      stadium,
      competition,
      status
    `)
    .eq(
      'date',
      now.date
    )

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

  let notificationsSent =
    0

  const sentTypes:
    string[] = []

  for (
    const match of
    matches || []
  ) {
    /*
     * ======================================
     * IGNORER KAMPE DER IKKE SKAL
     * HAVE AUTOMATISKE PUSH
     * ======================================
     */

    if (
      !match.kickoff_time ||
      match.status ===
        'Aflyst' ||
      match.status ===
        'Udsat' ||
      match.status ===
        'Slut'
    ) {
      continue
    }

    const elapsed =
      minutesSinceKickoff(
        match.kickoff_time
      )

    const kickoffText =
      formatKickoff(
        match.kickoff_time
      )

    /*
     * ======================================
     * 🌅 KAMPDAG
     *
     * Fra kl. 10:00 dansk tid.
     *
     * Push sendes kun hvis kampen
     * endnu ikke er startet.
     *
     * Notification type indeholder dato.
     * Hvis DBU flytter kampen til en ny dag,
     * kan der derfor komme en ny korrekt
     * kampdags-push.
     * ======================================
     */

    const afterTen =
      now.hours > 10 ||
      (
        now.hours === 10 &&
        now.minutes >= 0
      )

    if (
      afterTen &&
      elapsed < 0
    ) {
      const type =
        `matchday_${match.date}`

      const opponent =
        match.home_team ===
        'FC Glostruplona'
          ? match.away_team
          : match.home_team

      const venueText =
        match.stadium
          ? ` • ${match.stadium}`
          : ''

      const sent =
        await sendOnce({
          matchId:
            match.id,

          type,

          title:
            '🔴 DET ER KAMPDAG!',

          body:
            `FC Glostruplona møder ${opponent} i dag kl. ${kickoffText}${venueText} ⚽`,
        })

      if (sent) {
        notificationsSent++

        sentTypes.push(
          type
        )
      }
    }

    /*
     * ======================================
     * ⏰ 1 TIME TIL KAMPSTART
     *
     * Vi bruger et vindue fra:
     *
     * 60 min før
     * til
     * 45 min før
     *
     * Så selv hvis cron er et par minutter
     * forsinket, mister vi ikke pushen.
     *
     * Notification type indeholder dato
     * OG kickoff.
     *
     * Hvis DBU ændrer kickoff fra fx
     * 19:30 → 20:00, kan den nye korrekte
     * reminder derfor sendes.
     * ======================================
     */

    if (
      elapsed >= -60 &&
      elapsed < -45
    ) {
      const safeKickoff =
        kickoffText.replace(
          ':',
          ''
        )

      const type =
        `one_hour_${match.date}_${safeKickoff}`

      const venueText =
        match.stadium
          ? ` • ${match.stadium}`
          : ''

      const sent =
        await sendOnce({
          matchId:
            match.id,

          type,

          title:
            '⏰ 1 TIME TIL KAMPSTART',

          body:
            `${match.home_team} vs ${match.away_team} • ${kickoffText}${venueText}`,
        })

      if (sent) {
        notificationsSent++

        sentTypes.push(
          type
        )
      }
    }

    /*
     * ======================================
     * SCORE
     *
     * Behøves til pause.
     * ======================================
     */

    const {
      homeScore,
      awayScore,
    } = await getScore(
      match.id
    )

    const score =
      `${match.home_team} ${homeScore}–${awayScore} ${match.away_team}`

    /*
     * ======================================
     * 🔴 KAMPSTART
     * ======================================
     */

    if (
      elapsed >= 0 &&
      elapsed < 30
    ) {
      const sent =
        await sendOnce({
          matchId:
            match.id,

          type:
            'kickoff',

          title:
            '🔴 KAMPSTART!',

          body:
            `${match.home_team} vs ${match.away_team} • Kampen er i gang! ⚽`,
        })

      if (sent) {
        notificationsSent++

        sentTypes.push(
          'kickoff'
        )
      }
    }

    /*
     * ======================================
     * ⏸️ PAUSE
     *
     * 1. halvleg = 30 minutter
     * pause = ca. minut 30-34
     * ======================================
     */

    if (
      elapsed >= 30 &&
      elapsed < 35
    ) {
      const sent =
        await sendOnce({
          matchId:
            match.id,

          type:
            'halftime',

          title:
            '⏸️ PAUSE',

          body:
            `${score} • Pause.`,
        })

      if (sent) {
        notificationsSent++

        sentTypes.push(
          'halftime'
        )
      }
    }

    /*
     * ======================================
     * IKKE AUTOMATISK SLUT
     *
     * Kampen fortsætter som
     * live/overtid efter ordinær tid.
     *
     * SLUT bliver kun sendt,
     * når admin trykker:
     *
     * AFSLUT KAMP
     * ======================================
     */
  }

  return NextResponse.json({
    success: true,

    checked:
      matches?.length || 0,

    notificationsSent,

    sentTypes,

    time: now,
  })
}