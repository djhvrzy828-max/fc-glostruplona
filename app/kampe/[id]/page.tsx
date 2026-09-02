import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getMatchState } from '@/lib/match-time'
import LiveRefresh from '@/components/LiveRefresh'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const s = await createServerSupabase()

  const { data: m } = await s
    .from('matches')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!m) {
    notFound()
  }

  const { data: events, error: eventsError } = await s
    .from('match_events')
    .select(`
      *,
      player:players!match_events_player_id_fkey(
        first_name,
        last_name
      ),
      assist:players!match_events_assist_player_id_fkey(
        first_name,
        last_name
      )
    `)
    .eq('match_id', id)
    .order('minute', { ascending: false })

  if (eventsError) {
    console.error(
      'MATCH EVENTS ERROR:',
      eventsError
    )
  }

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
    lineupError.message,
    lineupError.details,
    lineupError.hint
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
    lineupPlayersError.message
  )
}

const startingLineup =
  lineupRows?.map((row: any) => ({
    ...row,

    player:
      lineupPlayers?.find(
        (player: any) =>
          player.id ===
          row.player_id
      ) || null,
  })) || []

  const state = getMatchState(
    m.date,
    m.kickoff_time
  )

  let statusText = 'KOMMENDE'

  if (
    state.phase === '1. halvleg' ||
    state.phase === '2. halvleg'
  ) {
    statusText = `LIVE • ${state.minute}'`
  } else if (
    state.phase === 'Pause'
  ) {
    statusText = 'PAUSE'
  } else if (
    state.phase === 'Slut'
  ) {
    statusText = 'SLUT'
  }

  if (m.status === 'Udsat') {
    statusText = 'UDSAT'
  }

  if (m.status === 'Aflyst') {
    statusText = 'AFLYST'
  }

  return (
    <div>
      <LiveRefresh interval={10000} />

      <div className="space-y-8">
        {/* KAMPHEADER */}
        <div className="card p-8 text-center">
          <div className="text-xs uppercase tracking-[.25em] text-neutral-400">
            {m.competition ||
              '9. divisionen'}
          </div>

          <div
            className={
              state.isLive &&
              m.status !== 'Udsat' &&
              m.status !== 'Aflyst'
                ? 'mt-4 text-sm font-black uppercase tracking-widest text-red-400'
                : 'mt-4 text-sm font-black uppercase tracking-widest text-neutral-400'
            }
          >
            {statusText}
          </div>

          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <h1 className="text-right text-2xl font-black">
              {m.home_team}
            </h1>

            <div className="rounded-2xl bg-white/5 px-6 py-4 text-4xl font-black">
              {m.home_score ?? 0}
              {' : '}
              {m.away_score ?? 0}
            </div>

            <h1 className="text-left text-2xl font-black">
              {m.away_team}
            </h1>
          </div>

          <div className="mt-5 text-neutral-400">
            {m.date ||
              'Dato ikke fastsat'}

            {m.kickoff_time
              ? ` • ${m.kickoff_time.slice(
                  0,
                  5
                )}`
              : ''}

            {m.stadium
              ? ` • ${m.stadium}`
              : ''}
          </div>
        </div>

        {/* STARTOPSTILLING */}
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">
                Startopstilling
              </h2>

              <div className="mt-1 text-sm text-neutral-400">
                FC Glostruplona
              </div>
            </div>

            {m.formation &&
              startingLineup.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black">
                  Formation:{' '}
                  <span className="text-red-400">
                    {m.formation}
                  </span>
                </div>
              )}
          </div>

          {startingLineup.length ? (
            <div className="card p-4 sm:p-6">
              <div className="mx-auto max-w-2xl">
                <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border-2 border-white/20 bg-green-800 shadow-2xl">
                  {/* YDRE BANE */}
                  <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/30" />

                  {/* MIDTERLINJE */}
                  <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-white/30" />

                  {/* MIDTERCIRKEL */}
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 sm:h-32 sm:w-32" />

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

                  {startingLineup.map(
                    (lineupPlayer: any) => {
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
                          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-red-600 text-xs font-black text-white shadow-xl sm:h-14 sm:w-14 sm:text-sm">
                            #
                            {
                              player.shirt_number
                            }
                          </div>

                          <div className="mt-1 max-w-24 truncate whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] font-bold text-white shadow-lg sm:max-w-32 sm:text-xs">
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

                <div className="mt-4 text-center text-xs text-neutral-500">
                  Startopstillingen er
                  offentliggjort af FC
                  Glostruplona.
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="text-4xl">
                ⚽
              </div>

              <div className="mt-4 text-xl font-black">
                Startopstillingen er
                endnu ikke
                offentliggjort
              </div>

              <div className="mt-2 text-sm text-neutral-400">
                Holdet bliver vist her,
                når trænerstaben har
                offentliggjort
                opstillingen.
              </div>
            </div>
          )}
        </section>

        {/* KAMPFORLØB */}
        <section>
          <h2 className="mb-3 text-2xl font-black">
            Kampforløb
          </h2>

          <div className="card divide-y divide-white/10">
            {events?.length ? (
              events.map((e: any) => {
                let eventLabel = ''
                let icon = ''

                if (
                  e.event_type ===
                  'goal'
                ) {
                  eventLabel = 'Mål'
                  icon = '⚽'
                }

                if (
                  e.event_type ===
                  'yellow_card'
                ) {
                  eventLabel =
                    'Gult kort'
                  icon = '🟨'
                }

                if (
                  e.event_type ===
                  'red_card'
                ) {
                  eventLabel =
                    'Rødt kort'
                  icon = '🟥'
                }

                const playerName =
                  e.player
                    ? `${e.player.first_name} ${e.player.last_name}`
                    : e.team ===
                        'home'
                      ? m.home_team
                      : m.away_team

                return (
                  <div
                    key={e.id}
                    className="flex gap-4 p-4"
                  >
                    <div className="w-14 shrink-0 font-black text-red-400">
                      {e.minute}'
                    </div>

                    <div>
                      <div className="font-bold">
                        {icon}{' '}
                        {eventLabel}
                      </div>

                      <div className="text-sm text-neutral-400">
                        {playerName}
                      </div>

                      {e.event_type ===
                        'goal' &&
                        e.assist && (
                          <div className="mt-1 text-xs text-neutral-500">
                            Assist:{' '}
                            {
                              e.assist
                                .first_name
                            }{' '}
                            {
                              e.assist
                                .last_name
                            }
                          </div>
                        )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-6 text-neutral-400">
                Ingen
                kamphændelser
                registreret endnu.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}