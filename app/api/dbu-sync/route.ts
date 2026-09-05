import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createClient,
} from '@supabase/supabase-js'

export const dynamic =
  'force-dynamic'

const DBU_URL =
  'https://www.dbu.dk/resultater/pulje/502671/kampprogramFuld'

const POOL_ID =
  '502671'

const OUR_DBU_TEAM_NAME =
  'Glostrup (1)'

const OUR_APP_TEAM_NAME =
  'FC Glostruplona'

const OUR_HOME_STADIUM =
  'Glostrup Nou'

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
 * TEKST / HTML
 * ==========================================
 */

function decodeHtml(
  value: string
) {
  return value
    .replace(/&#xE6;/gi, 'æ')
    .replace(/&#xF8;/gi, 'ø')
    .replace(/&#xE5;/gi, 'å')
    .replace(/&#xC6;/gi, 'Æ')
    .replace(/&#xD8;/gi, 'Ø')
    .replace(/&#xC5;/gi, 'Å')

    .replace(/&#230;/g, 'æ')
    .replace(/&#248;/g, 'ø')
    .replace(/&#229;/g, 'å')
    .replace(/&#198;/g, 'Æ')
    .replace(/&#216;/g, 'Ø')
    .replace(/&#197;/g, 'Å')

    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')

    .replace(/Ã¦/g, 'æ')
    .replace(/Ã¸/g, 'ø')
    .replace(/Ã¥/g, 'å')
    .replace(/Ã†/g, 'Æ')
    .replace(/Ã˜/g, 'Ø')
    .replace(/Ã…/g, 'Å')
}

function cleanText(
  value: string
) {
  return decodeHtml(
    value.replace(
      /<[^>]+>/g,
      ' '
    )
  )
    .replace(/\s+/g, ' ')
    .trim()
}

/*
 * ==========================================
 * HOLDNAVNE
 * ==========================================
 */

function displayTeamName(
  team: string
) {
  const cleaned =
    team.trim()

  if (
    cleaned ===
    OUR_DBU_TEAM_NAME
  ) {
    return OUR_APP_TEAM_NAME
  }

  return cleaned
}

function normalizeTeamName(
  team: string
) {
  return team
    .toLowerCase()
    .replace(
      /\(\d+\)/g,
      ''
    )
    .replace(
      /idrætsforening/g,
      'if'
    )
    .replace(
      /fodboldklub/g,
      'fk'
    )
    .replace(
      /boldklub/g,
      'bk'
    )
    .replace(
      /[^a-z0-9æøå]/g,
      ''
    )
}

/*
 * ==========================================
 * DATO
 * ==========================================
 */

function convertDate(
  dbuDate: string
) {
  const match =
    dbuDate.match(
      /(\d{2})-(\d{2})\s+(\d{4})/
    )

  if (!match) {
    return null
  }

  return `${match[3]}-${match[2]}-${match[1]}`
}

/*
 * ==========================================
 * PARSE DBU-KAMPE
 * ==========================================
 */

function parseMatches(
  html: string
) {
  const rowRegex =
    /<tr[^>]*onclick="MatchProgramMatchClick\('\/resultater\/kamp\/(\d+)_502671\/kampinfo'\)"[^>]*>([\s\S]*?)<\/tr>/g

  const rows =
    [
      ...html.matchAll(
        rowRegex
      ),
    ]

  return rows
    .map(
      (match) => {
        const dbuMatchId =
          match[1]

        const row =
          match[2]

        /*
         * DATO
         */
        const dateMatch =
          row.match(
            /<div class="matchprogram-date">[\s\S]*?(\d{2}-\d{2}\s+\d{4})[\s\S]*?<\/div>/
          )

        const rawDate =
          dateMatch?.[1] ||
          null

        /*
         * TID
         */
        const timeMatch =
          row.match(
            /<td class="hide-on-mobile">\s*(\d{2}:\d{2})\s*<\/td>/
          )

        const kickoffTime =
          timeMatch?.[1] ||
          null

        /*
         * HOLD
         */
        const teamMatches =
          [
            ...row.matchAll(
              /<a class="link[^"]*bold-text"[^>]*>([\s\S]*?)<\/a>/g
            ),
          ]

        const rawHomeTeam =
          teamMatches[0]?.[1]
            ? cleanText(
                teamMatches[0][1]
              )
            : null

        const rawAwayTeam =
          teamMatches[1]?.[1]
            ? cleanText(
                teamMatches[1][1]
              )
            : null

        /*
         * STADION
         */
        const stadiumMatch =
          row.match(
            /<a class="link" href="\/resultater\/stadium\/[^"]+">([\s\S]*?)<\/a>/
          )

        const dbuStadium =
          stadiumMatch?.[1]
            ? cleanText(
                stadiumMatch[1]
              )
            : null

        /*
         * RESULTAT
         */
        const homeScoreMatch =
          row.match(
            /<div class="home-score">\s*(\d+)\s*<\/div>/
          )

        const awayScoreMatch =
          row.match(
            /<div class="away-score">\s*(\d+)\s*<\/div>/
          )

        const homeScore =
          homeScoreMatch
            ? Number(
                homeScoreMatch[1]
              )
            : null

        const awayScore =
          awayScoreMatch
            ? Number(
                awayScoreMatch[1]
              )
            : null

        if (
          !rawDate ||
          !rawHomeTeam ||
          !rawAwayTeam
        ) {
          return null
        }

        const date =
          convertDate(
            rawDate
          )

        if (!date) {
          return null
        }

        const homeTeam =
          displayTeamName(
            rawHomeTeam
          )

        const awayTeam =
          displayTeamName(
            rawAwayTeam
          )

        const stadium =
          homeTeam ===
          OUR_APP_TEAM_NAME
            ? OUR_HOME_STADIUM
            : dbuStadium

        const finished =
          homeScore !== null &&
          awayScore !== null

        return {
          dbuMatchId,
          date,
          kickoffTime,
          homeTeam,
          awayTeam,
          stadium,
          homeScore,
          awayScore,
          finished,
        }
      }
    )
    .filter(Boolean) as {
      dbuMatchId: string
      date: string
      kickoffTime:
        | string
        | null
      homeTeam: string
      awayTeam: string
      stadium:
        | string
        | null
      homeScore:
        | number
        | null
      awayScore:
        | number
        | null
      finished: boolean
    }[]
}

/*
 * ==========================================
 * FIND EKSISTERENDE KAMP
 * ==========================================
 */

async function findExistingMatch(
  dbuMatch: {
    dbuMatchId: string
    date: string
    kickoffTime:
      | string
      | null
    homeTeam: string
    awayTeam: string
  }
) {
  /*
   * 1. MATCH VIA DBU-ID
   */
  const {
    data: byDbuId,
  } = await supabase
    .from('matches')
    .select('*')
    .eq(
      'dbu_match_id',
      dbuMatch.dbuMatchId
    )
    .maybeSingle()

  if (byDbuId) {
    return byDbuId
  }

  /*
   * 2. MATCH PÅ SAMME DATO
   */
  const {
    data: sameDateMatches,
  } = await supabase
    .from('matches')
    .select('*')
    .eq(
      'date',
      dbuMatch.date
    )
    .is(
      'dbu_match_id',
      null
    )

  const targetHome =
    normalizeTeamName(
      dbuMatch.homeTeam
    )

  const targetAway =
    normalizeTeamName(
      dbuMatch.awayTeam
    )

  const candidate =
    sameDateMatches?.find(
      (match: any) => {
        const existingHome =
          normalizeTeamName(
            match.home_team ||
              ''
          )

        const existingAway =
          normalizeTeamName(
            match.away_team ||
              ''
          )

        return (
          existingHome ===
            targetHome &&
          existingAway ===
            targetAway
        )
      }
    )

  if (candidate) {
    return candidate
  }

  return null
}

/*
 * ==========================================
 * SYNC
 * ==========================================
 */

async function runSync() {
  const response =
    await fetch(
      DBU_URL,
      {
        cache:
          'no-store',

        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; FC-Glostruplona/1.0)',

          Accept:
            'text/html,application/xhtml+xml',
        },
      }
    )

  if (!response.ok) {
    throw new Error(
      `DBU returnerede ${response.status}`
    )
  }

  const html =
    await response.text()

  const dbuMatches =
    parseMatches(html)

  /*
   * KUN VORES KAMPE
   */
  const ourMatches =
    dbuMatches.filter(
      (match) =>
        match.homeTeam ===
          OUR_APP_TEAM_NAME ||
        match.awayTeam ===
          OUR_APP_TEAM_NAME
    )

  let created = 0
  let updated = 0
  let unchanged = 0

  const changes: any[] =
    []

  for (
    const dbuMatch of
    ourMatches
  ) {
    const existing =
      await findExistingMatch(
        dbuMatch
      )

    /*
     * ======================================
     * OPRET NY KAMP
     * ======================================
     */
    if (!existing) {
      const {
        error:
          insertError,
      } = await supabase
        .from('matches')
        .insert({
          dbu_match_id:
            dbuMatch.dbuMatchId,

          dbu_synced_at:
            new Date()
              .toISOString(),

          home_team:
            dbuMatch.homeTeam,

          away_team:
            dbuMatch.awayTeam,

          date:
            dbuMatch.date,

          kickoff_time:
            dbuMatch.kickoffTime,

          stadium:
            dbuMatch.stadium,

          competition:
            '9. divisionen',

          status:
            dbuMatch.finished
              ? 'Slut'
              : 'Kommende',

          home_score:
            dbuMatch.homeScore ??
            0,

          away_score:
            dbuMatch.awayScore ??
            0,
        })

      if (insertError) {
        console.error(
          'DBU INSERT ERROR:',
          dbuMatch,
          insertError
        )

        continue
      }

      created++

      changes.push({
        type:
          'created',

        dbuMatchId:
          dbuMatch.dbuMatchId,

        match:
          `${dbuMatch.homeTeam} vs ${dbuMatch.awayTeam}`,

        status:
          dbuMatch.finished
            ? 'Slut'
            : 'Kommende',

        score:
          dbuMatch.finished
            ? `${dbuMatch.homeScore}-${dbuMatch.awayScore}`
            : null,
      })

      continue
    }

    /*
     * ======================================
     * SAMMENLIGN
     * ======================================
     */

    const oldKickoff =
      existing.kickoff_time
        ? String(
            existing.kickoff_time
          ).slice(0, 5)
        : null

    const changed =
      existing.home_team !==
        dbuMatch.homeTeam ||

      existing.away_team !==
        dbuMatch.awayTeam ||

      existing.date !==
        dbuMatch.date ||

      oldKickoff !==
        dbuMatch.kickoffTime ||

      (existing.stadium ||
        null) !==
        (dbuMatch.stadium ||
          null) ||

      existing.dbu_match_id !==
        dbuMatch.dbuMatchId ||

      (
        dbuMatch.finished &&
        (
          Number(
            existing.home_score
          ) !==
            dbuMatch.homeScore ||

          Number(
            existing.away_score
          ) !==
            dbuMatch.awayScore ||

          existing.status !==
            'Slut'
        )
      )

    /*
     * ======================================
     * INGEN ÆNDRING
     * ======================================
     */
    if (!changed) {
      await supabase
        .from('matches')
        .update({
          dbu_synced_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          existing.id
        )

      unchanged++

      continue
    }

    /*
     * ======================================
     * OPDATER KAMP
     *
     * DBU STYRER:
     * - hold
     * - dato
     * - tidspunkt
     * - stadion
     * - resultat når kampen er færdig
     *
     * DBU RØRER IKKE:
     * - events
     * - lineup
     * - MOTM
     * ======================================
     */

    const updateRow: any =
      {
        dbu_match_id:
          dbuMatch.dbuMatchId,

        dbu_synced_at:
          new Date()
            .toISOString(),

        home_team:
          dbuMatch.homeTeam,

        away_team:
          dbuMatch.awayTeam,

        date:
          dbuMatch.date,

        kickoff_time:
          dbuMatch.kickoffTime,

        stadium:
          dbuMatch.stadium,
      }

    if (
      dbuMatch.finished
    ) {
      updateRow.status =
        'Slut'

      updateRow.home_score =
        dbuMatch.homeScore

      updateRow.away_score =
        dbuMatch.awayScore
    }

    const {
      error:
        updateError,
    } = await supabase
      .from('matches')
      .update(
        updateRow
      )
      .eq(
        'id',
        existing.id
      )

    if (updateError) {
      console.error(
        'DBU UPDATE ERROR:',
        dbuMatch,
        updateError
      )

      continue
    }

    updated++

    changes.push({
      type:
        'updated',

      dbuMatchId:
        dbuMatch.dbuMatchId,

      match:
        `${dbuMatch.homeTeam} vs ${dbuMatch.awayTeam}`,

      old: {
        date:
          existing.date,

        kickoff:
          oldKickoff,

        stadium:
          existing.stadium,

        status:
          existing.status,

        score:
          `${existing.home_score}-${existing.away_score}`,
      },

      new: {
        date:
          dbuMatch.date,

        kickoff:
          dbuMatch.kickoffTime,

        stadium:
          dbuMatch.stadium,

        status:
          dbuMatch.finished
            ? 'Slut'
            : existing.status,

        score:
          dbuMatch.finished
            ? `${dbuMatch.homeScore}-${dbuMatch.awayScore}`
            : `${existing.home_score}-${existing.away_score}`,
      },
    })
  }

  return {
    success: true,

    source:
      'DBU',

    poolId:
      POOL_ID,

    dbuMatchesFound:
      dbuMatches.length,

    fcgMatchesFound:
      ourMatches.length,

    created,
    updated,
    unchanged,

    changes,
  }
}

/*
 * ==========================================
 * GET
 *
 * Lokalt:
 * må bruges direkte til test.
 *
 * Produktion:
 * kræver Vercel CRON_SECRET.
 * ==========================================
 */

export async function GET(
  request: NextRequest
) {
  const isDevelopment =
    process.env.NODE_ENV ===
    'development'

  /*
   * LOKAL TEST
   */
  if (isDevelopment) {
    try {
      const result =
        await runSync()

      return NextResponse.json(
        result
      )
    } catch (error) {
      console.error(
        'DBU SYNC ERROR:',
        error
      )

      return NextResponse.json(
        {
          success: false,

          error:
            error instanceof Error
              ? error.message
              : 'Ukendt fejl',
        },
        {
          status: 500,
        }
      )
    }
  }

  /*
   * PRODUKTION
   *
   * Vercel Cron sender:
   *
   * Authorization:
   * Bearer <CRON_SECRET>
   */
  const authorization =
    request.headers.get(
      'authorization'
    )

  const expectedSecret =
    process.env
      .CRON_SECRET

  if (
    !expectedSecret ||
    authorization !==
      `Bearer ${expectedSecret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Unauthorized',
      },
      {
        status: 401,
      }
    )
  }

  try {
    const result =
      await runSync()

    return NextResponse.json(
      result
    )
  } catch (error) {
    console.error(
      'DBU SYNC ERROR:',
      error
    )

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : 'Ukendt fejl',
      },
      {
        status: 500,
      }
    )
  }
}

/*
 * ==========================================
 * POST
 *
 * Beholdes også til vores egne
 * beskyttede kald.
 * ==========================================
 */

export async function POST(
  request: NextRequest
) {
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
        success: false,
        error:
          'Unauthorized',
      },
      {
        status: 401,
      }
    )
  }

  try {
    const result =
      await runSync()

    return NextResponse.json(
      result
    )
  } catch (error) {
    console.error(
      'DBU SYNC CRON ERROR:',
      error
    )

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : 'Ukendt fejl',
      },
      {
        status: 500,
      }
    )
  }
}