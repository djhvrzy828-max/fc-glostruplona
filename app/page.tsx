import Image from 'next/image'
import Link from 'next/link'
import MatchCard from '@/components/MatchCard'
import { createServerSupabase } from '@/lib/supabase-server'
import { Match } from '@/lib/types'
import { getMatchState } from '@/lib/match-time'
import LiveRefresh from '@/components/LiveRefresh'
import PushNotificationButton from '@/components/PushNotificationButton'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let matches: Match[] = []
  let announcement: any = null
  let nextMatch: any = null
  let nextLineup: any[] = []
  let lineupPlayers: any[] = []

  try {
    const s = await createServerSupabase()

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

    nextMatch =
      validMatches.find((match: any) => {
        const state = getMatchState(
  match.date,
  match.kickoff_time,
  match.status
)

        return state.phase !== 'Slut'
      }) || null

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

      lineupPlayers = players || []

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

    const { data: a } = await s
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    announcement = a
  } catch (error) {
    console.error(
      'HOME PAGE ERROR:',
      error
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <LiveRefresh interval={30000} />

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

      {/* HERO */}
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
            Næste kamp
          </div>

          <h2 className="mt-1 text-2xl font-black sm:text-3xl">
            Match Centre
          </h2>
        </div>

        {nextMatch ? (
          <div className="space-y-4">
            <MatchCard m={nextMatch} />

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
            matches.map(
              (m) => (
                <MatchCard
                  key={m.id}
                  m={m}
                />
              )
            )
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