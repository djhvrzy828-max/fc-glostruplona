import {
  createServerSupabase,
} from '@/lib/supabase-server'

import {
  updateOrder,
} from '../actions'

export const dynamic =
  'force-dynamic'

const statuses = [
  'Afventer betaling',
  'Betalt',
  'Bestilt',
  'Modtaget',
  'Klar til afhentning',
  'Udleveret',
  'Annulleret',
]

function formatDate(
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

function statusClasses(
  status: string
) {
  if (
    status ===
    'Udleveret'
  ) {
    return 'border-green-500/20 bg-green-950/30 text-green-400'
  }

  if (
    status ===
      'Betalt' ||
    status ===
      'Bestilt' ||
    status ===
      'Modtaget' ||
    status ===
      'Klar til afhentning'
  ) {
    return 'border-blue-500/20 bg-blue-950/30 text-blue-300'
  }

  if (
    status ===
    'Annulleret'
  ) {
    return 'border-red-500/20 bg-red-950/30 text-red-400'
  }

  return 'border-yellow-500/20 bg-yellow-950/30 text-yellow-400'
}

export default async function Page() {
  const s =
    await createServerSupabase()

  const {
    data,
    error,
  } = await s
    .from('orders')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false,
      }
    )

  if (error) {
    console.error(
      'ADMIN ORDERS ERROR:',
      error
    )
  }

  const orders =
    data || []

  const awaitingPayment =
    orders.filter(
      (o: any) =>
        o.order_status ===
        'Afventer betaling'
    ).length

  const readyForPickup =
    orders.filter(
      (o: any) =>
        o.order_status ===
        'Klar til afhentning'
    ).length

  const completed =
    orders.filter(
      (o: any) =>
        o.order_status ===
        'Udleveret'
    ).length

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
            SHOP{' '}
            <span className="text-red-500">
              ORDERS
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
            Administrér bestillinger på
            FC Glostruplonas officielle
            trøje og følg hver ordre fra
            betaling til udlevering.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <div className="fcg-badge fcg-badge-red">
              {orders.length} ORDRER
            </div>

            <div className="fcg-badge">
              {awaitingPayment} AFVENTER
            </div>

            <div className="fcg-badge">
              {readyForPickup} KLAR
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          OVERVIEW
         ================================================== */}

      <section>
        <div className="mb-4">
          <div className="fcg-label">
            Overblik
          </div>

          <h2 className="fcg-heading mt-1">
            Ordrestatus
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card p-4 text-center sm:p-5">
            <div className="text-[8px] font-black uppercase tracking-[.14em] text-neutral-600 sm:text-[10px]">
              Afventer
            </div>

            <div className="mt-2 text-3xl font-black text-yellow-400 sm:text-4xl">
              {awaitingPayment}
            </div>
          </div>

          <div className="card p-4 text-center sm:p-5">
            <div className="text-[8px] font-black uppercase tracking-[.14em] text-neutral-600 sm:text-[10px]">
              Klar
            </div>

            <div className="mt-2 text-3xl font-black text-blue-300 sm:text-4xl">
              {readyForPickup}
            </div>
          </div>

          <div className="card p-4 text-center sm:p-5">
            <div className="text-[8px] font-black uppercase tracking-[.14em] text-neutral-600 sm:text-[10px]">
              Udleveret
            </div>

            <div className="mt-2 text-3xl font-black text-green-400 sm:text-4xl">
              {completed}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          ORDERS
         ================================================== */}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="fcg-label">
              Shop
            </div>

            <h2 className="fcg-heading mt-1">
              Bestillinger
            </h2>
          </div>

          <div className="fcg-badge">
            {orders.length} TOTAL
          </div>
        </div>

        <div className="space-y-4">
          {orders.map(
            (
              o: any
            ) => (
              <article
                key={o.id}
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
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-700/10 blur-[70px]" />

                <div className="relative z-10 p-5 sm:p-6">

                  {/* TOP */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                        ORDRE
                      </div>

                      <h3 className="mt-1 text-2xl font-black uppercase tracking-[-.02em]">
                        {o.order_number}
                      </h3>

                      {o.created_at && (
                        <div className="mt-1 text-xs text-neutral-600">
                          {formatDate(
                            o.created_at
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={`
                        rounded-full
                        border
                        px-3
                        py-2
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[.14em]
                        ${statusClasses(
                          o.order_status
                        )}
                      `}
                    >
                      {o.order_status}
                    </div>
                  </div>

                  {/* CUSTOMER */}
                  <div className="mt-5 grid gap-3 rounded-[20px] border border-white/[0.07] bg-black/20 p-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[.14em] text-neutral-600">
                        Kunde
                      </div>

                      <div className="mt-1 font-black">
                        {o.first_name}{' '}
                        {o.last_name}
                      </div>
                    </div>

                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[.14em] text-neutral-600">
                        Kontakt
                      </div>

                      <div className="mt-1 break-all text-sm text-neutral-300">
                        {o.email}
                      </div>

                      <div className="mt-1 text-sm text-neutral-500">
                        {o.phone}
                      </div>
                    </div>
                  </div>

                  {/* SHIRT */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-3">
                      <div className="text-[8px] font-black uppercase tracking-[.12em] text-neutral-600">
                        Størrelse
                      </div>

                      <div className="mt-1 text-lg font-black">
                        {o.size}
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-3">
                      <div className="text-[8px] font-black uppercase tracking-[.12em] text-neutral-600">
                        Navn
                      </div>

                      <div className="mt-1 truncate text-lg font-black">
                        {o.shirt_name ||
                          '-'}
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-3">
                      <div className="text-[8px] font-black uppercase tracking-[.12em] text-neutral-600">
                        Nummer
                      </div>

                      <div className="mt-1 text-lg font-black">
                        #
                        {o.shirt_number ??
                          '-'}
                      </div>
                    </div>
                  </div>

                  {/* PRICE */}
                  <div className="mt-4 flex items-center justify-between rounded-[18px] border border-red-500/10 bg-red-950/10 p-4">
                    <div className="text-sm font-black uppercase tracking-[.12em] text-neutral-500">
                      Total
                    </div>

                    <div className="text-2xl font-black text-red-400">
                      {o.price} kr.
                    </div>
                  </div>

                  {/* COMMENT */}
                  {o.comment && (
                    <div className="mt-4 rounded-[18px] border border-white/[0.07] bg-white/[0.02] p-4">
                      <div className="text-[8px] font-black uppercase tracking-[.14em] text-neutral-600">
                        Kommentar
                      </div>

                      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                        {o.comment}
                      </div>
                    </div>
                  )}

                  {/* STATUS */}
                  <div className="mt-5 border-t border-white/[0.07] pt-5">
                    <div className="mb-3">
                      <div className="text-[9px] font-black uppercase tracking-[.18em] text-red-400">
                        Workflow
                      </div>

                      <div className="mt-1 text-lg font-black">
                        Opdater ordrestatus
                      </div>
                    </div>

                    <form
                      action={updateOrder}
                      className="grid gap-3 sm:grid-cols-[1fr_auto]"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={o.id}
                      />

                      <select
                        name="status"
                        defaultValue={
                          o.order_status
                        }
                        className="input w-full"
                      >
                        {statuses.map(
                          (
                            x
                          ) => (
                            <option
                              key={x}
                              value={x}
                            >
                              {x}
                            </option>
                          )
                        )}
                      </select>

                      <button className="btn">
                        GEM STATUS
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            )
          )}

          {!orders.length && (
            <div className="card relative overflow-hidden p-8 text-center">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-700/10 blur-[70px]" />

              <div className="relative z-10">
                <div className="text-4xl">
                  📦
                </div>

                <div className="mt-4 text-xl font-black">
                  Ingen bestillinger endnu
                </div>

                <div className="mt-2 text-sm text-neutral-500">
                  Nye shopordrer kommer til
                  at blive vist her.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}