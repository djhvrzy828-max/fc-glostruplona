import Link from 'next/link'

import MatchCard from '@/components/MatchCard'

import {
  createServerSupabase,
} from '@/lib/supabase-server'

import {
  getMatchState,
} from '@/lib/match-time'

import {
  Match,
} from '@/lib/types'

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

export default async function Page() {
  let matches: Match[] = []

  try {
    const s =
      await createServerSupabase()

    const {
      data,
      error,
    } = await s
      .from('matches')
      .select('*')
      .order(
        'date',
        {
          ascending: true,
          nullsFirst: false,
        }
      )

    if (error) {
      console.error(
        'MATCHES PAGE ERROR:',
        error
      )
    }

    matches =
      (data || []) as Match[]
  } catch (error) {
    console.error(
      'MATCHES PAGE ERROR:',
      error
    )
  }

  const upcomingMatches =
    matches.filter(
      (
        match: Match
      ) => {
        const state =
          getMatchState(
            match.date,
            match.kickoff_time,
            match.status
          )

        return (
          state.phase !==
            'Slut' &&
          match.status !==
            'Aflyst'
        )
      }
    )

  const finishedMatches =
    matches
      .filter(
        (
          match: Match
        ) => {
          const state =
            getMatchState(
              match.date,
              match.kickoff_time,
              match.status
            )

          return (
            state.phase ===
              'Slut' ||
            match.status ===
              'Aflyst'
          )
        }
      )
      .reverse()

  const featuredMatch =
    upcomingMatches[0] ||
    null

  const featuredState =
    featuredMatch
      ? getMatchState(
          featuredMatch.date,
          featuredMatch.kickoff_time,
          featuredMatch.status
        )
      : null

  const featuredIsLive =
    featuredState?.isLive &&
    featuredMatch?.status !==
      'Udsat' &&
    featuredMatch?.status !==
      'Aflyst'

  return (
    <div className="fcg-page fcg-fade-in space-y-8 md:space-y-12">

      {/* ==================================================
          CINEMATIC HERO
         ================================================== */}

      <section
        className="
          relative
          -mx-4
          -mt-4
          min-h-[430px]
          overflow-hidden
          border-y
          border-white/10
          bg-black
          shadow-[0_30px_90px_rgba(0,0,0,.55)]
          sm:mx-0
          sm:mt-0
          sm:min-h-[500px]
          sm:rounded-[30px]
          sm:border
        "
      >
        <div className="absolute inset-0">
          <div
            className="
              absolute
              inset-0
              bg-[url('/media/matches-hero.jpg')]
              bg-cover
              bg-center
            "
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-[#070707]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,27,27,.28),transparent_35%)]" />

        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-red-700/20 blur-[100px]" />

        <div
          className="
            relative
            z-10
            flex
            min-h-[430px]
            flex-col
            justify-between
            p-6
            sm:min-h-[500px]
            sm:p-8
            md:p-10
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div className="fcg-badge fcg-badge-red backdrop-blur-md">
              MATCH CENTRE
            </div>

            {featuredIsLive && (
              <div className="fcg-badge fcg-badge-red">
                <span className="fcg-live-dot" />
                LIVE
              </div>
            )}
          </div>

          <div className="max-w-3xl">
            <div className="fcg-label">
              FC Glostruplona
            </div>

            <h1
              className="
                mt-2
                text-5xl
                font-black
                uppercase
                leading-[.88]
                tracking-[-.05em]
                sm:text-7xl
                md:text-8xl
              "
            >
              KAMPE
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-300 sm:text-base">
              Kommende kampe, live-opdateringer og resultater fra
              FC Glostruplona.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <div className="fcg-badge">
                {upcomingMatches.length} KOMMENDE
              </div>

              <div className="fcg-badge">
                {finishedMatches.length} RESULTATER
              </div>

              <div className="fcg-badge">
                MESTERRÆKKEN
              </div>
            </div>

            {featuredMatch && (
              <Link
                href={`/kampe/${featuredMatch.id}`}
                className="
                  group
                  mt-6
                  block
                  max-w-2xl
                  rounded-[22px]
                  border
                  border-white/10
                  bg-black/45
                  p-4
                  shadow-2xl
                  backdrop-blur-md
                  transition
                  hover:border-red-500/30
                  sm:p-5
                "
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">
                    {featuredIsLive
                      ? 'LIVE NU'
                      : 'NÆSTE KAMP'}
                  </div>

                  <div
                    className={
                      featuredIsLive
                        ? 'text-[10px] font-black uppercase tracking-[.15em] text-red-300'
                        : 'text-[10px] font-black uppercase tracking-[.15em] text-neutral-500'
                    }
                  >
                    {featuredIsLive
                      ? `LIVE • ${featuredState?.minute}'`
                      : featuredState?.phase === 'Pause'
                        ? 'PAUSE'
                        : featuredState?.phase === 'Overtid'
                          ? `OVERTID • ${featuredState?.minute}'`
                          : 'KOMMENDE'}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                  <div className="text-right text-sm font-black leading-tight sm:text-lg">
                    {featuredMatch.home_team}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/70 px-4 py-3 text-center font-black">
                    {featuredState?.phase !== 'Kommende' ? (
                      <span className="text-xl sm:text-2xl">
                        {featuredMatch.home_score ?? 0}
                        <span className="mx-2 text-neutral-600">–</span>
                        {featuredMatch.away_score ?? 0}
                      </span>
                    ) : (
                      <span className="text-neutral-300">VS</span>
                    )}
                  </div>

                  <div className="text-left text-sm font-black leading-tight sm:text-lg">
                    {featuredMatch.away_team}
                  </div>
                </div>

                <div className="mt-4 text-center text-xs text-neutral-400">
                  {formatDate(featuredMatch.date)}

                  {featuredMatch.kickoff_time
                    ? ` • ${featuredMatch.kickoff_time.slice(0, 5)}`
                    : ''}

                  {featuredMatch.stadium
                    ? ` • ${featuredMatch.stadium}`
                    : ''}
                </div>

                <div className="mt-4 text-center text-xs font-black uppercase tracking-[.14em] text-red-400 transition group-hover:text-red-300">
                  ÅBN MATCH CENTRE →
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          FEATURED MATCH
         ================================================== */}

      {featuredMatch && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="fcg-label">
                {featuredIsLive
                  ? 'Live nu'
                  : 'Næste kamp'}
              </div>

              <h2 className="fcg-heading mt-1">
                {featuredMatch.home_team} vs {featuredMatch.away_team}
              </h2>
            </div>

            {featuredIsLive && (
              <div className="fcg-badge fcg-badge-red">
                <span className="fcg-live-dot" />
                LIVE
              </div>
            )}
          </div>

          <Link
            href={`/kampe/${featuredMatch.id}`}
            className="
              group
              relative
              block
              overflow-hidden
              rounded-[28px]
              border
              border-white/10
              bg-black
              shadow-[0_25px_80px_rgba(0,0,0,.5)]
            "
          >
            <div className="absolute inset-0 opacity-30">
              <div
                className="
                  h-full
                  w-full
                  bg-[url('/media/match-action-1.jpg')]
                  bg-cover
                  bg-center
                  transition
                  duration-700
                  group-hover:scale-[1.03]
                "
              />
            </div>

            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/70 to-black" />
            <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 to-transparent" />

            <div className="relative z-10 p-5 sm:p-7 md:p-9">
              <div className="mb-6 flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-[.2em] text-neutral-500 sm:text-xs">
                <span>
                  {featuredMatch.competition ||
                    'Mesterrækken'}
                </span>

                <span
                  className={
                    featuredIsLive
                      ? 'text-red-400'
                      : ''
                  }
                >
                  {featuredIsLive
                    ? `LIVE • ${featuredState?.minute}'`
                    : featuredState?.phase === 'Pause'
                      ? 'PAUSE'
                      : featuredState?.phase === 'Overtid'
                        ? `OVERTID • ${featuredState?.minute}'`
                        : 'KOMMENDE'}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
                <div className="text-right">
                  <div className="text-lg font-black leading-tight sm:text-2xl md:text-3xl">
                    {featuredMatch.home_team}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-4 text-center shadow-xl backdrop-blur sm:min-w-[130px] sm:px-6">
                  {featuredState?.phase !== 'Kommende' ? (
                    <div className="text-3xl font-black sm:text-5xl">
                      {featuredMatch.home_score ?? 0}

                      <span className="mx-2 text-neutral-700">
                        –
                      </span>

                      {featuredMatch.away_score ?? 0}
                    </div>
                  ) : (
                    <div className="text-xl font-black text-neutral-400 sm:text-2xl">
                      VS
                    </div>
                  )}
                </div>

                <div className="text-left">
                  <div className="text-lg font-black leading-tight sm:text-2xl md:text-3xl">
                    {featuredMatch.away_team}
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-xs text-neutral-400 sm:text-sm">
                {formatDate(featuredMatch.date)}

                {featuredMatch.kickoff_time
                  ? ` • ${featuredMatch.kickoff_time.slice(0, 5)}`
                  : ''}

                {featuredMatch.stadium
                  ? ` • ${featuredMatch.stadium}`
                  : ''}
              </div>

              <div className="mt-6 text-center">
                <span className="inline-flex items-center gap-2 text-sm font-black text-red-400 transition group-hover:text-red-300">
                  ÅBN MATCH CENTRE
                  <span>→</span>
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ==================================================
          KOMMENDE KAMPE
         ================================================== */}

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="fcg-label">
              Kalender
            </div>

            <h2 className="fcg-heading mt-1">
              Kommende kampe
            </h2>
          </div>

          {upcomingMatches.length > 0 && (
            <div className="fcg-badge">
              {upcomingMatches.length}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:gap-4">
          {upcomingMatches.length ? (
            upcomingMatches.map(
              (
                match,
                index
              ) => (
                <div
                  key={match.id}
                  className={
                    index === 0
                      ? 'opacity-90'
                      : ''
                  }
                >
                  <MatchCard
                    m={match}
                  />
                </div>
              )
            )
          ) : (
            <div className="card relative overflow-hidden p-8 text-center">
              <div className="absolute inset-0 opacity-15">
                <div
                  className="
                    h-full
                    w-full
                    bg-[url('/media/match-action-2.jpg')]
                    bg-cover
                    bg-center
                  "
                />
              </div>

              <div className="absolute inset-0 bg-black/80" />

              <div className="relative z-10">
                <div className="text-4xl">
                  📅
                </div>

                <div className="mt-4 text-xl font-black">
                  Ingen kommende kampe
                </div>

                <div className="mt-2 text-sm text-neutral-400">
                  Der er ingen nye kampe registreret lige nu.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          RESULTATER
         ================================================== */}

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-neutral-600 sm:text-xs">
              Historik
            </div>

            <h2 className="fcg-heading mt-1">
              Resultater
            </h2>
          </div>

          {finishedMatches.length > 0 && (
            <div className="fcg-badge">
              {finishedMatches.length}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:gap-4">
          {finishedMatches.length ? (
            finishedMatches.map(
              (
                match
              ) => (
                <MatchCard
                  key={match.id}
                  m={match}
                />
              )
            )
          ) : (
            <div className="card relative overflow-hidden p-8 text-center">
              <div className="absolute inset-0 opacity-15">
                <div
                  className="
                    h-full
                    w-full
                    bg-[url('/media/match-action-2.jpg')]
                    bg-cover
                    bg-center
                  "
                />
              </div>

              <div className="absolute inset-0 bg-black/80" />

              <div className="relative z-10">
                <div className="text-4xl">
                  ⚽
                </div>

                <div className="mt-4 text-xl font-black">
                  Ingen resultater endnu
                </div>

                <div className="mt-2 text-sm text-neutral-400">
                  Færdigspillede kampe kommer til at ligge her.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          MATCHDAY BRAND
         ================================================== */}

      <section
        className="
          relative
          min-h-[260px]
          overflow-hidden
          rounded-[28px]
          border
          border-white/10
          bg-black
          shadow-xl
          sm:min-h-[340px]
        "
      >
        <div
          className="
            absolute
            inset-0
            bg-[url('/media/match-action-2.jpg')]
            bg-cover
            bg-center
          "
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/30 to-transparent" />

        <div className="relative z-10 flex min-h-[260px] items-end p-6 sm:min-h-[340px] sm:p-8">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.22em] text-red-400">
              FC GLOSTRUPLONA
            </div>

            <div className="mt-2 text-3xl font-black uppercase tracking-[-.04em] sm:text-5xl">
              MATCHDAY IS EVERYTHING.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
