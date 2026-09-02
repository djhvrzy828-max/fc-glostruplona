import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function Page() {
  let players: any[] = []

  try {
    const s = await createServerSupabase()

    const { data } = await s
      .from('players')
      .select('*')
      .eq('active', true)
      .order('shirt_number')

    players = data || []
  } catch {}

  return (
    <div>
      <h1 className="mb-6 text-4xl font-black">
        Truppen
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <Link
            href={`/trup/${p.id}`}
            key={p.id}
            className="card block p-6 transition hover:-translate-y-1 hover:bg-white/5"
          >
            <div className="text-5xl font-black text-red-400">
              #{p.shirt_number}
            </div>

            <div className="mt-3 text-2xl font-black">
              {p.first_name} {p.last_name}
            </div>

            <div className="mt-1 text-sm text-neutral-400">
              {p.position || 'Position ikke registreret'}
            </div>

            <div className="mt-4 text-sm font-bold text-red-400">
              SE SPILLERPROFIL →
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-black">
        Trænerstab
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <div className="text-sm text-neutral-400">
            Cheftræner
          </div>

          <b className="text-xl">
            William Grønholt
          </b>
        </div>

        <div className="card p-6">
          <div className="text-sm text-neutral-400">
            Assistenttræner
          </div>

          <b className="text-xl">
            Gustav Lundø
          </b>
        </div>
      </div>
    </div>
  )
}