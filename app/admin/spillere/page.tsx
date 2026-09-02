import { createServerSupabase } from '@/lib/supabase-server'
import {
  createPlayer,
  updatePlayer,
  removePlayer,
} from '../actions'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const s = await createServerSupabase()

  const { data: players } = await s
    .from('players')
    .select('*')
    .eq('active', true)
    .order('shirt_number')

  return (
    <div>
      <h1 className="mb-6 text-4xl font-black">
        Spillere
      </h1>

      <form
        action={createPlayer}
        className="card mb-8 grid gap-3 p-6 md:grid-cols-2"
      >
        <input
          className="input"
          name="first_name"
          placeholder="Fornavn"
          required
        />

        <input
          className="input"
          name="last_name"
          placeholder="Efternavn"
          required
        />

        <input
          className="input"
          name="shirt_number"
          type="number"
          min="0"
          max="99"
          placeholder="Trøjenummer"
          required
        />

        <input
          className="input"
          name="position"
          placeholder="Position"
        />

        <button className="btn md:col-span-2">
          + TILFØJ SPILLER
        </button>
      </form>

      <h2 className="mb-4 text-2xl font-black">
        Rediger spillere
      </h2>

      <div className="space-y-4">
        {players?.map((player: any) => (
          <div
            key={player.id}
            className="card p-5"
          >
            <form action={updatePlayer}>
              <input
                type="hidden"
                name="id"
                value={player.id}
              />

              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs opacity-60">
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
                  <label className="mb-1 block text-xs opacity-60">
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
                  <label className="mb-1 block text-xs opacity-60">
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
                  <label className="mb-1 block text-xs opacity-60">
                    Position
                  </label>

                  <input
                    className="input w-full"
                    name="position"
                    defaultValue={player.position || ''}
                  />
                </div>
              </div>

              <button className="btn mt-4">
                GEM ÆNDRINGER
              </button>
            </form>

            <form
              action={removePlayer}
              className="mt-3"
            >
              <input
                type="hidden"
                name="id"
                value={player.id}
              />

              <button
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10"
              >
                FJERN FRA TRUP
              </button>
            </form>
          </div>
        ))}

        {!players?.length && (
          <div className="card p-6 opacity-60">
            Ingen aktive spillere.
          </div>
        )}
      </div>
    </div>
  )
}