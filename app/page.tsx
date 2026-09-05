import Image from 'next/image'
import Link from 'next/link'

import MatchCard from '@/components/MatchCard'
import LiveRefresh from '@/components/LiveRefresh'
import PushNotificationButton from '@/components/PushNotificationButton'

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

/*
 * =========================================================
 * DATO
 * =========================================================
 */

function getCopenhagenDate() {
  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Europe/Copenhagen',

        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    )

  const parts =
    formatter.formatToParts(
      new Date()
    )

  const getPart = (
    type: string
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value || ''

  return `${getPart(
    'year'
  )}-${getPart(
    'month'
  )}-${getPart(
    'day'
  )}`
}

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

/*
 * =========================================================
 * HOME
 * =========================================================
 */

export default async function Home() {
  let matches: Match[] = []

  let announcement:
    any = null

  let nextMatch:
    any = null

  let nextLineup:
    any[] = []

  let matchdayMatch:
    any = null

  let matchdayEvents:
    any[] = []

  try {
    const s =
      await createServerSupabase()

    /*
     * =====================================================
     * KAMPE
     * =====================================================
     */

    const {
      data: allMatches,
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

    const validMatches =
      (
        allMatches || []
      ).filter(
        (match: any) =>
          match.status !==
            'Aflyst' &&
          match.status !==
            'Udsat'
      )

    /*
     * =====================================================
     * DAGENS KAMP
     * =====================================================
     */

    const today =
      getCopenhagenDate()

    matchdayMatch =
      validMatches.find(
        (match: any) =>
          match.date ===
          today
      ) || null

    /*
     * =====================================================
     * DAGENS EVENTS
     * =====================================================
     */

    if (matchdayMatch) {
      const {
        data:
          matchdayEventRows,

        error:
          matchdayEventsError,
      } = await s
        .from(
          'match_events'
        )
        .select(`
          id,
          minute,
          event_type,
          team,
          player_id,
          assist_player_id,

          player:players!match_events_player_id_fkey(
            first_name,
            last_name
          ),

          assist:players!match_events_assist_player_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq(
          'match_id',
          matchdayMatch.id
        )
        .order(
          'minute',
          {
            ascending: true,
          }
        )

      if (
        matchdayEventsError
      ) {
        console.error(
          'MATCHDAY EVENTS ERROR:',
          matchdayEventsError
        )
      }

      matchdayEvents =
        matchdayEventRows ||
        []
    }

    /*
     * =====================================================
     * NÆSTE KAMP
     * =====================================================
     */

    nextMatch =
      validMatches.find(
        (match: any) => {
          const state =
            getMatchState(
              match.date,
              match.kickoff_time,
              match.status
            )

          return (
            state.phase !==
            'Slut'
          )
        }
      ) || null

    /*
     * =====================================================
     * KOMMENDE KAMPE
     * =====================================================
     */

    if (nextMatch) {
      const nextIndex =
        validMatches.findIndex(
          (match: any) =>
            match.id ===
            nextMatch.id
        )

      matches =
        validMatches.slice(
          nextIndex,
          nextIndex + 3
        ) as Match[]

      /*
       * ===================================================
       * STARTOPSTILLING
       * ===================================================
       */

      const {
        data:
          lineupRows,

        error:
          lineupError,
      } = await s
        .from(
          'match_lineups'
        )
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
          nextMatch.id
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
          'HOME LINEUP ERROR:',
          lineupError.message
        )
      }

      /*
       * SPILLERE
       */

      const {
        data: players,
        error:
          playersError,
      } = await s
        .from('players')
        .select(`
          id,
          first_name,
          last_name,
          shirt_number,
          position
        `)

      if (playersError) {
        console.error(
          'HOME LINEUP PLAYERS ERROR:',
          playersError.message
        )
      }

      const lineupPlayers =
        players || []

      nextLineup =
        lineupRows?.map(
          (
            row: any
          ) => ({
            ...row,

            player:
              lineupPlayers.find(
                (
                  player:
                    any
                ) =>
                  player.id ===
                  row.player_id
              ) || null,
          })
        ) || []
    }

    /*
     * =====================================================
     * MEDDELELSE
     * =====================================================
     */

    const now =
      new Date()
        .toISOString()

    const {
      data: a,
      error:
        announcementError,
    } = await s
      .from(
        'announcements'
      )
      .select('*')
      .eq(
        'active',
        true
      )
      .is(
        'removed_at',
        null
      )
      .or(
        `expires_at.is.null,expires_at.gt.${now}`
      )
      .order(
        'published_at',
        {
          ascending: false,
          nullsFirst: false,
        }
      )
      .limit(1)
      .maybeSingle()

    if (
      announcementError
    ) {
      console.error(
        'HOME ANNOUNCEMENT ERROR:',
        announcementError
      )
    }

    announcement = a
  } catch (error) {
    console.error(
      'HOME PAGE ERROR:',
      error
    )
  }

  /*
   * =========================================================
   * MATCHDAY
   * =========================================================
   */

  const matchdayState =
    matchdayMatch
      ? getMatchState(
          matchdayMatch.date,
          matchdayMatch.kickoff_time,
          matchdayMatch.status
        )
      : null

  const matchdayGoals =
    matchdayEvents.filter(
      (event: any) =>
        event.event_type ===
        'goal'
    )

  const eventHomeScore =
    matchdayGoals.filter(
      (event: any) =>
        event.team ===
        'home'
    ).length

  const eventAwayScore =
    matchdayGoals.filter(
      (event: any) =>
        event.team ===
        'away'
    ).length

  /*
   * Færdig kamp:
   * brug officielt resultat.
   *
   * Live:
   * brug events.
   */

  const matchdayHomeScore =
    matchdayState?.phase ===
      'Slut'
      ? Number(
          matchdayMatch
            ?.home_score ?? 0
        )
      : eventHomeScore

  const matchdayAwayScore =
    matchdayState?.phase ===
      'Slut'
      ? Number(
          matchdayMatch
            ?.away_score ?? 0
        )
      : eventAwayScore

  const isMatchdayLive =
    matchdayState?.isLive &&
    matchdayMatch?.status !==
      'Udsat' &&
    matchdayMatch?.status !==
      'Aflyst'

  let matchdayStatus =
    'MATCHDAY'

  if (
    matchdayState?.phase ===
      '1. halvleg' ||
    matchdayState?.phase ===
      '2. halvleg'
  ) {
    matchdayStatus =
      `LIVE • ${matchdayState.minute}'`
  } else if (
    matchdayState?.phase ===
    'Pause'
  ) {
    matchdayStatus =
      'PAUSE'
  } else if (
    matchdayState?.phase ===
    'Overtid'
  ) {
    matchdayStatus =
      `OVERTID • ${matchdayState.minute}'`
  } else if (
    matchdayState?.phase ===
    'Slut'
  ) {
    matchdayStatus =
      'FULL TIME'
  }

  const matchdayHasStarted =
    matchdayState &&
    matchdayState.phase !==
      'Kommende'

  /*
   * =========================================================
   * HERO MODSTANDER
   * =========================================================
   */

  const heroMatch =
    matchdayMatch ||
    nextMatch

  const opponent =
    heroMatch
      ? heroMatch.home_team ===
          'FC Glostruplona'
        ? heroMatch.away_team
        : heroMatch.home_team
      : null

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="fcg-page fcg-fade-in space-y-6 pb-6 md:space-y-10">
      <LiveRefresh
        interval={
          isMatchdayLive
            ? 10000
            : 30000
        }
      />

      {/* ==================================================
          CINEMATIC HOME HERO
         ================================================== */}

      <section className="fcg-hero relative -mx-4 -mt-4 overflow-hidden sm:mx-0 sm:mt-0">
        <Image
          src="/media/home-hero.jpg"
          alt="FC Glostruplona"
          fill
          priority
          sizes="100vw"
          className="fcg-hero-image object-cover object-center saturate-[.82] contrast-[1.08]"
        />

        {/* Cinematic overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,rgba(153,27,27,.25),transparent_35%)]" />
        <div className="pointer-events-none absolute -right-24 top-8 h-80 w-80 rounded-full bg-red-700/20 blur-[100px]" />

        <div className="fcg-hero-content relative z-10">
          {/* TOP */}
          <div className="mb-auto flex items-start justify-between gap-4">
            <div className="fcg-badge fcg-badge-red backdrop-blur-md">
              FC GLOSTRUPLONA
            </div>

            {isMatchdayLive && (
              <div className="fcg-badge fcg-badge-red">
                <span className="fcg-live-dot" />
                LIVE
              </div>
            )}
          </div>

          {/* HERO TEXT */}
          <div className="max-w-3xl">
            <div className="fcg-label mb-3">
              {matchdayMatch
                ? matchdayStatus
                : 'MERE END FODBOLD'}
            </div>

            <h1 className="fcg-title">
              FC
              <br />
              GLOSTRUPLONA
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-neutral-300 sm:text-xs">
              <span>Mesterrækken</span>
              <span className="text-red-500">•</span>
              <span>EST. 2025</span>
              <span className="text-red-500">•</span>
              <span>Glostrup Nou</span>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-300 sm:text-base">
              Øl, Damer & Sammenspil. Kampe, resultater, spillere og alt fra
              FC Glostruplona samlet ét sted.
            </p>

            {/* HERO MATCH */}
            {heroMatch && (
              <div className="mt-7 max-w-xl rounded-[22px] border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-md sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400">
                    {matchdayMatch
                      ? matchdayStatus
                      : 'Næste kamp'}
                  </div>

                  {isMatchdayLive && (
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-red-300">
                      <span className="fcg-live-dot" />
                      LIVE
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="text-right text-sm font-black leading-tight sm:text-lg">
                    {heroMatch.home_team}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/70 px-4 py-3 text-center font-black">
                    {matchdayMatch &&
                    matchdayHasStarted ? (
                      <span className="text-xl sm:text-2xl">
                        {matchdayHomeScore}
                        <span className="mx-2 text-neutral-600">–</span>
                        {matchdayAwayScore}
                      </span>
                    ) : (
                      <span className="text-neutral-300">
                        VS
                      </span>
                    )}
                  </div>

                  <div className="text-left text-sm font-black leading-tight sm:text-lg">
                    {heroMatch.away_team}
                  </div>
                </div>

                <div className="mt-4 text-center text-xs text-neutral-400">
                  {formatDate(
                    heroMatch.date
                  )}

                  {heroMatch.kickoff_time
                    ? ` • ${heroMatch.kickoff_time.slice(
                        0,
                        5
                      )}`
                    : ''}

                  {heroMatch.stadium
                    ? ` • ${heroMatch.stadium}`
                    : ''}
                </div>

                <div className="mt-4 flex justify-center">
                  <Link
                    href={`/kampe/${heroMatch.id}`}
                    className="btn"
                  >
                    {isMatchdayLive
                      ? 'FØLG KAMPEN →'
                      : matchdayState?.phase ===
                          'Slut'
                        ? 'SE KAMPEN →'
                        : 'SE KAMPINFO →'}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          MEDDELELSE
         ================================================== */}

      {announcement && (
        <section className="relative overflow-hidden rounded-[22px] border border-red-500/25 bg-gradient-to-r from-red-950/70 via-[#160909] to-[#0b0b0b] p-5 shadow-xl">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-red-600/15 blur-3xl" />

          <div className="relative z-10">
            <div className="fcg-label">
              {announcement.type ||
                'Klubmeddelelse'}
            </div>

            <div className="mt-2 text-xl font-black">
              {announcement.title}
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
              {announcement.body}
            </p>
          </div>
        </section>
      )}

      {/* ==================================================
          QUICK NAVIGATION
         ================================================== */}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/kampe"
          className="card group relative overflow-hidden p-4 sm:p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-950/20 to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="text-2xl">⚽</div>
            <div className="mt-3 text-sm font-black sm:text-base">
              Kampe
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Program & resultater
            </div>
          </div>
        </Link>

        <Link
          href="/trup"
          className="card group relative overflow-hidden p-4 sm:p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-950/20 to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="text-2xl">👥</div>
            <div className="mt-3 text-sm font-black sm:text-base">
              Truppen
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Spillere & profiler
            </div>
          </div>
        </Link>

        <Link
          href="/statistik"
          className="card group relative overflow-hidden p-4 sm:p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-950/20 to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="text-2xl">📊</div>
            <div className="mt-3 text-sm font-black sm:text-base">
              Statistik
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Mål & assists
            </div>
          </div>
        </Link>

        <Link
          href="/tabel"
          className="card group relative overflow-hidden p-4 sm:p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-950/20 to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="text-2xl">🏆</div>
            <div className="mt-3 text-sm font-black sm:text-base">
              Tabellen
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Mesterrækken
            </div>
          </div>
        </Link>
      </section>

      {/* ==================================================
          VISUAL CLUB STRIP
         ================================================== */}

      <section>
        <div className="mb-4">
          <div className="fcg-label">
            Klubben
          </div>

          <h2 className="fcg-heading mt-1">
            Glostrup Nou. Vores scene.
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.3fr_.7fr]">
          <div className="group relative min-h-[300px] overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-xl sm:min-h-[380px]">
            <Image
              src="/media/matches-hero.jpg"
              alt="FC Glostruplona i kamp"
              fill
              sizes="(max-width: 768px) 100vw, 65vw"
              className="object-cover object-center transition duration-700 group-hover:scale-[1.03]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-red-950/25 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <div className="text-[9px] font-black uppercase tracking-[.2em] text-red-400">
                MATCHDAY
              </div>

              <div className="mt-2 text-2xl font-black uppercase tracking-[-.03em] sm:text-3xl">
                Alt starter på banen.
              </div>

              <Link
                href="/kampe"
                className="mt-4 inline-flex text-xs font-black uppercase tracking-[.14em] text-white"
              >
                SE KAMPE →
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <Link
              href="/trup"
              className="group relative min-h-[180px] overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-lg"
            >
              <Image
                src="/media/squad-hero.jpg"
                alt="FC Glostruplona truppen"
                fill
                sizes="(max-width: 768px) 50vw, 35vw"
                className="object-cover object-center transition duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="text-[8px] font-black uppercase tracking-[.18em] text-red-400">
                  TRUPPEN
                </div>
                <div className="mt-1 text-lg font-black uppercase">
                  Mød spillerne
                </div>
              </div>
            </Link>

            <Link
              href="/statistik"
              className="group relative min-h-[180px] overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-lg"
            >
              <Image
                src="/media/stats-hero.jpg"
                alt="FC Glostruplona statistik"
                fill
                sizes="(max-width: 768px) 50vw, 35vw"
                className="object-cover object-center transition duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="text-[8px] font-black uppercase tracking-[.18em] text-red-400">
                  NUMBERS
                </div>
                <div className="mt-1 text-lg font-black uppercase">
                  Statistik & rekorder
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================================================
          PUSH
         ================================================== */}

      <section className="card overflow-hidden">
        <div className="relative p-5 sm:p-7">
          <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-red-700/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="fcg-label">
                FCG LIVE
              </div>

              <h2 className="mt-2 text-xl font-black sm:text-2xl">
                Vær med hele kampen.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
                Få kampdag, holdkort, mål, kampændringer, slutresultater og
                Man of the Match direkte på telefonen.
              </p>
            </div>

            <div className="w-full md:w-auto">
              <PushNotificationButton />
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          MATCH CENTRE
         ================================================== */}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="fcg-label">
              Match Centre
            </div>

            <h2 className="fcg-heading mt-1">
              Næste kamp
            </h2>
          </div>

          <Link
            href="/kampe"
            className="text-xs font-black text-red-400 sm:text-sm"
          >
            ALLE KAMPE →
          </Link>
        </div>

        {nextMatch ? (
          <div className="space-y-4">
            {nextMatch.id !==
              matchdayMatch?.id && (
              <MatchCard
                m={nextMatch}
              />
            )}

            <div className="card p-4 sm:p-6 md:p-7">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="fcg-label">
                    Holdet
                  </div>

                  <h3 className="mt-1 text-xl font-black sm:text-2xl">
                    Startopstilling
                  </h3>
                </div>

                {nextMatch.formation &&
                  nextLineup.length >
                    0 && (
                    <div className="fcg-badge">
                      Formation{' '}
                      <span className="text-red-400">
                        {nextMatch.formation}
                      </span>
                    </div>
                  )}
              </div>

              {nextLineup.length >
              0 ? (
                <div className="mx-auto max-w-xl">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[24px] border border-white/15 bg-[#142414] shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
                    <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/30" />
                    <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-white/30" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 sm:h-32 sm:w-32" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
                    <div className="pointer-events-none absolute left-[20%] right-[20%] top-3 h-[18%] border-x border-b border-white/30" />
                    <div className="pointer-events-none absolute bottom-3 left-[20%] right-[20%] h-[18%] border-x border-t border-white/30" />
                    <div className="pointer-events-none absolute left-[38%] right-[38%] top-0 h-3 border-x border-b border-white/30" />
                    <div className="pointer-events-none absolute bottom-0 left-[38%] right-[38%] h-3 border-x border-t border-white/30" />

                    {nextLineup.map(
                      (
                        lineupPlayer:
                          any
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
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-b from-red-500 to-red-800 text-[10px] font-black shadow-[0_5px_20px_rgba(220,20,20,.45)] sm:h-14 sm:w-14 sm:text-sm">
                              #
                              {player.shirt_number}
                            </div>

                            <div className="mt-1 max-w-[74px] truncate rounded-lg border border-white/10 bg-black/85 px-2 py-1 text-[8px] font-black shadow-lg backdrop-blur sm:max-w-32 sm:text-xs">
                              {player.first_name}{' '}
                              {player.last_name}
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>

                  <div className="mt-4 text-center text-xs text-neutral-500">
                    Den offentliggjorte startopstilling til næste kamp.
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-black/30 p-8 text-center sm:p-10">
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-700/10 blur-[70px]" />

                  <div className="relative z-10">
                    <div className="text-4xl">
                      ⚽
                    </div>

                    <div className="mt-4 text-xl font-black">
                      Holdkortet er ikke offentliggjort endnu.
                    </div>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-400">
                      FC Glostruplona møder{' '}
                      <span className="font-black text-white">
                        {opponent ||
                          'modstanderen'}
                      </span>
                      . Startopstillingen kommer her, når holdkortet er klar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-6 text-sm text-neutral-400">
            Der er ingen kommende kampe annonceret endnu.
          </div>
        )}
      </section>

      {/* ==================================================
          KOMMENDE KAMPE
         ================================================== */}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="fcg-label">
              Kalender
            </div>

            <h2 className="fcg-heading mt-1">
              Kommende kampe
            </h2>
          </div>

          <Link
            href="/kampe"
            className="text-xs font-black text-red-400 sm:text-sm"
          >
            SE ALLE →
          </Link>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {matches.length ? (
            matches
              .filter(
                (m) =>
                  m.id !==
                  matchdayMatch
                    ?.id
              )
              .map(
                (m) => (
                  <MatchCard
                    key={
                      m.id
                    }
                    m={m}
                  />
                )
              )
          ) : (
            <div className="card p-6 text-sm text-neutral-400">
              Ingen kommende kampe er annonceret endnu.
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          CLUB IDENTITY + IMAGE
         ================================================== */}

      <section>
        <div className="mb-4">
          <div className="fcg-label">
            Klubben
          </div>

          <h2 className="fcg-heading mt-1">
            Mere end fodbold.
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-[.8fr_1.2fr]">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:grid-cols-1">
            <div className="card min-w-0 p-3 sm:p-6">
              <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 sm:text-xs">
                Hjemmebane
              </div>

              <div className="mt-2 truncate text-sm font-black sm:text-2xl">
                Glostrup Nou
              </div>
            </div>

            <div className="card min-w-0 p-3 sm:p-6">
              <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 sm:text-xs">
                Række
              </div>

              <div className="mt-2 truncate text-sm font-black sm:text-2xl">
                Mesterrækken
              </div>
            </div>

            <div className="card min-w-0 p-3 sm:p-6">
              <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 sm:text-xs">
                Stiftet
              </div>

              <div className="mt-2 text-sm font-black sm:text-2xl">
                2025
              </div>
            </div>
          </div>

          <div className="group relative min-h-[260px] overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-xl sm:min-h-[360px]">
            <Image
              src="/media/team-action.jpg"
              alt="FC Glostruplona"
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              className="object-cover object-center transition duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                FCG DNA
              </div>
              <div className="mt-1 text-xl font-black uppercase sm:text-2xl">
                Sammen på banen.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          END BRAND
         ================================================== */}

      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black p-8 text-center sm:p-12">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/media/club-background.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        <div className="absolute inset-0 bg-black/75" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-80 -translate-x-1/2 rounded-full bg-red-700/15 blur-[90px]" />

        <div className="relative z-10">
          <Image
            src="/fcg-logo.png"
            alt="FC Glostruplona"
            width={110}
            height={110}
            className="mx-auto h-auto w-20 sm:w-24"
          />

          <div className="fcg-brush mt-5 text-3xl sm:text-5xl">
            FC GLOSTRUPLONA
          </div>

          <div className="mt-3 text-xs font-black uppercase tracking-[.25em] text-red-400">
            MERE END FODBOLD
          </div>
        </div>
      </section>
    </div>
  )
}
