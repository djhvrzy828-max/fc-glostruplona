import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase-server'
import { getMatchState } from '@/lib/match-time'
import LineupEditor from '@/components/LineupEditor'
import DeleteMatchButton from '@/components/DeleteMatchButton'
import { sendPushToAll } from '@/lib/send-push'
import {
  createMatch,
  updateMatch,
  updateLiveScore,
  createMatchEvent,
  updateMatchEvent,
  deleteMatchEvent,
  finishMatch,
  setManOfTheMatch,
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

  /*
   * TJEK OM DER ALLEREDE ER ET HOLDKORT
   *
   * Hvis der allerede findes spillere i
   * match_lineups, er dette kun en redigering.
   */
  const {
    data: existingLineup,
    error: existingLineupError,
  } = await s
    .from('match_lineups')
    .select('id')
    .eq('match_id', matchId)
    .limit(1)

  if (existingLineupError) {
    console.error(
      'CHECK EXISTING LINEUP ERROR:',
      existingLineupError
    )
  }

  const isFirstLineup =
    !existingLineup ||
    existingLineup.length === 0

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

  /*
   * SEND PUSH KUN FØRSTE GANG
   * DER GEMMES ET RIGTIGT HOLDKORT
   */
  if (
    isFirstLineup &&
    lineupRows.length > 0
  ) {
    try {
      const {
        data: match,
        error: matchError,
      } = await s
        .from('matches')
        .select(
          'home_team, away_team'
        )
        .eq('id', matchId)
        .single()

      if (matchError) {
        console.error(
          'LINEUP MATCH ERROR:',
          matchError
        )
      }

      if (match) {
        await sendPushToAll({
          title:
            '📋 HOLDKORTET ER KLAR!',

          body:
            `Startopstillingen til ${match.home_team} vs ${match.away_team} er nu offentliggjort.`,

          url:
            `/kampe/${matchId}`,
        })

        console.log(
          'LINEUP PUSH SENT:',
          matchId
        )
      }
    } catch (pushError) {
      /*
       * Holdkortet skal stadig gemmes,
       * selv hvis push fejler.
       */
      console.error(
        'LINEUP PUSH ERROR:',
        pushError
      )
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
    <div className="fcg-page fcg-fade-in space-y-8 md:space-y-10">
      {/* ==================================================
          HEADER
         ================================================== */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black p-6 shadow-[0_30px_90px_rgba(0,0,0,.5)] sm:p-8 md:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-700/15 blur-[90px]" />

        <div className="relative z-10">
          <div className="fcg-label">FCG ADMIN</div>

          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-5xl">
            KAMP <span className="text-red-500">CENTER</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
            Administrér kampe, startopstillinger, spillere, live-score,
            hændelser og Man of the Match.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <div className="fcg-badge fcg-badge-red">
              {matches?.length || 0} KAMPE
            </div>

            <div className="fcg-badge">
              {players?.length || 0} AKTIVE SPILLERE
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          OPRET KAMP
         ================================================== */}
      <section>
        <div className="mb-4">
          <div className="fcg-label">Ny kamp</div>
          <h2 className="fcg-heading mt-1">Opret kamp</h2>
        </div>

        <form
          action={createMatch}
          className="relative grid gap-4 overflow-hidden rounded-[26px] border border-white/10 bg-[#0d0d0d] p-5 shadow-xl sm:p-6 md:grid-cols-2"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-700/10 blur-[70px]" />

          <div className="relative z-10">
            <label className="label mb-2 block">Hjemmehold</label>
            <input
              className="input"
              name="home_team"
              placeholder="Hjemmehold"
              required
            />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">Udehold</label>
            <input
              className="input"
              name="away_team"
              placeholder="Udehold"
              required
            />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">Dato</label>
            <input className="input" name="date" type="date" />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">Kampstart</label>
            <input className="input" name="kickoff_time" type="time" />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">Stadion</label>
            <input
              className="input"
              name="stadium"
              placeholder="Stadion"
            />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">Turnering</label>
            <input
              className="input"
              name="competition"
              defaultValue="Mesterrækken"
            />
          </div>

          <div className="relative z-10 md:col-span-2">
            <label className="label mb-2 block">Status</label>
            <select
              className="input"
              name="status"
              defaultValue="Kommende"
            >
              {['Kommende', 'Slut', 'Udsat', 'Aflyst'].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <button className="btn relative z-10 md:col-span-2">
            + OPRET KAMP
          </button>
        </form>
      </section>

      {/* ==================================================
          KAMPE
         ================================================== */}
      <section>
        <div className="mb-4">
          <div className="fcg-label">Control room</div>
          <h2 className="fcg-heading mt-1">Kampe & live-kontrol</h2>
        </div>

        <div className="space-y-6">
          {matches?.map((m: any) => {
            const state = getMatchState(
              m.date,
              m.kickoff_time,
              m.status
            )

            const matchEvents =
              events?.filter(
                (e: any) => e.match_id === m.id
              ) || []

            const matchAppearances =
              appearances?.filter(
                (a: any) => a.match_id === m.id
              ) || []

            const selectedPlayerIds = new Set(
              matchAppearances.map(
                (a: any) => a.player_id
              )
            )

            const matchLineup =
              lineups
                ?.filter(
                  (lineup: any) =>
                    lineup.match_id === m.id &&
                    lineup.starter !== false
                )
                .map((lineup: any) => ({
                  player_id: lineup.player_id,
                  x_position: Number(lineup.x_position),
                  y_position: Number(lineup.y_position),
                  lineup_role: lineup.lineup_role,
                })) || []

            let liveText = 'KOMMENDE'

            if (
              state.phase === '1. halvleg' ||
              state.phase === '2. halvleg'
            ) {
              liveText = `LIVE • ${state.minute}'`
            } else if (state.phase === 'Pause') {
              liveText = 'PAUSE'
            } else if (state.phase === 'Overtid') {
              liveText = `OVERTID • ${state.minute}'`
            } else if (state.phase === 'Slut') {
              liveText = 'SLUT'
            }

            if (m.status === 'Udsat') {
              liveText = 'UDSAT'
            }

            if (m.status === 'Aflyst') {
              liveText = 'AFLYST'
            }

            const isActuallyLive =
              state.isLive &&
              m.status !== 'Udsat' &&
              m.status !== 'Aflyst'

            return (
              <article
                key={m.id}
                className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0d0d] shadow-[0_25px_80px_rgba(0,0,0,.45)]"
              >
                <div
                  className={
                    isActuallyLive
                      ? 'pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-600/15 blur-[90px]'
                      : 'pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/[0.025] blur-[90px]'
                  }
                />

                {/* MATCH HEADER */}
                <div className="relative z-10 border-b border-white/[0.07] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-[.18em] text-neutral-600">
                        {m.competition || 'Mesterrækken'}
                      </div>

                      <h3 className="mt-2 text-xl font-black uppercase leading-tight tracking-[-.02em] sm:text-2xl">
                        {m.home_team}{' '}
                        <span className="text-neutral-600">vs</span>{' '}
                        {m.away_team}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-neutral-500">
                        <span>{m.date || 'Ingen dato'}</span>

                        {m.kickoff_time && (
                          <>
                            <span className="text-neutral-700">•</span>
                            <span>{m.kickoff_time.slice(0, 5)}</span>
                          </>
                        )}

                        {m.stadium && (
                          <>
                            <span className="text-neutral-700">•</span>
                            <span>{m.stadium}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      className={
                        isActuallyLive
                          ? 'flex items-center gap-2 rounded-full border border-red-500/25 bg-red-950/45 px-3 py-2 text-[10px] font-black uppercase tracking-[.15em] text-red-300'
                          : 'rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[.15em] text-neutral-400'
                      }
                    >
                      {isActuallyLive && (
                        <span className="fcg-live-dot" />
                      )}

                      {liveText}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-center">
                      <div className="text-[8px] font-black uppercase tracking-[.12em] text-neutral-600">
                        Events
                      </div>
                      <div className="mt-1 text-lg font-black">
                        {matchEvents.length}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-center">
                      <div className="text-[8px] font-black uppercase tracking-[.12em] text-neutral-600">
                        Spillere
                      </div>
                      <div className="mt-1 text-lg font-black">
                        {matchAppearances.length}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-center">
                      <div className="text-[8px] font-black uppercase tracking-[.12em] text-neutral-600">
                        Lineup
                      </div>
                      <div className="mt-1 text-lg font-black">
                        {matchLineup.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 space-y-6 p-5 sm:p-6">
                  {/* LIVE FINISH */}
                  {isActuallyLive && m.status !== 'Slut' && (
                    <div className="rounded-[22px] border border-red-500/30 bg-red-950/25 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 font-black text-white">
                            <span className="fcg-live-dot" />
                            Kampen er live
                          </div>

                          <div className="mt-1 max-w-xl text-sm leading-6 text-neutral-400">
                            Kampen afsluttes ikke automatisk. Tryk først,
                            når dommeren har fløjtet af.
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

                  {/* MATCH INFO */}
                  <section>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                          Kampdata
                        </div>

                        <h4 className="mt-1 text-xl font-black">
                          Kampinformation
                        </h4>
                      </div>

                      <form action={deleteMatch}>
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

                    <form
                      action={updateMatch}
                      className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={m.id}
                      />

                      <div>
                        <label className="label mb-2 block">Dato</label>
                        <input
                          className="input w-full"
                          name="date"
                          type="date"
                          defaultValue={m.date || ''}
                        />
                      </div>

                      <div>
                        <label className="label mb-2 block">
                          Kampstart
                        </label>
                        <input
                          className="input w-full"
                          name="kickoff_time"
                          type="time"
                          defaultValue={
                            m.kickoff_time
                              ? m.kickoff_time.slice(0, 5)
                              : ''
                          }
                        />
                      </div>

                      <div>
                        <label className="label mb-2 block">Stadion</label>
                        <input
                          className="input w-full"
                          name="stadium"
                          defaultValue={m.stadium || ''}
                        />
                      </div>

                      <div>
                        <label className="label mb-2 block">Status</label>
                        <select
                          className="input w-full"
                          name="status"
                          defaultValue={m.status || 'Kommende'}
                        >
                          {['Kommende', 'Slut', 'Udsat', 'Aflyst'].map(
                            (x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <button className="btn lg:col-span-4">
                        GEM KAMPINFO
                      </button>
                    </form>
                  </section>

                  {/* LINEUP */}
                  <section className="border-t border-white/[0.07] pt-6">
                    <div className="mb-5">
                      <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                        Holdkort
                      </div>

                      <h4 className="mt-1 text-xl font-black">
                        Startopstilling
                      </h4>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                        Vælg op til 8 startende spillere og placer dem på
                        banen. Første gang et rigtigt holdkort gemmes,
                        sendes der automatisk en push-notifikation.
                      </p>
                    </div>

                    <form action={saveMatchLineup}>
                      <input
                        type="hidden"
                        name="match_id"
                        value={m.id}
                      />

                      <LineupEditor
                        players={players || []}
                        initialLineup={matchLineup}
                        initialFormation={m.formation || '3-3-1'}
                      />

                      <button className="btn mt-5">
                        GEM STARTOPSTILLING
                      </button>
                    </form>
                  </section>

                  {/* APPEARANCES */}
                  <section className="border-t border-white/[0.07] pt-6">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                          Trup
                        </div>

                        <h4 className="mt-1 text-xl font-black">
                          Spillere i kampen
                        </h4>

                        <p className="mt-2 text-sm text-neutral-400">
                          Vælg alle FC Glostruplona-spillere, der deltog i
                          kampen.
                        </p>
                      </div>

                      <div className="fcg-badge">
                        {matchAppearances.length} VALGT
                      </div>
                    </div>

                    <form action={saveMatchAppearances}>
                      <input
                        type="hidden"
                        name="match_id"
                        value={m.id}
                      />

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {players?.map((p: any) => (
                          <label
                            key={p.id}
                            className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-3 transition hover:border-red-500/20 hover:bg-white/[0.05]"
                          >
                            <input
                              type="checkbox"
                              name="player_ids"
                              value={p.id}
                              defaultChecked={selectedPlayerIds.has(p.id)}
                              className="h-5 w-5 accent-red-600"
                            />

                            <div className="min-w-0">
                              <div className="truncate font-black">
                                #{p.shirt_number} {p.first_name}{' '}
                                {p.last_name}
                              </div>

                              {p.position && (
                                <div className="mt-0.5 text-xs text-neutral-600">
                                  {p.position}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>

                      {!players?.length && (
                        <div className="text-sm text-neutral-500">
                          Ingen aktive spillere fundet.
                        </div>
                      )}

                      <button className="btn mt-4">
                        GEM SPILLERTRUP
                      </button>
                    </form>
                  </section>

                  {/* SCORE */}
                  <section className="border-t border-white/[0.07] pt-6">
                    <div className="mb-4">
                      <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                        Scoreboard
                      </div>

                      <h4 className="mt-1 text-xl font-black">
                        Live score
                      </h4>
                    </div>

                    <form
                      action={updateLiveScore}
                      className="grid gap-3 rounded-[22px] border border-white/[0.08] bg-black/25 p-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-end"
                    >
                      <input type="hidden" name="id" value={m.id} />

                      <div>
                        <label className="label mb-2 block">
                          {m.home_team}
                        </label>

                        <input
                          className="input w-full text-center text-2xl font-black"
                          name="home_score"
                          type="number"
                          min="0"
                          defaultValue={m.home_score ?? 0}
                          required
                        />
                      </div>

                      <div className="hidden pb-3 text-2xl font-black text-neutral-700 md:block">
                        –
                      </div>

                      <div>
                        <label className="label mb-2 block">
                          {m.away_team}
                        </label>

                        <input
                          className="input w-full text-center text-2xl font-black"
                          name="away_score"
                          type="number"
                          min="0"
                          defaultValue={m.away_score ?? 0}
                          required
                        />
                      </div>

                      <button className="btn self-end">
                        GEM SCORE
                      </button>
                    </form>
                  </section>

                  {/* MOTM */}
                  <section className="border-t border-white/[0.07] pt-6">
                    <div className="rounded-[22px] border border-yellow-500/15 bg-yellow-950/10 p-4 sm:p-5">
                      <div className="text-[9px] font-black uppercase tracking-[.18em] text-yellow-400">
                        ★ MAN OF THE MATCH
                      </div>

                      <h4 className="mt-1 text-xl font-black">
                        Vælg kampens spiller
                      </h4>

                      <p className="mt-2 text-sm text-neutral-400">
                        Vælg den FC Glostruplona-spiller, der skal stå som
                        kampens spiller.
                      </p>

                      <form
                        action={setManOfTheMatch}
                        className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"
                      >
                        <input
                          type="hidden"
                          name="match_id"
                          value={m.id}
                        />

                        <select
                          className="input w-full"
                          name="player_id"
                          defaultValue={
                            m.man_of_match_player_id || ''
                          }
                        >
                          <option value="">Ingen valgt</option>

                          {players?.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              #{p.shirt_number} {p.first_name}{' '}
                              {p.last_name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          className="rounded-xl bg-yellow-500 px-5 py-3 font-black text-black transition hover:bg-yellow-400"
                        >
                          ★ GEM MOTM
                        </button>
                      </form>
                    </div>
                  </section>

                  {/* CREATE EVENT */}
                  <section className="border-t border-white/[0.07] pt-6">
                    <div className="mb-4">
                      <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                        Live events
                      </div>

                      <h4 className="mt-1 text-xl font-black">
                        Registrer hændelse
                      </h4>
                    </div>

                    <form
                      action={createMatchEvent}
                      className="grid gap-3 rounded-[22px] border border-white/[0.08] bg-black/25 p-4 md:grid-cols-2 lg:grid-cols-3"
                    >
                      <input
                        type="hidden"
                        name="match_id"
                        value={m.id}
                      />

                      <div>
                        <label className="label mb-2 block">
                          Hændelse
                        </label>

                        <select
                          className="input w-full"
                          name="event_type"
                        >
                          <option value="goal">Mål</option>
                          <option value="yellow_card">Gult kort</option>
                          <option value="red_card">Rødt kort</option>
                        </select>
                      </div>

                      <div>
                        <label className="label mb-2 block">Hold</label>

                        <select className="input w-full" name="team">
                          <option value="home">{m.home_team}</option>
                          <option value="away">{m.away_team}</option>
                        </select>
                      </div>

                      <div>
                        <label className="label mb-2 block">
                          Spiller
                        </label>

                        <select
                          className="input w-full"
                          name="player_id"
                        >
                          <option value="">Ingen spiller valgt</option>

                          {players?.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              #{p.shirt_number} {p.first_name}{' '}
                              {p.last_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="label mb-2 block">
                          Assist
                        </label>

                        <select
                          className="input w-full"
                          name="assist_player_id"
                        >
                          <option value="">Ingen assist</option>

                          {players?.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              #{p.shirt_number} {p.first_name}{' '}
                              {p.last_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="label mb-2 block">
                          Kampminut
                        </label>

                        <input
                          className="input w-full"
                          name="minute"
                          type="number"
                          min="1"
                          max="120"
                          defaultValue={state.minute ?? 1}
                          required
                        />
                      </div>

                      <button className="btn self-end">
                        REGISTRER HÆNDELSE
                      </button>
                    </form>
                  </section>

                  {/* EXISTING EVENTS */}
                  <section className="border-t border-white/[0.07] pt-6">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                          Timeline
                        </div>

                        <h4 className="mt-1 text-xl font-black">
                          Registrerede hændelser
                        </h4>
                      </div>

                      <div className="fcg-badge">
                        {matchEvents.length} EVENTS
                      </div>
                    </div>

                    <div className="space-y-3">
                      {matchEvents.map((e: any) => {
                        let eventName = e.event_type

                        if (e.event_type === 'goal') {
                          eventName = '⚽ Mål'
                        }

                        if (e.event_type === 'yellow_card') {
                          eventName = '🟨 Gult kort'
                        }

                        if (e.event_type === 'red_card') {
                          eventName = '🟥 Rødt kort'
                        }

                        return (
                          <div
                            key={e.id}
                            className="rounded-[18px] border border-white/[0.08] bg-white/[0.025] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="font-black">
                                  {eventName}
                                </div>

                                <div className="mt-1 text-sm text-neutral-500">
                                  {e.player
                                    ? `${e.player.first_name} ${e.player.last_name}`
                                    : e.team === 'home'
                                      ? m.home_team
                                      : m.away_team}

                                  {e.assist
                                    ? ` • Assist: ${e.assist.first_name} ${e.assist.last_name}`
                                    : ''}
                                </div>
                              </div>

                              <div className="rounded-full border border-red-500/15 bg-red-950/20 px-3 py-1 text-sm font-black text-red-400">
                                {e.minute}'
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <form
                                action={updateMatchEvent}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={e.id}
                                />

                                <input
                                  type="hidden"
                                  name="match_id"
                                  value={m.id}
                                />

                                <label className="text-xs font-bold text-neutral-500">
                                  Minut
                                </label>

                                <input
                                  className="input w-24"
                                  name="minute"
                                  type="number"
                                  min="1"
                                  max="120"
                                  defaultValue={e.minute}
                                  required
                                />

                                <button className="btn">
                                  GEM MINUT
                                </button>
                              </form>

                              <form action={deleteMatchEvent}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={e.id}
                                />

                                <input
                                  type="hidden"
                                  name="match_id"
                                  value={m.id}
                                />

                                <button
                                  type="submit"
                                  className="rounded-xl border border-red-500/35 px-4 py-3 font-black text-red-400 transition hover:bg-red-500/10"
                                >
                                  SLET
                                </button>
                              </form>
                            </div>
                          </div>
                        )
                      })}

                      {!matchEvents.length && (
                        <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-center text-sm text-neutral-600">
                          Ingen hændelser registreret.
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </article>
            )
          })}

          {!matches?.length && (
            <div className="card p-8 text-center text-neutral-500">
              Ingen kampe oprettet endnu.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
