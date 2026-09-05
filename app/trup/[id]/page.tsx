import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  createServerSupabase,
} from '@/lib/supabase-server'

export const dynamic =
  'force-dynamic'

function formatDate(
  date: string | null
) {
  if (!date) {
    return 'Ingen dato'
  }

  const [
    year,
    month,
    day,
  ] = date.split('-')

  return `${day}.${month}.${year}`
}

function getSingleMatch(
  value: any
) {
  if (!value) {
    return null
  }

  if (
    Array.isArray(value)
  ) {
    return value[0] || null
  }

  return value
}

export default async function Page({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const { id } =
    await params

  const s =
    await createServerSupabase()

  /*
   * ======================================================
   * SPILLER
   * ======================================================
   */

  const {
    data: player,
    error: playerError,
  } = await s
    .from('players')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (playerError) {
    console.error(
      'PLAYER ERROR:',
      playerError
    )
  }

  if (!player) {
    notFound()
  }

  /*
   * ======================================================
   * KAMPDELTAGELSER
   * ======================================================
   */

  const {
    data: appearances,
    error:
      appearancesError,
  } = await s
    .from(
      'match_appearances'
    )
    .select(`
      match_id,
      matches(
        id,
        home_team,
        away_team,
        date,
        competition,
        home_score,
        away_score,
        status
      )
    `)
    .eq(
      'player_id',
      id
    )

  if (
    appearancesError
  ) {
    console.error(
      'PLAYER APPEARANCES ERROR:',
      appearancesError
    )
  }

  /*
   * ======================================================
   * EVENTS
   * ======================================================
   */

  const {
    data: events,
    error: eventsError,
  } = await s
    .from('match_events')
    .select(`
      *,
      matches(
        id,
        home_team,
        away_team,
        date,
        competition,
        home_score,
        away_score,
        status
      )
    `)
    .or(
      `player_id.eq.${id},assist_player_id.eq.${id}`
    )
    .order(
      'minute',
      {
        ascending: false,
      }
    )

  if (eventsError) {
    console.error(
      'PLAYER EVENTS ERROR:',
      eventsError
    )
  }

  /*
   * ======================================================
   * MOTM
   * ======================================================
   */

  const {
    data: motmMatches,
    error: motmError,
  } = await s
    .from('matches')
    .select(`
      id,
      home_team,
      away_team,
      date
    `)
    .eq(
      'man_of_match_player_id',
      id
    )
    .order(
      'date',
      {
        ascending: false,
        nullsFirst: false,
      }
    )

  if (motmError) {
    console.error(
      'PLAYER MOTM ERROR:',
      motmError
    )
  }

  /*
   * ======================================================
   * NORMALISER RELATIONER
   * ======================================================
   */

  const allAppearances =
    (
      appearances || []
    ).map(
      (
        appearance:
          any
      ) => ({
        ...appearance,

        match:
          getSingleMatch(
            appearance.matches
          ),
      })
    )

  const allEvents =
    (
      events || []
    ).map(
      (
        event: any
      ) => ({
        ...event,

        match:
          getSingleMatch(
            event.matches
          ),
      })
    )

  const allMotmMatches =
    motmMatches || []

  /*
   * ======================================================
   * STATISTIK
   * ======================================================
   */

  const matchesPlayed =
    allAppearances.length

  const goals =
    allEvents.filter(
      (event: any) =>
        event.event_type ===
          'goal' &&
        event.player_id ===
          id
    )

  const assists =
    allEvents.filter(
      (event: any) =>
        event.event_type ===
          'goal' &&
        event.assist_player_id ===
          id
    )

  const yellowCards =
    allEvents.filter(
      (event: any) =>
        event.event_type ===
          'yellow_card' &&
        event.player_id ===
          id
    )

  const redCards =
    allEvents.filter(
      (event: any) =>
        event.event_type ===
          'red_card' &&
        event.player_id ===
          id
    )

  const goalContributions =
    goals.length +
    assists.length

  const motmCount =
    allMotmMatches.length

  const goalsPerMatch =
    matchesPlayed > 0
      ? goals.length /
        matchesPlayed
      : 0

  const assistsPerMatch =
    matchesPlayed > 0
      ? assists.length /
        matchesPlayed
      : 0

  const contributionsPerMatch =
    matchesPlayed > 0
      ? goalContributions /
        matchesPlayed
      : 0

  /*
   * ======================================================
   * KAMPHISTORIK
   * ======================================================
   */

  const matchHistory =
    [
      ...allAppearances,
    ]
      .filter(
        (
          appearance:
            any
        ) =>
          appearance.match
      )
      .sort(
        (
          a: any,
          b: any
        ) => {
          const dateA =
            a.match?.date ||
            ''

          const dateB =
            b.match?.date ||
            ''

          return dateB.localeCompare(
            dateA
          )
        }
      )

  /*
   * ======================================================
   * SENESTE 5
   * ======================================================
   */

  const recentMatches =
    matchHistory.slice(
      0,
      5
    )

  const recentMatchIds =
    new Set(
      recentMatches.map(
        (
          appearance:
            any
        ) =>
          appearance.match_id
      )
    )

  const recentGoals =
    goals.filter(
      (event: any) =>
        recentMatchIds.has(
          event.match_id
        )
    ).length

  const recentAssists =
    assists.filter(
      (event: any) =>
        recentMatchIds.has(
          event.match_id
        )
    ).length

  /*
   * ======================================================
   * BEDSTE KAMP
   * ======================================================
   */

  const contributionsByMatch:
    Record<
      string,
      {
        goals: number
        assists: number
      }
    > = {}

  for (
    const goal of goals
  ) {
    if (
      !contributionsByMatch[
        goal.match_id
      ]
    ) {
      contributionsByMatch[
        goal.match_id
      ] = {
        goals: 0,
        assists: 0,
      }
    }

    contributionsByMatch[
      goal.match_id
    ].goals++
  }

  for (
    const assist of
    assists
  ) {
    if (
      !contributionsByMatch[
        assist.match_id
      ]
    ) {
      contributionsByMatch[
        assist.match_id
      ] = {
        goals: 0,
        assists: 0,
      }
    }

    contributionsByMatch[
      assist.match_id
    ].assists++
  }

  let bestMatch:
    | {
        matchId: string
        goals: number
        assists: number
        total: number
      }
    | null = null

  for (
    const [
      matchId,
      value,
    ] of Object.entries(
      contributionsByMatch
    )
  ) {
    const total =
      value.goals +
      value.assists

    if (
      !bestMatch ||
      total >
        bestMatch.total
    ) {
      bestMatch = {
        matchId,
        goals:
          value.goals,
        assists:
          value.assists,
        total,
      }
    }
  }

  const bestMatchAppearance =
    bestMatch
      ? matchHistory.find(
          (
            appearance:
              any
          ) =>
            appearance.match_id ===
            bestMatch?.matchId
        )
      : null

  const bestMatchInfo =
    bestMatchAppearance
      ?.match || null

  /*
   * ======================================================
   * PLAYER EVENTS
   * ======================================================
   */

  const playerEvents =
    [...allEvents].sort(
      (
        a: any,
        b: any
      ) => {
        const dateA =
          a.match?.date ||
          ''

        const dateB =
          b.match?.date ||
          ''

        if (
          dateA !== dateB
        ) {
          return dateB.localeCompare(
            dateA
          )
        }

        return (
          (
            b.minute || 0
          ) -
          (
            a.minute || 0
          )
        )
      }
    )

  /*
   * ======================================================
   * UI
   * ======================================================
   */

  return (
    <div className="fcg-page fcg-fade-in space-y-8 md:space-y-12">

      {/* BACK */}
      <Link
        href="/trup"
        className="
          inline-flex
          items-center
          gap-2
          text-xs
          font-black
          uppercase
          tracking-[.12em]
          text-neutral-500
          transition
          hover:text-white
        "
      >
        ← TRUPPEN
      </Link>

      {/* ==================================================
          PLAYER HERO
         ================================================== */}

      <section
        className="
          relative
          -mx-4
          overflow-hidden
          border-y
          border-white/10
          bg-black
          shadow-[0_30px_90px_rgba(0,0,0,.6)]
          sm:mx-0
          sm:rounded-[30px]
          sm:border
        "
      >
        <div
          className="
            relative
            aspect-[4/5]
            min-h-[520px]
            w-full
            sm:aspect-[16/9]
            sm:min-h-[560px]
          "
        >
          {/* ===============================================
              VIDEO HVIS SPILLEREN HAR EN
             =============================================== */}

          {player.video_url ? (
            <video
              src={
                player.video_url
              }
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="
                absolute
                inset-0
                h-full
                w-full
                object-cover
              "
            />
          ) : (
            /*
             * FALLBACK:
             * Fælles kampfoto.
             *
             * Når spilleren senere får
             * sin video gennem admin,
             * bliver denne automatisk
             * erstattet.
             */
            <Image
              src="/media/team-action.jpg"
              alt={`${player.first_name} ${player.last_name}`}
              fill
              priority
              sizes="100vw"
              className="
                object-cover
                object-center
                saturate-[.72]
                contrast-[1.15]
              "
            />
          )}

          {/* CINEMATIC FILTERS */}
          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-b
              from-black/10
              via-transparent
              to-black
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              inset-x-0
              bottom-0
              h-[72%]
              bg-gradient-to-t
              from-black
              via-black/75
              to-transparent
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-r
              from-red-950/25
              via-transparent
              to-black/10
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -right-24
              top-12
              h-72
              w-72
              rounded-full
              bg-red-700/15
              blur-[100px]
            "
          />

          {/* TOP BADGES */}
          <div
            className="
              absolute
              inset-x-0
              top-0
              z-20
              flex
              items-start
              justify-between
              gap-3
              p-5
              sm:p-7
            "
          >
            <div
              className="
                rounded-full
                border
                border-white/10
                bg-black/45
                px-3
                py-2
                text-[9px]
                font-black
                uppercase
                tracking-[.18em]
                text-neutral-300
                backdrop-blur-md
              "
            >
              FC GLOSTRUPLONA
            </div>

            {player.video_url && (
              <div
                className="
                  rounded-full
                  border
                  border-red-500/20
                  bg-red-950/40
                  px-3
                  py-2
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[.18em]
                  text-red-300
                  backdrop-blur-md
                "
              >
                PLAYER CAM
              </div>
            )}
          </div>

          {/* PLAYER INFO */}
          <div
            className="
              absolute
              inset-x-0
              bottom-0
              z-20
              p-5
              pb-7
              sm:p-8
              md:p-10
            "
          >
            <div
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[.25em]
                text-red-400
              "
            >
              {player.position ||
                'FCG PLAYER'}
            </div>

            <div
              className="
                mt-3
                flex
                items-end
                gap-4
                sm:gap-7
              "
            >
              <div
                className="
                  shrink-0
                  text-[70px]
                  font-black
                  leading-[.8]
                  tracking-[-.08em]
                  text-red-400
                  drop-shadow-2xl
                  sm:text-[110px]
                "
              >
                #
                {
                  player.shirt_number
                }
              </div>

              <div
                className="
                  min-w-0
                  pb-1
                  sm:pb-2
                "
              >
                <h1
                  className="
                    text-3xl
                    font-black
                    uppercase
                    leading-[.88]
                    tracking-[-.045em]
                    drop-shadow-2xl
                    sm:text-5xl
                    md:text-6xl
                  "
                >
                  {
                    player.first_name
                  }

                  <br />

                  <span className="text-neutral-200">
                    {
                      player.last_name
                    }
                  </span>
                </h1>
              </div>
            </div>

            <div
              className="
                mt-6
                grid
                grid-cols-4
                gap-2
                sm:max-w-2xl
                sm:gap-3
              "
            >
              <div className="rounded-2xl border border-white/10 bg-black/45 p-3 text-center backdrop-blur-md sm:p-4">
                <div className="text-[8px] font-black uppercase tracking-[.13em] text-neutral-500 sm:text-[10px]">
                  Kampe
                </div>

                <div className="mt-1 text-xl font-black sm:text-2xl">
                  {
                    matchesPlayed
                  }
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/45 p-3 text-center backdrop-blur-md sm:p-4">
                <div className="text-[8px] font-black uppercase tracking-[.13em] text-neutral-500 sm:text-[10px]">
                  Mål
                </div>

                <div className="mt-1 text-xl font-black sm:text-2xl">
                  {
                    goals.length
                  }
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/45 p-3 text-center backdrop-blur-md sm:p-4">
                <div className="text-[8px] font-black uppercase tracking-[.13em] text-neutral-500 sm:text-[10px]">
                  Assists
                </div>

                <div className="mt-1 text-xl font-black sm:text-2xl">
                  {
                    assists.length
                  }
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-950/25 p-3 text-center backdrop-blur-md sm:p-4">
                <div className="text-[8px] font-black uppercase tracking-[.13em] text-yellow-500/70 sm:text-[10px]">
                  MOTM
                </div>

                <div className="mt-1 text-xl font-black text-yellow-400 sm:text-2xl">
                  {
                    motmCount
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SEASON STATS
         ================================================== */}

      <section>

        <div className="mb-4">
          <div className="fcg-label">
            Performance
          </div>

          <h2 className="fcg-heading mt-1">
            Statistik
          </h2>
        </div>

        <div
          className="
            grid
            grid-cols-2
            gap-3
            lg:grid-cols-4
          "
        >
          <div className="card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-600">
              Målbidrag
            </div>

            <div className="mt-2 text-4xl font-black">
              {
                goalContributions
              }
            </div>

            <div className="mt-2 text-xs text-neutral-500">
              Mål + assists
            </div>
          </div>

          <div className="card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-600">
              Mål / kamp
            </div>

            <div className="mt-2 text-4xl font-black">
              {goalsPerMatch.toFixed(
                2
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-600">
              Assists / kamp
            </div>

            <div className="mt-2 text-4xl font-black">
              {assistsPerMatch.toFixed(
                2
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-600">
              Bidrag / kamp
            </div>

            <div className="mt-2 text-4xl font-black text-red-400">
              {contributionsPerMatch.toFixed(
                2
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          FORM
         ================================================== */}

      <section>

        <div className="mb-4">
          <div className="fcg-label">
            Form
          </div>

          <h2 className="fcg-heading mt-1">
            Seneste 5
          </h2>
        </div>

        <div
          className="
            grid
            grid-cols-4
            gap-2
            sm:gap-3
          "
        >
          <div className="card p-3 text-center sm:p-5">
            <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600 sm:text-[10px]">
              Kampe
            </div>

            <div className="mt-2 text-2xl font-black sm:text-3xl">
              {
                recentMatches.length
              }
            </div>
          </div>

          <div className="card p-3 text-center sm:p-5">
            <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600 sm:text-[10px]">
              Mål
            </div>

            <div className="mt-2 text-2xl font-black sm:text-3xl">
              {
                recentGoals
              }
            </div>
          </div>

          <div className="card p-3 text-center sm:p-5">
            <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600 sm:text-[10px]">
              Assists
            </div>

            <div className="mt-2 text-2xl font-black sm:text-3xl">
              {
                recentAssists
              }
            </div>
          </div>

          <div className="card p-3 text-center sm:p-5">
            <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600 sm:text-[10px]">
              Bidrag
            </div>

            <div className="mt-2 text-2xl font-black text-red-400 sm:text-3xl">
              {recentGoals +
                recentAssists}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          BEST MATCH
         ================================================== */}

      {bestMatch &&
        bestMatchInfo && (
          <section>

            <div className="mb-4">
              <div className="fcg-label">
                Highlight
              </div>

              <h2 className="fcg-heading mt-1">
                Bedste kamp
              </h2>
            </div>

            <Link
              href={`/kampe/${bestMatchInfo.id}`}
              className="
                group
                relative
                block
                overflow-hidden
                rounded-[24px]
                border
                border-white/10
                bg-gradient-to-br
                from-red-950/30
                via-[#0e0e0e]
                to-black
                p-5
                shadow-xl
                transition
                hover:border-red-500/30
                sm:p-6
              "
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-700/15 blur-[75px]" />

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">

                <div>
                  <div
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[.18em]
                      text-red-400
                    "
                  >
                    PERSONLIG REKORD
                  </div>

                  <div className="mt-2 text-xl font-black sm:text-2xl">
                    {
                      bestMatchInfo.home_team
                    }{' '}
                    vs{' '}
                    {
                      bestMatchInfo.away_team
                    }
                  </div>

                  <div className="mt-1 text-xs text-neutral-500">
                    {formatDate(
                      bestMatchInfo.date
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {bestMatch.goals >
                    0 && (
                    <div className="fcg-badge">
                      ⚽{' '}
                      {
                        bestMatch.goals
                      }
                    </div>
                  )}

                  {bestMatch.assists >
                    0 && (
                    <div className="fcg-badge">
                      🎯{' '}
                      {
                        bestMatch.assists
                      }
                    </div>
                  )}
                </div>

              </div>
            </Link>
          </section>
        )}

      {/* ==================================================
          DISCIPLINE
         ================================================== */}

      <section>

        <div className="mb-4">
          <div className="fcg-label">
            Disciplin
          </div>

          <h2 className="fcg-heading mt-1">
            Kort
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">

          <div className="card p-5">
            <div className="text-sm text-neutral-500">
              🟨 Gule kort
            </div>

            <div className="mt-2 text-4xl font-black">
              {
                yellowCards.length
              }
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm text-neutral-500">
              🟥 Røde kort
            </div>

            <div className="mt-2 text-4xl font-black">
              {
                redCards.length
              }
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================
          MOTM HISTORY
         ================================================== */}

      {allMotmMatches.length >
        0 && (
        <section>

          <div className="mb-4">
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-yellow-400">
              ★ Awards
            </div>

            <h2 className="fcg-heading mt-1">
              Man of the Match
            </h2>
          </div>

          <div
            className="
              overflow-hidden
              rounded-[24px]
              border
              border-yellow-500/15
              bg-[#0d0d0d]
            "
          >
            {allMotmMatches.map(
              (
                match:
                  any
              ) => (
                <Link
                  key={
                    match.id
                  }
                  href={`/kampe/${match.id}`}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    border-b
                    border-white/[0.06]
                    p-4
                    transition
                    last:border-0
                    hover:bg-white/[0.04]
                    sm:p-5
                  "
                >
                  <div>

                    <div className="font-black">
                      ★{' '}
                      {
                        match.home_team
                      }{' '}
                      vs{' '}
                      {
                        match.away_team
                      }
                    </div>

                    <div className="mt-1 text-xs text-neutral-600">
                      {formatDate(
                        match.date
                      )}
                    </div>

                  </div>

                  <span className="text-yellow-400">
                    →
                  </span>
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {/* ==================================================
          MATCH HISTORY
         ================================================== */}

      <section>

        <div className="mb-4">
          <div className="fcg-label">
            Historik
          </div>

          <h2 className="fcg-heading mt-1">
            Kampe
          </h2>
        </div>

        <div
          className="
            overflow-hidden
            rounded-[24px]
            border
            border-white/10
            bg-[#0d0d0d]
          "
        >
          {matchHistory.map(
            (
              appearance:
                any
            ) => {
              const match =
                appearance.match

              if (!match) {
                return null
              }

              return (
                <Link
                  key={
                    appearance.match_id
                  }
                  href={`/kampe/${match.id}`}
                  className="
                    block
                    border-b
                    border-white/[0.06]
                    p-4
                    transition
                    last:border-0
                    hover:bg-white/[0.04]
                    sm:p-5
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-4
                    "
                  >
                    <div className="min-w-0">

                      <div className="font-black">
                        {
                          match.home_team
                        }{' '}
                        vs{' '}
                        {
                          match.away_team
                        }
                      </div>

                      <div className="mt-1 text-xs text-neutral-600">
                        {formatDate(
                          match.date
                        )}

                        {match.competition
                          ? ` • ${match.competition}`
                          : ''}
                      </div>

                    </div>

                    <div className="shrink-0 text-right">

                      {match.home_score !==
                        null &&
                      match.away_score !==
                        null ? (
                        <div className="text-xl font-black sm:text-2xl">
                          {
                            match.home_score
                          }
                          {' – '}
                          {
                            match.away_score
                          }
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-600">
                          -
                        </div>
                      )}

                    </div>
                  </div>
                </Link>
              )
            }
          )}

          {!matchHistory.length && (
            <div className="p-8 text-center text-sm text-neutral-500">
              Spilleren har endnu ikke registreret nogen kampe.
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          EVENTS
         ================================================== */}

      <section>

        <div className="mb-4">
          <div className="fcg-label">
            Karriere
          </div>

          <h2 className="fcg-heading mt-1">
            Kampbegivenheder
          </h2>
        </div>

        <div
          className="
            overflow-hidden
            rounded-[24px]
            border
            border-white/10
            bg-[#0d0d0d]
          "
        >
          {playerEvents.map(
            (
              event:
                any
            ) => {
              let eventName =
                event.event_type

              if (
                event.event_type ===
                  'goal' &&
                event.player_id ===
                  id
              ) {
                eventName =
                  '⚽ Mål'
              } else if (
                event.event_type ===
                  'goal' &&
                event.assist_player_id ===
                  id
              ) {
                eventName =
                  '🎯 Assist'
              } else if (
                event.event_type ===
                'yellow_card'
              ) {
                eventName =
                  '🟨 Gult kort'
              } else if (
                event.event_type ===
                'red_card'
              ) {
                eventName =
                  '🟥 Rødt kort'
              }

              return (
                <Link
                  key={`${event.id}-${eventName}`}
                  href={
                    event.match?.id
                      ? `/kampe/${event.match.id}`
                      : '#'
                  }
                  className="
                    block
                    border-b
                    border-white/[0.06]
                    p-4
                    transition
                    last:border-0
                    hover:bg-white/[0.04]
                    sm:p-5
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-4
                    "
                  >
                    <div>

                      <div className="font-black">
                        {
                          eventName
                        }
                      </div>

                      {event.match && (
                        <div className="mt-1 text-xs text-neutral-600">
                          {
                            event.match.home_team
                          }{' '}
                          vs{' '}
                          {
                            event.match.away_team
                          }
                        </div>
                      )}

                    </div>

                    <div className="shrink-0 text-right">

                      <div className="font-black text-red-400">
                        {
                          event.minute
                        }
                        '
                      </div>

                      {event.match
                        ?.date && (
                        <div className="text-xs text-neutral-700">
                          {formatDate(
                            event.match.date
                          )}
                        </div>
                      )}

                    </div>

                  </div>
                </Link>
              )
            }
          )}

          {!playerEvents.length && (
            <div className="p-8 text-center text-sm text-neutral-500">
              Ingen kampbegivenheder registreret for denne spiller endnu.
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          END BRAND
         ================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-[28px]
          border
          border-white/10
          bg-black
          p-8
          text-center
          sm:p-10
        "
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-red-700/15 blur-[80px]" />

        <div className="relative z-10">

          <Image
            src="/fcg-logo.png"
            alt="FC Glostruplona"
            width={75}
            height={75}
            className="mx-auto h-auto w-16"
          />

          <div
            className="
              mt-4
              text-xl
              font-black
              uppercase
              tracking-[-.03em]
              sm:text-3xl
            "
          >
            {
              player.first_name
            }{' '}
            {
              player.last_name
            }
          </div>

          <div className="mt-2 text-[9px] font-black uppercase tracking-[.22em] text-red-400">
            FC GLOSTRUPLONA · EST. 2025
          </div>

        </div>
      </section>

    </div>
  )
}