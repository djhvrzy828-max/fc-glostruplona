'use client'

import {
  useMemo,
  useRef,
  useState,
} from 'react'

type Player = {
  id: string
  first_name: string
  last_name: string
  shirt_number: number
  position?: string | null
}

type LineupPlayer = {
  player_id: string
  x_position: number
  y_position: number
  lineup_role?: string | null
}

export default function LineupEditor({
  players,
  initialLineup = [],
  initialFormation = '3-3-1',
}: {
  players: Player[]
  initialLineup?: LineupPlayer[]
  initialFormation?: string
}) {
  const pitchRef =
    useRef<HTMLDivElement | null>(null)

  const [formation, setFormation] =
    useState(initialFormation)

  const [lineup, setLineup] =
    useState<LineupPlayer[]>(
      initialLineup
    )

  const [draggingPlayerId, setDraggingPlayerId] =
    useState<string | null>(null)

  const selectedIds = useMemo(
    () =>
      new Set(
        lineup.map(
          (player) =>
            player.player_id
        )
      ),
    [lineup]
  )

  function addPlayer(
    playerId: string
  ) {
    if (selectedIds.has(playerId)) {
      return
    }

    if (lineup.length >= 8) {
      alert(
        'Der må kun være 8 spillere i startopstillingen.'
      )
      return
    }

    const defaultPositions = [
      {
        x: 50,
        y: 88,
        role: 'GK',
      },
      {
        x: 20,
        y: 68,
        role: 'DEF',
      },
      {
        x: 50,
        y: 68,
        role: 'DEF',
      },
      {
        x: 80,
        y: 68,
        role: 'DEF',
      },
      {
        x: 20,
        y: 42,
        role: 'MID',
      },
      {
        x: 50,
        y: 42,
        role: 'MID',
      },
      {
        x: 80,
        y: 42,
        role: 'MID',
      },
      {
        x: 50,
        y: 16,
        role: 'ST',
      },
    ]

    const position =
      defaultPositions[
        lineup.length
      ]

    setLineup([
      ...lineup,
      {
        player_id: playerId,
        x_position:
          position.x,
        y_position:
          position.y,
        lineup_role:
          position.role,
      },
    ])
  }

  function removePlayer(
    playerId: string
  ) {
    setLineup(
      lineup.filter(
        (player) =>
          player.player_id !==
          playerId
      )
    )
  }

  function movePlayer(
    playerId: string,
    x: number,
    y: number
  ) {
    setLineup(
      (current) =>
        current.map(
          (player) =>
            player.player_id ===
            playerId
              ? {
                  ...player,
                  x_position:
                    Math.max(
                      6,
                      Math.min(
                        94,
                        x
                      )
                    ),
                  y_position:
                    Math.max(
                      6,
                      Math.min(
                        94,
                        y
                      )
                    ),
                }
              : player
        )
    )
  }

  function getPositionFromPointer(
    clientX: number,
    clientY: number
  ) {
    const pitch =
      pitchRef.current

    if (!pitch) {
      return null
    }

    const rect =
      pitch.getBoundingClientRect()

    const x =
      ((clientX -
        rect.left) /
        rect.width) *
      100

    const y =
      ((clientY -
        rect.top) /
        rect.height) *
      100

    return {
      x,
      y,
    }
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    playerId: string
  ) {
    event.preventDefault()

    event.currentTarget.setPointerCapture(
      event.pointerId
    )

    setDraggingPlayerId(
      playerId
    )
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLButtonElement>,
    playerId: string
  ) {
    if (
      draggingPlayerId !==
      playerId
    ) {
      return
    }

    event.preventDefault()

    const position =
      getPositionFromPointer(
        event.clientX,
        event.clientY
      )

    if (!position) {
      return
    }

    movePlayer(
      playerId,
      position.x,
      position.y
    )
  }

  function handlePointerUp(
    event: React.PointerEvent<HTMLButtonElement>,
    playerId: string
  ) {
    if (
      draggingPlayerId !==
      playerId
    ) {
      return
    }

    const position =
      getPositionFromPointer(
        event.clientX,
        event.clientY
      )

    if (position) {
      movePlayer(
        playerId,
        position.x,
        position.y
      )
    }

    setDraggingPlayerId(
      null
    )

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      )
    }
  }

  function handlePointerCancel(
    event: React.PointerEvent<HTMLButtonElement>
  ) {
    setDraggingPlayerId(
      null
    )

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-bold text-neutral-400">
          Formation
        </label>

        <input
          name="formation"
          value={formation}
          onChange={(e) =>
            setFormation(
              e.target.value
            )
          }
          placeholder="Fx 3-3-1"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-red-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-black">
              Startopstilling
            </div>

            <div className="text-sm font-bold text-neutral-400">
              {lineup.length}/8
              spillere
            </div>
          </div>

          <div
            ref={pitchRef}
            className="relative aspect-[3/4] touch-none select-none overflow-hidden rounded-3xl border-2 border-white/20 bg-green-800"
          >
            {/* YDRE BANE */}
            <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/30" />

            {/* MIDTERLINJE */}
            <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-white/30" />

            {/* MIDTERCIRKEL */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />

            {/* MIDTERPLET */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />

            {/* ØVERSTE FELT */}
            <div className="pointer-events-none absolute left-[20%] right-[20%] top-3 h-[18%] border-x-2 border-b-2 border-white/30" />

            {/* NEDERSTE FELT */}
            <div className="pointer-events-none absolute bottom-3 left-[20%] right-[20%] h-[18%] border-x-2 border-t-2 border-white/30" />

            {/* ØVERSTE MÅL */}
            <div className="pointer-events-none absolute left-[38%] right-[38%] top-0 h-3 border-x-2 border-b-2 border-white/30" />

            {/* NEDERSTE MÅL */}
            <div className="pointer-events-none absolute bottom-0 left-[38%] right-[38%] h-3 border-x-2 border-t-2 border-white/30" />

            {lineup.map(
              (
                lineupPlayer
              ) => {
                const player =
                  players.find(
                    (p) =>
                      p.id ===
                      lineupPlayer.player_id
                  )

                if (!player) {
                  return null
                }

                const isDragging =
                  draggingPlayerId ===
                  player.id

                return (
                  <button
                    key={
                      player.id
                    }
                    type="button"
                    onPointerDown={(
                      event
                    ) =>
                      handlePointerDown(
                        event,
                        player.id
                      )
                    }
                    onPointerMove={(
                      event
                    ) =>
                      handlePointerMove(
                        event,
                        player.id
                      )
                    }
                    onPointerUp={(
                      event
                    ) =>
                      handlePointerUp(
                        event,
                        player.id
                      )
                    }
                    onPointerCancel={
                      handlePointerCancel
                    }
                    className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 touch-none select-none ${
                      isDragging
                        ? 'z-30 scale-110 cursor-grabbing'
                        : 'cursor-grab'
                    }`}
                    style={{
                      left: `${lineupPlayer.x_position}%`,
                      top: `${lineupPlayer.y_position}%`,
                    }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-red-600 text-sm font-black text-white shadow-xl">
                      #
                      {
                        player.shirt_number
                      }
                    </div>

                    <div className="mt-1 max-w-28 truncate whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs font-bold text-white shadow-lg">
                      {
                        player.first_name
                      }
                    </div>
                  </button>
                )
              }
            )}
          </div>

          <div className="mt-3 text-xs text-neutral-500">
            Hold på en
            spiller og træk ham
            rundt på banen.
            Placeringen gemmes,
            når du trykker
            GEM STARTOPSTILLING.
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-black">
              Spillere
            </div>

            <div className="text-xs text-neutral-500">
              Maks. 8
            </div>
          </div>

          <div className="space-y-2">
            {players.map(
              (player) => {
                const selected =
                  selectedIds.has(
                    player.id
                  )

                return (
                  <div
                    key={
                      player.id
                    }
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                      selected
                        ? 'border-red-500/30 bg-red-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-black">
                        #
                        {
                          player.shirt_number
                        }{' '}
                        {
                          player.first_name
                        }{' '}
                        {
                          player.last_name
                        }
                      </div>

                      <div className="text-xs text-neutral-500">
                        {player.position ||
                          'Ingen position'}
                      </div>
                    </div>

                    {selected ? (
                      <button
                        type="button"
                        onClick={() =>
                          removePlayer(
                            player.id
                          )
                        }
                        className="shrink-0 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-black text-red-400 hover:bg-red-500/30"
                      >
                        FJERN
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          addPlayer(
                            player.id
                          )
                        }
                        disabled={
                          lineup.length >=
                          8
                        }
                        className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        TILFØJ
                      </button>
                    )}
                  </div>
                )
              }
            )}
          </div>
        </div>
      </div>

      {lineup.map(
        (
          player,
          index
        ) => (
          <div
            key={
              player.player_id
            }
          >
            <input
              type="hidden"
              name={`lineup_${index}_player_id`}
              value={
                player.player_id
              }
            />

            <input
              type="hidden"
              name={`lineup_${index}_x`}
              value={
                player.x_position
              }
            />

            <input
              type="hidden"
              name={`lineup_${index}_y`}
              value={
                player.y_position
              }
            />

            <input
              type="hidden"
              name={`lineup_${index}_role`}
              value={
                player.lineup_role ||
                ''
              }
            />
          </div>
        )
      )}

      <input
        type="hidden"
        name="lineup_count"
        value={lineup.length}
      />
    </div>
  )
}