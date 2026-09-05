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
    m.kickoff_time,
    m.status
  )

  /*
   * HENT ALLE MÅL I KAMPEN
   *
   * Bruges kun til live-score.
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
   * LIVE-SCORE FRA MÅL-EVENTS
   */
  const liveHomeScore =
    goals?.filter(
      (goal: any) =>
        goal.team === 'home'
    ).length || 0

  const liveAwayScore =
    goals?.filter(
      (goal: any) =>
        goal.team === 'away'
    ).length || 0

  /*
   * OFFICIELT RESULTAT
   *
   * Bruges til afsluttede kampe.
   * Det er vigtigt for gamle DBU-kampe,
   * hvor målscorerne måske ikke er
   * efterregistreret endnu.
   */
  const officialHomeScore =
    m.home_score !== null &&
    m.home_score !== undefined
      ? Number(m.home_score)
      : null

  const officialAwayScore =
    m.away_score !== null &&
    m.away_score !== undefined
      ? Number(m.away_score)
      : null

  const isFinished =
    String(m.status)
      .trim()
      .toLowerCase() === 'slut' ||
    state.phase === 'Slut'

  const isPostponed =
    m.status === 'Udsat'

  const isCancelled =
    m.status === 'Aflyst'

  /*
   * SCORE
   *
   * Kommende:
   * vs
   *
   * Live:
   * score fra events
   *
   * Slut:
   * officiel score fra matches-tabellen
   */
  let score = 'vs'

  if (
    isFinished &&
    officialHomeScore !== null &&
    officialAwayScore !== null
  ) {
    score =
      `${officialHomeScore} – ${officialAwayScore}`
  } else if (
    state.phase !== 'Kommende' &&
    !isPostponed &&
    !isCancelled
  ) {
    score =
      `${liveHomeScore} – ${liveAwayScore}`
  }

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
    statusText =
      'PAUSE'
  } else if (
    state.phase === 'Overtid'
  ) {
    statusText =
      `OVERTID • ${state.minute}'`
  } else if (
    state.phase === 'Slut'
  ) {
    statusText =
      'SLUT'
  } else {
    statusText =
      'KOMMENDE'
  }

  /*
   * MANUELLE STATUSSER HAR PRIORITET
   */
  if (m.status === 'Udsat') {
    statusText =
      'UDSAT'
  }

  if (m.status === 'Aflyst') {
    statusText =
      'AFLYST'
  }

  if (isFinished) {
    statusText =
      'SLUT'
  }

  const isLive =
    state.isLive &&
    !isFinished &&
    !isPostponed &&
    !isCancelled

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