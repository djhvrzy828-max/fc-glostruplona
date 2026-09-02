import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const s = await createServerSupabase()

  const { data: player } = await s
    .from('players')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!player) {
    notFound()
  }

  const {
    data: appearances,
    error: appearancesError,
  } = await s
    .from('match_appearances')
    .select(`
      match_id,
      matches(
        id,
        home_team,
        away_team,
        date,
        competition,
        home_score,
        away_score
      )
    `)
    .eq('player_id', id)

  if (appearancesError) {
    console.error(
      'PLAYER APPEARANCES ERROR:',
      appearancesError
    )
  }

  const { data: events, error: eventsError } = await s
    .from('match_events')
    .select(`
      *,
      matches(
        id,
        home_team,
        away_team,
        date,
        competition,
        home_score,
        away_score
      )
    `)
    .or(`player_id.eq.${id},assist_player_id.eq.${id}`)
    .order('minute', { ascending: false })

  if (eventsError) {
    console.error(
      'PLAYER EVENTS ERROR:',
      eventsError
    )
  }

  const allEvents = events || []
  const allAppearances = appearances || []

  const matchesPlayed = allAppearances.length

  const goals = allEvents.filter(
    (event: any) =>
      event.event_type === 'goal' &&
      event.player_id === id
  )

  const assists = allEvents.filter(
    (event: any) =>
      event.event_type === 'goal' &&
      event.assist_player_id === id
  )

  const yellowCards = allEvents.filter(
    (event: any) =>
      event.event_type === 'yellow_card' &&
      event.player_id === id
  )

  const redCards = allEvents.filter(
    (event: any) =>
      event.event_type === 'red_card' &&
      event.player_id === id
  )

  const goalsPerMatch =
    matchesPlayed > 0
      ? goals.length / matchesPlayed
      : 0

  const assistsPerMatch =
    matchesPlayed > 0
      ? assists.length / matchesPlayed
      : 0

  const playerEvents = allEvents
    .filter(
      (event: any) =>
        event.player_id === id ||
        event.assist_player_id === id
    )
    .sort((a: any, b: any) => {
      const dateA =
        a.matches?.date || ''

      const dateB =
        b.matches?.date || ''

      if (dateA !== dateB) {
        return dateB.localeCompare(dateA)
      }

      return (b.minute || 0) - (a.minute || 0)
    })

  const matchHistory = [...allAppearances].sort(
    (a: any, b: any) => {
      const dateA =
        a.matches?.date || ''

      const dateB =
        b.matches?.date || ''

      return dateB.localeCompare(dateA)
    }
  )

  return (
    <div>
      <Link
        href="/trup"
        className="mb-6 inline-block text-sm font-bold text-neutral-400 hover:text-white"
      >
        ← Tilbage til truppen
      </Link>

      {/* SPILLERHEADER */}
      <div className="card p-8">
        <div className="text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
          FC Glostruplona
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-5">
          <div className="text-7xl font-black text-red-400">
            #{player.shirt_number}
          </div>

          <div>
            <h1 className="text-4xl font-black">
              {player.first_name}{' '}
              {player.last_name}
            </h1>

            <div className="mt-2 text-neutral-400">
              {player.position ||
                'Position ikke registreret'}
            </div>
          </div>
        </div>
      </div>

      {/* HOVEDSTATISTIK */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Kampe
          </div>

          <div className="mt-2 text-4xl font-black">
            {matchesPlayed}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Mål
          </div>

          <div className="mt-2 text-4xl font-black">
            {goals.length}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Assists
          </div>

          <div className="mt-2 text-4xl font-black">
            {assists.length}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Målbidrag
          </div>

          <div className="mt-2 text-4xl font-black">
            {goals.length + assists.length}
          </div>
        </div>
      </div>

      {/* PR. KAMP + KORT */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Mål pr. kamp
          </div>

          <div className="mt-2 text-3xl font-black">
            {goalsPerMatch.toFixed(2)}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Assists pr. kamp
          </div>

          <div className="mt-2 text-3xl font-black">
            {assistsPerMatch.toFixed(2)}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Gule kort
          </div>

          <div className="mt-2 text-3xl font-black">
            {yellowCards.length}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-neutral-400">
            Røde kort
          </div>

          <div className="mt-2 text-3xl font-black">
            {redCards.length}
          </div>
        </div>
      </div>

      {/* KAMPHISTORIK */}
      <div className="mt-8">
        <h2 className="mb-4 text-2xl font-black">
          Kamphistorik
        </h2>

        <div className="card divide-y divide-white/10">
          {matchHistory.map(
            (appearance: any) => {
              const match =
                appearance.matches

              if (!match) {
                return null
              }

              return (
                <div
                  key={appearance.match_id}
                  className="p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-black">
                        {match.home_team}{' '}
                        vs{' '}
                        {match.away_team}
                      </div>

                      <div className="mt-1 text-sm text-neutral-400">
                        {match.date ||
                          'Ingen dato'}

                        {match.competition
                          ? ` • ${match.competition}`
                          : ''}
                      </div>
                    </div>

                    <div className="text-right">
                      {match.home_score !==
                        null &&
                      match.away_score !==
                        null ? (
                        <div className="text-2xl font-black">
                          {
                            match.home_score
                          }{' '}
                          :{' '}
                          {
                            match.away_score
                          }
                        </div>
                      ) : (
                        <div className="text-sm text-neutral-500">
                          Intet resultat
                        </div>
                      )}

                      <Link
                        href={`/kampe/${match.id}`}
                        className="mt-1 inline-block text-sm font-bold text-red-400 hover:text-red-300"
                      >
                        Se kampen →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            }
          )}

          {!matchHistory.length && (
            <div className="p-8 text-center text-neutral-400">
              Spilleren har endnu ikke
              registreret nogen kampe.
            </div>
          )}
        </div>
      </div>

      {/* KAMPBEGIVENHEDER */}
      <div className="mt-8">
        <h2 className="mb-4 text-2xl font-black">
          Kampbegivenheder
        </h2>

        <div className="card divide-y divide-white/10">
          {playerEvents.map((event: any) => {
            let eventName =
              event.event_type

            if (
              event.event_type ===
                'goal' &&
              event.player_id === id
            ) {
              eventName = '⚽ Mål'
            } else if (
              event.event_type ===
                'goal' &&
              event.assist_player_id === id
            ) {
              eventName = '🎯 Assist'
            } else if (
              event.event_type ===
              'yellow_card'
            ) {
              eventName =
                '🟨 Gult kort'
            } else if (
              event.event_type ===
              'red_card'
            ) {
              eventName =
                '🟥 Rødt kort'
            }

            return (
              <div
                key={`${event.id}-${eventName}`}
                className="p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-black">
                      {eventName}
                    </div>

                    {event.matches && (
                      <div className="mt-1 text-sm text-neutral-400">
                        {
                          event.matches
                            .home_team
                        }{' '}
                        vs{' '}
                        {
                          event.matches
                            .away_team
                        }
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-black text-red-400">
                      {event.minute}'
                    </div>

                    {event.matches
                      ?.date && (
                      <div className="text-xs text-neutral-500">
                        {
                          event.matches
                            .date
                        }
                      </div>
                    )}
                  </div>
                </div>

                {event.matches?.id && (
                  <Link
                    href={`/kampe/${event.matches.id}`}
                    className="mt-3 inline-block text-sm font-bold text-neutral-400 hover:text-white"
                  >
                    Se kampen →
                  </Link>
                )}
              </div>
            )
          })}

          {!playerEvents.length && (
            <div className="p-8 text-center text-neutral-400">
              Ingen
              kampbegivenheder
              registreret for denne
              spiller endnu.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}