import {
  createServerSupabase,
} from '@/lib/supabase-server'

import PlayerVideoUploader from '@/components/PlayerVideoUploader'

import {
  createPlayer,
  updatePlayer,
  removePlayer,
} from '../actions'

export const dynamic =
  'force-dynamic'

export default async function Page() {
  const s =
    await createServerSupabase()

  const {
    data: players,
    error,
  } = await s
    .from('players')
    .select('*')
    .eq('active', true)
    .order('shirt_number')

  if (error) {
    console.error(
      'ADMIN PLAYERS ERROR:',
      error
    )
  }

  return (
    <div className="fcg-page fcg-fade-in space-y-8 md:space-y-10">

      {/* ==================================================
          HEADER
         ================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-[28px]
          border
          border-white/10
          bg-black
          p-6
          shadow-[0_30px_90px_rgba(0,0,0,.5)]
          sm:p-8
          md:p-10
        "
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-700/15 blur-[90px]" />

        <div className="relative z-10">
          <div className="fcg-label">
            FCG ADMIN
          </div>

          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-5xl">
            SQUAD <span className="text-red-500">MANAGER</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
            Administrér spillertruppen, trøjenumre, positioner og personlige
            loop-videoer til spillerprofilerne.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <div className="fcg-badge fcg-badge-red">
              {players?.length || 0} AKTIVE SPILLERE
            </div>

            <div className="fcg-badge">
              VIDEOER VIA ADMIN
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          OPRET SPILLER
         ================================================== */}

      <section>
        <div className="mb-4">
          <div className="fcg-label">
            Ny spiller
          </div>

          <h2 className="fcg-heading mt-1">
            Tilføj til truppen
          </h2>
        </div>

        <form
          action={createPlayer}
          className="
            relative
            grid
            gap-4
            overflow-hidden
            rounded-[26px]
            border
            border-white/10
            bg-[#0d0d0d]
            p-5
            shadow-xl
            sm:p-6
            md:grid-cols-2
          "
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-700/10 blur-[70px]" />

          <div className="relative z-10">
            <label className="label mb-2 block">
              Fornavn
            </label>

            <input
              className="input w-full"
              name="first_name"
              placeholder="Fornavn"
              required
            />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">
              Efternavn
            </label>

            <input
              className="input w-full"
              name="last_name"
              placeholder="Efternavn"
              required
            />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">
              Trøjenummer
            </label>

            <input
              className="input w-full"
              name="shirt_number"
              type="number"
              min="0"
              max="99"
              placeholder="Fx 10"
              required
            />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">
              Position
            </label>

            <input
              className="input w-full"
              name="position"
              placeholder="Fx Målmand, Forsvar, Midtbane"
            />
          </div>

          <input
            type="hidden"
            name="video_url"
            value=""
          />

          <button className="btn relative z-10 md:col-span-2">
            + TILFØJ SPILLER
          </button>
        </form>
      </section>

      {/* ==================================================
          SPILLERE
         ================================================== */}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="fcg-label">
              Truppen
            </div>

            <h2 className="fcg-heading mt-1">
              Rediger spillere
            </h2>
          </div>

          {players?.length ? (
            <div className="fcg-badge">
              {players.length} SPILLERE
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {players?.map((player: any) => (
            <article
              key={player.id}
              className="
                relative
                overflow-hidden
                rounded-[26px]
                border
                border-white/10
                bg-[#0d0d0d]
                shadow-[0_22px_70px_rgba(0,0,0,.4)]
              "
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-red-700/10 blur-[70px]" />

              {/* PLAYER HEADER */}
              <div
                className="
                  relative
                  z-10
                  flex
                  flex-wrap
                  items-center
                  gap-4
                  border-b
                  border-white/[0.07]
                  bg-white/[0.015]
                  p-4
                  sm:p-5
                "
              >
                <div
                  className="
                    flex
                    h-16
                    w-16
                    shrink-0
                    items-center
                    justify-center
                    rounded-[20px]
                    border
                    border-red-500/20
                    bg-gradient-to-b
                    from-red-950/60
                    to-black
                    text-2xl
                    font-black
                    text-red-400
                    shadow-[0_10px_30px_rgba(120,0,0,.18)]
                  "
                >
                  #{player.shirt_number}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-black uppercase tracking-[.16em] text-neutral-600">
                    FC GLOSTRUPLONA
                  </div>

                  <div className="mt-1 truncate text-xl font-black uppercase tracking-[-.02em] sm:text-2xl">
                    {player.first_name} {player.last_name}
                  </div>

                  <div className="mt-1 text-sm text-neutral-500">
                    {player.position || 'Ingen position'}
                  </div>
                </div>

                <div className="ml-auto">
                  {player.video_url ? (
                    <div className="rounded-full border border-green-500/20 bg-green-950/30 px-3 py-2 text-[9px] font-black uppercase tracking-[.15em] text-green-400">
                      🎬 VIDEO AKTIV
                    </div>
                  ) : (
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] font-black uppercase tracking-[.15em] text-neutral-600">
                      INGEN VIDEO
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-10 space-y-6 p-4 sm:p-5">

                {/* INFO */}
                <section>
                  <div className="mb-4">
                    <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                      Spillerdata
                    </div>

                    <h3 className="mt-1 text-lg font-black">
                      Profiloplysninger
                    </h3>
                  </div>

                  <form action={updatePlayer}>
                    <input
                      type="hidden"
                      name="id"
                      value={player.id}
                    />

                    <input
                      type="hidden"
                      name="video_url"
                      value={player.video_url || ''}
                    />

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="label mb-2 block">
                          Fornavn
                        </label>

                        <input
                          className="input w-full"
                          name="first_name"
                          defaultValue={player.first_name}
                          required
                        />
                      </div>

                      <div>
                        <label className="label mb-2 block">
                          Efternavn
                        </label>

                        <input
                          className="input w-full"
                          name="last_name"
                          defaultValue={player.last_name}
                          required
                        />
                      </div>

                      <div>
                        <label className="label mb-2 block">
                          Nummer
                        </label>

                        <input
                          className="input w-full"
                          name="shirt_number"
                          type="number"
                          min="0"
                          max="99"
                          defaultValue={player.shirt_number}
                          required
                        />
                      </div>

                      <div>
                        <label className="label mb-2 block">
                          Position
                        </label>

                        <input
                          className="input w-full"
                          name="position"
                          defaultValue={player.position || ''}
                        />
                      </div>
                    </div>

                    <button className="btn mt-5">
                      GEM ÆNDRINGER
                    </button>
                  </form>
                </section>

                {/* VIDEO */}
                <section className="border-t border-white/[0.07] pt-6">
                  <div className="mb-4">
                    <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                      Player Cam
                    </div>

                    <h3 className="mt-1 text-lg font-black">
                      Loop-video
                    </h3>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                      Upload eller udskift spillerens personlige loop-video.
                      Når en video er sat på spilleren, bliver den automatisk
                      brugt på spillerprofilen.
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/[0.08] bg-black/25 p-4">
                    <PlayerVideoUploader
                      playerId={player.id}
                      playerName={`${player.first_name} ${player.last_name}`}
                      currentVideoUrl={player.video_url}
                    />
                  </div>
                </section>

                {/* REMOVE */}
                <section className="border-t border-white/[0.07] pt-6">
                  <div className="rounded-[20px] border border-red-500/15 bg-red-950/10 p-4">
                    <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                      Farezone
                    </div>

                    <div className="mt-2 text-sm leading-6 text-neutral-400">
                      Fjern spilleren fra den aktive trup. Spillerens historiske
                      kampdata beholdes i systemet.
                    </div>

                    <form
                      action={removePlayer}
                      className="mt-4"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={player.id}
                      />

                      <button
                        className="
                          rounded-xl
                          border
                          border-red-500/40
                          px-4
                          py-2.5
                          text-sm
                          font-black
                          text-red-400
                          transition
                          hover:bg-red-500/10
                        "
                      >
                        FJERN FRA TRUP
                      </button>
                    </form>
                  </div>
                </section>
              </div>
            </article>
          ))}

          {!players?.length && (
            <div className="card p-8 text-center">
              <div className="text-4xl">
                👕
              </div>

              <div className="mt-4 text-xl font-black">
                Ingen aktive spillere
              </div>

              <div className="mt-2 text-sm text-neutral-500">
                Tilføj den første spiller ovenfor.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
