'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const desktopLinks = [
  ['/', 'Oversigt'],
  ['/kampe', 'Kampe'],
  ['/tabel', 'Tabel'],
  ['/trup', 'Trup'],
  ['/statistik', 'Statistik'],
  ['/shop', 'Shop'],
]

const mobileLinks = [
  {
    href: '/',
    label: 'Hjem',
    icon: 'home',
  },
  {
    href: '/kampe',
    label: 'Kampe',
    icon: 'ball',
  },
  {
    href: '/trup',
    label: 'Trup',
    icon: 'team',
  },
  {
    href: '/statistik',
    label: 'Stat',
    icon: 'stats',
  },
]


function NavIcon({
  name,
}: {
  name: string
}) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13v-9.5" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    )
  }

  if (name === 'ball') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m9.2 9.4 2.8-2 2.8 2-1.1 3.3h-3.4z" />
        <path d="m12 7.4-.9-3M14.8 9.4l3-1M13.7 12.7l2 2.7M10.3 12.7l-2 2.7M9.2 9.4l-3-1" />
      </svg>
    )
  }

  if (name === 'team') {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6" />
        <circle cx="17" cy="9" r="2.2" />
        <path d="M15.5 14.5c3.1-.6 5 1.2 5.5 4.5" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M5 19V9M12 19V5M19 19v-7" />
      <path d="M3 19h18" />
    </svg>
  )
}

export default function Nav() {
  const pathname = usePathname()

  const [
    moreOpen,
    setMoreOpen,
  ] = useState(false)

  function isActive(
    href: string
  ) {
    if (href === '/') {
      return pathname === '/'
    }

    return pathname.startsWith(
      href
    )
  }

  /*
   * Luk MORE automatisk
   * når siden ændres.
   */
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  const moreIsActive =
    moreOpen ||
    pathname.startsWith(
      '/tabel'
    ) ||
    pathname.startsWith(
      '/shop'
    ) ||
    pathname.startsWith(
      '/login'
    )

  return (
    <>
      {/* =================================================
          TOP HEADER
         ================================================= */}

      <header
        className="
          sticky
          top-0
          z-50
          border-b
          border-white/[0.07]
          bg-[#070707]/82
          shadow-[0_12px_40px_rgba(0,0,0,.22)]
          backdrop-blur-2xl
        "
      >
        <div
          className="
            mx-auto
            flex
            max-w-7xl
            items-center
            px-4
            py-2.5
            md:py-3
          "
        >
          {/* BRAND */}
          <Link
            href="/"
            className="
              group
              flex
              min-w-0
              items-center
              gap-3
            "
          >
            <div
              className="
                relative
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-xl
                border
                border-white/10
                bg-white/[0.03]
                shadow-[0_8px_25px_rgba(0,0,0,.45)]
                md:h-12
                md:w-12
              "
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-black" />

              <Image
                src="/fcg-logo.png"
                alt="FC Glostruplona"
                width={48}
                height={48}
                priority
                className="
                  relative
                  z-10
                  h-10
                  w-10
                  object-contain
                  transition
                  duration-300
                  group-hover:scale-105
                  md:h-11
                  md:w-11
                "
              />
            </div>

            <div className="min-w-0">
              <div
                className="
                  truncate
                  text-sm
                  font-black
                  uppercase
                  tracking-[.03em]
                  text-white
                  sm:text-base
                "
              >
                FC Glostruplona
              </div>

              <div
                className="
                  mt-0.5
                  hidden
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[.18em]
                  text-red-400
                  sm:block
                  sm:text-[10px]
                "
              >
                Mere end fodbold
              </div>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav
            className="
              ml-auto
              hidden
              items-center
              gap-1
              md:flex
            "
          >
            {desktopLinks.map(
              ([href, label]) => {
                const active =
                  isActive(
                    href
                  )

                return (
                  <Link
                    key={href}
                    href={href}
                    className={
                      active
                        ? `
                          relative
                          rounded-xl
                          bg-white/[0.06]
                          px-3.5
                          py-2
                          text-sm
                          font-black
                          text-white
                          shadow-[inset_0_-2px_0_rgba(220,38,38,.85)]
                        `
                        : `
                          rounded-xl
                          px-3.5
                          py-2
                          text-sm
                          font-bold
                          text-neutral-500
                          transition
                          hover:bg-white/[0.04]
                          hover:text-white
                        `
                    }
                  >
                    {label}
                  </Link>
                )
              }
            )}

            <Link
              href="/login"
              className="
                ml-2
                rounded-xl
                border
                border-red-500/20
                bg-red-950/20
                px-3.5
                py-2
                text-sm
                font-black
                text-red-300
                transition
                hover:border-red-500/40
                hover:bg-red-950/40
                hover:text-white
              "
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* =================================================
          MOBILE MORE OVERLAY
         ================================================= */}

      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Luk menu"
            onClick={() =>
              setMoreOpen(false)
            }
            className="
              fixed
              inset-0
              z-[60]
              bg-black/75
              backdrop-blur-sm
              md:hidden
            "
          />

          <div
            className="
              fixed
              bottom-[calc(78px+env(safe-area-inset-bottom))]
              left-3
              right-3
              z-[70]
              overflow-hidden
              rounded-[26px]
              border
              border-white/10
              bg-[#0d0d0d]/95
              p-3
              shadow-[0_30px_90px_rgba(0,0,0,.75)]
              backdrop-blur-2xl
              md:hidden
            "
          >
            {/* GLOW */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-700/15 blur-[60px]" />

            <div className="relative z-10">
              <div className="px-3 pb-2 pt-1">
                <div className="text-[10px] font-black uppercase tracking-[.22em] text-red-400">
                  Mere
                </div>

                <div className="mt-1 text-lg font-black">
                  FC Glostruplona
                </div>
              </div>

              <div className="mt-2 grid gap-1">
                <Link
                  href="/tabel"
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-2xl
                    px-4
                    py-3.5
                    font-black
                    transition
                    hover:bg-white/[0.05]
                  "
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      🏆
                    </span>

                    <span>
                      Tabel
                    </span>
                  </div>

                  <span className="text-neutral-600">
                    ›
                  </span>
                </Link>

                <Link
                  href="/shop"
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-2xl
                    px-4
                    py-3.5
                    font-black
                    transition
                    hover:bg-white/[0.05]
                  "
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      🛍️
                    </span>

                    <span>
                      Shop
                    </span>
                  </div>

                  <span className="text-neutral-600">
                    ›
                  </span>
                </Link>

                <div className="my-1 border-t border-white/[0.06]" />

                <Link
                  href="/login"
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-2xl
                    bg-red-950/20
                    px-4
                    py-3.5
                    font-black
                    text-red-300
                    transition
                    hover:bg-red-950/40
                  "
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      ⚙️
                    </span>

                    <span>
                      Admin
                    </span>
                  </div>

                  <span className="text-red-900">
                    ›
                  </span>
                </Link>
              </div>

              <div
                className="
                  mt-3
                  rounded-2xl
                  border
                  border-white/[0.06]
                  bg-white/[0.025]
                  px-4
                  py-3
                  text-center
                "
              >
                <div className="text-[9px] font-black uppercase tracking-[.18em] text-neutral-600">
                  Mesterrækken · Est. 2025
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================================================
          MOBILE BOTTOM NAV
         ================================================= */}

      <nav
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-50
          border-t
          border-white/[0.08]
          bg-[#070707]/92
          px-2
          pt-1.5
          shadow-[0_-18px_55px_rgba(0,0,0,.58)]
          backdrop-blur-2xl
          md:hidden
        "
        style={{
          paddingBottom:
            'max(7px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          className="
            mx-auto
            grid
            max-w-md
            grid-cols-5
            gap-1
          "
        >
          {mobileLinks.map(
            (item) => {
              const active =
                isActive(
                  item.href
                )

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className="
                    relative
                    flex
                    min-h-[58px]
                    flex-col
                    items-center
                    justify-center
                    gap-1
                    rounded-2xl
                    transition
                    active:scale-[.96]
                  "
                >
                  {active && (
                    <>
                      <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />

                      <div className="pointer-events-none absolute left-1/2 top-1 h-8 w-14 -translate-x-1/2 rounded-full bg-red-700/10 blur-xl" />
                    </>
                  )}

                  <span
                    className={
                      active
                        ? `
                          relative
                          z-10
                          flex
                          h-8
                          min-w-10
                          items-center
                          justify-center
                          rounded-full
                          bg-red-950/60
                          px-2
                          text-lg
                          text-red-300
                          shadow-[0_0_18px_rgba(220,38,38,.18)]
                        `
                        : `
                          relative
                          z-10
                          flex
                          h-8
                          min-w-10
                          items-center
                          justify-center
                          px-2
                          text-lg
                          text-neutral-600
                        `
                    }
                  >
                    <NavIcon name={item.icon} />
                  </span>

                  <span
                    className={
                      active
                        ? 'relative z-10 text-[10px] font-black uppercase tracking-[.05em] text-white'
                        : 'relative z-10 text-[10px] font-bold uppercase tracking-[.05em] text-neutral-600'
                    }
                  >
                    {
                      item.label
                    }
                  </span>
                </Link>
              )
            }
          )}

          {/* MORE */}
          <button
            type="button"
            onClick={() =>
              setMoreOpen(
                (value) =>
                  !value
              )
            }
            className="
              relative
              flex
              min-h-[58px]
              flex-col
              items-center
              justify-center
              gap-1
              rounded-2xl
              transition
              active:scale-[.96]
            "
          >
            {moreIsActive && (
              <>
                <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />

                <div className="pointer-events-none absolute left-1/2 top-1 h-8 w-14 -translate-x-1/2 rounded-full bg-red-700/10 blur-xl" />
              </>
            )}

            <span
              className={
                moreIsActive
                  ? `
                    relative
                    z-10
                    flex
                    h-8
                    min-w-10
                    items-center
                    justify-center
                    rounded-full
                    bg-red-950/60
                    px-2
                    text-xl
                    font-black
                    tracking-[.08em]
                    text-red-300
                  `
                  : `
                    relative
                    z-10
                    flex
                    h-8
                    min-w-10
                    items-center
                    justify-center
                    px-2
                    text-xl
                    font-black
                    tracking-[.08em]
                    text-neutral-600
                  `
              }
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </span>

            <span
              className={
                moreIsActive
                  ? 'relative z-10 text-[10px] font-black uppercase tracking-[.05em] text-white'
                  : 'relative z-10 text-[10px] font-bold uppercase tracking-[.05em] text-neutral-600'
              }
            >
              Mere
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}