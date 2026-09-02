import { createServerSupabase } from '@/lib/supabase-server'
import { createMatch, updateMatch } from '../actions'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const s = await createServerSupabase()

  const { data } = await s
    .from('matches')
    .select('*')
    .order('date', { ascending: true, nullsFirst: false })

  return (
    <div>
      <h1 className="mb-6 text-4xl font-black">Kampe</h1>

      {/* OPRET NY KAMP */}
      <form
        action={createMatch}
        className="card mb-8 grid gap-3 p-6 md:grid-cols-2"
      >
        <input
          className="input"
          name="home_team"
          placeholder="Hjemmehold"
          required
        />

        <input
          className="input"
          name="away_team"
          placeholder="Udehold"
          required
        />

        <input className="input" name="date" type="date" />

        <input className="input" name="kickoff_time" type="time" />

        <input
          className="input"
          name="stadium"
          placeholder="Stadion"
        />

        <input
          className="input"
          name="competition"
          defaultValue="9. divisionen"
        />

        <select className="input" name="status">
          {['Kommende', 'I gang', 'Slut', 'Udsat', 'Aflyst'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>

        <button className="btn">
          + OPRET KAMP
        </button>
      </form>

      {/* REDIGER EKSISTERENDE KAMPE */}
      <h2 className="mb-4 text-2xl font-black">
        Rediger kampe
      </h2>

      <div className="space-y-4">
        {data?.map((m: any) => (
          <form
            key={m.id}
            action={updateMatch}
            className="card p-5"
          >
            <input
              type="hidden"
              name="id"
              value={m.id}
            />

            <div className="mb-4 text-lg font-bold">
              {m.home_team} vs {m.away_team}
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">

              <div>
                <label className="mb-1 block text-xs opacity-60">
                  Dato
                </label>

                <input
                  className="input w-full"
                  name="date"
                  type="date"
                  defaultValue={m.date || ''}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-60">
                  Kampstart
                </label>

                <input
                  className="input w-full"
                  name="kickoff_time"
                  type="time"
                  defaultValue={
                    m.kickoff_time
                      ? m.kickoff_time.slice(0, 5)
                      : ''
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-60">
                  Stadion
                </label>

                <input
                  className="input w-full"
                  name="stadium"
                  defaultValue={m.stadium || ''}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs opacity-60">
                  Status
                </label>

                <select
                  className="input w-full"
                  name="status"
                  defaultValue={m.status}
                >
                  {[
                    'Kommende',
                    'I gang',
                    'Slut',
                    'Udsat',
                    'Aflyst',
                  ].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn mt-4">
              GEM ÆNDRINGER
            </button>
          </form>
        ))}

        {!data?.length && (
          <div className="card p-6 opacity-60">
            Ingen kampe oprettet endnu.
          </div>
        )}
      </div>
    </div>
  )
}