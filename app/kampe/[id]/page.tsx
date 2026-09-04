import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getMatchState } from '@/lib/match-time'
import LiveRefresh from '@/components/LiveRefresh'

export const dynamic = 'force-dynamic'

function formatDate(date: string | null) {
  if (!date) return 'Dato ikke fastsat'

  const [year, month, day] = date.split('-')

  return `${day}.${month}.${year}`
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const s = await createServerSupabase()

  /*
   * ==========================================
   * HENT KAMP
   * ==========================================
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
   * ==========================================
   * MAN OF THE MATCH
   * ==========================================
   */
  let manOfTheMatch: any = null

  if (m.man_of_match_player_id) {
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

    manOfTheMatch = motmPlayer
  }

  /*
   * ==========================================
   * HENT KAMPHÆNDELSER
   * ==========================================
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
    .order('minute', {
      ascending: false,
    })

  if (eventsError) {
    console.error(
      'MATCH EVENTS ERROR:',
      eventsError
    )
  }

  const matchEvents = events || []

  /*
   * ==========================================
   * SCORE
   * ==========================================
   */
  const goalEvents =
    matchEvents.filter(
      (event: any) =>
        event.event_type === 'goal'
    )

  const homeScore =
    goalEvents.filter(
      (event: any) =>
        event.team === 'home'
    ).length

  const awayScore =
    goalEvents.filter(
      (event: any) =>
        event.team === 'away'
    ).length

  /*
   * ==========================================
   * STARTOPSTILLING
   * ==========================================
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
    .eq('match_id', id)
    .eq('starter', true)
    .order('position_order', {
      ascending: true,
    })

  if (lineupError) {
    console.error(
      'MATCH LINEUP ERROR:',
      lineupError
    )
  }

  const {
    data: lineupPlayers,
    error: lineupPlayersError,
  } = await s
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      shirt_number,
      position
    `)

  if (lineupPlayersError) {
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
            (player: any) =>
              player.id === row.player_id
          ) || null,
      })
    ) || []

  /*
   * ==========================================
   * KAMPSTATUS
   * ==========================================
   */
  const state = getMatchState(
    m.date,
    m.kickoff_time,
    m.status
  )

  let statusText = 'KOMMENDE'

  if (
    state.phase === '1. halvleg' ||
    state.phase === '2. halvleg'
  ) {
    statusText =
      `LIVE • ${state.minute}'`
  } else if (
    state.phase === 'Pause'
  ) {
    statusText = 'PAUSE'
  } else if (
    state.phase === 'Overtid'
  ) {
    statusText =
      `OVERTID • ${state.minute}'`
  } else if (
    state.phase === 'Slut'
  ) {
    statusText = 'FULL TIME'
  }

  if (m.status === 'Udsat') {
    statusText = 'UDSAT'
  }

  if (m.status === 'Aflyst') {
    statusText = 'AFLYST'
  }

  const isLive =
    state.isLive &&
    m.status !== 'Udsat' &&
    m.status !== 'Aflyst'

  const hasStarted =
    state.phase !== 'Kommende'

  /*
   * ==========================================
   * MÅLSCORERE
   * ==========================================
   */
  const homeGoals =
    goalEvents
      .filter(
        (goal: any) =>
          goal.team === 'home'
      )
      .sort(
        (a: any, b: any) =>
          Number(a.minute) -
          Number(b.minute)
      )

  const awayGoals =
    goalEvents
      .filter(
        (goal: any) =>
          goal.team === 'away'
      )
      .sort(
        (a: any, b: any) =>
          Number(a.minute) -
          Number(b.minute)
      )

  /*
   * ==========================================
   * MOTM-STATISTIK I DENNE KAMP
   * ==========================================
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
   * ==========================================
   * EVENT HELPERS
   * ==========================================
   */
  function getEventInfo(e: any) {
    if (e.event_type === 'goal') {
      return {
        label: 'Mål',
        icon: '⚽',
      }
    }

    if (
      e.event_type ===
      'yellow_card'
    ) {
      return {
        label: 'Gult kort',
        icon: '🟨',
      }
    }

    if (
      e.event_type ===
      'red_card'
    ) {
      return {
        label: 'Rødt kort',
        icon: '🟥',
      }
    }

    return {
      label: 'Hændelse',
      icon: '•',
    }
  }

  function getEventPlayerName(
    e: any
  ) {
    if (e.player) {
      return `${e.player.first_name} ${e.player.last_name}`
    }

    return e.team === 'home'
      ? m.home_team
      : m.away_team
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      <LiveRefresh
        interval={
          isLive
            ? 10000
            : 30000
        }
      />

      {/* SCOREBOARD */}
      <section
        className={
          isLive
            ? 'relative overflow-hidden rounded-[28px] border border-red-500/40 bg-gradient-to-b from-red-950/80 via-[#1a0d0b] to-[#120d0b] shadow-2xl'
            : 'relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-[#120d0b] shadow-2xl'
        }
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-700/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-8 md:p-10">
          <div className="text-center text-[10px] font-black uppercase tracking-[.25em] text-neutral-500 sm:text-xs">
            {m.competition ||
              '9. divisionen'}
          </div>

          {/* STATUS */}
          <div className="mt-3 flex justify-center">
            <div
              className={
                isLive
                  ? 'flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/70 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-red-300'
                  : state.phase === 'Slut'
                    ? 'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white'
                    : 'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-neutral-400'
              }
            >
              {isLive && (
                <span className="h-2 w-2 rounded-full bg-red-500" />
              )}

              {statusText}
            </div>
          </div>

          {/* HOLD + SCORE */}
          <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-5">
            {/* HJEMME */}
            <div className="min-w-0 text-right">
              <div className="ml-auto max-w-[130px] text-base font-black leading-tight sm:max-w-none sm:text-2xl md:text-3xl">
                {m.home_team}
              </div>

              {hasStarted &&
                homeGoals.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {homeGoals.map(
                      (goal: any) => (
                        <div
                          key={goal.id}
                          className="text-[10px] leading-tight text-neutral-400 sm:text-xs"
                        >
                          <span className="font-bold text-neutral-300">
                            {goal.player
                              ? `${goal.player.first_name} ${goal.player.last_name}`
                              : m.home_team}
                          </span>{' '}

                          {goal.minute}'
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>

            {/* SCORE */}
            <div className="min-w-[88px] rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-center shadow-xl sm:min-w-[150px] sm:px-6 sm:py-5">
              {hasStarted ? (
                <div className="whitespace-nowrap text-3xl font-black tracking-tight sm:text-5xl">
                  {homeScore}

                  <span className="mx-2 text-neutral-600">
                    –
                  </span>

                  {awayScore}
                </div>
              ) : (
                <div className="text-xl font-black text-neutral-400 sm:text-2xl">
                  VS
                </div>
              )}
            </div>

            {/* UDE */}
            <div className="min-w-0 text-left">
              <div className="mr-auto max-w-[130px] text-base font-black leading-tight sm:max-w-none sm:text-2xl md:text-3xl">
                {m.away_team}
              </div>

              {hasStarted &&
                awayGoals.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {awayGoals.map(
                      (goal: any) => (
                        <div
                          key={goal.id}
                          className="text-[10px] leading-tight text-neutral-400 sm:text-xs"
                        >
                          <span className="font-bold text-neutral-300">
                            {goal.player
                              ? `${goal.player.first_name} ${goal.player.last_name}`
                              : m.away_team}
                          </span>{' '}

                          {goal.minute}'
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* KAMPINFO */}
          <div className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-neutral-400 sm:text-sm">
            <span>
              📅 {formatDate(m.date)}
            </span>

            {m.kickoff_time && (
              <>
                <span className="text-neutral-700">
                  •
                </span>

                <span>
                  🕒{' '}
                  {m.kickoff_time.slice(
                    0,
                    5
                  )}
                </span>
              </>
            )}

            {m.stadium && (
              <>
                <span className="text-neutral-700">
                  •
                </span>

                <span>
                  📍 {m.stadium}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* HURTIG KAMPSTATUS */}
      {hasStarted && (
        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="card min-w-0 p-3 text-center sm:p-5">
            <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 sm:text-xs">
              Status
            </div>

            <div
              className={
                isLive
                  ? 'mt-1 truncate text-sm font-black text-red-400 sm:mt-2 sm:text-lg'
                  : 'mt-1 truncate text-sm font-black sm:mt-2 sm:text-lg'
              }
            >
              {state.phase === 'Slut'
                ? 'Slut'
                : state.phase}
            </div>
          </div>

          <div className="card min-w-0 p-3 text-center sm:p-5">
            <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 sm:text-xs">
              Mål
            </div>

            <div className="mt-1 text-sm font-black sm:mt-2 sm:text-lg">
              {homeScore + awayScore}
            </div>
          </div>

          <div className="card min-w-0 p-3 text-center sm:p-5">
            <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 sm:text-xs">
              Hændelser
            </div>

            <div className="mt-1 text-sm font-black sm:mt-2 sm:text-lg">
              {matchEvents.length}
            </div>
          </div>
        </section>
      )}

      {/* MAN OF THE MATCH */}
      {manOfTheMatch && (
        <section className="relative overflow-hidden rounded-[26px] border border-yellow-500/30 bg-gradient-to-br from-yellow-950/40 via-[#17110c] to-[#120d0b] p-5 shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-yellow-500/10 blur-3xl" />

          <div className="relative z-10">
            <div className="text-[10px] font-black uppercase tracking-[.25em] text-yellow-400 sm:text-xs">
              ⭐ Man of the Match
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-yellow-400/60 bg-yellow-500/10 text-xl font-black text-yellow-300 sm:h-20 sm:w-20 sm:text-2xl">
                #{manOfTheMatch.shirt_number}
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-black sm:text-3xl">
                  {manOfTheMatch.first_name}{' '}
                  {manOfTheMatch.last_name}
                </h2>

                {manOfTheMatch.position && (
                  <div className="mt-1 text-sm text-neutral-400">
                    {manOfTheMatch.position}
                  </div>
                )}
              </div>
            </div>

            {(motmGoals > 0 ||
              motmAssists > 0) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {motmGoals > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black">
                    ⚽ {motmGoals}{' '}
                    {motmGoals === 1
                      ? 'mål'
                      : 'mål'}
                  </div>
                )}

                {motmAssists > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black">
                    🎯 {motmAssists}{' '}
                    {motmAssists === 1
                      ? 'assist'
                      : 'assists'}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* KAMPFORLØB */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Live center
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Kampforløb
          </h2>
        </div>

        {matchEvents.length ? (
          <div className="card overflow-hidden">
            {matchEvents.map(
              (
                e: any,
                index: number
              ) => {
                const {
                  label,
                  icon,
                } = getEventInfo(e)

                const playerName =
                  getEventPlayerName(e)

                const isHome =
                  e.team === 'home'

                return (
                  <div
                    key={e.id}
                    className={
                      index !==
                      matchEvents.length -
                        1
                        ? 'relative border-b border-white/10 p-4 sm:p-5'
                        : 'relative p-4 sm:p-5'
                    }
                  >
                    <div className="grid grid-cols-[48px_1fr] items-start gap-3 sm:grid-cols-[60px_1fr] sm:gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black text-red-400 sm:h-12 sm:w-12">
                        {e.minute}'
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg">
                            {icon}
                          </span>

                          <span className="font-black">
                            {label}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-neutral-500">
                            {isHome
                              ? m.home_team
                              : m.away_team}
                          </span>
                        </div>

                        <div className="mt-1 text-sm font-bold text-neutral-300">
                          {playerName}
                        </div>

                        {e.event_type ===
                          'goal' &&
                          e.assist && (
                            <div className="mt-1 text-xs text-neutral-500">
                              Assist:{' '}

                              <span className="text-neutral-400">
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
          <div className="card p-7 text-center sm:p-10">
            <div className="text-3xl">
              ⚽
            </div>

            <div className="mt-3 text-lg font-black">
              {hasStarted
                ? 'Ingen hændelser endnu'
                : 'Kampen er ikke startet'}
            </div>

            <div className="mx-auto mt-2 max-w-md text-sm leading-5 text-neutral-400">
              {hasStarted
                ? 'Mål og kort bliver vist her, så snart de bliver registreret.'
                : 'Når kampen starter, kan du følge mål, kort og andre hændelser her.'}
            </div>
          </div>
        )}
      </section>

      {/* STARTOPSTILLING */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
              FC Glostruplona
            </div>

            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Startopstilling
            </h2>
          </div>

          {m.formation &&
            startingLineup.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black sm:px-4 sm:text-sm">
                Formation:{' '}

                <span className="text-red-400">
                  {m.formation}
                </span>
              </div>
            )}
        </div>

        {startingLineup.length ? (
          <div className="card p-3 sm:p-6">
            <div className="mx-auto max-w-2xl">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-white/20 bg-green-800 shadow-2xl sm:rounded-3xl">
                {/* GRÆSSTRIBER */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
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

                <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/35" />

                <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-white/35" />

                <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35 sm:h-32 sm:w-32" />

                <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />

                <div className="pointer-events-none absolute left-[20%] right-[20%] top-3 h-[18%] border-x-2 border-b-2 border-white/35" />

                <div className="pointer-events-none absolute bottom-3 left-[20%] right-[20%] h-[18%] border-x-2 border-t-2 border-white/35" />

                <div className="pointer-events-none absolute left-[38%] right-[38%] top-0 h-3 border-x-2 border-b-2 border-white/35" />

                <div className="pointer-events-none absolute bottom-0 left-[38%] right-[38%] h-3 border-x-2 border-t-2 border-white/35" />

                {startingLineup.map(
                  (
                    lineupPlayer: any
                  ) => {
                    const player =
                      lineupPlayer.player

                    if (!player) {
                      return null
                    }

                    return (
                      <div
                        key={
                          lineupPlayer.id
                        }
                        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
                        style={{
                          left: `${
                            Number(
                              lineupPlayer.x_position
                            ) || 50
                          }%`,

                          top: `${
                            Number(
                              lineupPlayer.y_position
                            ) || 50
                          }%`,
                        }}
                      >
                        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-700 text-[10px] font-black text-white shadow-xl sm:h-14 sm:w-14 sm:text-sm">
                          #
                          {
                            player.shirt_number
                          }
                        </div>

                        <div className="mt-1 max-w-[72px] truncate whitespace-nowrap rounded-md border border-white/10 bg-black/85 px-1.5 py-1 text-[8px] font-black text-white shadow-lg sm:max-w-32 sm:px-2 sm:text-xs">
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

              <div className="mt-3 text-center text-[11px] text-neutral-500 sm:mt-4 sm:text-xs">
                FC Glostruplonas officielle
                startopstilling.
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-7 text-center sm:p-10">
            <div className="text-4xl">
              👕
            </div>

            <div className="mt-4 text-xl font-black">
              Startopstillingen er endnu
              ikke offentliggjort
            </div>

            <div className="mx-auto mt-2 max-w-md text-sm leading-5 text-neutral-400">
              Holdet bliver vist her, når
              trænerstaben har offentliggjort
              startopstillingen.
            </div>
          </div>
        )}
      </section>

      {/* KAMPINFO */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Information
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Kampinfo
          </h2>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-[100px_1fr] gap-3 border-b border-white/10 p-4 text-sm sm:grid-cols-[150px_1fr] sm:p-5">
            <div className="text-neutral-500">
              Turnering
            </div>

            <div className="text-right font-bold">
              {m.competition ||
                '9. divisionen'}
            </div>
          </div>

          <div className="grid grid-cols-[100px_1fr] gap-3 border-b border-white/10 p-4 text-sm sm:grid-cols-[150px_1fr] sm:p-5">
            <div className="text-neutral-500">
              Dato
            </div>

            <div className="text-right font-bold">
              {formatDate(m.date)}
            </div>
          </div>

          <div className="grid grid-cols-[100px_1fr] gap-3 border-b border-white/10 p-4 text-sm sm:grid-cols-[150px_1fr] sm:p-5">
            <div className="text-neutral-500">
              Kickoff
            </div>

            <div className="text-right font-bold">
              {m.kickoff_time
                ? m.kickoff_time.slice(
                    0,
                    5
                  )
                : 'Ikke fastsat'}
            </div>
          </div>

          <div className="grid grid-cols-[100px_1fr] gap-3 p-4 text-sm sm:grid-cols-[150px_1fr] sm:p-5">
            <div className="text-neutral-500">
              Stadion
            </div>

            <div className="text-right font-bold">
              {m.stadium ||
                'Ikke fastsat'}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}