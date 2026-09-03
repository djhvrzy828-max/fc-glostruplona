import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DBU_URL =
  'https://www.dbu.dk/resultater/pulje/502671/kampprogramFuld'

type Match = {
  matchId: string | null
  date: string | null
  time: string | null
  homeTeam: string | null
  awayTeam: string | null
  homeScore: number | null
  awayScore: number | null
}

type Standing = {
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

function cleanText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#xE6;/gi, 'æ')
    .replace(/&#xF8;/gi, 'ø')
    .replace(/&#xE5;/gi, 'å')
    .replace(/&#xC6;/gi, 'Æ')
    .replace(/&#xD8;/gi, 'Ø')
    .replace(/&#xC5;/gi, 'Å')
    .replace(/&#230;/g, 'æ')
    .replace(/&#248;/g, 'ø')
    .replace(/&#229;/g, 'å')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function displayTeamName(team: string) {
  // DBU-navnet skal vises som vores klubnavn i appen
  if (team === 'Glostrup (1)') {
    return 'FC Glostruplona'
  }

  return team
}

function calculateStandings(matches: Match[]) {
  const table = new Map<string, Standing>()

  function getTeam(teamName: string) {
    if (!table.has(teamName)) {
      table.set(teamName, {
        team: teamName,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      })
    }

    return table.get(teamName)!
  }

  // Vi bruger kun kampe, hvor DBU har et gyldigt resultat
  const finishedMatches = matches.filter(
    (match) =>
      match.homeTeam &&
      match.awayTeam &&
      match.homeScore !== null &&
      match.awayScore !== null
  )

  for (const match of finishedMatches) {
    const homeName = displayTeamName(match.homeTeam!)
    const awayName = displayTeamName(match.awayTeam!)

    const home = getTeam(homeName)
    const away = getTeam(awayName)

    const homeScore = match.homeScore!
    const awayScore = match.awayScore!

    // Spillede kampe
    home.played += 1
    away.played += 1

    // Mål
    home.goalsFor += homeScore
    home.goalsAgainst += awayScore

    away.goalsFor += awayScore
    away.goalsAgainst += homeScore

    // Resultat og point
    if (homeScore > awayScore) {
      home.won += 1
      home.points += 3

      away.lost += 1
    } else if (homeScore < awayScore) {
      away.won += 1
      away.points += 3

      home.lost += 1
    } else {
      home.drawn += 1
      away.drawn += 1

      home.points += 1
      away.points += 1
    }
  }

  // Beregn målforskel
  for (const team of table.values()) {
    team.goalDifference =
      team.goalsFor - team.goalsAgainst
  }

  // Sortering:
  // 1. Point
  // 2. Målforskel
  // 3. Flest scorede mål
  // 4. Alfabetisk som sidste fallback
  const standings = Array.from(table.values()).sort(
    (a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points
      }

      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference
      }

      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor
      }

      return a.team.localeCompare(b.team, 'da')
    }
  )

  return standings.map((team, index) => ({
    position: index + 1,
    ...team,
  }))
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
          error: 'Kunne ikke hente DBU',
        },
        { status: 502 }
      )
    }

    const html = await response.text()

    const rowRegex =
      /<tr class="(?:odd|even) has-hover"[\s\S]*?<\/tr>/g

    const rows = html.match(rowRegex) || []

    const matches: Match[] = rows
      .map((row) => {
        const matchId =
          row.match(
            /\/resultater\/kamp\/(\d+)_502671\/kampinfo/
          )?.[1] || null

        const dateRaw =
          row.match(
            /<div class="matchprogram-date">[\s\S]*?<\/span>(.*?)<\/div>/
          )?.[1] || null

        const date = dateRaw
          ? cleanText(dateRaw)
          : null

        const time =
          row.match(
            /<td class="hide-on-mobile">\s*(\d{1,2}:\d{2})\s*<\/td>/
          )?.[1] || null

        const teamMatches = [
          ...row.matchAll(
            /href="\/resultater\/hold\/[^"]+">([^<]+)<\/a>/g
          ),
        ]

        const homeTeam =
          teamMatches[0]?.[1]
            ? cleanText(teamMatches[0][1])
            : null

        const awayTeam =
          teamMatches[1]?.[1]
            ? cleanText(teamMatches[1][1])
            : null

        const homeScoreRaw =
          row.match(
            /<div class="home-score">\s*([^<]*)\s*<\/div>/
          )?.[1]?.trim() ?? null

        const awayScoreRaw =
          row.match(
            /<div class="away-score">\s*([^<]*)\s*<\/div>/
          )?.[1]?.trim() ?? null

        const homeScore =
          homeScoreRaw !== null &&
          homeScoreRaw !== '' &&
          /^\d+$/.test(homeScoreRaw)
            ? Number(homeScoreRaw)
            : null

        const awayScore =
          awayScoreRaw !== null &&
          awayScoreRaw !== '' &&
          /^\d+$/.test(awayScoreRaw)
            ? Number(awayScoreRaw)
            : null

        return {
          matchId,
          date,
          time,
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
        }
      })
      .filter(
        (match) =>
          match.matchId &&
          match.homeTeam &&
          match.awayTeam
      )

    const finishedMatches = matches.filter(
      (match) =>
        match.homeScore !== null &&
        match.awayScore !== null
    )

    const standings =
      calculateStandings(matches)

    return NextResponse.json({
      success: true,

      source: 'DBU',
      poolId: '502671',

      totalMatchesFound: matches.length,
      finishedMatches: finishedMatches.length,

      standings,

      matches,
    })
  } catch (error) {
    console.error(
      'DBU TABLE ERROR:',
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