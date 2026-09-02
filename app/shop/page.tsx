import Image from 'next/image'
import { createOrder } from './actions'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="card p-8">
       <div className="mx-auto w-full max-w-[600px] overflow-hidden rounded-2xl border border-white/10 bg-white">
  <Image
    src="/fcg-troeje.png"
    alt="FC Glostruplona fodboldtrøje"
    width={1200}
    height={700}
    priority
    className="h-auto w-full object-contain"
  />
</div>

        <div className="mt-6">
          <div className="text-sm font-black uppercase tracking-[.25em] text-red-400">
            FC Glostruplona
          </div>

          <h1 className="mt-2 text-3xl font-black">
            FC Glostruplona fodboldtrøje
          </h1>

          <p className="mt-3 text-neutral-400">
            Officiel FC Glostruplona-trøje. Vælg størrelse og tilpas den med
            navn og nummer på ryggen.
          </p>

          <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-5">
            <div>
              <div className="text-sm text-neutral-400">Pris</div>
              <div className="text-3xl font-black text-red-400">599 kr.</div>
            </div>

            <div className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-400">
              FORUDBESTILLING
            </div>
          </div>
        </div>
      </section>

      <section className="card p-8">
        {order ? (
          <div>
            <div className="text-sm font-black uppercase tracking-[.25em] text-green-400">
              Tak for din forudbestilling
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Ordre {order}
            </h2>

            <p className="mt-4 text-neutral-300">
              Overfør <b>599 kr.</b> til FC Glostruplona MobilePay Box{' '}
              <b>9799GP</b> og skriv <b>{order}</b> som besked.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-neutral-400">
                MobilePay Box
              </div>

              <div className="mt-1 text-3xl font-black">
                9799GP
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm font-black uppercase tracking-[.25em] text-red-400">
              FC Glostruplona Shop
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Forudbestil din trøje
            </h2>

            <p className="mt-2 text-neutral-400">
              Udfyld oplysningerne nedenfor. Efter bestilling får du et
              ordrenummer, som skal bruges ved MobilePay-betalingen.
            </p>

            <form action={createOrder} className="mt-6 grid gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  name="first_name"
                  required
                  className="input"
                  placeholder="Fornavn"
                />

                <input
                  name="last_name"
                  required
                  className="input"
                  placeholder="Efternavn"
                />
              </div>

              <input
                name="email"
                type="email"
                required
                className="input"
                placeholder="Email"
              />

              <input
                name="phone"
                required
                className="input"
                placeholder="Telefonnummer"
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-300">
                  Størrelse
                </label>

                <select
                  name="size"
                  required
                  className="input"
                  defaultValue="M"
                >
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-300">
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
                <label className="mb-2 block text-sm font-bold text-neutral-300">
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

              <textarea
                name="comment"
                className="input min-h-28"
                placeholder="Eventuel kommentar"
              />

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">FCG-trøje</span>
                  <span className="font-bold">599 kr.</span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="font-black">TOTAL</span>
                  <span className="text-xl font-black text-red-400">
                    599 kr.
                  </span>
                </div>
              </div>

              <button className="btn mt-2" type="submit">
                FORUDBESTIL – 599 KR.
              </button>

              <p className="text-center text-xs text-neutral-500">
                Betaling sker efter bestilling via MobilePay Box 9799GP.
              </p>
            </form>
          </>
        )}
      </section>
    </div>
  )
}