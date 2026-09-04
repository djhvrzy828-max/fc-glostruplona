import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function formatDate(date: string | null) {
  if (!date) {
    return 'Ingen dato'
  }

  const [year, month, day] =
    date.split('-')

  return `${day}.${month}.${year}`
}

function getSingleMatch(
  value: any
) {
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const s =
    await createServerSupabase()

  /*
   * ==========================================
   * SPILLER
   * ==========================================
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
   * ==========================================
   * KAMPDELTAGELSER
   * ==========================================
   */
  const {
    data: appearances,
    error: appearancesError,
  } = await s
    .from('match_appearances')
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

  if (appearancesError) {
    console.error(
      'PLAYER APPEARANCES ERROR:',
      appearancesError
    )
  }

  /*
   * ==========================================
   * SPILLERENS HÆNDELSER
   * ==========================================
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
   * ==========================================
   * MOTM
   * ==========================================
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
   * ==========================================
   * NORMALISER SUPABASE-RELATIONER
   * ==========================================
   */
  const allAppearances =
    (appearances || []).map(
      (appearance: any) => ({
        ...appearance,
        match:
          getSingleMatch(
            appearance.matches
          ),
      })
    )

  const allEvents =
    (events || []).map(
      (event: any) => ({
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
   * ==========================================
   * STATISTIK
   * ==========================================
   */
  const matchesPlayed =
    allAppearances.length

  const goals =
    allEvents.filter(
      (event: any) =>
        event.event_type ===
          'goal' &&
        event.player_id === id
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
        event.player_id === id
    )

  const redCards =
    allEvents.filter(
      (event: any) =>
        event.event_type ===
          'red_card' &&
        event.player_id === id
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
   * ==========================================
   * SENESTE HÆNDELSER
   * ==========================================
   */
  const playerEvents =
    [...allEvents]
      .filter(
        (event: any) =>
          event.player_id ===
            id ||
          event.assist_player_id ===
            id
      )
      .sort(
        (
          a: any,
          b: any
        ) => {
          const dateA =
            a.match?.date || ''

          const dateB =
            b.match?.date || ''

          if (
            dateA !== dateB
          ) {
            return dateB.localeCompare(
              dateA
            )
          }

          return (
            (b.minute || 0) -
            (a.minute || 0)
          )
        }
      )

  /*
   * ==========================================
   * KAMPHISTORIK
   * ==========================================
   */
  const matchHistory =
    [...allAppearances]
      .filter(
        (appearance: any) =>
          appearance.match
      )
      .sort(
        (
          a: any,
          b: any
        ) => {
          const dateA =
            a.match?.date || ''

          const dateB =
            b.match?.date || ''

          return dateB.localeCompare(
            dateA
          )
        }
      )

  /*
   * ==========================================
   * SENESTE 5 KAMPE
   * ==========================================
   */
  const recentMatches =
    matchHistory.slice(0, 5)

  /*
   * ==========================================
   * FORM
   * ==========================================
   */
  const recentMatchIds =
    new Set(
      recentMatches.map(
        (appearance: any) =>
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
   * ==========================================
   * BEDSTE KAMP
   * ==========================================
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
    const assist of assists
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
          (appearance: any) =>
            appearance.match_id ===
            bestMatch?.matchId
        )
      : null

  const bestMatchInfo =
    bestMatchAppearance?.match ||
    null

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* TILBAGE */}
      <Link
        href="/trup"
        className="inline-flex items-center gap-2 text-sm font-bold text-neutral-400 transition hover:text-white"
      >
        ← Tilbage til truppen
      </Link>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-red-950/60 via-[#18100e] to-[#120d0b] shadow-2xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-700/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 md:p-10">
          <div className="text-[10px] font-black uppercase tracking-[.25em] text-red-400 sm:text-xs">
            FC Glostruplona
          </div>

          <div className="mt-5 flex items-end gap-4 sm:gap-6">
            <div className="shrink-0 text-[64px] font-black leading-none tracking-[-0.06em] text-red-400 sm:text-[96px]">
              #
              {
                player.shirt_number
              }
            </div>

            <div className="min-w-0 pb-1 sm:pb-2">
              <h1 className="text-3xl font-black leading-[0.95] tracking-tight sm:text-5xl">
                {
                  player.first_name
                }
                <br />

                <span className="text-neutral-300">
                  {
                    player.last_name
                  }
                </span>
              </h1>

              <div className="mt-3 text-sm font-bold text-neutral-400 sm:text-base">
                {player.position ||
                  'Position ikke registreret'}
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-4 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center sm:p-4">
              <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 sm:text-xs">
                Kampe
              </div>

              <div className="mt-1 text-xl font-black sm:text-2xl">
                {matchesPlayed}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center sm:p-4">
              <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 sm:text-xs">
                Mål
              </div>

              <div className="mt-1 text-xl font-black sm:text-2xl">
                {goals.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center sm:p-4">
              <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 sm:text-xs">
                Assists
              </div>

              <div className="mt-1 text-xl font-black sm:text-2xl">
                {assists.length}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-950/20 p-3 text-center sm:p-4">
              <div className="text-[9px] font-black uppercase tracking-wider text-yellow-500/70 sm:text-xs">
                MOTM
              </div>

              <div className="mt-1 text-xl font-black text-yellow-400 sm:text-2xl">
                {motmCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTIK */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Sæson
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Statistik
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="card p-4 sm:p-5">
            <div className="text-xs text-neutral-500 sm:text-sm">
              Målbidrag
            </div>

            <div className="mt-2 text-3xl font-black">
              {goalContributions}
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <div className="text-xs text-neutral-500 sm:text-sm">
              Mål pr. kamp
            </div>

            <div className="mt-2 text-3xl font-black">
              {goalsPerMatch.toFixed(
                2
              )}
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <div className="text-xs text-neutral-500 sm:text-sm">
              Assists pr. kamp
            </div>

            <div className="mt-2 text-3xl font-black">
              {assistsPerMatch.toFixed(
                2
              )}
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <div className="text-xs text-neutral-500 sm:text-sm">
              Bidrag pr. kamp
            </div>

            <div className="mt-2 text-3xl font-black">
              {contributionsPerMatch.toFixed(
                2
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Form
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Seneste 5 kampe
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4 text-center sm:p-5">
            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Kampe
            </div>

            <div className="mt-2 text-3xl font-black">
              {recentMatches.length}
            </div>
          </div>

          <div className="card p-4 text-center sm:p-5">
            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              ⚽ Mål
            </div>

            <div className="mt-2 text-3xl font-black">
              {recentGoals}
            </div>
          </div>

          <div className="card p-4 text-center sm:p-5">
            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              🎯 Assists
            </div>

            <div className="mt-2 text-3xl font-black">
              {recentAssists}
            </div>
          </div>

          <div className="card p-4 text-center sm:p-5">
            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Bidrag
            </div>

            <div className="mt-2 text-3xl font-black text-red-400">
              {recentGoals +
                recentAssists}
            </div>
          </div>
        </div>
      </section>

      {/* BEDSTE KAMP */}
      {bestMatch &&
        bestMatchInfo && (
          <section>
            <div className="mb-3">
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
                Personlig rekord
              </div>

              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                Bedste kamp
              </h2>
            </div>

            <Link
              href={`/kampe/${bestMatchInfo.id}`}
              className="card block p-5 transition hover:border-red-500/30 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-black sm:text-lg">
                    {
                      bestMatchInfo.home_team
                    }{' '}
                    vs{' '}
                    {
                      bestMatchInfo.away_team
                    }
                  </div>

                  <div className="mt-1 text-sm text-neutral-500">
                    {formatDate(
                      bestMatchInfo.date
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {bestMatch.goals >
                    0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black">
                      ⚽{' '}
                      {
                        bestMatch.goals
                      }
                    </div>
                  )}

                  {bestMatch.assists >
                    0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black">
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

      {/* KORT */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Disciplin
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Kort
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card p-5">
            <div className="text-sm text-neutral-400">
              🟨 Gule kort
            </div>

            <div className="mt-2 text-3xl font-black">
              {yellowCards.length}
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm text-neutral-400">
              🟥 Røde kort
            </div>

            <div className="mt-2 text-3xl font-black">
              {redCards.length}
            </div>
          </div>
        </div>
      </section>

      {/* MOTM HISTORIK */}
      {allMotmMatches.length >
        0 && (
        <section>
          <div className="mb-3">
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-yellow-400 sm:text-xs">
              ⭐ Man of the Match
            </div>

            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              MOTM-priser
            </h2>
          </div>

          <div className="card divide-y divide-white/10 overflow-hidden">
            {allMotmMatches.map(
              (match: any) => (
                <Link
                  key={match.id}
                  href={`/kampe/${match.id}`}
                  className="flex items-center justify-between gap-4 p-4 transition hover:bg-white/5 sm:p-5"
                >
                  <div>
                    <div className="font-black">
                      ⭐{' '}
                      {match.home_team}{' '}
                      vs{' '}
                      {match.away_team}
                    </div>

                    <div className="mt-1 text-xs text-neutral-500">
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

      {/* KAMPHISTORIK */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Historik
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Kampe
          </h2>
        </div>

        <div className="card divide-y divide-white/10 overflow-hidden">
          {matchHistory.map(
            (
              appearance: any
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
                  className="block p-4 transition hover:bg-white/5 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-4">
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

                      <div className="mt-1 text-xs text-neutral-500 sm:text-sm">
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
                        <div className="text-lg font-black sm:text-2xl">
                          {
                            match.home_score
                          }
                          {' – '}
                          {
                            match.away_score
                          }
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-500">
                          Intet resultat
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            }
          )}

          {!matchHistory.length && (
            <div className="p-8 text-center text-neutral-400">
              Spilleren har endnu ikke
              registreret nogen kampe.
            </div>
          )}
        </div>
      </section>

      {/* KAMPBEGIVENHEDER */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Karriere
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Kampbegivenheder
          </h2>
        </div>

        <div className="card divide-y divide-white/10 overflow-hidden">
          {playerEvents.map(
            (event: any) => {
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
                  className="block p-4 transition hover:bg-white/5 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-black">
                        {eventName}
                      </div>

                      {event.match && (
                        <div className="mt-1 text-xs text-neutral-500 sm:text-sm">
                          {
                            event.match
                              .home_team
                          }{' '}
                          vs{' '}
                          {
                            event.match
                              .away_team
                          }
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="font-black text-red-400">
                        {event.minute}'
                      </div>

                      {event.match
                        ?.date && (
                        <div className="text-xs text-neutral-600">
                          {formatDate(
                            event.match
                              .date
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
            <div className="p-8 text-center text-neutral-400">
              Ingen kampbegivenheder
              registreret for denne spiller
              endnu.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}