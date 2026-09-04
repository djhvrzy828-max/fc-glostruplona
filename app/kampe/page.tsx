import MatchCard from '@/components/MatchCard'
import { createServerSupabase } from '@/lib/supabase-server'
import { Match } from '@/lib/types'
import { getMatchState } from '@/lib/match-time'

export const dynamic = 'force-dynamic'

export default async function Page() {
  let matches: Match[] = []

  try {
    const s = await createServerSupabase()

    const { data } = await s
      .from('matches')
      .select('*')
      .order('date', {
        ascending: true,
        nullsFirst: false,
      })

    matches = (data || []) as Match[]
  } catch (error) {
    console.error(
      'MATCHES PAGE ERROR:',
      error
    )
  }

  const upcomingMatches = matches.filter(
    (match: Match) => {
      const state = getMatchState(
        match.date,
        match.kickoff_time,
        match.status
      )

      return (
        state.phase !== 'Slut' &&
        match.status !== 'Aflyst'
      )
    }
  )

  const finishedMatches = matches
    .filter((match: Match) => {
      const state = getMatchState(
        match.date,
        match.kickoff_time,
        match.status
      )

      return (
        state.phase === 'Slut' ||
        match.status === 'Aflyst'
      )
    })
    .reverse()

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <section>
        <div className="text-[10px] font-black uppercase tracking-[.25em] text-red-400 sm:text-xs">
          Kampcenter
        </div>

        <h1 className="mt-1 text-3xl font-black sm:text-4xl">
          Kampe
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
          Følg kommende kampe, live-resultater
          og tidligere resultater fra FC
          Glostruplona.
        </p>
      </section>

      {/* KOMMENDE / LIVE */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
              Næste
            </div>

            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Kommende kampe
            </h2>
          </div>

          {upcomingMatches.length > 0 && (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-neutral-400">
              {upcomingMatches.length}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {upcomingMatches.length ? (
            upcomingMatches.map(
              (match) => (
                <MatchCard
                  key={match.id}
                  m={match}
                />
              )
            )
          ) : (
            <div className="card p-7 text-center">
              <div className="text-3xl">
                📅
              </div>

              <div className="mt-3 text-lg font-black">
                Ingen kommende kampe
              </div>

              <div className="mt-2 text-sm text-neutral-400">
                Der er ingen nye kampe
                registreret lige nu.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TIDLIGERE KAMPE */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-neutral-500 sm:text-xs">
              Resultater
            </div>

            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Tidligere kampe
            </h2>
          </div>

          {finishedMatches.length > 0 && (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-neutral-500">
              {finishedMatches.length}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {finishedMatches.length ? (
            finishedMatches.map(
              (match) => (
                <MatchCard
                  key={match.id}
                  m={match}
                />
              )
            )
          ) : (
            <div className="card p-7 text-center">
              <div className="text-3xl">
                ⚽
              </div>

              <div className="mt-3 text-lg font-black">
                Ingen tidligere kampe
              </div>

              <div className="mt-2 text-sm text-neutral-400">
                Resultater kommer til at
                blive vist her.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}