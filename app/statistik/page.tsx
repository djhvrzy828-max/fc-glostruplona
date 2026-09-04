import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const s = await createServerSupabase()

  /*
   * ==========================================
   * HENT SPILLERE
   * ==========================================
   */
  const {
    data: players,
    error: playersError,
  } = await s
    .from('players')
    .select('*')
    .eq('active', true)
    .order('shirt_number')

  if (playersError) {
    console.error(
      'STATISTICS PLAYERS ERROR:',
      playersError
    )
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
      id,
      match_id,
      event_type,
      player_id,
      assist_player_id,
      minute
    `)

  if (eventsError) {
    console.error(
      'STATISTICS EVENTS ERROR:',
      eventsError
    )
  }

  /*
   * ==========================================
   * HENT KAMPDELTAGELSER
   * ==========================================
   */
  const {
    data: appearances,
    error: appearancesError,
  } = await s
    .from('match_appearances')
    .select(`
      match_id,
      player_id
    `)

  if (appearancesError) {
    console.error(
      'STATISTICS APPEARANCES ERROR:',
      appearancesError
    )
  }

  /*
   * ==========================================
   * HENT KAMPE
   *
   * Bruges til:
   * - Man of the Match
   * - største sejr
   * - resultater
   * ==========================================
   */
  const {
    data: matches,
    error: matchesError,
  } = await s
    .from('matches')
    .select(`
      id,
      home_team,
      away_team,
      home_score,
      away_score,
      status,
      date,
      man_of_match_player_id
    `)

  if (matchesError) {
    console.error(
      'STATISTICS MATCHES ERROR:',
      matchesError
    )
  }

  const playerRows =
    players || []

  const eventRows =
    events || []

  const appearanceRows =
    appearances || []

  const matchRows =
    matches || []

  /*
   * ==========================================
   * SPILLERSTATISTIK
   * ==========================================
   */
  const stats =
    playerRows.map((player: any) => {
      const matchesPlayed =
        appearanceRows.filter(
          (appearance: any) =>
            appearance.player_id ===
            player.id
        ).length

      const goals =
        eventRows.filter(
          (event: any) =>
            event.event_type ===
              'goal' &&
            event.player_id ===
              player.id
        ).length

      const assists =
        eventRows.filter(
          (event: any) =>
            event.event_type ===
              'goal' &&
            event.assist_player_id ===
              player.id
        ).length

      const yellowCards =
        eventRows.filter(
          (event: any) =>
            event.event_type ===
              'yellow_card' &&
            event.player_id ===
              player.id
        ).length

      const redCards =
        eventRows.filter(
          (event: any) =>
            event.event_type ===
              'red_card' &&
            event.player_id ===
              player.id
        ).length

      const motm =
        matchRows.filter(
          (match: any) =>
            match.man_of_match_player_id ===
            player.id
        ).length

      const goalsPerMatch =
        matchesPlayed > 0
          ? goals / matchesPlayed
          : 0

      const assistsPerMatch =
        matchesPlayed > 0
          ? assists / matchesPlayed
          : 0

      /*
       * FLEST MÅL I ÉN KAMP
       */
      const goalsByMatch =
        eventRows
          .filter(
            (event: any) =>
              event.event_type ===
                'goal' &&
              event.player_id ===
                player.id
          )
          .reduce(
            (
              acc: Record<string, number>,
              event: any
            ) => {
              acc[event.match_id] =
                (acc[event.match_id] || 0) +
                1

              return acc
            },
            {}
          )

      const mostGoalsInOneMatch =
        Object.values(
          goalsByMatch
        ).length > 0
          ? Math.max(
              ...Object.values(
                goalsByMatch
              )
            )
          : 0

      return {
        ...player,
        matchesPlayed,
        goals,
        assists,
        goalsPerMatch,
        assistsPerMatch,
        yellowCards,
        redCards,
        motm,
        mostGoalsInOneMatch,
      }
    })

  /*
   * ==========================================
   * SORTERING AF HOVEDTABEL
   * ==========================================
   */
  stats.sort(
    (
      a: any,
      b: any
    ) => {
      if (
        b.goals !== a.goals
      ) {
        return b.goals - a.goals
      }

      if (
        b.assists !== a.assists
      ) {
        return b.assists - a.assists
      }

      return (
        a.shirt_number -
        b.shirt_number
      )
    }
  )

  /*
   * ==========================================
   * REKORD-HJÆLPER
   * ==========================================
   */
  function getLeader(
    key:
      | 'goals'
      | 'assists'
      | 'matchesPlayed'
      | 'motm'
      | 'yellowCards'
      | 'redCards'
      | 'mostGoalsInOneMatch'
  ) {
    return [...stats].sort(
      (
        a: any,
        b: any
      ) => {
        if (
          b[key] !== a[key]
        ) {
          return (
            b[key] - a[key]
          )
        }

        if (
          b.goals !== a.goals
        ) {
          return (
            b.goals -
            a.goals
          )
        }

        return (
          b.assists -
          a.assists
        )
      }
    )[0]
  }

  const topScorer =
    getLeader('goals')

  const topAssist =
    getLeader('assists')

  const mostAppearances =
    getLeader(
      'matchesPlayed'
    )

  const mostMotm =
    getLeader('motm')

  const mostYellowCards =
    getLeader(
      'yellowCards'
    )

  const mostRedCards =
    getLeader(
      'redCards'
    )

  const mostGoalsOneMatch =
    getLeader(
      'mostGoalsInOneMatch'
    )

  /*
   * ==========================================
   * KLUBTAL
   * ==========================================
   */
  const totalGoals =
    stats.reduce(
      (
        sum: number,
        player: any
      ) =>
        sum + player.goals,
      0
    )

  const totalAssists =
    stats.reduce(
      (
        sum: number,
        player: any
      ) =>
        sum + player.assists,
      0
    )

  const totalCards =
    stats.reduce(
      (
        sum: number,
        player: any
      ) =>
        sum +
        player.yellowCards +
        player.redCards,
      0
    )

  /*
   * ==========================================
   * STØRSTE SEJR
   * ==========================================
   */
  const finishedMatches =
    matchRows.filter(
      (match: any) =>
        match.status === 'Slut'
    )

  let biggestWin: any = null
  let biggestWinMargin = -1

  for (
    const match of
    finishedMatches
  ) {
    const homeScore =
      Number(
        match.home_score
      ) || 0

    const awayScore =
      Number(
        match.away_score
      ) || 0

    const fcgIsHome =
      String(
        match.home_team
      )
        .trim()
        .toLowerCase() ===
      'fc glostruplona'

    const fcgIsAway =
      String(
        match.away_team
      )
        .trim()
        .toLowerCase() ===
      'fc glostruplona'

    if (
      !fcgIsHome &&
      !fcgIsAway
    ) {
      continue
    }

    const fcgScore =
      fcgIsHome
        ? homeScore
        : awayScore

    const opponentScore =
      fcgIsHome
        ? awayScore
        : homeScore

    if (
      fcgScore <=
      opponentScore
    ) {
      continue
    }

    const margin =
      fcgScore -
      opponentScore

    if (
      margin >
      biggestWinMargin
    ) {
      biggestWinMargin =
        margin

      biggestWin = {
        ...match,
        fcgScore,
        opponentScore,
      }
    }
  }

  /*
   * ==========================================
   * FORMAT
   * ==========================================
   */
  function playerName(
    player: any
  ) {
    if (!player) {
      return '-'
    }

    return `${player.first_name} ${player.last_name}`
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <section>
        <div className="text-[10px] font-black uppercase tracking-[.25em] text-red-400 sm:text-xs">
          FC Glostruplona
        </div>

        <h1 className="mt-1 text-3xl font-black sm:text-4xl">
          Statistik & Rekorder
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
          Officiel spillerstatistik og klubrekorder
          baseret på registrerede kampe og hændelser.
        </p>
      </section>

      {/* STORE TOPKORT */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Sæsonledere
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Topspillere
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card p-5">
            <div className="text-sm text-neutral-400">
              ⚽ Flest mål
            </div>

            <div className="mt-2 text-xl font-black">
              {topScorer?.goals
                ? playerName(
                    topScorer
                  )
                : '-'}
            </div>

            <div className="mt-1 font-black text-red-400">
              {topScorer?.goals ||
                0}{' '}
              mål
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm text-neutral-400">
              🎯 Flest assists
            </div>

            <div className="mt-2 text-xl font-black">
              {topAssist?.assists
                ? playerName(
                    topAssist
                  )
                : '-'}
            </div>

            <div className="mt-1 font-black text-red-400">
              {topAssist?.assists ||
                0}{' '}
              assists
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm text-neutral-400">
              👕 Flest kampe
            </div>

            <div className="mt-2 text-xl font-black">
              {mostAppearances?.matchesPlayed
                ? playerName(
                    mostAppearances
                  )
                : '-'}
            </div>

            <div className="mt-1 font-black text-red-400">
              {mostAppearances?.matchesPlayed ||
                0}{' '}
              kampe
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm text-neutral-400">
              ⭐ Flest MOTM
            </div>

            <div className="mt-2 text-xl font-black">
              {mostMotm?.motm
                ? playerName(
                    mostMotm
                  )
                : '-'}
            </div>

            <div className="mt-1 font-black text-yellow-400">
              {mostMotm?.motm ||
                0}{' '}
              MOTM
            </div>
          </div>
        </div>
      </section>

      {/* KLUBREKORDER */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Historik
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Klubrekorder
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-5">
            <div className="text-xs font-black uppercase tracking-wider text-neutral-500">
              ⚽ Flest mål i én kamp
            </div>

            <div className="mt-3 text-xl font-black">
              {mostGoalsOneMatch?.mostGoalsInOneMatch
                ? playerName(
                    mostGoalsOneMatch
                  )
                : '-'}
            </div>

            <div className="mt-1 text-red-400">
              {mostGoalsOneMatch?.mostGoalsInOneMatch ||
                0}{' '}
              mål
            </div>
          </div>

          <div className="card p-5">
            <div className="text-xs font-black uppercase tracking-wider text-neutral-500">
              🟨 Flest gule kort
            </div>

            <div className="mt-3 text-xl font-black">
              {mostYellowCards?.yellowCards
                ? playerName(
                    mostYellowCards
                  )
                : '-'}
            </div>

            <div className="mt-1 text-yellow-400">
              {mostYellowCards?.yellowCards ||
                0}{' '}
              gule
            </div>
          </div>

          <div className="card p-5">
            <div className="text-xs font-black uppercase tracking-wider text-neutral-500">
              🟥 Flest røde kort
            </div>

            <div className="mt-3 text-xl font-black">
              {mostRedCards?.redCards
                ? playerName(
                    mostRedCards
                  )
                : '-'}
            </div>

            <div className="mt-1 text-red-400">
              {mostRedCards?.redCards ||
                0}{' '}
              røde
            </div>
          </div>

          <div className="card p-5 sm:col-span-2 lg:col-span-3">
            <div className="text-xs font-black uppercase tracking-wider text-neutral-500">
              🏆 Største sejr
            </div>

            {biggestWin ? (
              <>
                <div className="mt-3 text-xl font-black sm:text-2xl">
                  {
                    biggestWin.home_team
                  }{' '}
                  {biggestWin.home_score}
                  {' – '}
                  {
                    biggestWin.away_score
                  }{' '}
                  {
                    biggestWin.away_team
                  }
                </div>

                <div className="mt-2 text-sm text-neutral-400">
                  Sejr med{' '}
                  <span className="font-black text-red-400">
                    {biggestWinMargin}
                  </span>{' '}
                  mål
                </div>
              </>
            ) : (
              <div className="mt-3 text-neutral-400">
                Ingen sejr registreret endnu.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* KLUBTAL */}
      <section>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card p-3 text-center sm:p-5">
            <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 sm:text-xs">
              Mål
            </div>

            <div className="mt-1 text-xl font-black sm:mt-2 sm:text-3xl">
              {totalGoals}
            </div>
          </div>

          <div className="card p-3 text-center sm:p-5">
            <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 sm:text-xs">
              Assists
            </div>

            <div className="mt-1 text-xl font-black sm:mt-2 sm:text-3xl">
              {totalAssists}
            </div>
          </div>

          <div className="card p-3 text-center sm:p-5">
            <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 sm:text-xs">
              Kort
            </div>

            <div className="mt-1 text-xl font-black sm:mt-2 sm:text-3xl">
              {totalCards}
            </div>
          </div>
        </div>
      </section>

      {/* SPILLERSTATISTIK */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Truppen
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Spillerstatistik
          </h2>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="border-b border-white/10 bg-white/5 text-sm text-neutral-400">
                <tr>
                  <th className="p-4">
                    #
                  </th>

                  <th className="p-4">
                    Spiller
                  </th>

                  <th className="p-4 text-center">
                    K
                  </th>

                  <th className="p-4 text-center">
                    Mål
                  </th>

                  <th className="p-4 text-center">
                    Ass
                  </th>

                  <th className="p-4 text-center">
                    MOTM
                  </th>

                  <th className="p-4 text-center">
                    Mål/kamp
                  </th>

                  <th className="p-4 text-center">
                    Ass/kamp
                  </th>

                  <th className="p-4 text-center">
                    🟨
                  </th>

                  <th className="p-4 text-center">
                    🟥
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {stats.map(
                  (player: any) => (
                    <tr
                      key={player.id}
                      className="transition hover:bg-white/5"
                    >
                      <td className="p-4 font-black text-red-400">
                        #
                        {
                          player.shirt_number
                        }
                      </td>

                      <td className="p-4">
                        <Link
                          href={`/trup/${player.id}`}
                          className="group block"
                        >
                          <div className="font-bold transition group-hover:text-red-400">
                            {
                              player.first_name
                            }{' '}
                            {
                              player.last_name
                            }
                          </div>

                          <div className="text-xs text-neutral-500">
                            {
                              player.position ||
                              'Ingen position'
                            }
                          </div>

                          <div className="mt-1 text-xs font-bold text-red-400 opacity-0 transition group-hover:opacity-100">
                            SE PROFIL →
                          </div>
                        </Link>
                      </td>

                      <td className="p-4 text-center font-black">
                        {
                          player.matchesPlayed
                        }
                      </td>

                      <td className="p-4 text-center font-black">
                        {
                          player.goals
                        }
                      </td>

                      <td className="p-4 text-center font-black">
                        {
                          player.assists
                        }
                      </td>

                      <td className="p-4 text-center font-black text-yellow-400">
                        {
                          player.motm
                        }
                      </td>

                      <td className="p-4 text-center">
                        {
                          player.goalsPerMatch.toFixed(
                            2
                          )
                        }
                      </td>

                      <td className="p-4 text-center">
                        {
                          player.assistsPerMatch.toFixed(
                            2
                          )
                        }
                      </td>

                      <td className="p-4 text-center">
                        {
                          player.yellowCards
                        }
                      </td>

                      <td className="p-4 text-center">
                        {
                          player.redCards
                        }
                      </td>
                    </tr>
                  )
                )}

                {!stats.length && (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-neutral-400"
                    >
                      Ingen spillere registreret endnu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}