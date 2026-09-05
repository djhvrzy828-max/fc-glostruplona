import Image from 'next/image'
import { createOrder } from './actions'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams

  return (
    <div className="fcg-page fcg-fade-in space-y-8 md:space-y-10">

      {/* ==================================================
          HERO / PRODUCT
         ================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-[30px]
          border
          border-white/10
          bg-black
          shadow-[0_30px_90px_rgba(0,0,0,.55)]
        "
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-red-700/15 blur-[90px]" />

        <div className="grid lg:grid-cols-[1.08fr_.92fr]">

          {/* PRODUCT IMAGE */}
          <div
            className="
              relative
              min-h-[360px]
              overflow-hidden
              bg-white
              sm:min-h-[500px]
            "
          >
            <Image
              src="/fcg-troeje.png"
              alt="FC Glostruplona fodboldtrøje"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-contain p-4 sm:p-8"
            />

            <div
              className="
                pointer-events-none
                absolute
                inset-x-0
                bottom-0
                h-28
                bg-gradient-to-t
                from-black/40
                to-transparent
              "
            />

            <div
              className="
                absolute
                left-4
                top-4
                rounded-full
                border
                border-green-500/25
                bg-green-950/75
                px-3
                py-2
                text-[9px]
                font-black
                uppercase
                tracking-[.15em]
                text-green-300
                backdrop-blur-md
              "
            >
              FORUDBESTILLING
            </div>
          </div>

          {/* PRODUCT INFO */}
          <div
            className="
              relative
              flex
              min-h-[390px]
              flex-col
              justify-end
              overflow-hidden
              p-6
              sm:min-h-[500px]
              sm:p-8
              md:p-10
            "
          >
            <Image
              src="/media/shop-hero.jpg"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-center opacity-45 saturate-[.78] contrast-[1.12]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(153,27,27,.25),transparent_35%)]" />

            <div className="relative z-10">
            <div className="fcg-label">
              FCG SHOP
            </div>

            <h1
              className="
                mt-3
                text-4xl
                font-black
                uppercase
                leading-[.9]
                tracking-[-.045em]
                sm:text-5xl
              "
            >
              DEN OFFICIELLE
              <br />
              <span className="text-red-500">
                FCG-TRØJE
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-400 sm:text-base">
              FC Glostruplonas officielle fodboldtrøje.
              Vælg størrelse og gør den personlig med navn
              og nummer på ryggen.
            </p>

            <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.15em] text-neutral-600">
                  Pris
                </div>

                <div className="mt-1 text-4xl font-black text-red-400">
                  599 kr.
                </div>
              </div>

              <div className="fcg-badge fcg-badge-red">
                FC GLOSTRUPLONA
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          ORDER / SUCCESS
         ================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-[28px]
          border
          border-white/10
          bg-[#0d0d0d]
          shadow-xl
        "
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-700/10 blur-[80px]" />

        <div className="relative z-10 p-5 sm:p-7 md:p-9">
          {order ? (
            <div className="mx-auto max-w-2xl">

              <div className="text-[10px] font-black uppercase tracking-[.22em] text-green-400">
                BESTILLING MODTAGET
              </div>

              <h2 className="mt-2 text-3xl font-black uppercase tracking-[-.03em] sm:text-4xl">
                ORDRE {order}
              </h2>

              <p className="mt-4 text-sm leading-6 text-neutral-300 sm:text-base">
                Din forudbestilling er registreret. Overfør{' '}
                <b>599 kr.</b> til FC Glostruplona MobilePay Box{' '}
                <b>9799GP</b> og skriv <b>{order}</b> som besked.
              </p>

              <div
                className="
                  mt-6
                  rounded-[24px]
                  border
                  border-green-500/20
                  bg-green-950/20
                  p-5
                "
              >
                <div className="text-[10px] font-black uppercase tracking-[.16em] text-green-500">
                  MobilePay Box
                </div>

                <div className="mt-2 text-4xl font-black">
                  9799GP
                </div>

                <div className="mt-2 text-sm text-neutral-400">
                  Husk at skrive{' '}
                  <span className="font-black text-white">
                    {order}
                  </span>{' '}
                  i beskedfeltet.
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="card p-4">
                  <div className="text-[9px] font-black uppercase tracking-wider text-neutral-600">
                    Beløb
                  </div>

                  <div className="mt-2 text-2xl font-black text-red-400">
                    599 kr.
                  </div>
                </div>

                <div className="card p-4">
                  <div className="text-[9px] font-black uppercase tracking-wider text-neutral-600">
                    Status
                  </div>

                  <div className="mt-2 text-sm font-black text-green-400">
                    AFVENTER BETALING
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mx-auto max-w-3xl">

                <div className="fcg-label">
                  Forudbestilling
                </div>

                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-.03em] sm:text-4xl">
                  BESTIL DIN TRØJE
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
                  Udfyld oplysningerne nedenfor. Når bestillingen er
                  registreret, får du et ordrenummer, som bruges ved
                  MobilePay-betalingen.
                </p>

                <form
                  action={createOrder}
                  className="mt-7 grid gap-4"
                >
                  {/* NAVN */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label mb-2 block">
                        Fornavn
                      </label>

                      <input
                        name="first_name"
                        required
                        className="input"
                        placeholder="Fornavn"
                      />
                    </div>

                    <div>
                      <label className="label mb-2 block">
                        Efternavn
                      </label>

                      <input
                        name="last_name"
                        required
                        className="input"
                        placeholder="Efternavn"
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className="label mb-2 block">
                      Email
                    </label>

                    <input
                      name="email"
                      type="email"
                      required
                      className="input"
                      placeholder="Email"
                    />
                  </div>

                  {/* PHONE */}
                  <div>
                    <label className="label mb-2 block">
                      Telefonnummer
                    </label>

                    <input
                      name="phone"
                      required
                      className="input"
                      placeholder="Telefonnummer"
                    />
                  </div>

                  {/* SIZE */}
                  <div>
                    <label className="label mb-2 block">
                      Størrelse
                    </label>

                    <select
                      name="size"
                      required
                      className="input"
                      defaultValue="M"
                    >
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(
                        (size) => (
                          <option
                            key={size}
                            value={size}
                          >
                            {size}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* CUSTOMIZATION */}
                  <div
                    className="
                      mt-2
                      rounded-[24px]
                      border
                      border-white/10
                      bg-black/30
                      p-4
                      sm:p-5
                    "
                  >
                    <div className="text-[10px] font-black uppercase tracking-[.18em] text-red-400">
                      PERSONLIG TRØJE
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label mb-2 block">
                          Navn på ryggen
                        </label>

                        <input
                          name="shirt_name"
                          className="input"
                          maxLength={20}
                          placeholder="Fx GUDMANN"
                        />
                      </div>

                      <div>
                        <label className="label mb-2 block">
                          Nummer
                        </label>

                        <input
                          name="shirt_number"
                          type="number"
                          min="0"
                          max="99"
                          className="input"
                          placeholder="Fx 5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COMMENT */}
                  <div>
                    <label className="label mb-2 block">
                      Kommentar
                    </label>

                    <textarea
                      name="comment"
                      className="input min-h-28"
                      placeholder="Eventuel kommentar"
                    />
                  </div>

                  {/* TOTAL */}
                  <div
                    className="
                      mt-2
                      rounded-[24px]
                      border
                      border-white/10
                      bg-gradient-to-r
                      from-white/[0.04]
                      to-transparent
                      p-5
                    "
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-400">
                        Officiel FCG-trøje
                      </span>

                      <span className="font-black">
                        599 kr.
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-sm font-black uppercase tracking-[.12em]">
                        TOTAL
                      </span>

                      <span className="text-2xl font-black text-red-400">
                        599 kr.
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn mt-2 min-h-[52px] text-sm"
                    type="submit"
                  >
                    FORUDBESTIL – 599 KR.
                  </button>

                  <p className="text-center text-xs leading-5 text-neutral-600">
                    Betaling sker efter bestilling via MobilePay Box
                    9799GP.
                  </p>
                </form>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ==================================================
          BRAND
         ================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-[28px]
          border
          border-white/10
          bg-black
          p-8
          text-center
          sm:p-10
        "
      >
        <Image
          src="/media/shop-hero.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-20"
        />
        <div className="absolute inset-0 bg-black/80" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-red-700/15 blur-[80px]" />

        <div className="relative z-10">
          <Image
            src="/fcg-logo.png"
            alt="FC Glostruplona"
            width={75}
            height={75}
            className="mx-auto h-auto w-16"
          />

          <div className="mt-4 text-2xl font-black uppercase tracking-[-.03em] sm:text-4xl">
            WEAR THE CLUB.
          </div>

          <div className="mt-2 text-[9px] font-black uppercase tracking-[.22em] text-red-400">
            FC GLOSTRUPLONA · EST. 2025
          </div>
        </div>
      </section>

    </div>
  )
}