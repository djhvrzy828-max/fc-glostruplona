import {
  createAnnouncement,
  removeAnnouncement,
} from '../actions'

import {
  createServerSupabase,
} from '@/lib/supabase-server'

export const dynamic =
  'force-dynamic'

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat(
    'da-DK',
    {
      timeZone:
        'Europe/Copenhagen',

      day: '2-digit',
      month: '2-digit',
      year: 'numeric',

      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(
    new Date(value)
  )
}

export default async function Page() {
  const s =
    await createServerSupabase()

  const now =
    new Date().toISOString()

  /*
   * ==========================================
   * HENT MEDDELELSER
   * ==========================================
   */
  const {
    data: announcements,
    error,
  } = await s
    .from('announcements')
    .select(`
      id,
      title,
      body,
      type,
      active,
      published_at,
      expires_at,
      removed_at
    `)
    .eq('active', true)
    .is('removed_at', null)
    .or(
      `expires_at.is.null,expires_at.gt.${now}`
    )
    .order(
      'published_at',
      {
        ascending: false,
        nullsFirst: false,
      }
    )

  if (error) {
    console.error(
      'ADMIN ANNOUNCEMENTS ERROR:',
      error
    )
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <section>
        <div className="text-[10px] font-black uppercase tracking-[.25em] text-red-400 sm:text-xs">
          FC Glostruplona
        </div>

        <h1 className="mt-1 text-3xl font-black sm:text-4xl">
          Klubmeddelelser
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
          Publicer beskeder på
          forsiden og send dem som
          push-notifikation til
          klubbens følgere.
        </p>
      </section>

      {/* NY MEDDELELSE */}
      <section>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
            Ny besked
          </div>

          <h2 className="mt-1 text-2xl font-black">
            Publicer meddelelse
          </h2>
        </div>

        <form
          action={
            createAnnouncement
          }
          className="card grid gap-5 p-5 sm:p-6"
        >
          {/* TITEL */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-neutral-500">
              Titel
            </label>

            <input
              className="input w-full"
              name="title"
              placeholder="Fx SIGNING"
              required
            />
          </div>

          {/* BESKED */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-neutral-500">
              Besked
            </label>

            <textarea
              className="input min-h-32 w-full resize-y"
              name="body"
              placeholder="Skriv meddelelsen..."
              required
            />
          </div>

          {/* TYPE */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-neutral-500">
              Type
            </label>

            <select
              className="input w-full"
              name="type"
              defaultValue="Information"
            >
              {[
                'Information',
                'Kampændring',
                'Breaking',
                'Shop',
                'Advarsel',
              ].map(
                (
                  type
                ) => (
                  <option
                    key={
                      type
                    }
                    value={
                      type
                    }
                  >
                    {
                      type
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* UDLØB */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
            <div className="text-sm font-black">
              ⏱ Automatisk
              fjernelse
            </div>

            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Valgfrit. Hvis du
              vælger en dato og
              tid, forsvinder
              meddelelsen
              automatisk fra
              forsiden derefter.
              Lader du feltet være
              tomt, bliver den
              stående indtil admin
              fjerner den.
            </p>

            <input
              className="input mt-4 w-full"
              name="expires_at"
              type="datetime-local"
            />
          </div>

          {/* PUSH INFO */}
          <div className="rounded-2xl border border-red-500/15 bg-red-950/20 p-4">
            <div className="text-sm font-black text-red-300">
              🔔 Push-notifikation
            </div>

            <p className="mt-1 text-xs leading-5 text-neutral-400">
              Når du publicerer,
              bliver meddelelsen
              både vist på
              forsiden og sendt
              som push til
              brugerne.
            </p>
          </div>

          <button className="btn w-full sm:w-auto">
            📢 PUBLICER MEDDELELSE
          </button>
        </form>
      </section>

      {/* AKTIVE */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400 sm:text-xs">
              Forsiden
            </div>

            <h2 className="mt-1 text-2xl font-black">
              Aktive meddelelser
            </h2>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-neutral-400">
            {announcements
              ?.length || 0}
          </div>
        </div>

        <div className="space-y-4">
          {announcements?.map(
            (
              announcement:
                any
            ) => (
              <article
                key={
                  announcement.id
                }
                className="overflow-hidden rounded-[24px] border border-red-500/20 bg-gradient-to-br from-red-950/60 to-[#170d0c]"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400">
                        {announcement.type ||
                          'Information'}
                      </div>

                      <h3 className="mt-2 text-2xl font-black">
                        {
                          announcement.title
                        }
                      </h3>
                    </div>

                    <div className="rounded-full border border-green-500/20 bg-green-950/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-400">
                      AKTIV
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                    {
                      announcement.body
                    }
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="grid gap-2 text-xs text-neutral-500 sm:grid-cols-2">
                      <div>
                        <span className="font-black text-neutral-400">
                          Publiceret:
                        </span>{' '}
                        {formatDateTime(
                          announcement.published_at
                        ) ||
                          'Ukendt'}
                      </div>

                      <div>
                        <span className="font-black text-neutral-400">
                          Udløber:
                        </span>{' '}
                        {announcement.expires_at
                          ? formatDateTime(
                              announcement.expires_at
                            )
                          : 'Ingen udløbstid'}
                      </div>
                    </div>
                  </div>

                  <form
                    action={
                      removeAnnouncement
                    }
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={
                        announcement.id
                      }
                    />

                    <button className="w-full rounded-xl border border-red-500/40 px-4 py-3 text-sm font-black text-red-400 transition hover:bg-red-500/10 sm:w-auto">
                      FJERN MEDDELELSE
                    </button>
                  </form>
                </div>
              </article>
            )
          )}

          {!announcements
            ?.length && (
            <div className="card p-8 text-center">
              <div className="text-3xl">
                📭
              </div>

              <div className="mt-3 font-black">
                Ingen aktive
                meddelelser
              </div>

              <div className="mt-1 text-sm text-neutral-500">
                Publicer en ny
                meddelelse ovenfor.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}