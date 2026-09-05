import Image from 'next/image'
import { notFound } from 'next/navigation'

import {
  createServerSupabase,
} from '@/lib/supabase-server'

import {
  getMatchState,
} from '@/lib/match-time'

import LiveRefresh from '@/components/LiveRefresh'

export const dynamic =
  'force-dynamic'

function formatDate(
  date: string | null
) {
  if (!date) {
    return 'Dato ikke fastsat'
  }

  const [
    year,
    month,
    day,
  ] = date.split('-')

  return `${day}.${month}.${year}`
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
   * KAMP
   * ======================================================
   */

  const {
    data: m,
    error: matchError,
  } = await s
    .from('matches')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (matchError) {
    console.error(
      'MATCH ERROR:',
      matchError
    )
  }

  if (!m) {
    notFound()
  }

  /*
   * ======================================================
   * MAN OF THE MATCH
   * ======================================================
   */

  let manOfTheMatch:
    any = null

  if (
    m.man_of_match_player_id
  ) {
    const {
      data: motmPlayer,
      error: motmError,
    } = await s
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        shirt_number,
        position
      `)
      .eq(
        'id',
        m.man_of_match_player_id
      )
      .maybeSingle()

    if (motmError) {
      console.error(
        'MAN OF THE MATCH ERROR:',
        motmError
      )
    }

    manOfTheMatch =
      motmPlayer
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
      player:players!match_events_player_id_fkey(
        first_name,
        last_name,
        shirt_number
      ),
      assist:players!match_events_assist_player_id_fkey(
        first_name,
        last_name,
        shirt_number
      )
    `)
    .eq('match_id', id)
    .order(
      'minute',
      {
        ascending: false,
      }
    )

  if (eventsError) {
    console.error(
      'MATCH EVENTS ERROR:',
      eventsError
    )
  }

  const matchEvents =
    events || []

  /*
   * ======================================================
   * SCORE
   * ======================================================
   */

  const goalEvents =
    matchEvents.filter(
      (event: any) =>
        event.event_type ===
        'goal'
    )

  const eventHomeScore =
    goalEvents.filter(
      (event: any) =>
        event.team ===
        'home'
    ).length

  const eventAwayScore =
    goalEvents.filter(
      (event: any) =>
        event.team ===
        'away'
    ).length

  /*
   * ======================================================
   * LINEUP
   * ======================================================
   */

  const {
    data: lineupRows,
    error: lineupError,
  } = await s
    .from('match_lineups')
    .select(`
      id,
      player_id,
      starter,
      position_order,
      x_position,
      y_position,
      lineup_role
    `)
    .eq(
      'match_id',
      id
    )
    .eq(
      'starter',
      true
    )
    .order(
      'position_order',
      {
        ascending: true,
      }
    )

  if (lineupError) {
    console.error(
      'MATCH LINEUP ERROR:',
      lineupError
    )
  }

  const {
    data: lineupPlayers,
    error:
      lineupPlayersError,
  } = await s
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      shirt_number,
      position
    `)

  if (
    lineupPlayersError
  ) {
    console.error(
      'LINEUP PLAYERS ERROR:',
      lineupPlayersError
    )
  }

  const startingLineup =
    lineupRows?.map(
      (row: any) => ({
        ...row,

        player:
          lineupPlayers?.find(
            (
              player:
                any
            ) =>
              player.id ===
              row.player_id
          ) || null,
      })
    ) || []

  /*
   * ======================================================
   * STATUS
   * ======================================================
   */

  const state =
    getMatchState(
      m.date,
      m.kickoff_time,
      m.status
    )

  let statusText =
    'KOMMENDE'

  if (
    state.phase ===
      '1. halvleg' ||
    state.phase ===
      '2. halvleg'
  ) {
    statusText =
      `LIVE • ${state.minute}'`
  } else if (
    state.phase ===
    'Pause'
  ) {
    statusText =
      'PAUSE'
  } else if (
    state.phase ===
    'Overtid'
  ) {
    statusText =
      `OVERTID • ${state.minute}'`
  } else if (
    state.phase ===
    'Slut'
  ) {
    statusText =
      'FULL TIME'
  }

  if (
    m.status ===
    'Udsat'
  ) {
    statusText =
      'UDSAT'
  }

  if (
    m.status ===
    'Aflyst'
  ) {
    statusText =
      'AFLYST'
  }

  const isLive =
    state.isLive &&
    m.status !==
      'Udsat' &&
    m.status !==
      'Aflyst'

  const hasStarted =
    state.phase !==
    'Kommende'

  /*
   * FÆRDIGE KAMPE:
   * Brug gemt slutresultat.
   *
   * LIVE:
   * Brug events.
   */

  const homeScore =
    state.phase ===
      'Slut'
      ? Number(
          m.home_score ??
            eventHomeScore
        )
      : eventHomeScore

  const awayScore =
    state.phase ===
      'Slut'
      ? Number(
          m.away_score ??
            eventAwayScore
        )
      : eventAwayScore

  /*
   * ======================================================
   * MÅLSCORERE
   * ======================================================
   */

  const homeGoals =
    goalEvents
      .filter(
        (goal: any) =>
          goal.team ===
          'home'
      )
      .sort(
        (
          a: any,
          b: any
        ) =>
          Number(
            a.minute
          ) -
          Number(
            b.minute
          )
      )

  const awayGoals =
    goalEvents
      .filter(
        (goal: any) =>
          goal.team ===
          'away'
      )
      .sort(
        (
          a: any,
          b: any
        ) =>
          Number(
            a.minute
          ) -
          Number(
            b.minute
          )
      )

  /*
   * ======================================================
   * MOTM STATS
   * ======================================================
   */

  const motmGoals =
    manOfTheMatch
      ? goalEvents.filter(
          (goal: any) =>
            goal.player_id ===
            manOfTheMatch.id
        ).length
      : 0

  const motmAssists =
    manOfTheMatch
      ? goalEvents.filter(
          (goal: any) =>
            goal.assist_player_id ===
            manOfTheMatch.id
        ).length
      : 0

  /*
   * ======================================================
   * EVENT HELPERS
   * ======================================================
   */

  function getEventInfo(
    e: any
  ) {
    if (
      e.event_type ===
      'goal'
    ) {
      return {
        label: 'MÅL',
        icon: '⚽',
      }
    }

    if (
      e.event_type ===
      'yellow_card'
    ) {
      return {
        label:
          'GULT KORT',
        icon: '🟨',
      }
    }

    if (
      e.event_type ===
      'red_card'
    ) {
      return {
        label:
          'RØDT KORT',
        icon: '🟥',
      }
    }

    return {
      label:
        'HÆNDELSE',
      icon: '•',
    }
  }

  function getEventPlayerName(
    e: any
  ) {
    if (e.player) {
      return `${e.player.first_name} ${e.player.last_name}`
    }

    return e.team ===
      'home'
      ? m.home_team
      : m.away_team
  }

  /*
   * ======================================================
   * UI
   * ======================================================
   */

  return (
    <div className="fcg-page fcg-fade-in space-y-7 md:space-y-12">

      <LiveRefresh
        interval={
          isLive
            ? 10000
            : 30000
        }
      />

      {/* ==================================================
          MATCH HERO
         ================================================== */}

      <section
        className="
          relative
          -mx-4
          -mt-5
          min-h-[520px]
          overflow-hidden
          border-b
          border-white/10
          bg-black
          sm:mx-0
          sm:mt-0
          sm:min-h-[560px]
          sm:rounded-[30px]
          sm:border
          md:min-h-[600px]
        "
      >
        {/* FOTO */}
        <Image
          src="/media/matches-hero.jpg"
          alt="FC Glostruplona Matchday"
          fill
          priority
          sizes="100vw"
          className="
            object-cover
            object-center
            opacity-70
            saturate-[.75]
            contrast-[1.18]
          "
        />

        {/* CINEMATIC OVERLAYS */}
        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-black/30
            via-black/45
            to-[#070707]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-r
            from-red-950/30
            via-transparent
            to-black/20
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-24
            top-10
            h-72
            w-72
            rounded-full
            bg-red-700/20
            blur-[100px]
          "
        />

        <div
          className="
            relative
            z-10
            flex
            min-h-[520px]
            flex-col
            justify-between
            p-5
            pb-8
            sm:min-h-[560px]
            sm:p-8
            md:min-h-[600px]
            md:p-10
          "
        >

          {/* HERO TOP */}
          <div
            className="
              flex
              items-start
              justify-between
              gap-4
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
                tracking-[.2em]
                text-neutral-300
                backdrop-blur-md
                sm:text-[10px]
              "
            >
              {m.competition ||
                'Mesterrækken'}
            </div>

            <div
              className={
                isLive
                  ? `
                    flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-red-500/30
                    bg-red-950/70
                    px-3
                    py-2
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[.15em]
                    text-red-300
                    backdrop-blur-md
                  `
                  : `
                    rounded-full
                    border
                    border-white/10
                    bg-black/45
                    px-3
                    py-2
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[.15em]
                    text-white
                    backdrop-blur-md
                  `
              }
            >
              {isLive && (
                <span className="fcg-live-dot" />
              )}

              {statusText}
            </div>
          </div>

          {/* HERO BOTTOM */}
          <div>

            <div className="mb-5 text-center">

              <div
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[.28em]
                  text-red-400
                  sm:text-xs
                "
              >
                {isLive
                  ? 'LIVE FROM GLOSTRUP'
                  : state.phase ===
                      'Slut'
                    ? 'FULL TIME'
                    : 'MATCHDAY'}
              </div>

            </div>

            {/* HOLD + SCORE */}
            <div
              className="
                grid
                grid-cols-[1fr_auto_1fr]
                items-start
                gap-2
                sm:gap-5
              "
            >

              {/* HOME */}
              <div
                className="
                  min-w-0
                  pt-3
                  text-right
                "
              >
                <div
                  className="
                    ml-auto
                    max-w-[125px]
                    text-base
                    font-black
                    uppercase
                    leading-[1.05]
                    drop-shadow-xl
                    sm:max-w-[230px]
                    sm:text-2xl
                    md:text-3xl
                  "
                >
                  {m.home_team}
                </div>

                {hasStarted &&
                  homeGoals.length >
                    0 && (
                    <div className="mt-4 space-y-1.5">
                      {homeGoals.map(
                        (
                          goal:
                            any
                        ) => (
                          <div
                            key={
                              goal.id
                            }
                            className="
                              text-[9px]
                              font-bold
                              leading-tight
                              text-neutral-300
                              sm:text-xs
                            "
                          >
                            {goal.player
                              ? `${goal.player.first_name} ${goal.player.last_name}`
                              : m.home_team}

                            <span className="ml-1 text-neutral-500">
                              {
                                goal.minute
                              }
                              '
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>

              {/* SCORE */}
              <div
                className="
                  min-w-[92px]
                  rounded-[22px]
                  border
                  border-white/15
                  bg-black/60
                  px-3
                  py-4
                  text-center
                  shadow-[0_20px_60px_rgba(0,0,0,.5)]
                  backdrop-blur-xl
                  sm:min-w-[160px]
                  sm:px-6
                  sm:py-5
                "
              >
                {hasStarted ? (
                  <div
                    className="
                      whitespace-nowrap
                      text-3xl
                      font-black
                      tracking-[-.06em]
                      sm:text-5xl
                      md:text-6xl
                    "
                  >
                    {homeScore}

                    <span className="mx-2 text-neutral-600">
                      –
                    </span>

                    {awayScore}
                  </div>
                ) : (
                  <div
                    className="
                      py-1
                      text-xl
                      font-black
                      text-neutral-300
                      sm:text-3xl
                    "
                  >
                    VS
                  </div>
                )}
              </div>

              {/* AWAY */}
              <div
                className="
                  min-w-0
                  pt-3
                  text-left
                "
              >
                <div
                  className="
                    mr-auto
                    max-w-[125px]
                    text-base
                    font-black
                    uppercase
                    leading-[1.05]
                    drop-shadow-xl
                    sm:max-w-[230px]
                    sm:text-2xl
                    md:text-3xl
                  "
                >
                  {m.away_team}
                </div>

                {hasStarted &&
                  awayGoals.length >
                    0 && (
                    <div className="mt-4 space-y-1.5">
                      {awayGoals.map(
                        (
                          goal:
                            any
                        ) => (
                          <div
                            key={
                              goal.id
                            }
                            className="
                              text-[9px]
                              font-bold
                              leading-tight
                              text-neutral-300
                              sm:text-xs
                            "
                          >
                            {goal.player
                              ? `${goal.player.first_name} ${goal.player.last_name}`
                              : m.away_team}

                            <span className="ml-1 text-neutral-500">
                              {
                                goal.minute
                              }
                              '
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* INFO */}
            <div
              className="
                mx-auto
                mt-7
                flex
                max-w-xl
                flex-wrap
                items-center
                justify-center
                gap-x-2
                gap-y-1
                text-center
                text-[10px]
                font-bold
                uppercase
                tracking-[.08em]
                text-neutral-400
                sm:text-xs
              "
            >
              <span>
                {formatDate(
                  m.date
                )}
              </span>

              {m.kickoff_time && (
                <>
                  <span className="text-red-700">
                    •
                  </span>

                  <span>
                    {m.kickoff_time.slice(
                      0,
                      5
                    )}
                  </span>
                </>
              )}

              {m.stadium && (
                <>
                  <span className="text-red-700">
                    •
                  </span>

                  <span>
                    {m.stadium}
                  </span>
                </>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================
          QUICK STATS
         ================================================== */}

      {hasStarted && (
        <section
          className="
            grid
            grid-cols-3
            gap-2
            sm:gap-4
          "
        >
          <div className="card min-w-0 p-3 text-center sm:p-5">
            <div
              className="
                text-[8px]
                font-black
                uppercase
                tracking-[.15em]
                text-neutral-600
                sm:text-[10px]
              "
            >
              STATUS
            </div>

            <div
              className={
                isLive
                  ? 'mt-2 truncate text-sm font-black text-red-400 sm:text-xl'
                  : 'mt-2 truncate text-sm font-black sm:text-xl'
              }
            >
              {state.phase ===
              'Slut'
                ? 'Slut'
                : state.phase}
            </div>
          </div>

          <div className="card min-w-0 p-3 text-center sm:p-5">
            <div
              className="
                text-[8px]
                font-black
                uppercase
                tracking-[.15em]
                text-neutral-600
                sm:text-[10px]
              "
            >
              MÅL
            </div>

            <div className="mt-2 text-sm font-black sm:text-xl">
              {homeScore +
                awayScore}
            </div>
          </div>

          <div className="card min-w-0 p-3 text-center sm:p-5">
            <div
              className="
                text-[8px]
                font-black
                uppercase
                tracking-[.15em]
                text-neutral-600
                sm:text-[10px]
              "
            >
              EVENTS
            </div>

            <div className="mt-2 text-sm font-black sm:text-xl">
              {
                matchEvents.length
              }
            </div>
          </div>
        </section>
      )}

      {/* ==================================================
          MAN OF THE MATCH
         ================================================== */}

      {manOfTheMatch && (
        <section
          className="
            relative
            overflow-hidden
            rounded-[28px]
            border
            border-yellow-500/20
            bg-gradient-to-br
            from-[#241a06]
            via-[#11100c]
            to-[#080808]
            p-5
            shadow-[0_25px_80px_rgba(0,0,0,.5)]
            sm:p-7
            md:p-8
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-16
              -top-16
              h-52
              w-52
              rounded-full
              bg-yellow-500/10
              blur-[80px]
            "
          />

          <div className="relative z-10">

            <div
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[.25em]
                text-yellow-400
              "
            >
              ★ PLAYER OF THE MATCH
            </div>

            <div
              className="
                mt-5
                flex
                items-center
                gap-4
                sm:gap-6
              "
            >
              <div
                className="
                  flex
                  h-16
                  w-16
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-yellow-400/40
                  bg-yellow-500/10
                  text-xl
                  font-black
                  text-yellow-300
                  shadow-[0_0_40px_rgba(234,179,8,.12)]
                  sm:h-20
                  sm:w-20
                  sm:text-2xl
                "
              >
                #
                {
                  manOfTheMatch.shirt_number
                }
              </div>

              <div className="min-w-0">

                <div
                  className="
                    text-2xl
                    font-black
                    uppercase
                    leading-tight
                    sm:text-4xl
                  "
                >
                  {
                    manOfTheMatch.first_name
                  }{' '}
                  {
                    manOfTheMatch.last_name
                  }
                </div>

                {manOfTheMatch.position && (
                  <div
                    className="
                      mt-1
                      text-xs
                      font-black
                      uppercase
                      tracking-[.15em]
                      text-neutral-500
                    "
                  >
                    {
                      manOfTheMatch.position
                    }
                  </div>
                )}
              </div>
            </div>

            {(motmGoals >
              0 ||
              motmAssists >
                0) && (
              <div className="mt-5 flex flex-wrap gap-2">

                {motmGoals >
                  0 && (
                  <div className="fcg-badge">
                    ⚽{' '}
                    {motmGoals}{' '}
                    MÅL
                  </div>
                )}

                {motmAssists >
                  0 && (
                  <div className="fcg-badge">
                    🎯{' '}
                    {
                      motmAssists
                    }{' '}
                    {motmAssists ===
                    1
                      ? 'ASSIST'
                      : 'ASSISTS'}
                  </div>
                )}

              </div>
            )}
          </div>
        </section>
      )}

      {/* ==================================================
          MATCH TIMELINE
         ================================================== */}

      <section>

        <div className="mb-4">

          <div className="fcg-label">
            Match Centre
          </div>

          <h2 className="fcg-heading mt-1">
            Kampforløb
          </h2>

        </div>

        {matchEvents.length ? (
          <div
            className="
              relative
              overflow-hidden
              rounded-[24px]
              border
              border-white/10
              bg-[#0d0d0d]
              shadow-xl
            "
          >
            {matchEvents.map(
              (
                e: any,
                index:
                  number
              ) => {
                const {
                  label,
                  icon,
                } =
                  getEventInfo(
                    e
                  )

                const playerName =
                  getEventPlayerName(
                    e
                  )

                const isHome =
                  e.team ===
                  'home'

                return (
                  <div
                    key={
                      e.id
                    }
                    className={
                      index !==
                      matchEvents.length -
                        1
                        ? 'relative border-b border-white/[0.07] p-4 sm:p-5'
                        : 'relative p-4 sm:p-5'
                    }
                  >
                    <div
                      className="
                        grid
                        grid-cols-[52px_1fr]
                        items-start
                        gap-3
                        sm:grid-cols-[64px_1fr]
                        sm:gap-5
                      "
                    >

                      {/* MINUTE */}
                      <div
                        className="
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-red-500/15
                          bg-red-950/20
                          text-sm
                          font-black
                          text-red-400
                          sm:h-14
                          sm:w-14
                          sm:text-base
                        "
                      >
                        {
                          e.minute
                        }
                        '
                      </div>

                      <div className="min-w-0">

                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                          "
                        >
                          <span className="text-lg">
                            {icon}
                          </span>

                          <span
                            className="
                              text-sm
                              font-black
                              tracking-wide
                              sm:text-base
                            "
                          >
                            {label}
                          </span>

                          <span
                            className="
                              rounded-full
                              border
                              border-white/10
                              bg-white/[0.04]
                              px-2
                              py-1
                              text-[8px]
                              font-black
                              uppercase
                              tracking-wider
                              text-neutral-500
                              sm:text-[9px]
                            "
                          >
                            {isHome
                              ? m.home_team
                              : m.away_team}
                          </span>

                        </div>

                        <div
                          className="
                            mt-2
                            text-sm
                            font-black
                            text-white
                          "
                        >
                          {
                            playerName
                          }
                        </div>

                        {e.event_type ===
                          'goal' &&
                          e.assist && (
                            <div
                              className="
                                mt-1
                                text-xs
                                text-neutral-500
                              "
                            >
                              Assist:{' '}

                              <span className="font-bold text-neutral-300">
                                {
                                  e.assist
                                    .first_name
                                }{' '}
                                {
                                  e.assist
                                    .last_name
                                }
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )
              }
            )}
          </div>
        ) : (
          <div className="card relative overflow-hidden p-8 text-center sm:p-10">

            <div
              className="
                pointer-events-none
                absolute
                left-1/2
                top-1/2
                h-48
                w-48
                -translate-x-1/2
                -translate-y-1/2
                rounded-full
                bg-red-700/10
                blur-[70px]
              "
            />

            <div className="relative z-10">

              <div className="text-4xl">
                ⚽
              </div>

              <div className="mt-4 text-xl font-black">
                {hasStarted
                  ? 'Ingen hændelser endnu'
                  : 'Kampen er ikke startet'}
              </div>

              <div
                className="
                  mx-auto
                  mt-2
                  max-w-md
                  text-sm
                  leading-6
                  text-neutral-400
                "
              >
                {hasStarted
                  ? 'Mål og kort bliver vist her, så snart de bliver registreret.'
                  : 'Når kampen starter, kan du følge mål, kort og andre hændelser her.'}
              </div>

            </div>
          </div>
        )}
      </section>

      {/* ==================================================
          LINEUP
         ================================================== */}

      <section>

        <div
          className="
            mb-4
            flex
            flex-wrap
            items-end
            justify-between
            gap-3
          "
        >
          <div>
            <div className="fcg-label">
              FC Glostruplona
            </div>

            <h2 className="fcg-heading mt-1">
              Startopstilling
            </h2>
          </div>

          {m.formation &&
            startingLineup.length >
              0 && (
              <div className="fcg-badge">
                FORMATION{' '}

                <span className="text-red-400">
                  {
                    m.formation
                  }
                </span>
              </div>
            )}
        </div>

        {startingLineup.length ? (
          <div className="card p-3 sm:p-6">

            <div className="mx-auto max-w-2xl">

              <div
                className="
                  relative
                  aspect-[3/4]
                  overflow-hidden
                  rounded-[24px]
                  border
                  border-white/15
                  bg-[#132313]
                  shadow-[0_25px_80px_rgba(0,0,0,.55)]
                "
              >

                {/* DARK GRASS */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35" />

                <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
                  <div className="h-[10%] bg-white" />
                  <div className="h-[10%]" />
                  <div className="h-[10%] bg-white" />
                  <div className="h-[10%]" />
                  <div className="h-[10%] bg-white" />
                  <div className="h-[10%]" />
                  <div className="h-[10%] bg-white" />
                  <div className="h-[10%]" />
                  <div className="h-[10%] bg-white" />
                  <div className="h-[10%]" />
                </div>

                {/* PITCH */}
                <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/30" />

                <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-white/30" />

                <div
                  className="
                    pointer-events-none
                    absolute
                    left-1/2
                    top-1/2
                    h-24
                    w-24
                    -translate-x-1/2
                    -translate-y-1/2
                    rounded-full
                    border
                    border-white/30
                    sm:h-32
                    sm:w-32
                  "
                />

                <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />

                <div className="pointer-events-none absolute left-[20%] right-[20%] top-3 h-[18%] border-x border-b border-white/30" />

                <div className="pointer-events-none absolute bottom-3 left-[20%] right-[20%] h-[18%] border-x border-t border-white/30" />

                <div className="pointer-events-none absolute left-[38%] right-[38%] top-0 h-3 border-x border-b border-white/30" />

                <div className="pointer-events-none absolute bottom-0 left-[38%] right-[38%] h-3 border-x border-t border-white/30" />

                {/* PLAYERS */}
                {startingLineup.map(
                  (
                    lineupPlayer:
                      any
                  ) => {
                    const player =
                      lineupPlayer.player

                    if (
                      !player
                    ) {
                      return null
                    }

                    return (
                      <div
                        key={
                          lineupPlayer.id
                        }
                        className="
                          absolute
                          z-10
                          -translate-x-1/2
                          -translate-y-1/2
                          text-center
                        "
                        style={{
                          left: `${
                            Number(
                              lineupPlayer.x_position
                            ) ||
                            50
                          }%`,

                          top: `${
                            Number(
                              lineupPlayer.y_position
                            ) ||
                            50
                          }%`,
                        }}
                      >
                        <div
                          className="
                            mx-auto
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-full
                            border-2
                            border-white
                            bg-gradient-to-b
                            from-red-500
                            to-red-900
                            text-[10px]
                            font-black
                            text-white
                            shadow-[0_5px_22px_rgba(220,38,38,.45)]
                            sm:h-14
                            sm:w-14
                            sm:text-sm
                          "
                        >
                          #
                          {
                            player.shirt_number
                          }
                        </div>

                        <div
                          className="
                            mt-1
                            max-w-[76px]
                            truncate
                            whitespace-nowrap
                            rounded-lg
                            border
                            border-white/10
                            bg-black/90
                            px-1.5
                            py-1
                            text-[8px]
                            font-black
                            text-white
                            shadow-xl
                            backdrop-blur-md
                            sm:max-w-32
                            sm:px-2
                            sm:text-xs
                          "
                        >
                          {
                            player.first_name
                          }{' '}
                          {
                            player.last_name
                          }
                        </div>
                      </div>
                    )
                  }
                )}
              </div>

              <div
                className="
                  mt-4
                  text-center
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[.12em]
                  text-neutral-600
                "
              >
                FC GLOSTRUPLONAS OFFICIELLE STARTOPSTILLING
              </div>

            </div>
          </div>
        ) : (
          <div className="card relative overflow-hidden p-8 text-center sm:p-10">

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-700/10 blur-[70px]" />

            <div className="relative z-10">

              <div className="text-4xl">
                👕
              </div>

              <div className="mt-4 text-xl font-black">
                Holdkortet er ikke offentliggjort
              </div>

              <div
                className="
                  mx-auto
                  mt-2
                  max-w-md
                  text-sm
                  leading-6
                  text-neutral-400
                "
              >
                FC Glostruplonas startopstilling bliver vist her, når trænerstaben offentliggør holdkortet.
              </div>

            </div>
          </div>
        )}
      </section>

      {/* ==================================================
          MATCH INFO
         ================================================== */}

      <section>

        <div className="mb-4">

          <div className="fcg-label">
            Detaljer
          </div>

          <h2 className="fcg-heading mt-1">
            Kampinfo
          </h2>

        </div>

        <div
          className="
            overflow-hidden
            rounded-[24px]
            border
            border-white/10
            bg-[#0d0d0d]
            shadow-xl
          "
        >
          <div className="grid grid-cols-[105px_1fr] gap-3 border-b border-white/[0.07] p-4 text-sm sm:grid-cols-[160px_1fr] sm:p-5">

            <div className="text-neutral-600">
              Turnering
            </div>

            <div className="text-right font-black">
              {m.competition ||
                'Mesterrækken'}
            </div>

          </div>

          <div className="grid grid-cols-[105px_1fr] gap-3 border-b border-white/[0.07] p-4 text-sm sm:grid-cols-[160px_1fr] sm:p-5">

            <div className="text-neutral-600">
              Dato
            </div>

            <div className="text-right font-black">
              {formatDate(
                m.date
              )}
            </div>

          </div>

          <div className="grid grid-cols-[105px_1fr] gap-3 border-b border-white/[0.07] p-4 text-sm sm:grid-cols-[160px_1fr] sm:p-5">

            <div className="text-neutral-600">
              Kickoff
            </div>

            <div className="text-right font-black">
              {m.kickoff_time
                ? m.kickoff_time.slice(
                    0,
                    5
                  )
                : 'Ikke fastsat'}
            </div>

          </div>

          <div className="grid grid-cols-[105px_1fr] gap-3 p-4 text-sm sm:grid-cols-[160px_1fr] sm:p-5">

            <div className="text-neutral-600">
              Stadion
            </div>

            <div className="text-right font-black">
              {m.stadium ||
                'Ikke fastsat'}
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}