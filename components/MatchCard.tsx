import Link from 'next/link'
import { Match } from '@/lib/types'
import { getMatchState } from '@/lib/match-time'

export default function MatchCard({ m }: { m: Match }) {
  const state = getMatchState(m.date, m.kickoff_time)

  const score =
    m.home_score !== null && m.away_score !== null
      ? `${m.home_score} – ${m.away_score}`
      : 'vs'

  let statusText = m.status

  if (state.phase === '1. halvleg' || state.phase === '2. halvleg') {
    statusText = `LIVE • ${state.minute}'`
  } else if (state.phase === 'Pause') {
    statusText = 'PAUSE'
  } else if (state.phase === 'Slut') {
    statusText = 'SLUT'
  } else {
    statusText = 'KOMMENDE'
  }

  return (
    <Link
      href={`/kampe/${m.id}`}
      className="card block p-5 hover:border-red-500/40"
    >
      <div className="mb-3 flex justify-between text-xs uppercase tracking-widest text-neutral-400">
        <span>{m.competition || '9. divisionen'}</span>

        <span className={state.isLive ? 'font-black text-red-400' : ''}>
          {statusText}
        </span>
      </div>

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

      <div className="mt-4 text-center text-sm text-neutral-400">
        {m.date || 'Dato ikke fastsat'}

        {m.kickoff_time
          ? ` • ${m.kickoff_time.slice(0, 5)}`
          : ''}

        {m.stadium
          ? ` • ${m.stadium}`
          : ''}
      </div>
    </Link>
  )
}