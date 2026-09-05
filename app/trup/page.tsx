import Image from 'next/image'
import Link from 'next/link'

import {
  createServerSupabase,
} from '@/lib/supabase-server'

export const dynamic =
  'force-dynamic'

export default async function Page() {
  let players: any[] = []

  try {
    const s =
      await createServerSupabase()

    const {
      data,
      error,
    } = await s
      .from('players')
      .select('*')
      .eq('active', true)
      .order('shirt_number')

    if (error) {
      console.error(
        'SQUAD PAGE ERROR:',
        error
      )
    }

    players =
      data || []
  } catch (error) {
    console.error(
      'SQUAD PAGE ERROR:',
      error
    )
  }

  return (
    <div className="fcg-page fcg-fade-in space-y-10 md:space-y-14">

      {/* ==================================================
          HERO
         ================================================== */}

      <section
        className="
          relative
          -mx-4
          -mt-5
          min-h-[420px]
          overflow-hidden
          border-b
          border-white/10
          bg-black
          sm:mx-0
          sm:mt-0
          sm:min-h-[460px]
          sm:rounded-[30px]
          sm:border
        "
      >
        <Image
          src="/media/squad-hero.jpg"
          alt="FC Glostruplona truppen"
          fill
          priority
          sizes="100vw"
          className="
            object-cover
            object-center
            opacity-75
            saturate-[.82]
            contrast-[1.12]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-black/20
            via-black/50
            to-[#070707]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-r
            from-red-950/30
            via-transparent
            to-black/20
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-24
            top-10
            h-72
            w-72
            rounded-full
            bg-red-700/20
            blur-[100px]
          "
        />

        <div
          className="
            relative
            z-10
            flex
            min-h-[420px]
            flex-col
            justify-end
            p-6
            sm:min-h-[460px]
            sm:p-8
            md:p-10
          "
        >
          <div className="fcg-label">
            FC Glostruplona
          </div>

          <h1 className="fcg-title mt-2">
            TRUPPEN
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-300 sm:text-base">
            Spillerne bag FC Glostruplona.
            Se profiler, statistik og
            alt om holdet.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">

            <div className="fcg-badge">
              {players.length} spillere
            </div>

            <div className="fcg-badge">
              Mesterrækken
            </div>

            <div className="fcg-badge">
              Est. 2025
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================
          PLAYERS
         ================================================== */}

      <section>

        <div className="mb-5">

          <div className="fcg-label">
            Holdet
          </div>

          <h2 className="fcg-heading mt-1">
            Spillere
          </h2>

        </div>

        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {players.map(
            (
              p
            ) => (
              <Link
                href={`/trup/${p.id}`}
                key={p.id}
                className="
                  group
                  relative
                  min-h-[230px]
                  overflow-hidden
                  rounded-[24px]
                  border
                  border-white/10
                  bg-[#0b0b0b]
                  shadow-[0_20px_60px_rgba(0,0,0,.45)]
                  transition
                  duration-300
                  hover:-translate-y-1
                  hover:border-red-500/30
                  hover:shadow-[0_25px_80px_rgba(150,0,0,.15)]
                "
              >

                {/* SHARED CINEMATIC BACKGROUND */}
                <Image
                  src="/media/team-action.jpg"
                  alt={`${p.first_name} ${p.last_name}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="
                    object-cover
                    object-center
                    opacity-25
                    grayscale
                    transition
                    duration-500
                    group-hover:scale-[1.03]
                    group-hover:opacity-35
                  "
                />

                <div
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-b
                    from-black/10
                    via-black/45
                    to-black/95
                  "
                />

                <div
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-r
                    from-red-950/20
                    via-transparent
                    to-transparent
                  "
                />

                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-10
                    -top-10
                    h-32
                    w-32
                    rounded-full
                    bg-red-700/10
                    blur-[60px]
                  "
                />

                <div
                  className="
                    relative
                    z-10
                    flex
                    min-h-[230px]
                    flex-col
                    justify-between
                    p-5
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-3
                    "
                  >
                    <div
                      className="
                        text-5xl
                        font-black
                        tracking-[-.06em]
                        text-red-400
                        drop-shadow-xl
                        sm:text-6xl
                      "
                    >
                      #
                      {
                        p.shirt_number
                      }
                    </div>

                    <div className="fcg-badge">
                      {p.position ||
                        'SPILLER'}
                    </div>
                  </div>

                  <div>

                    <div
                      className="
                        text-[10px]
                        font-black
                        uppercase
                        tracking-[.18em]
                        text-red-400
                      "
                    >
                      FC Glostruplona
                    </div>

                    <h3
                      className="
                        mt-2
                        text-2xl
                        font-black
                        uppercase
                        leading-[.95]
                        tracking-[-.03em]
                        sm:text-3xl
                      "
                    >
                      {
                        p.first_name
                      }

                      <br />

                      {
                        p.last_name
                      }
                    </h3>

                    <div
                      className="
                        mt-4
                        text-xs
                        font-black
                        uppercase
                        tracking-[.12em]
                        text-neutral-500
                        transition
                        group-hover:text-red-400
                      "
                    >
                      SE SPILLERPROFIL →
                    </div>

                  </div>

                </div>
              </Link>
            )
          )}
        </div>

        {!players.length && (
          <div className="card p-8 text-center">

            <div className="text-4xl">
              👕
            </div>

            <div className="mt-4 text-xl font-black">
              Ingen spillere endnu
            </div>

            <div className="mt-2 text-sm text-neutral-400">
              Spillertruppen bliver vist her.
            </div>

          </div>
        )}

      </section>

      {/* ==================================================
          STAFF
         ================================================== */}

      <section>

        <div className="mb-5">

          <div className="fcg-label">
            Staff
          </div>

          <h2 className="fcg-heading mt-1">
            Trænerstab
          </h2>

        </div>

        <div
          className="
            grid
            gap-4
            md:grid-cols-2
          "
        >

          {/* HEAD COACH */}
          <div
            className="
              relative
              overflow-hidden
              rounded-[24px]
              border
              border-white/10
              bg-gradient-to-br
              from-[#15100f]
              via-[#0c0c0c]
              to-black
              p-6
              shadow-xl
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                -right-16
                -top-16
                h-44
                w-44
                rounded-full
                bg-red-700/10
                blur-[70px]
              "
            />

            <div className="relative z-10">

              <div
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[.2em]
                  text-red-400
                "
              >
                CHEFTRÆNER
              </div>

              <div
                className="
                  mt-3
                  text-2xl
                  font-black
                  uppercase
                "
              >
                William Grønholt
              </div>

              <div
                className="
                  mt-4
                  text-xs
                  font-bold
                  uppercase
                  tracking-[.12em]
                  text-neutral-600
                "
              >
                FC GLOSTRUPLONA
              </div>

            </div>
          </div>

          {/* ASSISTANT */}
          <div
            className="
              relative
              overflow-hidden
              rounded-[24px]
              border
              border-white/10
              bg-gradient-to-br
              from-[#15100f]
              via-[#0c0c0c]
              to-black
              p-6
              shadow-xl
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                -right-16
                -top-16
                h-44
                w-44
                rounded-full
                bg-red-700/10
                blur-[70px]
              "
            />

            <div className="relative z-10">

              <div
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[.2em]
                  text-red-400
                "
              >
                ASSISTENTTRÆNER
              </div>

              <div
                className="
                  mt-3
                  text-2xl
                  font-black
                  uppercase
                "
              >
                Gustav Lundø
              </div>

              <div
                className="
                  mt-4
                  text-xs
                  font-bold
                  uppercase
                  tracking-[.12em]
                  text-neutral-600
                "
              >
                FC GLOSTRUPLONA
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ==================================================
          BRAND END
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
          sm:p-12
        "
      >

        <div
          className="
            pointer-events-none
            absolute
            left-1/2
            top-0
            h-48
            w-80
            -translate-x-1/2
            rounded-full
            bg-red-700/15
            blur-[90px]
          "
        />

        <div className="relative z-10">

          <Image
            src="/fcg-logo.png"
            alt="FC Glostruplona"
            width={90}
            height={90}
            className="mx-auto h-auto w-20"
          />

          <div
            className="
              mt-5
              text-2xl
              font-black
              uppercase
              tracking-[-.03em]
              sm:text-4xl
            "
          >
            ÉT HOLD.
            <br />
            ÉN KLUB.
          </div>

          <div
            className="
              mt-3
              text-[10px]
              font-black
              uppercase
              tracking-[.25em]
              text-red-400
            "
          >
            FC GLOSTRUPLONA
          </div>

        </div>

      </section>

    </div>
  )
}