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
            KLUB <span className="text-red-500">MEDDELELSER</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
            Publicér beskeder på forsiden og send dem direkte som push-notifikationer
            til klubbens følgere.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <div className="fcg-badge fcg-badge-red">
              {announcements?.length || 0} AKTIVE
            </div>

            <div className="fcg-badge">
              PUSH + FORSIDE
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          NY MEDDELELSE
         ================================================== */}

      <section>
        <div className="mb-4">
          <div className="fcg-label">
            Ny besked
          </div>

          <h2 className="fcg-heading mt-1">
            Publicér meddelelse
          </h2>
        </div>

        <form
          action={createAnnouncement}
          className="
            relative
            grid
            gap-5
            overflow-hidden
            rounded-[26px]
            border
            border-white/10
            bg-[#0d0d0d]
            p-5
            shadow-xl
            sm:p-6
          "
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-700/10 blur-[70px]" />

          <div className="relative z-10">
            <label className="label mb-2 block">
              Titel
            </label>

            <input
              className="input w-full"
              name="title"
              placeholder="Fx SIGNING"
              required
            />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">
              Besked
            </label>

            <textarea
              className="input min-h-32 w-full resize-y"
              name="body"
              placeholder="Skriv meddelelsen..."
              required
            />
          </div>

          <div className="relative z-10">
            <label className="label mb-2 block">
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
              ].map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div
            className="
              relative
              z-10
              rounded-[22px]
              border
              border-white/[0.08]
              bg-white/[0.025]
              p-4
              sm:p-5
            "
          >
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-red-400">
              Automatisk fjernelse
            </div>

            <h3 className="mt-2 text-lg font-black">
              ⏱ Udløbstid
            </h3>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-neutral-500">
              Valgfrit. Hvis du vælger en dato og tid, forsvinder meddelelsen
              automatisk fra forsiden derefter. Hvis feltet er tomt, bliver den
              stående, indtil admin fjerner den.
            </p>

            <input
              className="input mt-4 w-full"
              name="expires_at"
              type="datetime-local"
            />
          </div>

          <div
            className="
              relative
              z-10
              rounded-[22px]
              border
              border-red-500/15
              bg-red-950/15
              p-4
            "
          >
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-red-400">
              Push
            </div>

            <div className="mt-2 text-lg font-black text-white">
              🔔 Sendes til brugerne
            </div>

            <p className="mt-1 text-xs leading-5 text-neutral-400">
              Når du publicerer, bliver meddelelsen både vist på forsiden og sendt
              som push-notifikation til brugere, der har aktiveret notifikationer.
            </p>
          </div>

          <button className="btn relative z-10 w-full sm:w-auto">
            📢 PUBLICÉR MEDDELELSE
          </button>
        </form>
      </section>

      {/* ==================================================
          AKTIVE MEDDELELSER
         ================================================== */}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="fcg-label">
              Forsiden
            </div>

            <h2 className="fcg-heading mt-1">
              Aktive meddelelser
            </h2>
          </div>

          <div className="fcg-badge">
            {announcements?.length || 0} AKTIVE
          </div>
        </div>

        <div className="space-y-4">
          {announcements?.map(
            (
              announcement:
                any
            ) => (
              <article
                key={announcement.id}
                className="
                  relative
                  overflow-hidden
                  rounded-[26px]
                  border
                  border-red-500/20
                  bg-gradient-to-br
                  from-red-950/45
                  via-[#120d0d]
                  to-[#090909]
                  shadow-[0_22px_70px_rgba(0,0,0,.4)]
                "
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-600/12 blur-[70px]" />

                <div className="relative z-10 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400">
                        {announcement.type || 'Information'}
                      </div>

                      <h3 className="mt-2 text-2xl font-black uppercase tracking-[-.02em]">
                        {announcement.title}
                      </h3>
                    </div>

                    <div className="rounded-full border border-green-500/20 bg-green-950/30 px-3 py-2 text-[9px] font-black uppercase tracking-[.15em] text-green-400">
                      ● AKTIV
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                    {announcement.body}
                  </p>

                  <div
                    className="
                      mt-5
                      grid
                      gap-3
                      rounded-[20px]
                      border
                      border-white/[0.07]
                      bg-black/20
                      p-4
                      text-xs
                      sm:grid-cols-2
                    "
                  >
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[.14em] text-neutral-600">
                        Publiceret
                      </div>

                      <div className="mt-1 font-bold text-neutral-300">
                        {formatDateTime(
                          announcement.published_at
                        ) || 'Ukendt'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[.14em] text-neutral-600">
                        Udløber
                      </div>

                      <div className="mt-1 font-bold text-neutral-300">
                        {announcement.expires_at
                          ? formatDateTime(
                              announcement.expires_at
                            )
                          : 'Ingen udløbstid'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[10px] font-black uppercase tracking-[.15em] text-neutral-600">
                      Synlig på forsiden
                    </div>

                    <form action={removeAnnouncement}>
                      <input
                        type="hidden"
                        name="id"
                        value={announcement.id}
                      />

                      <button
                        className="
                          rounded-xl
                          border
                          border-red-500/40
                          px-4
                          py-3
                          text-sm
                          font-black
                          text-red-400
                          transition
                          hover:bg-red-500/10
                        "
                      >
                        FJERN MEDDELELSE
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            )
          )}

          {!announcements?.length && (
            <div className="card relative overflow-hidden p-8 text-center">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-700/10 blur-[70px]" />

              <div className="relative z-10">
                <div className="text-4xl">
                  📭
                </div>

                <div className="mt-4 text-xl font-black">
                  Ingen aktive meddelelser
                </div>

                <div className="mt-2 text-sm text-neutral-500">
                  Publicér en ny meddelelse ovenfor.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
