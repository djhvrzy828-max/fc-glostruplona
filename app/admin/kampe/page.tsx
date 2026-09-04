import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase-server'
import { getMatchState } from '@/lib/match-time'
import LineupEditor from '@/components/LineupEditor'
import DeleteMatchButton from '@/components/DeleteMatchButton'

import {
  createMatch,
  updateMatch,
  updateLiveScore,
  createMatchEvent,
  updateMatchEvent,
  deleteMatchEvent,
  finishMatch,
} from '../actions'

export const dynamic = 'force-dynamic'

async function saveMatchAppearances(
  formData: FormData
) {
  'use server'

  const s = await createServerSupabase()

  const matchId = String(
    formData.get('match_id') || ''
  )

  const playerIds = formData
    .getAll('player_ids')
    .map((id) => String(id))
    .filter(Boolean)

  if (!matchId) {
    return
  }

  const { error: deleteError } = await s
    .from('match_appearances')
    .delete()
    .eq('match_id', matchId)

  if (deleteError) {
    console.error(
      'DELETE APPEARANCES ERROR:',
      deleteError
    )
    return
  }

  if (playerIds.length > 0) {
    const rows = playerIds.map(
      (playerId) => ({
        match_id: matchId,
        player_id: playerId,
      })
    )

    const { error: insertError } = await s
      .from('match_appearances')
      .insert(rows)

    if (insertError) {
      console.error(
        'INSERT APPEARANCES ERROR:',
        insertError
      )
      return
    }
  }

  revalidatePath('/admin/kampe')
  revalidatePath('/statistik')
  revalidatePath('/trup')
}

async function saveMatchLineup(
  formData: FormData
) {
  'use server'

  const s = await createServerSupabase()

  const matchId = String(
    formData.get('match_id') || ''
  )

  const formation = String(
    formData.get('formation') || ''
  ).trim()

  const lineupCount = Math.min(
    Number(
      formData.get('lineup_count') || 0
    ),
    8
  )

  if (!matchId) {
    return
  }

  const lineupRows = []

  for (
    let index = 0;
    index < lineupCount;
    index++
  ) {
    const playerId = String(
      formData.get(
        `lineup_${index}_player_id`
      ) || ''
    )

    if (!playerId) {
      continue
    }

    const xPosition = Number(
      formData.get(
        `lineup_${index}_x`
      ) || 50
    )

    const yPosition = Number(
      formData.get(
        `lineup_${index}_y`
      ) || 50
    )

    const lineupRole = String(
      formData.get(
        `lineup_${index}_role`
      ) || ''
    )

    lineupRows.push({
      match_id: matchId,
      player_id: playerId,
      starter: true,
      position_order: index,
      x_position: xPosition,
      y_position: yPosition,
      lineup_role:
        lineupRole || null,
    })
  }

  const {
    error: formationError,
  } = await s
    .from('matches')
    .update({
      formation:
        formation || null,
    })
    .eq('id', matchId)

  if (formationError) {
    console.error(
      'FORMATION UPDATE ERROR:',
      formationError
    )
    return
  }

  const {
    error: deleteLineupError,
  } = await s
    .from('match_lineups')
    .delete()
    .eq('match_id', matchId)

  if (deleteLineupError) {
    console.error(
      'DELETE LINEUP ERROR:',
      deleteLineupError
    )
    return
  }

  if (lineupRows.length > 0) {
    const {
      error: insertLineupError,
    } = await s
      .from('match_lineups')
      .insert(lineupRows)

    if (insertLineupError) {
      console.error(
        'INSERT LINEUP ERROR:',
        insertLineupError
      )
      return
    }
  }

  revalidatePath('/admin/kampe')
  revalidatePath('/')
  revalidatePath('/kampe')
  revalidatePath(
    `/kampe/${matchId}`
  )
}

/*
 * SLET EN HEL KAMP
 *
 * Tilknyttede data bliver slettet via
 * database-relationernes ON DELETE CASCADE.
 */
async function deleteMatch(
  formData: FormData
) {
  'use server'

  const s = await createServerSupabase()

  const matchId = String(
    formData.get('match_id') || ''
  )

  if (!matchId) {
    return
  }

  const { error } = await s
    .from('matches')
    .delete()
    .eq('id', matchId)

  if (error) {
    console.error(
      'DELETE MATCH ERROR:',
      error
    )
    return
  }

  revalidatePath('/admin/kampe')
  revalidatePath('/kampe')
  revalidatePath('/')
  revalidatePath('/statistik')
  revalidatePath('/trup')
}

export default async function Page() {
  const s = await createServerSupabase()

  const { data: matches } = await s
    .from('matches')
    .select('*')
    .order('date', {
      ascending: true,
      nullsFirst: false,
    })

  const { data: players } = await s
    .from('players')
    .select('*')
    .eq('active', true)
    .order('shirt_number')

  const {
    data: appearances,
    error: appearancesError,
  } = await s
    .from('match_appearances')
    .select('match_id, player_id')

  if (appearancesError) {
    console.error(
      'MATCH APPEARANCES ERROR:',
      appearancesError
    )
  }

  const {
    data: lineups,
    error: lineupsError,
  } = await s
    .from('match_lineups')
    .select(`
      match_id,
      player_id,
      starter,
      position_order,
      x_position,
      y_position,
      lineup_role
    `)
    .order('position_order', {
      ascending: true,
    })

  if (lineupsError) {
    console.error(
      'MATCH LINEUPS ERROR:',
      lineupsError
    )
  }

  const {
    data: events,
    error: eventsError,
  } = await s
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
    .order('minute', {
      ascending: false,
    })

  if (eventsError) {
    console.error(
      'ADMIN MATCH EVENTS ERROR:',
      eventsError
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-4xl font-black">
        Kampe
      </h1>

      {/* OPRET NY KAMP */}
      <form
        action={createMatch}
        className="card mb-8 grid gap-3 p-6 md:grid-cols-2"
      >
        <input
          className="input"
          name="home_team"
          placeholder="Hjemmehold"
          required
        />

        <input
          className="input"
          name="away_team"
          placeholder="Udehold"
          required
        />

        <input
          className="input"
          name="date"
          type="date"
        />

        <input
          className="input"
          name="kickoff_time"
          type="time"
        />

        <input
          className="input"
          name="stadium"
          placeholder="Stadion"
        />

        <input
          className="input"
          name="competition"
          defaultValue="9. divisionen"
        />

        <select
          className="input"
          name="status"
          defaultValue="Kommende"
        >
          {[
            'Kommende',
            'Slut',
            'Udsat',
            'Aflyst',
          ].map((x) => (
            <option
              key={x}
              value={x}
            >
              {x}
            </option>
          ))}
        </select>

        <button className="btn">
          + OPRET KAMP
        </button>
      </form>

      <h2 className="mb-4 text-2xl font-black">
        Kampe og live-kontrol
      </h2>

      <div className="space-y-6">
        {matches?.map((m: any) => {
          const state = getMatchState(
  m.date,
  m.kickoff_time,
  m.status
)

          const matchEvents =
            events?.filter(
              (e: any) =>
                e.match_id === m.id
            ) || []

          const matchAppearances =
            appearances?.filter(
              (a: any) =>
                a.match_id === m.id
            ) || []

          const selectedPlayerIds =
            new Set(
              matchAppearances.map(
                (a: any) =>
                  a.player_id
              )
            )

          const matchLineup =
            lineups
              ?.filter(
                (lineup: any) =>
                  lineup.match_id ===
                    m.id &&
                  lineup.starter !==
                    false
              )
              .map(
                (lineup: any) => ({
                  player_id:
                    lineup.player_id,

                  x_position:
                    Number(
                      lineup.x_position
                    ),

                  y_position:
                    Number(
                      lineup.y_position
                    ),

                  lineup_role:
                    lineup.lineup_role,
                })
              ) || []

          let liveText = 'KOMMENDE'

          if (
            state.phase ===
              '1. halvleg' ||
            state.phase ===
              '2. halvleg'
          ) {
            liveText =
              `LIVE • ${state.minute}'`
         } else if (
  state.phase === 'Pause'
) {
  liveText = 'PAUSE'
} else if (
  state.phase === 'Overtid'
) {
  liveText =
    `OVERTID • ${state.minute}'`
} else if (
  state.phase === 'Slut'
) {
  liveText = 'SLUT'
}
          if (
            m.status === 'Udsat'
          ) {
            liveText = 'UDSAT'
          }

          if (
            m.status === 'Aflyst'
          ) {
            liveText = 'AFLYST'
          }

          const isActuallyLive =
            state.isLive &&
            m.status !== 'Udsat' &&
            m.status !== 'Aflyst'

          return (
            <div
              key={m.id}
              className="card p-5"
            >
              {/* KAMP HEADER */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black">
                    {m.home_team} vs{' '}
                    {m.away_team}
                  </div>

                  <div className="mt-1 text-sm text-neutral-400">
                    {m.date ||
                      'Ingen dato'}

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

                <div
                  className={
                    isActuallyLive
                      ? 'font-black text-red-400'
                      : 'font-black text-neutral-400'
                  }
                >
                  {liveText}
                </div>
              </div>
              {/* AFSLUT KAMP */}
{isActuallyLive &&
  m.status !== 'Slut' && (
    <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/30 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-black text-white">
            Kampen er live
          </div>

          <div className="mt-1 text-sm text-neutral-400">
            Kampen afsluttes ikke automatisk.
            Tryk først når dommeren har fløjtet af.
          </div>
        </div>

        <form action={finishMatch}>
          <input
            type="hidden"
            name="match_id"
            value={m.id}
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-red-700 px-5 py-3 font-black text-white transition hover:bg-red-600 sm:w-auto"
          >
            🏁 AFSLUT KAMP
          </button>
        </form>
      </div>
    </div>
  )}

              {/* SLET KAMP */}
              <div className="mb-6 flex justify-end">
                <form
                  action={deleteMatch}
                >
                  <input
                    type="hidden"
                    name="match_id"
                    value={m.id}
                  />

                  <DeleteMatchButton
                    matchName={`${m.home_team} vs ${m.away_team}`}
                  />
                </form>
              </div>

              {/* REDIGER KAMPINFO */}
              <form
                action={updateMatch}
                className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4"
              >
                <input
                  type="hidden"
                  name="id"
                  value={m.id}
                />

                <div>
                  <label className="mb-1 block text-xs opacity-60">
                    Dato
                  </label>

                  <input
                    className="input w-full"
                    name="date"
                    type="date"
                    defaultValue={
                      m.date || ''
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs opacity-60">
                    Kampstart
                  </label>

                  <input
                    className="input w-full"
                    name="kickoff_time"
                    type="time"
                    defaultValue={
                      m.kickoff_time
                        ? m.kickoff_time.slice(
                            0,
                            5
                          )
                        : ''
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs opacity-60">
                    Stadion
                  </label>

                  <input
                    className="input w-full"
                    name="stadium"
                    defaultValue={
                      m.stadium || ''
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs opacity-60">
                    Status
                  </label>

                  <select
                    className="input w-full"
                    name="status"
                    defaultValue={
                      m.status ||
                      'Kommende'
                    }
                  >
                    {[
                      'Kommende',
                      'Slut',
                      'Udsat',
                      'Aflyst',
                    ].map((x) => (
                      <option
                        key={x}
                        value={x}
                      >
                        {x}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="btn lg:col-span-4">
                  GEM KAMPINFO
                </button>
              </form>

              {/* STARTOPSTILLING */}
              <div className="border-t border-white/10 pt-6">
                <div className="mb-5">
                  <h3 className="text-xl font-black">
                    Startopstilling
                  </h3>

                  <p className="mt-1 text-sm text-neutral-400">
                    Vælg op til 8
                    startende spillere og
                    placer dem på banen.
                    Opstillingen gemmes kun
                    til denne kamp.
                  </p>
                </div>

                <form
                  action={
                    saveMatchLineup
                  }
                >
                  <input
                    type="hidden"
                    name="match_id"
                    value={m.id}
                  />

                  <LineupEditor
                    players={
                      players || []
                    }
                    initialLineup={
                      matchLineup
                    }
                    initialFormation={
                      m.formation ||
                      '3-3-1'
                    }
                  />

                  <button className="btn mt-5">
                    GEM STARTOPSTILLING
                  </button>
                </form>
              </div>

              {/* SPILLERE DER DELTOG */}
              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black">
                      Spillere i kampen
                    </h3>

                    <p className="mt-1 text-sm text-neutral-400">
                      Vælg alle FC
                      Glostruplona-spillere,
                      der deltog i kampen.
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-neutral-300">
                    {
                      matchAppearances.length
                    }{' '}
                    spillere valgt
                  </div>
                </div>

                <form
                  action={
                    saveMatchAppearances
                  }
                >
                  <input
                    type="hidden"
                    name="match_id"
                    value={m.id}
                  />

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {players?.map(
                      (p: any) => (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
                        >
                          <input
                            type="checkbox"
                            name="player_ids"
                            value={p.id}
                            defaultChecked={
                              selectedPlayerIds.has(
                                p.id
                              )
                            }
                            className="h-5 w-5"
                          />

                          <div>
                            <div className="font-black">
                              #
                              {
                                p.shirt_number
                              }{' '}
                              {
                                p.first_name
                              }{' '}
                              {
                                p.last_name
                              }
                            </div>

                            {p.position && (
                              <div className="text-xs text-neutral-500">
                                {
                                  p.position
                                }
                              </div>
                            )}
                          </div>
                        </label>
                      )
                    )}
                  </div>

                  {!players?.length && (
                    <div className="text-sm text-neutral-500">
                      Ingen aktive
                      spillere fundet.
                    </div>
                  )}

                  <button className="btn mt-4">
                    GEM SPILLERTRUP
                  </button>
                </form>
              </div>

              {/* LIVE SCORE */}
              <div className="mt-6 border-t border-white/10 pt-6">
                <h3 className="mb-4 text-xl font-black">
                  Live score
                </h3>

                <form
                  action={
                    updateLiveScore
                  }
                  className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto]"
                >
                  <input
                    type="hidden"
                    name="id"
                    value={m.id}
                  />

                  <div>
                    <label className="mb-1 block text-xs opacity-60">
                      {m.home_team}
                    </label>

                    <input
                      className="input w-full"
                      name="home_score"
                      type="number"
                      min="0"
                      defaultValue={
                        m.home_score ?? 0
                      }
                      required
                    />
                  </div>

                  <div className="flex items-end pb-3 text-2xl font-black">
                    -
                  </div>

                  <div>
                    <label className="mb-1 block text-xs opacity-60">
                      {m.away_team}
                    </label>

                    <input
                      className="input w-full"
                      name="away_score"
                      type="number"
                      min="0"
                      defaultValue={
                        m.away_score ?? 0
                      }
                      required
                    />
                  </div>

                  <button className="btn self-end">
                    GEM SCORE
                  </button>
                </form>
              </div>

              {/* REGISTRER NY HÆNDELSE */}
              <div className="mt-6 border-t border-white/10 pt-6">
                <h3 className="mb-4 text-xl font-black">
                  Registrer hændelse
                </h3>

                <form
                  action={
                    createMatchEvent
                  }
                  className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
                >
                  <input
                    type="hidden"
                    name="match_id"
                    value={m.id}
                  />

                  <div>
                    <label className="mb-1 block text-xs opacity-60">
                      Hændelse
                    </label>

                    <select
                      className="input w-full"
                      name="event_type"
                    >
                      <option value="goal">
                        Mål
                      </option>

                      <option value="yellow_card">
                        Gult kort
                      </option>

                      <option value="red_card">
                        Rødt kort
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs opacity-60">
                      Hold
                    </label>

                    <select
                      className="input w-full"
                      name="team"
                    >
                      <option value="home">
                        {m.home_team}
                      </option>

                      <option value="away">
                        {m.away_team}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs opacity-60">
                      Spiller
                    </label>

                    <select
                      className="input w-full"
                      name="player_id"
                    >
                      <option value="">
                        Ingen spiller valgt
                      </option>

                      {players?.map(
                        (p: any) => (
                          <option
                            key={p.id}
                            value={p.id}
                          >
                            #
                            {
                              p.shirt_number
                            }{' '}
                            {
                              p.first_name
                            }{' '}
                            {
                              p.last_name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs opacity-60">
                      Assist
                    </label>

                    <select
                      className="input w-full"
                      name="assist_player_id"
                    >
                      <option value="">
                        Ingen assist
                      </option>

                      {players?.map(
                        (p: any) => (
                          <option
                            key={p.id}
                            value={p.id}
                          >
                            #
                            {
                              p.shirt_number
                            }{' '}
                            {
                              p.first_name
                            }{' '}
                            {
                              p.last_name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs opacity-60">
                      Kampminut
                    </label>

                    <input
                      className="input w-full"
                      name="minute"
                      type="number"
                      min="1"
                      max="120"
                      defaultValue={
                        state.minute ?? 1
                      }
                      required
                    />
                  </div>

                  <button className="btn self-end">
                    REGISTRER HÆNDELSE
                  </button>
                </form>
              </div>

              {/* EKSISTERENDE HÆNDELSER */}
              <div className="mt-6 border-t border-white/10 pt-6">
                <h3 className="mb-4 text-xl font-black">
                  Registrerede hændelser
                </h3>

                <div className="space-y-3">
                  {matchEvents.map(
                    (e: any) => {
                      let eventName =
                        e.event_type

                      if (
                        e.event_type ===
                        'goal'
                      ) {
                        eventName =
                          '⚽ Mål'
                      }

                      if (
                        e.event_type ===
                        'yellow_card'
                      ) {
                        eventName =
                          '🟨 Gult kort'
                      }

                      if (
                        e.event_type ===
                        'red_card'
                      ) {
                        eventName =
                          '🟥 Rødt kort'
                      }

                      return (
                        <div
                          key={e.id}
                          className="rounded-xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="mb-3">
                            <div className="font-black">
                              {
                                eventName
                              }
                            </div>

                            <div className="mt-1 text-sm text-neutral-400">
                              {e.player
                                ? `${e.player.first_name} ${e.player.last_name}`
                                : e.team ===
                                    'home'
                                  ? m.home_team
                                  : m.away_team}

                              {e.assist
                                ? ` • Assist: ${e.assist.first_name} ${e.assist.last_name}`
                                : ''}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <form
                              action={
                                updateMatchEvent
                              }
                              className="flex flex-wrap items-center gap-2"
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={
                                  e.id
                                }
                              />

                              <input
                                type="hidden"
                                name="match_id"
                                value={
                                  m.id
                                }
                              />

                              <label className="text-sm text-neutral-400">
                                Minut
                              </label>

                              <input
                                className="input w-24"
                                name="minute"
                                type="number"
                                min="1"
                                max="120"
                                defaultValue={
                                  e.minute
                                }
                                required
                              />

                              <button className="btn">
                                GEM MINUT
                              </button>
                            </form>

                            <form
                              action={
                                deleteMatchEvent
                              }
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={
                                  e.id
                                }
                              />

                              <input
                                type="hidden"
                                name="match_id"
                                value={
                                  m.id
                                }
                              />

                              <button
                                type="submit"
                                className="rounded-xl border border-red-500/40 px-4 py-3 font-bold text-red-400 hover:bg-red-500/10"
                              >
                                SLET
                              </button>
                            </form>
                          </div>
                        </div>
                      )
                    }
                  )}

                  {!matchEvents.length && (
                    <div className="text-sm text-neutral-500">
                      Ingen hændelser
                      registreret.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {!matches?.length && (
          <div className="card p-6 opacity-60">
            Ingen kampe oprettet endnu.
          </div>
        )}
      </div>
    </div>
  )
}