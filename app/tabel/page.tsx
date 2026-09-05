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

async function getStandings(): Promise<
  Standing[]
> {
  try {
    const response = await fetch(
      DBU_URL,
      {
        cache: 'no-store',

        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; FC-Glostruplona/1.0)',

          Accept:
            'text/html,application/xhtml+xml',
        },
      }
    )

    if (!response.ok) {
      console.error(
        'DBU TABLE FETCH ERROR:',
        response.status
      )

      return []
    }

    const html =
      await response.text()

    const rowRegex =
      /<tr[^>]*data-teamid="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g

    const rows = [
      ...html.matchAll(
        rowRegex
      ),
    ]

    const standings:
      Standing[] = []

    for (
      const match of rows
    ) {
      const teamId =
        match[1]

      const row =
        match[2]

      /*
       * Kun holdene
       * fra vores pulje.
       */
      if (
        !TEAM_NAMES[
          teamId
        ]
      ) {
        continue
      }

      const positionMatch =
        row.match(
          /<td>\s*(\d+)\s*<\/td>/
        )

      const position =
        positionMatch
          ? Number(
              positionMatch[
                1
              ]
            )
          : null

      const playedMatch =
        row.match(
          /<td class="centered\s*">\s*(\d+)\s*<\/td>/
        )

      const played =
        playedMatch
          ? Number(
              playedMatch[
                1
              ]
            )
          : 0

      const hiddenNumbers =
        [
          ...row.matchAll(
            /<td class="centered hide-on-mobile">\s*(\d+)\s*<\/td>/g
          ),
        ].map(
          (
            result
          ) =>
            Number(
              result[1]
            )
        )

      const won =
        hiddenNumbers[
          0
        ] ?? 0

      const drawn =
        hiddenNumbers[
          1
        ] ?? 0

      const lost =
        hiddenNumbers[
          2
        ] ?? 0

      const goalsForMatch =
        row.match(
          /<div class="home-score">\s*(\d+)\s*<\/div>/
        )

      const goalsAgainstMatch =
        row.match(
          /<div class="away-score">\s*(\d+)\s*<\/div>/
        )

      const goalsFor =
        goalsForMatch
          ? Number(
              goalsForMatch[
                1
              ]
            )
          : 0

      const goalsAgainst =
        goalsAgainstMatch
          ? Number(
              goalsAgainstMatch[
                1
              ]
            )
          : 0

      const goalDifference =
        goalsFor -
        goalsAgainst

      const pointMatches =
        [
          ...row.matchAll(
            /<td class="centered">\s*(\d+)\s*<\/td>/g
          ),
        ]

      const points =
        pointMatches.length >
        0
          ? Number(
              pointMatches[
                pointMatches
                  .length -
                  1
              ][1]
            )
          : 0

      if (
        position ===
        null
      ) {
        continue
      }

      standings.push({
        position,
        teamId,
        team:
          TEAM_NAMES[
            teamId
          ],

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
      (
        a,
        b
      ) =>
        a.position -
        b.position
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
  const rows =
    await getStandings()

  const fcgRow =
    rows.find(
      (
        row
      ) =>
        row.teamId ===
        '507066_502671'
    )

  return (
    <div className="fcg-page fcg-fade-in space-y-10 md:space-y-14">

      {/* ==================================================
          HERO
         ================================================== */}

      <section
        className="
          relative
          -mx-4
          -mt-5
          min-h-[360px]
          overflow-hidden
          border-b
          border-white/10
          bg-black
          sm:mx-0
          sm:mt-0
          sm:min-h-[410px]
          sm:rounded-[30px]
          sm:border
        "
      >
        <div
          className="
            absolute
            inset-0
            bg-[url('/media/match-action-2.jpg')]
            bg-cover
            bg-center
            opacity-50
            saturate-[.72]
            contrast-[1.12]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-black/30
            via-black/65
            to-[#070707]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-r
            from-red-950/35
            via-transparent
            to-black/20
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-24
            top-0
            h-72
            w-72
            rounded-full
            bg-red-700/20
            blur-[100px]
          "
        />

        <div
          className="
            relative
            z-10
            flex
            min-h-[360px]
            flex-col
            justify-end
            p-6
            sm:min-h-[410px]
            sm:p-9
          "
        >
          <div className="fcg-label">
            Mesterrækken
          </div>

          <h1
            className="
              mt-2
              text-5xl
              font-black
              uppercase
              leading-[.9]
              tracking-[-.05em]
              sm:text-7xl
            "
          >
            TABEL
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-300 sm:text-base">
            Herresenior Mester 8:8 ·
            Efterår · Pulje 2
          </p>

          {fcgRow && (
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="fcg-badge fcg-badge-red">
                #{fcgRow.position}
                {' '}
                FC GLOSTRUPLONA
              </div>

              <div className="fcg-badge">
                {fcgRow.points}
                {' '}
                POINT
              </div>

              <div className="fcg-badge">
                {fcgRow.played}
                {' '}
                KAMPE
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          FCG SNAPSHOT
         ================================================== */}

      {fcgRow && (
        <section>
          <div className="mb-5">
            <div className="fcg-label">
              FC Glostruplona
            </div>

            <h2 className="fcg-heading mt-1">
              Sæsonstatus
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-4">

            <div className="card p-3 text-center sm:p-5">
              <div className="text-[8px] font-black uppercase tracking-[.15em] text-neutral-600 sm:text-[10px]">
                Placering
              </div>

              <div className="mt-2 text-3xl font-black text-red-400 sm:text-4xl">
                #{fcgRow.position}
              </div>
            </div>

            <div className="card p-3 text-center sm:p-5">
              <div className="text-[8px] font-black uppercase tracking-[.15em] text-neutral-600 sm:text-[10px]">
                Point
              </div>

              <div className="mt-2 text-3xl font-black sm:text-4xl">
                {fcgRow.points}
              </div>
            </div>

            <div className="card p-3 text-center sm:p-5">
              <div className="text-[8px] font-black uppercase tracking-[.15em] text-neutral-600 sm:text-[10px]">
                Sejre
              </div>

              <div className="mt-2 text-3xl font-black sm:text-4xl">
                {fcgRow.won}
              </div>
            </div>

            <div className="card p-3 text-center sm:p-5">
              <div className="text-[8px] font-black uppercase tracking-[.15em] text-neutral-600 sm:text-[10px]">
                Målscore
              </div>

              <div className="mt-2 text-xl font-black sm:text-3xl">
                {fcgRow.goalsFor}
                {' – '}
                {fcgRow.goalsAgainst}
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ==================================================
          TABLE
         ================================================== */}

      <section>
        <div className="mb-5">
          <div className="fcg-label">
            Live fra DBU
          </div>

          <h2 className="fcg-heading mt-1">
            Stillingen
          </h2>
        </div>

        {/* MOBILE */}
        <div className="space-y-3 md:hidden">
          {rows.map(
            (
              row
            ) => {
              const isFCG =
                row.teamId ===
                '507066_502671'

              return (
                <div
                  key={
                    row.teamId
                  }
                  className={
                    isFCG
                      ? `
                        relative
                        overflow-hidden
                        rounded-[22px]
                        border
                        border-red-500/30
                        bg-gradient-to-r
                        from-red-950/55
                        via-[#151010]
                        to-[#0d0d0d]
                        p-4
                        shadow-[0_20px_60px_rgba(100,0,0,.15)]
                      `
                      : `
                        rounded-[22px]
                        border
                        border-white/10
                        bg-[#0d0d0d]
                        p-4
                      `
                  }
                >
                  {isFCG && (
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-red-600/15 blur-[50px]" />
                  )}

                  <div className="relative z-10">

                    <div className="flex items-center gap-3">

                      <div
                        className={
                          isFCG
                            ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-700 text-lg font-black text-white'
                            : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg font-black text-neutral-500'
                        }
                      >
                        {row.position}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={
                            isFCG
                              ? 'truncate font-black uppercase text-white'
                              : 'truncate font-black uppercase text-neutral-300'
                          }
                        >
                          {row.team}
                        </div>

                        <div className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-neutral-600">
                          {row.played} kampe
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={
                            isFCG
                              ? 'text-3xl font-black text-red-400'
                              : 'text-3xl font-black'
                          }
                        >
                          {row.points}
                        </div>

                        <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600">
                          Point
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-5 gap-2">

                      <div className="rounded-xl bg-white/[0.035] p-2 text-center">
                        <div className="text-sm font-black">
                          {row.won}
                        </div>

                        <div className="mt-1 text-[8px] uppercase text-neutral-600">
                          V
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.035] p-2 text-center">
                        <div className="text-sm font-black">
                          {row.drawn}
                        </div>

                        <div className="mt-1 text-[8px] uppercase text-neutral-600">
                          U
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.035] p-2 text-center">
                        <div className="text-sm font-black">
                          {row.lost}
                        </div>

                        <div className="mt-1 text-[8px] uppercase text-neutral-600">
                          T
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.035] p-2 text-center">
                        <div className="text-sm font-black">
                          {row.goalsFor}
                          {'-'}
                          {row.goalsAgainst}
                        </div>

                        <div className="mt-1 text-[8px] uppercase text-neutral-600">
                          Mål
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.035] p-2 text-center">
                        <div
                          className={
                            row.goalDifference > 0
                              ? 'text-sm font-black text-red-400'
                              : 'text-sm font-black'
                          }
                        >
                          {row.goalDifference > 0
                            ? `+${row.goalDifference}`
                            : row.goalDifference}
                        </div>

                        <div className="mt-1 text-[8px] uppercase text-neutral-600">
                          +/-
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )
            }
          )}
        </div>

        {/* DESKTOP */}
        <div
          className="
            hidden
            overflow-hidden
            rounded-[24px]
            border
            border-white/10
            bg-[#0d0d0d]
            shadow-xl
            md:block
          "
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">

              <thead className="border-b border-white/10 bg-white/[0.035]">
                <tr className="text-[10px] font-black uppercase tracking-[.12em] text-neutral-600">
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

              <tbody className="divide-y divide-white/[0.06]">

                {rows.map(
                  (
                    row
                  ) => {
                    const isFCG =
                      row.teamId ===
                        '507066_502671'

                    return (
                      <tr
                        key={
                          row.teamId
                        }
                        className={
                          isFCG
                            ? 'bg-red-950/30 font-black'
                            : 'transition hover:bg-white/[0.03]'
                        }
                      >
                        <td
                          className={
                            isFCG
                              ? 'p-4 text-red-400'
                              : 'p-4 text-neutral-500'
                          }
                        >
                          {row.position}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <div
                            className={
                              isFCG
                                ? 'font-black uppercase text-white'
                                : 'font-bold text-neutral-300'
                            }
                          >
                            {row.team}
                          </div>
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

                        <td
                          className={
                            row.goalDifference > 0
                              ? 'p-4 text-center font-black text-red-400'
                              : 'p-4 text-center'
                          }
                        >
                          {row.goalDifference > 0
                            ? `+${row.goalDifference}`
                            : row.goalDifference}
                        </td>

                        <td
                          className={
                            isFCG
                              ? 'p-4 text-center text-xl font-black text-red-400'
                              : 'p-4 text-center text-lg font-black'
                          }
                        >
                          {row.points}
                        </td>
                      </tr>
                    )
                  }
                )}

              </tbody>
            </table>
          </div>
        </div>

        {rows.length ===
          0 && (
          <div className="card p-8 text-center">
            <div className="text-4xl">
              📊
            </div>

            <div className="mt-4 text-xl font-black">
              Tabellen kunne ikke hentes
            </div>

            <div className="mt-2 text-sm text-neutral-400">
              DBU-data er ikke tilgængelig lige nu.
            </div>
          </div>
        )}
      </section>

      {/* ==================================================
          DBU STATUS
         ================================================== */}

      <section
        className="
          rounded-[20px]
          border
          border-white/[0.07]
          bg-white/[0.025]
          p-4
        "
      >
        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
            <div className="h-2 w-2 rounded-full bg-green-400" />
          </div>

          <div>
            <div className="text-xs font-black uppercase tracking-[.12em] text-neutral-400">
              Automatisk DBU-data
            </div>

            <div className="mt-1 text-xs text-neutral-600">
              Stillingen hentes direkte fra DBU, når siden åbnes.
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}