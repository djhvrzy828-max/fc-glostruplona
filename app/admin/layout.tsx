import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_admin, display_name')
    .eq('id', user.id)
    .single()



  if (profileError || !profile?.is_admin) {
    redirect('/')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="card h-fit p-4">
        <div className="mb-4 font-black">ADMIN</div>

        {[
  ['/admin', 'Dashboard'],
  ['/admin/kampe', 'Kampe'],
  ['/admin/spillere', 'Spillere'],
  ['/admin/ordrer', 'Ordrer'],
  ['/admin/meddelelser', 'Meddelelser'],
].map(([href, label]) => (
          <Link
            className="block rounded-xl px-3 py-2 text-sm hover:bg-white/5"
            key={href}
            href={href}
          >
            {label}
          </Link>
        ))}
      </aside>

      <div>{children}</div>
    </div>
  )
}