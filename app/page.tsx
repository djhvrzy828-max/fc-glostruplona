import Image from 'next/image'
import Link from 'next/link'
import MatchCard from '@/components/MatchCard'
import { createServerSupabase } from '@/lib/supabase-server'
import { Match } from '@/lib/types'
import { getMatchState } from '@/lib/match-time'
import LiveRefresh from '@/components/LiveRefresh'
import PushNotificationButton from '@/components/PushNotificationButton'

export const dynamic = 'force-dynamic'

function getCopenhagenDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(new Date())

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value || ''

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`
}

function formatDate(date: string | null) {
  if (!date) {
    return 'Dato ikke fastsat'
  }

  const [year, month, day] = date.split('-')

  return `${day}.${month}.${year}`
}

export default async function Home() {
  let matches: Match[] = []
  let announcement: any = null
  let nextMatch: any = null
  let nextLineup: any[] = []

  /*
   * Kampdag-kampen kan både være:
   *
   * - kommende senere i dag
   * - live
   * - pause
   * - overtid
   * - afsluttet tidligere i dag
   */
  let matchdayMatch: any = null
  let matchdayEvents: any[] = []

  try {
    const s = await createServerSupabase()

    /*
     * HENT ALLE KAMPE
     */
    const { data: allMatches } = await s
      .from('matches')
      .select('*')
      .order('date', {
        ascending: true,
        nullsFirst: false,
      })

    const validMatches =
      (allMatches || []).filter(
        (match: any) =>
          match.status !== 'Aflyst' &&
          match.status !== 'Udsat'
      )

    /*
     * FIND DAGENS KAMP
     *
     * Hvis der findes en kamp i dag, går
     * forsiden automatisk i MATCHDAY-mode.
     */
    const today = getCopenhagenDate()

    matchdayMatch =
      validMatches.find(
        (match: any) =>
          match.date === today
      ) || null

    /*
     * HENT HÆNDELSER TIL DAGENS KAMP
     *
     * Bruges til:
     * - live-score
     * - slutresultat
     * - målscorere
     */
    if (matchdayMatch) {
      const {
        data: matchdayEventRows,
        error: matchdayEventsError,
      } = await s
        .from('match_events')
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
        .eq('match_id', matchdayMatch.id)
        .order('minute', {
          ascending: true,
        })

      if (matchdayEventsError) {
        console.error(
          'MATCHDAY EVENTS ERROR:',
          matchdayEventsError
        )
      }

      matchdayEvents =
        matchdayEventRows || []
    }

    /*
     * FIND NÆSTE IKKE-AFSLUTTEDE KAMP
     */
    nextMatch =
      validMatches.find((match: any) => {
        const state = getMatchState(
          match.date,
          match.kickoff_time,
          match.status
        )

        return state.phase !== 'Slut'
      }) || null

    /*
     * KOMMENDE KAMPE
     */
    if (nextMatch) {
      const nextIndex =
        validMatches.findIndex(
          (match: any) =>
            match.id === nextMatch.id
        )

      matches =
        validMatches.slice(
          nextIndex,
          nextIndex + 3
        ) as Match[]

      /*
       * HENT STARTOPSTILLING
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
          nextMatch.id
        )
        .eq('starter', true)
        .order('position_order', {
          ascending: true,
        })

      if (lineupError) {
        console.error(
          'HOME LINEUP ERROR:',
          lineupError.message
        )
      }

      /*
       * HENT SPILLERE
       */
      const {
        data: players,
        error: playersError,
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
          (row: any) => ({
            ...row,

            player:
              lineupPlayers.find(
                (player: any) =>
                  player.id ===
                  row.player_id
              ) || null,
          })
        ) || []
    }

   /*
 * ==========================================
 * MEDDELELSE
 *
 * Vis kun en meddelelse hvis:
 *
 * - active = true
 * - den ikke er fjernet manuelt
 * - den ikke er udløbet
 *
 * Hvis flere er aktive, vises den senest
 * publicerede.
 * ==========================================
 */

const now =
  new Date().toISOString()

const {
  data: a,
  error: announcementError,
} = await s
  .from('announcements')
  .select('*')
  .eq('active', true)
  .is('removed_at', null)
  .or(
    `expires_at.is.null,expires_at.gt.${now}`
  )
  .order('published_at', {
    ascending: false,
    nullsFirst: false,
  })
  .limit(1)
  .maybeSingle()

if (announcementError) {
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
   * KAMPDAG-DATA
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
        event.event_type === 'goal'
    )

  const matchdayHomeScore =
    matchdayGoals.filter(
      (event: any) =>
        event.team === 'home'
    ).length

  const matchdayAwayScore =
    matchdayGoals.filter(
      (event: any) =>
        event.team === 'away'
    ).length

  const isMatchdayLive =
    matchdayState?.isLive &&
    matchdayMatch?.status !== 'Udsat' &&
    matchdayMatch?.status !== 'Aflyst'

  /*
   * TEKSTEN ØVERST PÅ MATCHDAY-KORTET
   */
  let matchdayStatus = 'MATCHDAY'

  if (
    matchdayState?.phase ===
      '1. halvleg' ||
    matchdayState?.phase ===
      '2. halvleg'
  ) {
    matchdayStatus =
      `LIVE • ${matchdayState.minute}'`
  } else if (
    matchdayState?.phase === 'Pause'
  ) {
    matchdayStatus = 'PAUSE'
  } else if (
    matchdayState?.phase === 'Overtid'
  ) {
    matchdayStatus =
      `OVERTID • ${matchdayState.minute}'`
  } else if (
    matchdayState?.phase === 'Slut'
  ) {
    matchdayStatus = 'FULL TIME'
  }

  /*
   * VIS SCORE HVIS KAMPEN ER STARTET.
   * Ellers vises VS.
   */
  const matchdayHasStarted =
    matchdayState &&
    matchdayState.phase !== 'Kommende'

  return (
    <div className="space-y-6 md:space-y-8">
      {/*
       * Under en kamp opdaterer vi hurtigere,
       * så forsiden føles som en rigtig livescore-app.
       */}
      <LiveRefresh
        interval={
          isMatchdayLive
            ? 10000
            : 30000
        }
      />

      {/* MEDDELELSE */}
      {announcement && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/50 p-4">
          <div className="font-black">
            {announcement.title}
          </div>

          <p className="mt-1 text-sm leading-5 text-red-100">
            {announcement.body}
          </p>
        </div>
      )}

      {/*
       * ==========================================
       * KAMPDAG-MODE
       * ==========================================
       */}
      {matchdayMatch &&
      matchdayState ? (
        <section
          className={
            isMatchdayLive
              ? 'relative overflow-hidden rounded-[28px] border border-red-500/40 bg-gradient-to-b from-red-950/80 to-[#120d0b] shadow-2xl'
              : 'relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-[#120d0b] shadow-2xl'
          }
        >
          {/* BAGGRUNDSGLOW */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-700/20 blur-3xl" />

          <div className="relative z-10 p-5 sm:p-7 md:p-10">
            {/* TOP */}
            <div className="flex items-center justify-between gap-3">
              <div
                className={
                  isMatchdayLive
                    ? 'text-[11px] font-black uppercase tracking-[.25em] text-red-400'
                    : 'text-[11px] font-black uppercase tracking-[.25em] text-neutral-400'
                }
              >
                {matchdayStatus}
              </div>

              {isMatchdayLive && (
                <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-300">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Live
                </div>
              )}
            </div>

            {/* TURNERING */}
            <div className="mt-5 text-center text-[10px] font-bold uppercase tracking-[.2em] text-neutral-500 sm:text-xs">
              {matchdayMatch.competition ||
                '9. divisionen'}
            </div>

            {/* HOLD + SCORE */}
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-5">
              <div className="min-w-0 text-right">
                <div className="text-lg font-black leading-tight sm:text-2xl md:text-3xl">
                  {matchdayMatch.home_team}
                </div>
              </div>

              <div className="min-w-[86px] rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-center shadow-xl sm:min-w-[130px] sm:px-6">
                {matchdayHasStarted ? (
                  <div className="text-3xl font-black tracking-tight sm:text-5xl">
                    {matchdayHomeScore}
                    <span className="mx-2 text-neutral-600">
                      –
                    </span>
                    {matchdayAwayScore}
                  </div>
                ) : (
                  <div className="text-xl font-black text-neutral-400 sm:text-2xl">
                    VS
                  </div>
                )}
              </div>

              <div className="min-w-0 text-left">
                <div className="text-lg font-black leading-tight sm:text-2xl md:text-3xl">
                  {matchdayMatch.away_team}
                </div>
              </div>
            </div>

            {/* KAMPINFO */}
            <div className="mt-6 text-center text-xs text-neutral-400 sm:text-sm">
              {formatDate(
                matchdayMatch.date
              )}

              {matchdayMatch.kickoff_time
                ? ` • ${matchdayMatch.kickoff_time.slice(
                    0,
                    5
                  )}`
                : ''}

              {matchdayMatch.stadium
                ? ` • ${matchdayMatch.stadium}`
                : ''}
            </div>

            {/* MÅLSCORERE */}
            {matchdayGoals.length > 0 && (
              <div className="mx-auto mt-6 max-w-xl border-t border-white/10 pt-5">
                <div className="mb-3 text-center text-[10px] font-black uppercase tracking-[.2em] text-neutral-500">
                  Mål
                </div>

                <div className="space-y-2">
                  {matchdayGoals.map(
                    (goal: any) => {
                      const playerName =
                        goal.player
                          ? `${goal.player.first_name} ${goal.player.last_name}`
                          : goal.team ===
                              'home'
                            ? matchdayMatch.home_team
                            : matchdayMatch.away_team

                      return (
                        <div
                          key={goal.id}
                          className="flex items-center justify-center gap-2 text-sm"
                        >
                          <span>
                            ⚽
                          </span>

                          <span className="font-bold">
                            {playerName}
                          </span>

                          <span className="text-neutral-500">
                            {goal.minute}'
                          </span>

                          {goal.assist && (
                            <span className="hidden text-xs text-neutral-500 sm:inline">
                              • Assist:{' '}
                              {
                                goal.assist
                                  .first_name
                              }{' '}
                              {
                                goal.assist
                                  .last_name
                              }
                            </span>
                          )}
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            )}

            {/* KNAP */}
            <div className="mt-7 flex justify-center">
              <Link
                href={`/kampe/${matchdayMatch.id}`}
                className={
                  isMatchdayLive
                    ? 'rounded-xl bg-red-700 px-6 py-3 text-sm font-black text-white transition hover:bg-red-600'
                    : 'rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:bg-white/10'
                }
              >
                {isMatchdayLive
                  ? 'Følg kampen →'
                  : matchdayState.phase ===
                      'Slut'
                    ? 'Se kampen →'
                    : 'Se kampinfo →'}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        /*
         * ==========================================
         * NORMAL FORSIDE
         * ==========================================
         */
        <section className="card relative overflow-hidden p-5 sm:p-6 md:p-10">
          <div className="relative z-10 grid items-center gap-6 md:grid-cols-[1fr_320px] md:gap-8">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs md:text-sm md:tracking-[.3em]">
                Officiel klubside
              </div>

              <h1 className="mt-3 max-w-full text-[clamp(2.7rem,13vw,4.5rem)] font-black leading-[0.86] tracking-[-0.055em] md:text-7xl">
                FC
                <br />

                <span className="break-words">
                  GLOSTRUPLONA
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-6 text-neutral-300 sm:text-base md:text-lg md:leading-7">
                Øl, Damer & Sammenspil.
                Kampe, resultater, truppen
                og den officielle FCG-trøje
                samlet ét sted.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 md:hidden">
                <Link
                  href="/kampe"
                  className="rounded-xl bg-red-800 px-4 py-2.5 text-sm font-black text-white"
                >
                  Se kampe
                </Link>

                <Link
                  href="/tabel"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white"
                >
                  Se tabel
                </Link>
              </div>
            </div>

            <div className="flex justify-center">
              <Image
                src="/fcg-logo.png"
                alt="FC Glostruplona logo"
                width={320}
                height={320}
                priority
                className="h-auto w-[210px] sm:w-[250px] md:w-[320px]"
              />
            </div>
          </div>
        </section>
      )}

      {/* NOTIFIKATIONER */}
      <section className="card overflow-hidden p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-5">
          <div className="max-w-2xl">
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
              FC Glostruplona Live
            </div>

            <h2 className="mt-2 text-xl font-black sm:text-2xl">
              Få besked når der sker noget 🔔
            </h2>

            <p className="mt-2 text-sm leading-5 text-neutral-400 md:leading-6">
              Aktivér notifikationer og få
              kampopdateringer direkte på din
              telefon.
            </p>
          </div>

          <div className="w-full md:w-auto md:shrink-0">
            <PushNotificationButton />
          </div>
        </div>
      </section>

      {/* NÆSTE KAMP */}
      <section>
        <div className="mb-3 md:mb-4">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            {matchdayMatch
              ? 'Kampcenter'
              : 'Næste kamp'}
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Match Centre
          </h2>
        </div>

        {nextMatch ? (
          <div className="space-y-4">
            {/*
             * Hvis dagens kamp også er nextMatch,
             * har vi allerede en stor kampdag-boks
             * øverst. Derfor undgår vi at vise det
             * samme MatchCard to gange.
             */}
            {nextMatch.id !==
              matchdayMatch?.id && (
              <MatchCard
                m={nextMatch}
              />
            )}

            {/* STARTOPSTILLING */}
            <div className="card p-4 sm:p-5 md:p-7">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
                    Holdet
                  </div>

                  <h3 className="mt-1 text-xl font-black sm:text-2xl">
                    Startopstilling
                  </h3>
                </div>

                {nextMatch.formation &&
                  nextLineup.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black sm:px-4 sm:text-sm">
                      Formation:{' '}

                      <span className="text-red-400">
                        {nextMatch.formation}
                      </span>
                    </div>
                  )}
              </div>

              {nextLineup.length > 0 ? (
                <div className="mx-auto max-w-2xl">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-white/20 bg-green-800 shadow-2xl sm:rounded-3xl">
                    {/* YDRE BANE */}
                    <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/30" />

                    {/* MIDTERLINJE */}
                    <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-white/30" />

                    {/* MIDTERCIRKEL */}
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 sm:h-32 sm:w-32" />

                    {/* MIDTERPLET */}
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />

                    {/* ØVERSTE FELT */}
                    <div className="pointer-events-none absolute left-[20%] right-[20%] top-3 h-[18%] border-x-2 border-b-2 border-white/30" />

                    {/* NEDERSTE FELT */}
                    <div className="pointer-events-none absolute bottom-3 left-[20%] right-[20%] h-[18%] border-x-2 border-t-2 border-white/30" />

                    {/* ØVERSTE MÅL */}
                    <div className="pointer-events-none absolute left-[38%] right-[38%] top-0 h-3 border-x-2 border-b-2 border-white/30" />

                    {/* NEDERSTE MÅL */}
                    <div className="pointer-events-none absolute bottom-0 left-[38%] right-[38%] h-3 border-x-2 border-t-2 border-white/30" />

                    {nextLineup.map(
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
                            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-600 text-[10px] font-black text-white shadow-xl sm:h-14 sm:w-14 sm:text-sm">
                              #
                              {
                                player.shirt_number
                              }
                            </div>

                            <div className="mt-1 max-w-[70px] truncate whitespace-nowrap rounded bg-black/80 px-1.5 py-1 text-[8px] font-bold text-white shadow-lg sm:max-w-32 sm:px-2 sm:text-xs">
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
                    Den offentliggjorte
                    startopstilling til næste
                    kamp.
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center sm:px-6 sm:py-10">
                  <div className="text-3xl sm:text-4xl">
                    ⚽
                  </div>

                  <div className="mt-3 text-lg font-black sm:mt-4 sm:text-xl">
                    Startopstillingen er endnu
                    ikke offentliggjort
                  </div>

                  <div className="mx-auto mt-2 max-w-md text-sm leading-5 text-neutral-400">
                    FC Glostruplona møder{' '}

                    <span className="font-bold text-white">
                      {nextMatch.home_team ===
                      'FC Glostruplona'
                        ? nextMatch.away_team
                        : nextMatch.home_team}
                    </span>

                    . Holdet bliver vist her,
                    når startopstillingen er
                    klar.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-5 text-sm text-neutral-400 sm:p-6">
            Der er ingen kommende kampe
            annonceret endnu.
          </div>
        )}
      </section>

      {/* KOMMENDE KAMPE */}
      <section>
        <div className="mb-3 flex items-end justify-between md:mb-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
              Kampcenter
            </div>

            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Kommende kampe
            </h2>
          </div>

          <Link
            href="/kampe"
            className="text-xs font-black text-red-400 sm:text-sm"
          >
            Se alle →
          </Link>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {matches.length ? (
            matches
              .filter(
                (m) =>
                  m.id !==
                  matchdayMatch?.id
              )
              .map((m) => (
                <MatchCard
                  key={m.id}
                  m={m}
                />
              ))
          ) : (
            <div className="card p-5 text-sm text-neutral-400 sm:p-6">
              Ingen kommende kampe er
              annonceret endnu.
            </div>
          )}
        </div>
      </section>

      {/* KLUBINFO */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Klubben
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            FC Glostruplona
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card min-w-0 p-3 sm:p-6">
            <div className="text-[10px] text-neutral-400 sm:text-sm">
              Hjemmebane
            </div>

            <div className="mt-1 truncate text-sm font-black sm:mt-2 sm:text-2xl">
              Glostrup Nou
            </div>
          </div>

          <div className="card min-w-0 p-3 sm:p-6">
            <div className="text-[10px] text-neutral-400 sm:text-sm">
              Liga
            </div>

            <div className="mt-1 truncate text-sm font-black sm:mt-2 sm:text-2xl">
              9. division
            </div>
          </div>

          <div className="card min-w-0 p-3 sm:p-6">
            <div className="text-[10px] text-neutral-400 sm:text-sm">
              Stiftet
            </div>

            <div className="mt-1 text-sm font-black sm:mt-2 sm:text-2xl">
              1142
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}