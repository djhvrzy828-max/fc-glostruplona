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
    <div className="fcg-page fcg-fade-in space-y-10 md:space-y-14">

      {/* ==================================================
          HERO
         ================================================== */}

      <section
        className="
          relative
          -mx-4
          -mt-5
          min-h-[390px]
          overflow-hidden
          border-b
          border-white/10
          bg-black
          sm:mx-0
          sm:mt-0
          sm:min-h-[430px]
          sm:rounded-[30px]
          sm:border
        "
      >
        <div
          className="
            absolute
            inset-0
            bg-[url('/media/stats-hero.jpg')]
            bg-cover
            bg-center
            opacity-55
            saturate-[.75]
            contrast-[1.12]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-black/30
            via-black/60
            to-[#070707]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-r
            from-red-950/35
            via-transparent
            to-black/20
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-24
            top-0
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
            min-h-[390px]
            flex-col
            justify-end
            p-6
            sm:min-h-[430px]
            sm:p-9
          "
        >
          <div className="fcg-label">
            FC Glostruplona
          </div>

          <h1
            className="
              mt-2
              text-4xl
              font-black
              uppercase
              leading-[.9]
              tracking-[-.05em]
              sm:text-6xl
              md:text-7xl
            "
          >
            STATISTIK
            <br />
            <span className="text-red-500">
              & REKORDER
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-300 sm:text-base">
            Mål, assists, rekorder og præstationer
            fra FC Glostruplona.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <div className="fcg-badge">
              {stats.length} spillere
            </div>

            <div className="fcg-badge">
              {totalGoals} mål
            </div>

            <div className="fcg-badge">
              Mesterrækken
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          TOP PLAYERS
         ================================================== */}

      <section>
        <div className="mb-5">
          <div className="fcg-label">
            Sæsonledere
          </div>

          <h2 className="fcg-heading mt-1">
            Topspillere
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          {/* TOPSCORER */}
          <Link
            href={
              topScorer?.id
                ? `/trup/${topScorer.id}`
                : '#'
            }
            className="
              group
              relative
              min-h-[210px]
              overflow-hidden
              rounded-[24px]
              border
              border-red-500/20
              bg-gradient-to-br
              from-red-950/40
              via-[#101010]
              to-black
              p-5
              shadow-xl
              transition
              hover:-translate-y-1
              hover:border-red-500/40
            "
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-red-600/15 blur-[60px]" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-red-400">
                  ⚽ TOPSCORER
                </div>

                <div className="mt-4 text-5xl font-black tracking-[-.06em]">
                  {topScorer?.goals || 0}
                </div>

                <div className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  MÅL
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xl font-black uppercase leading-tight">
                  {topScorer?.goals
                    ? playerName(topScorer)
                    : '-'}
                </div>

                {topScorer?.shirt_number && (
                  <div className="mt-1 text-xs text-neutral-500">
                    #{topScorer.shirt_number}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* ASSISTS */}
          <Link
            href={
              topAssist?.id
                ? `/trup/${topAssist.id}`
                : '#'
            }
            className="
              group
              relative
              min-h-[210px]
              overflow-hidden
              rounded-[24px]
              border
              border-white/10
              bg-gradient-to-br
              from-[#171717]
              to-black
              p-5
              shadow-xl
              transition
              hover:-translate-y-1
              hover:border-red-500/30
            "
          >
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-500">
                  🎯 ASSIST KING
                </div>

                <div className="mt-4 text-5xl font-black tracking-[-.06em]">
                  {topAssist?.assists || 0}
                </div>

                <div className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  ASSISTS
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xl font-black uppercase leading-tight">
                  {topAssist?.assists
                    ? playerName(topAssist)
                    : '-'}
                </div>

                {topAssist?.shirt_number && (
                  <div className="mt-1 text-xs text-neutral-500">
                    #{topAssist.shirt_number}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* APPEARANCES */}
          <Link
            href={
              mostAppearances?.id
                ? `/trup/${mostAppearances.id}`
                : '#'
            }
            className="
              group
              relative
              min-h-[210px]
              overflow-hidden
              rounded-[24px]
              border
              border-white/10
              bg-gradient-to-br
              from-[#171717]
              to-black
              p-5
              shadow-xl
              transition
              hover:-translate-y-1
              hover:border-red-500/30
            "
          >
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-500">
                  👕 FLEST KAMPE
                </div>

                <div className="mt-4 text-5xl font-black tracking-[-.06em]">
                  {mostAppearances?.matchesPlayed || 0}
                </div>

                <div className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  KAMPE
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xl font-black uppercase leading-tight">
                  {mostAppearances?.matchesPlayed
                    ? playerName(mostAppearances)
                    : '-'}
                </div>
              </div>
            </div>
          </Link>

          {/* MOTM */}
          <Link
            href={
              mostMotm?.id
                ? `/trup/${mostMotm.id}`
                : '#'
            }
            className="
              group
              relative
              min-h-[210px]
              overflow-hidden
              rounded-[24px]
              border
              border-yellow-500/20
              bg-gradient-to-br
              from-yellow-950/30
              via-[#12110b]
              to-black
              p-5
              shadow-xl
              transition
              hover:-translate-y-1
              hover:border-yellow-500/35
            "
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-yellow-500/10 blur-[60px]" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-yellow-400">
                  ★ PLAYER OF THE MATCH
                </div>

                <div className="mt-4 text-5xl font-black tracking-[-.06em] text-yellow-400">
                  {mostMotm?.motm || 0}
                </div>

                <div className="text-xs font-black uppercase tracking-wider text-yellow-700">
                  MOTM
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xl font-black uppercase leading-tight">
                  {mostMotm?.motm
                    ? playerName(mostMotm)
                    : '-'}
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ==================================================
          CLUB NUMBERS
         ================================================== */}

      <section>
        <div className="mb-5">
          <div className="fcg-label">
            Sæsonen
          </div>

          <h2 className="fcg-heading mt-1">
            Klubtal
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card p-4 text-center sm:p-6">
            <div className="text-[9px] font-black uppercase tracking-[.15em] text-neutral-600 sm:text-xs">
              Mål
            </div>

            <div className="mt-2 text-3xl font-black sm:text-5xl">
              {totalGoals}
            </div>
          </div>

          <div className="card p-4 text-center sm:p-6">
            <div className="text-[9px] font-black uppercase tracking-[.15em] text-neutral-600 sm:text-xs">
              Assists
            </div>

            <div className="mt-2 text-3xl font-black sm:text-5xl">
              {totalAssists}
            </div>
          </div>

          <div className="card p-4 text-center sm:p-6">
            <div className="text-[9px] font-black uppercase tracking-[.15em] text-neutral-600 sm:text-xs">
              Kort
            </div>

            <div className="mt-2 text-3xl font-black sm:text-5xl">
              {totalCards}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          RECORDS
         ================================================== */}

      <section>
        <div className="mb-5">
          <div className="fcg-label">
            Historik
          </div>

          <h2 className="fcg-heading mt-1">
            Klubrekorder
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

          <div className="card p-5">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-neutral-500">
              ⚽ FLEST MÅL I ÉN KAMP
            </div>

            <div className="mt-4 text-3xl font-black text-red-400">
              {mostGoalsOneMatch?.mostGoalsInOneMatch || 0}
            </div>

            <div className="mt-2 font-black">
              {mostGoalsOneMatch?.mostGoalsInOneMatch
                ? playerName(mostGoalsOneMatch)
                : '-'}
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-neutral-500">
              🟨 FLEST GULE KORT
            </div>

            <div className="mt-4 text-3xl font-black text-yellow-400">
              {mostYellowCards?.yellowCards || 0}
            </div>

            <div className="mt-2 font-black">
              {mostYellowCards?.yellowCards
                ? playerName(mostYellowCards)
                : '-'}
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-neutral-500">
              🟥 FLEST RØDE KORT
            </div>

            <div className="mt-4 text-3xl font-black text-red-500">
              {mostRedCards?.redCards || 0}
            </div>

            <div className="mt-2 font-black">
              {mostRedCards?.redCards
                ? playerName(mostRedCards)
                : '-'}
            </div>
          </div>
        </div>

        {/* BIGGEST WIN */}
        <div
          className="
            relative
            mt-3
            overflow-hidden
            rounded-[26px]
            border
            border-red-500/15
            bg-gradient-to-r
            from-red-950/35
            via-[#111]
            to-black
            p-6
            shadow-xl
            sm:p-8
          "
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-red-700/15 blur-[80px]" />

          <div className="relative z-10">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">
              🏆 STØRSTE SEJR
            </div>

            {biggestWin ? (
              <div className="mt-5">
                <div className="text-2xl font-black uppercase leading-tight sm:text-4xl">
                  {biggestWin.home_team}
                </div>

                <div className="my-3 text-5xl font-black tracking-[-.06em] sm:text-7xl">
                  {biggestWin.home_score}
                  <span className="mx-3 text-neutral-700">
                    –
                  </span>
                  {biggestWin.away_score}
                </div>

                <div className="text-2xl font-black uppercase leading-tight sm:text-4xl">
                  {biggestWin.away_team}
                </div>

                <div className="mt-5 text-sm text-neutral-400">
                  Sejr med{' '}
                  <span className="font-black text-red-400">
                    {biggestWinMargin}
                  </span>{' '}
                  mål
                </div>
              </div>
            ) : (
              <div className="mt-4 text-neutral-400">
                Ingen sejr registreret endnu.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          PLAYER LEADERBOARD
         ================================================== */}

      <section>
        <div className="mb-5">
          <div className="fcg-label">
            Truppen
          </div>

          <h2 className="fcg-heading mt-1">
            Leaderboard
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            Sorteret efter mål og derefter assists.
          </p>
        </div>

        {/* MOBILE CARDS */}
        <div className="space-y-3 md:hidden">
          {stats.map((player: any, index: number) => (
            <Link
              href={`/trup/${player.id}`}
              key={player.id}
              className="
                group
                block
                overflow-hidden
                rounded-[22px]
                border
                border-white/10
                bg-[#0d0d0d]
                p-4
                transition
                hover:border-red-500/30
                hover:bg-white/[0.03]
              "
            >
              <div className="flex items-center gap-4">
                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-white/10
                    bg-white/[0.04]
                    text-lg
                    font-black
                    text-neutral-500
                  "
                >
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-black uppercase">
                    {player.first_name}{' '}
                    {player.last_name}
                  </div>

                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                    #{player.shirt_number}
                    {' • '}
                    {player.position || 'Spiller'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-red-400">
                    {player.goals}
                  </div>

                  <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600">
                    Mål
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="rounded-xl bg-white/[0.035] p-2 text-center">
                  <div className="text-sm font-black">
                    {player.matchesPlayed}
                  </div>

                  <div className="mt-1 text-[8px] uppercase text-neutral-600">
                    K
                  </div>
                </div>

                <div className="rounded-xl bg-white/[0.035] p-2 text-center">
                  <div className="text-sm font-black">
                    {player.assists}
                  </div>

                  <div className="mt-1 text-[8px] uppercase text-neutral-600">
                    Ass
                  </div>
                </div>

                <div className="rounded-xl bg-white/[0.035] p-2 text-center">
                  <div className="text-sm font-black text-yellow-400">
                    {player.motm}
                  </div>

                  <div className="mt-1 text-[8px] uppercase text-neutral-600">
                    MOTM
                  </div>
                </div>

                <div className="rounded-xl bg-white/[0.035] p-2 text-center">
                  <div className="text-sm font-black">
                    {player.goalsPerMatch.toFixed(2)}
                  </div>

                  <div className="mt-1 text-[8px] uppercase text-neutral-600">
                    M/K
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d0d] shadow-xl md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/10 bg-white/[0.035]">
                <tr className="text-[10px] font-black uppercase tracking-[.12em] text-neutral-600">
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

              <tbody className="divide-y divide-white/[0.06]">
                {stats.map((player: any, index: number) => (
                  <tr
                    key={player.id}
                    className="transition hover:bg-white/[0.035]"
                  >
                    <td className="p-4">
                      <div className="font-black text-neutral-600">
                        {index + 1}
                      </div>
                    </td>

                    <td className="p-4">
                      <Link
                        href={`/trup/${player.id}`}
                        className="group"
                      >
                        <div className="font-black uppercase transition group-hover:text-red-400">
                          {player.first_name}{' '}
                          {player.last_name}
                        </div>

                        <div className="mt-1 text-xs text-neutral-600">
                          #{player.shirt_number}
                          {' • '}
                          {player.position || 'Spiller'}
                        </div>
                      </Link>
                    </td>

                    <td className="p-4 text-center font-bold">
                      {player.matchesPlayed}
                    </td>

                    <td className="p-4 text-center text-lg font-black text-red-400">
                      {player.goals}
                    </td>

                    <td className="p-4 text-center font-black">
                      {player.assists}
                    </td>

                    <td className="p-4 text-center font-black text-yellow-400">
                      {player.motm}
                    </td>

                    <td className="p-4 text-center text-neutral-400">
                      {player.goalsPerMatch.toFixed(2)}
                    </td>

                    <td className="p-4 text-center text-neutral-400">
                      {player.assistsPerMatch.toFixed(2)}
                    </td>

                    <td className="p-4 text-center">
                      {player.yellowCards}
                    </td>

                    <td className="p-4 text-center">
                      {player.redCards}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!stats.length && (
          <div className="card p-8 text-center text-neutral-400">
            Ingen spillere registreret endnu.
          </div>
        )}
      </section>

      {/* ==================================================
          FOOTER BRAND
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
          sm:p-12
        "
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-44 w-72 -translate-x-1/2 rounded-full bg-red-700/15 blur-[80px]" />

        <div className="relative z-10">
          <div className="text-[10px] font-black uppercase tracking-[.28em] text-red-400">
            FC GLOSTRUPLONA
          </div>

          <div className="mt-4 text-3xl font-black uppercase tracking-[-.04em] sm:text-5xl">
            NUMBERS DON'T LIE.
          </div>

          <div className="mt-3 text-xs font-bold uppercase tracking-[.16em] text-neutral-600">
            EST. 2025 · MESTERRÆKKEN
          </div>
        </div>
      </section>

    </div>
  )
}