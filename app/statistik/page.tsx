import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const s = await createServerSupabase()

  const { data: players } = await s
    .from('players')
    .select('*')
    .eq('active', true)
    .order('shirt_number')

  const { data: events, error: eventsError } = await s
    .from('match_events')
    .select(`
      id,
      match_id,
      event_type,
      player_id,
      assist_player_id
    `)

  if (eventsError) {
    console.error(
      'STATISTICS EVENTS ERROR:',
      eventsError
    )
  }

  const {
    data: appearances,
    error: appearancesError,
  } = await s
    .from('match_appearances')
    .select(`
      match_id,
      player_id
    `)

  if (appearancesError) {
    console.error(
      'STATISTICS APPEARANCES ERROR:',
      appearancesError
    )
  }

  const stats =
    players?.map((player: any) => {
      const matchesPlayed =
        appearances?.filter(
          (appearance: any) =>
            appearance.player_id === player.id
        ).length || 0

      const goals =
        events?.filter(
          (event: any) =>
            event.event_type === 'goal' &&
            event.player_id === player.id
        ).length || 0

      const assists =
        events?.filter(
          (event: any) =>
            event.event_type === 'goal' &&
            event.assist_player_id === player.id
        ).length || 0

      const yellowCards =
        events?.filter(
          (event: any) =>
            event.event_type === 'yellow_card' &&
            event.player_id === player.id
        ).length || 0

      const redCards =
        events?.filter(
          (event: any) =>
            event.event_type === 'red_card' &&
            event.player_id === player.id
        ).length || 0

      const goalsPerMatch =
        matchesPlayed > 0
          ? goals / matchesPlayed
          : 0

      const assistsPerMatch =
        matchesPlayed > 0
          ? assists / matchesPlayed
          : 0

      return {
        ...player,
        matchesPlayed,
        goals,
        assists,
        goalsPerMatch,
        assistsPerMatch,
        yellowCards,
        redCards,
      }
    }) || []

  stats.sort((a: any, b: any) => {
    if (b.goals !== a.goals) {
      return b.goals - a.goals
    }

    if (b.assists !== a.assists) {
      return b.assists - a.assists
    }

    return a.shirt_number - b.shirt_number
  })

  const topScorer = [...stats].sort(
    (a: any, b: any) => {
      if (b.goals !== a.goals) {
        return b.goals - a.goals
      }

      return b.assists - a.assists
    }
  )[0]

  const topAssist = [...stats].sort(
    (a: any, b: any) => {
      if (b.assists !== a.assists) {
        return b.assists - a.assists
      }

      return b.goals - a.goals
    }
  )[0]

  const mostAppearances = [...stats].sort(
    (a: any, b: any) =>
      b.matchesPlayed - a.matchesPlayed
  )[0]

  const totalGoals = stats.reduce(
    (sum: number, player: any) =>
      sum + player.goals,
    0
  )

  return (
    <div>
      <h1 className="mb-6 text-4xl font-black">
        Statistik
      </h1>

      {/* TOPKORT */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Flest mål
          </div>

          <div className="mt-2 text-xl font-black">
            {topScorer?.goals
              ? `${topScorer.first_name} ${topScorer.last_name}`
              : '-'}
          </div>

          <div className="mt-1 text-red-400">
            {topScorer?.goals || 0} mål
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Flest assists
          </div>

          <div className="mt-2 text-xl font-black">
            {topAssist?.assists
              ? `${topAssist.first_name} ${topAssist.last_name}`
              : '-'}
          </div>

          <div className="mt-1 text-red-400">
            {topAssist?.assists || 0} assists
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Flest kampe
          </div>

          <div className="mt-2 text-xl font-black">
            {mostAppearances?.matchesPlayed
              ? `${mostAppearances.first_name} ${mostAppearances.last_name}`
              : '-'}
          </div>

          <div className="mt-1 text-red-400">
            {mostAppearances?.matchesPlayed || 0}{' '}
            kampe
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Registrerede mål
          </div>

          <div className="mt-2 text-3xl font-black">
            {totalGoals}
          </div>
        </div>
      </div>

      {/* STATISTIKTABEL */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-white/10 bg-white/5 text-sm text-neutral-400">
              <tr>
                <th className="p-4">
                  #
                </th>

                <th className="p-4">
                  Spiller
                </th>

                <th className="p-4 text-center">
                  Kampe
                </th>

                <th className="p-4 text-center">
                  Mål
                </th>

                <th className="p-4 text-center">
                  Assists
                </th>

                <th className="p-4 text-center">
                  Mål/kamp
                </th>

                <th className="p-4 text-center">
                  Assists/kamp
                </th>

                <th className="p-4 text-center">
                  Gule
                </th>

                <th className="p-4 text-center">
                  Røde
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {stats.map((player: any) => (
                <tr
                  key={player.id}
                  className="hover:bg-white/5"
                >
                  <td className="p-4 font-black text-red-400">
                    #{player.shirt_number}
                  </td>

                  <td className="p-4">
                    <Link
                      href={`/trup/${player.id}`}
                      className="group block"
                    >
                      <div className="font-bold transition group-hover:text-red-400">
                        {player.first_name}{' '}
                        {player.last_name}
                      </div>

                      <div className="text-xs text-neutral-500">
                        {player.position ||
                          'Ingen position'}
                      </div>

                      <div className="mt-1 text-xs font-bold text-red-400 opacity-0 transition group-hover:opacity-100">
                        SE PROFIL →
                      </div>
                    </Link>
                  </td>

                  <td className="p-4 text-center font-black">
                    {player.matchesPlayed}
                  </td>

                  <td className="p-4 text-center font-black">
                    {player.goals}
                  </td>

                  <td className="p-4 text-center font-black">
                    {player.assists}
                  </td>

                  <td className="p-4 text-center">
                    {player.goalsPerMatch.toFixed(2)}
                  </td>

                  <td className="p-4 text-center">
                    {player.assistsPerMatch.toFixed(2)}
                  </td>

                  <td className="p-4 text-center">
                    {player.yellowCards}
                  </td>

                  <td className="p-4 text-center">
                    {player.redCards}
                  </td>
                </tr>
              ))}

              {!stats.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-neutral-400"
                  >
                    Ingen spillere registreret endnu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}