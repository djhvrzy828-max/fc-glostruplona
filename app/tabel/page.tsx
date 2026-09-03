export const dynamic = 'force-dynamic'

const DBU_URL =
  'https://www.dbu.dk/resultater/hold/507066_502671/stilling'

const TEAM_NAMES: Record<string, string> = {
  '765570_502671': 'Albertslund IF (2)',
  '675906_502671': 'Hundige BK (1)',
  '418991_502671': 'Albertslund IF (1)',
  '507066_502671': 'FC Glostruplona',
  '515718_502671': 'Taastrup Idrætsforening (1)',
  '810350_502671': 'FC Ishøj',
}

type Standing = {
  position: number
  teamId: string
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

async function getStandings(): Promise<Standing[]> {
  try {
    const response = await fetch(DBU_URL, {
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; FC-Glostruplona/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      console.error(
        'DBU TABLE FETCH ERROR:',
        response.status
      )

      return []
    }

    const html = await response.text()

    const rowRegex =
      /<tr[^>]*data-teamid="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g

    const rows = [...html.matchAll(rowRegex)]

    const standings: Standing[] = []

    for (const match of rows) {
      const teamId = match[1]
      const row = match[2]

      // Vi viser kun holdene fra vores pulje
      if (!TEAM_NAMES[teamId]) {
        continue
      }

      const positionMatch =
        row.match(/<td>\s*(\d+)\s*<\/td>/)

      const position = positionMatch
        ? Number(positionMatch[1])
        : null

      const playedMatch =
        row.match(
          /<td class="centered\s*">\s*(\d+)\s*<\/td>/
        )

      const played = playedMatch
        ? Number(playedMatch[1])
        : 0

      const hiddenNumbers = [
        ...row.matchAll(
          /<td class="centered hide-on-mobile">\s*(\d+)\s*<\/td>/g
        ),
      ].map((result) => Number(result[1]))

      const won = hiddenNumbers[0] ?? 0
      const drawn = hiddenNumbers[1] ?? 0
      const lost = hiddenNumbers[2] ?? 0

      const goalsForMatch =
        row.match(
          /<div class="home-score">\s*(\d+)\s*<\/div>/
        )

      const goalsAgainstMatch =
        row.match(
          /<div class="away-score">\s*(\d+)\s*<\/div>/
        )

      const goalsFor = goalsForMatch
        ? Number(goalsForMatch[1])
        : 0

      const goalsAgainst = goalsAgainstMatch
        ? Number(goalsAgainstMatch[1])
        : 0

      const goalDifference =
        goalsFor - goalsAgainst

      const pointMatches = [
        ...row.matchAll(
          /<td class="centered">\s*(\d+)\s*<\/td>/g
        ),
      ]

      const points =
        pointMatches.length > 0
          ? Number(
              pointMatches[
                pointMatches.length - 1
              ][1]
            )
          : 0

      if (position === null) {
        continue
      }

      standings.push({
        position,
        teamId,
        team: TEAM_NAMES[teamId],
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points,
      })
    }

    return standings.sort(
      (a, b) => a.position - b.position
    )
  } catch (error) {
    console.error(
      'DBU TABLE ERROR:',
      error
    )

    return []
  }
}

export default async function Page() {
  const rows = await getStandings()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl font-black">
          Tabel
        </h1>

        <p className="mt-2 text-sm text-neutral-400">
          Herresenior Mester 8:8 · Efterår · Pulje 2
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-white/5 text-neutral-400">
            <tr>
              <th className="p-4 text-left">
                #
              </th>

              <th className="p-4 text-left">
                Hold
              </th>

              <th className="p-4 text-center">
                K
              </th>

              <th className="p-4 text-center">
                V
              </th>

              <th className="p-4 text-center">
                U
              </th>

              <th className="p-4 text-center">
                T
              </th>

              <th className="p-4 text-center">
                MF
              </th>

              <th className="p-4 text-center">
                MI
              </th>

              <th className="p-4 text-center">
                +/-
              </th>

              <th className="p-4 text-center">
                P
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isFCG =
                row.teamId ===
                '507066_502671'

              return (
                <tr
                  key={row.teamId}
                  className={
                    isFCG
                      ? 'border-t border-white/10 bg-red-950/40 font-bold'
                      : 'border-t border-white/5'
                  }
                >
                  <td className="p-4">
                    {row.position}
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    {row.team}
                  </td>

                  <td className="p-4 text-center">
                    {row.played}
                  </td>

                  <td className="p-4 text-center">
                    {row.won}
                  </td>

                  <td className="p-4 text-center">
                    {row.drawn}
                  </td>

                  <td className="p-4 text-center">
                    {row.lost}
                  </td>

                  <td className="p-4 text-center">
                    {row.goalsFor}
                  </td>

                  <td className="p-4 text-center">
                    {row.goalsAgainst}
                  </td>

                  <td className="p-4 text-center">
                    {row.goalDifference > 0
                      ? `+${row.goalDifference}`
                      : row.goalDifference}
                  </td>

                  <td className="p-4 text-center font-black">
                    {row.points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="p-6 text-neutral-400">
            Kunne ikke hente tabellen fra DBU lige nu.
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        Stillingen hentes automatisk fra DBU.
      </p>
    </div>
  )
}