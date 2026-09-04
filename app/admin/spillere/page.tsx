import { createServerSupabase } from '@/lib/supabase-server'
import {
  createPlayer,
  updatePlayer,
  removePlayer,
  uploadPlayerVideo,
} from '../actions'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const s = await createServerSupabase()

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
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <div className="text-[10px] font-black uppercase tracking-[.25em] text-red-400 sm:text-xs">
          FC Glostruplona
        </div>

        <h1 className="mt-1 text-3xl font-black sm:text-4xl">
          Spillere
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
          Administrer truppen, spillerinformation
          og personlige loop-videoer.
        </p>
      </div>

      {/* OPRET SPILLER */}
      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-black">
          Tilføj spiller
        </h2>

        <form
          action={createPlayer}
          className="card grid gap-4 p-5 sm:p-6 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs font-bold text-neutral-500">
              Fornavn
            </label>

            <input
              className="input w-full"
              name="first_name"
              placeholder="Fornavn"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-neutral-500">
              Efternavn
            </label>

            <input
              className="input w-full"
              name="last_name"
              placeholder="Efternavn"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-neutral-500">
              Trøjenummer
            </label>

            <input
              className="input w-full"
              name="shirt_number"
              type="number"
              min="0"
              max="99"
              placeholder="Trøjenummer"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-neutral-500">
              Position
            </label>

            <input
              className="input w-full"
              name="position"
              placeholder="Fx Målmand, Forsvar, Midtbane"
            />
          </div>

          <button className="btn md:col-span-2">
            + TILFØJ SPILLER
          </button>
        </form>
      </section>

      {/* REDIGER SPILLERE */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
              Truppen
            </div>

            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Rediger spillere
            </h2>
          </div>

          {players?.length ? (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-neutral-400">
              {players.length} spillere
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {players?.map((player: any) => (
            <div
              key={player.id}
              className="card overflow-hidden"
            >
              {/* SPILLER HEADER */}
              <div className="flex items-center gap-4 border-b border-white/10 bg-white/[0.02] p-4 sm:p-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-950/40 text-xl font-black text-red-400">
                  #{player.shirt_number}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-lg font-black">
                    {player.first_name}{' '}
                    {player.last_name}
                  </div>

                  <div className="mt-1 text-sm text-neutral-500">
                    {player.position ||
                      'Ingen position'}
                  </div>
                </div>

                {player.video_url && (
                  <div className="ml-auto rounded-full border border-green-500/20 bg-green-950/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-400">
                    🎬 VIDEO
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5">
                {/* SPILLERINFO */}
                <form action={updatePlayer}>
                  <input
                    type="hidden"
                    name="id"
                    value={player.id}
                  />

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-neutral-500">
                        Fornavn
                      </label>

                      <input
                        className="input w-full"
                        name="first_name"
                        defaultValue={
                          player.first_name
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-neutral-500">
                        Efternavn
                      </label>

                      <input
                        className="input w-full"
                        name="last_name"
                        defaultValue={
                          player.last_name
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-neutral-500">
                        Nummer
                      </label>

                      <input
                        className="input w-full"
                        name="shirt_number"
                        type="number"
                        min="0"
                        max="99"
                        defaultValue={
                          player.shirt_number
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-neutral-500">
                        Position
                      </label>

                      <input
                        className="input w-full"
                        name="position"
                        defaultValue={
                          player.position || ''
                        }
                      />
                    </div>
                  </div>

                  <button className="btn mt-5">
                    GEM ÆNDRINGER
                  </button>
                </form>

                {/* VIDEO UPLOAD */}
                <div className="mt-6 border-t border-white/10 pt-6">
                  <div className="mb-3">
                    <div className="text-sm font-black">
                      🎬 Spiller-video
                    </div>

                    <div className="mt-1 text-xs leading-5 text-neutral-500">
                      Upload en kort video til
                      spillerens profil. MP4 anbefales.
                      Maks. 20 MB.
                    </div>
                  </div>

                  {player.video_url && (
                    <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
                      <video
                        src={player.video_url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="aspect-video w-full object-cover sm:max-h-72"
                      />

                      <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.03] px-4 py-3">
                        <span className="text-xs font-black text-green-400">
                          ✓ VIDEO UPLOADET
                        </span>

                        <span className="text-xs text-neutral-500">
                          • Upload en ny video for
                          at erstatte den
                        </span>
                      </div>
                    </div>
                  )}

                  <form
                    action={uploadPlayerVideo}
                    className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4"
                  >
                    <input
                      type="hidden"
                      name="player_id"
                      value={player.id}
                    />

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-neutral-400">
                        Vælg videofil
                      </span>

                      <input
                        name="video"
                        type="file"
                        accept="video/*"
                        required
                        className="block w-full cursor-pointer rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-red-700 file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
                      />
                    </label>

                    <button
                      type="submit"
                      className="btn mt-4 w-full sm:w-auto"
                    >
                      🎬 UPLOAD VIDEO
                    </button>
                  </form>
                </div>

                {/* FJERN SPILLER */}
                <form
                  action={removePlayer}
                  className="mt-5"
                >
                  <input
                    type="hidden"
                    name="id"
                    value={player.id}
                  />

                  <button className="rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/10">
                    FJERN FRA TRUP
                  </button>
                </form>
              </div>
            </div>
          ))}

          {!players?.length && (
            <div className="card p-8 text-center">
              <div className="text-3xl">
                👕
              </div>

              <div className="mt-3 font-black">
                Ingen aktive spillere
              </div>

              <div className="mt-1 text-sm text-neutral-500">
                Tilføj den første spiller ovenfor.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}