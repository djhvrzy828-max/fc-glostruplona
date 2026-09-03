import Link from 'next/link'
import { Match } from '@/lib/types'
import { getMatchState } from '@/lib/match-time'
import { createServerSupabase } from '@/lib/supabase-server'

export default async function MatchCard({
  m,
}: {
  m: Match
}) {
  const state = getMatchState(
    m.date,
    m.kickoff_time
  )

  /*
   * HENT ALLE MÅL I KAMPEN
   */
  const s = await createServerSupabase()

  const {
    data: goals,
    error: goalsError,
  } = await s
    .from('match_events')
    .select('team')
    .eq('match_id', m.id)
    .eq('event_type', 'goal')

  if (goalsError) {
    console.error(
      'MATCH CARD GOALS ERROR:',
      goalsError
    )
  }

  /*
   * BEREGN SCORE FRA MÅL-EVENTS
   */
  const homeScore =
    goals?.filter(
      (goal: any) =>
        goal.team === 'home'
    ).length || 0

  const awayScore =
    goals?.filter(
      (goal: any) =>
        goal.team === 'away'
    ).length || 0

  /*
   * SCORE
   *
   * Kommende kamp uden mål:
   * vs
   *
   * Live eller færdig:
   * 0 – 0
   * 1 – 0
   * osv.
   */
  const hasStarted =
    state.phase !== 'Kommende'

  const score = hasStarted
    ? `${homeScore} – ${awayScore}`
    : 'vs'

  /*
   * STATUS
   */
  let statusText = 'KOMMENDE'

  if (
    state.phase === '1. halvleg' ||
    state.phase === '2. halvleg'
  ) {
    statusText =
      `LIVE • ${state.minute}'`
  } else if (
    state.phase === 'Pause'
  ) {
    statusText = 'PAUSE'
  } else if (
    state.phase === 'Slut'
  ) {
    statusText = 'SLUT'
  }

  /*
   * MANUELLE STATUSSER HAR PRIORITET
   */
  if (m.status === 'Udsat') {
    statusText = 'UDSAT'
  }

  if (m.status === 'Aflyst') {
    statusText = 'AFLYST'
  }

  const isLive =
    state.isLive &&
    m.status !== 'Udsat' &&
    m.status !== 'Aflyst'

  return (
    <Link
      href={`/kampe/${m.id}`}
      className="card block p-5 transition hover:border-red-500/40"
    >
      {/* TOP */}
      <div className="mb-3 flex justify-between gap-4 text-xs uppercase tracking-widest text-neutral-400">
        <span>
          {m.competition ||
            '9. divisionen'}
        </span>

        <span
          className={
            isLive
              ? 'font-black text-red-400'
              : ''
          }
        >
          {statusText}
        </span>
      </div>

      {/* HOLD + SCORE */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
        <b className="text-right">
          {m.home_team}
        </b>

        <div className="rounded-xl bg-white/5 px-4 py-2 text-xl font-black">
          {score}
        </div>

        <b className="text-left">
          {m.away_team}
        </b>
      </div>

      {/* KAMPINFO */}
      <div className="mt-4 text-center text-sm text-neutral-400">
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
    </Link>
  )
}