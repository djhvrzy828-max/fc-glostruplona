import Link from 'next/link'
import { Match } from '@/lib/types'
export default function MatchCard({m}: {m:Match}){
 const score=m.home_score!==null&&m.away_score!==null?`${m.home_score} – ${m.away_score}`:'vs'
 return <Link href={`/kampe/${m.id}`} className="card block p-5 hover:border-red-500/40"><div className="mb-3 flex justify-between text-xs uppercase tracking-widest text-neutral-400"><span>{m.competition||'9. divisionen'}</span><span>{m.status}</span></div><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center"><b className="text-right">{m.home_team}</b><div className="rounded-xl bg-white/5 px-4 py-2 text-xl font-black">{score}</div><b className="text-left">{m.away_team}</b></div><div className="mt-4 text-center text-sm text-neutral-400">{m.date||'Dato ikke fastsat'} {m.kickoff_time?`• ${m.kickoff_time.slice(0,5)}`:''}{m.stadium?` • ${m.stadium}`:''}</div></Link>
}
