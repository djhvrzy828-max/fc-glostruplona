import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DBU_URL =
  'https://www.dbu.dk/resultater/hold/507066_502671/stilling'

// Vi bruger DBU's stabile hold-ID'er til de korrekte navne.
// Så undgår vi problemer med æ, ø og å fra DBU's HTML.
const TEAM_NAMES: Record<string, string> = {
  '765570_502671': 'Albertslund IF (2)',
  '675906_502671': 'Hundige BK (1)',
  '418991_502671': 'Albertslund IF (1)',
  '507066_502671': 'FC Glostruplona',
  '515718_502671': 'Taastrup Idrætsforening (1)',
  '810350_502671': 'FC Ishøj',
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function GET() {
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
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: 'Kunne ikke hente DBU-stillingen',
        },
        { status: 502 }
      )
    }

    const html = await response.text()

    // Finder alle holdrækker i DBU-tabellen
    const rowRegex =
      /<tr[^>]*data-teamid="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g

    const rows = [...html.matchAll(rowRegex)]

    const standings = rows
      .map((match) => {
        const teamId = match[1]
        const row = match[2]

        // Placering
        const positionMatch =
          row.match(/<td>\s*(\d+)\s*<\/td>/)

        const position = positionMatch
          ? Number(positionMatch[1])
          : null

        // Holdnavn fra DBU
        const teamNameMatch =
          row.match(
            /<div class="teamname-logo">[\s\S]*?<span>(.*?)<\/span>/
          )

        const dbuTeamName = teamNameMatch?.[1]
          ? cleanText(teamNameMatch[1])
          : 'Ukendt hold'

        // Brug vores faste navn, hvis vi kender DBU-ID'et
        const team =
          TEAM_NAMES[teamId] ?? dbuTeamName

        // K = kampe
        const playedMatch =
          row.match(
            /<td class="centered\s*">\s*(\d+)\s*<\/td>/
          )

        const played = playedMatch
          ? Number(playedMatch[1])
          : 0

        // V, U og T
        const hiddenNumbers = [
          ...row.matchAll(
            /<td class="centered hide-on-mobile">\s*(\d+)\s*<\/td>/g
          ),
        ].map((result) => Number(result[1]))

        const won = hiddenNumbers[0] ?? 0
        const drawn = hiddenNumbers[1] ?? 0
        const lost = hiddenNumbers[2] ?? 0

        // Score
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

        // Point
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

        return {
          position,
          teamId,
          team,
          played,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          goalDifference,
          points,
        }
      })
      .filter(
        (team) =>
          team.position !== null &&
          TEAM_NAMES[team.teamId]
      )
      .sort(
        (a, b) =>
          (a.position ?? 999) -
          (b.position ?? 999)
      )

    return NextResponse.json({
      success: true,
      source: 'DBU',
      poolId: '502671',
      teamCount: standings.length,
      standings,
    })
  } catch (error) {
    console.error(
      'DBU OFFICIAL STANDING ERROR:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Ukendt fejl',
      },
      { status: 500 }
    )
  }
}