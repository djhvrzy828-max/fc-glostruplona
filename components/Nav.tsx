'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

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
    icon: '⌂',
  },
  {
    href: '/kampe',
    label: 'Kampe',
    icon: '⚽',
  },
  {
    href: '/tabel',
    label: 'Tabel',
    icon: '▤',
  },
  {
    href: '/trup',
    label: 'Trup',
    icon: '♟',
  },
]

export default function Nav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/') {
      return pathname === '/'
    }

    return pathname.startsWith(href)
  }

  return (
    <>
      {/* DESKTOP / TOP HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#120d0b]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src="/fcg-logo.png"
              alt="FC Glostruplona"
              width={46}
              height={46}
              priority
            />

            <div>
              <div className="font-black tracking-wide">
                FC GLOSTRUPLONA
              </div>

              <div className="text-xs text-neutral-400">
                Øl, Damer & Sammenspil
              </div>
            </div>
          </Link>

          <nav className="ml-auto hidden items-center gap-5 md:flex">
            {desktopLinks.map(([href, label]) => {
              const active = isActive(href)

              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    active
                      ? 'text-sm font-black text-white'
                      : 'text-sm font-bold text-neutral-400 transition hover:text-white'
                  }
                >
                  {label}
                </Link>
              )
            })}

            <Link
              href="/login"
              className="text-sm font-bold text-red-300 transition hover:text-red-200"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* MORE MENU */}
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Luk menu"
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-[60] bg-black/60 md:hidden"
          />

          <div className="fixed bottom-[86px] left-4 right-4 z-[70] rounded-3xl border border-white/10 bg-[#18110e] p-3 shadow-2xl md:hidden">
            <div className="mb-2 px-3 py-2 text-xs font-black uppercase tracking-widest text-neutral-500">
              Mere
            </div>

            <Link
              href="/statistik"
              onClick={() => setMoreOpen(false)}
              className="flex items-center justify-between rounded-2xl px-4 py-4 font-bold hover:bg-white/5"
            >
              <span>Statistik</span>
              <span className="text-neutral-500">›</span>
            </Link>

            <Link
              href="/shop"
              onClick={() => setMoreOpen(false)}
              className="flex items-center justify-between rounded-2xl px-4 py-4 font-bold hover:bg-white/5"
            >
              <span>Shop</span>
              <span className="text-neutral-500">›</span>
            </Link>

            <Link
              href="/login"
              onClick={() => setMoreOpen(false)}
              className="flex items-center justify-between rounded-2xl px-4 py-4 font-bold text-red-300 hover:bg-white/5"
            >
              <span>Admin</span>
              <span className="text-neutral-500">›</span>
            </Link>
          </div>
        </>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="
          fixed bottom-0 left-0 right-0 z-50
          border-t border-white/10
          bg-[#120d0b]/95
          px-2 pt-2
          backdrop-blur-xl
          md:hidden
        "
        style={{
          paddingBottom:
            'max(8px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {mobileLinks.map((item) => {
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl"
              >
                <span
                  className={
                    active
                      ? 'flex h-7 min-w-10 items-center justify-center rounded-full bg-red-900/60 px-2 text-lg text-white'
                      : 'flex h-7 min-w-10 items-center justify-center px-2 text-lg text-neutral-500'
                  }
                >
                  {item.icon}
                </span>

                <span
                  className={
                    active
                      ? 'text-[11px] font-black text-white'
                      : 'text-[11px] font-bold text-neutral-500'
                  }
                >
                  {item.label}
                </span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl"
          >
            <span
              className={
                moreOpen ||
                pathname.startsWith('/statistik') ||
                pathname.startsWith('/shop')
                  ? 'flex h-7 min-w-10 items-center justify-center rounded-full bg-red-900/60 px-2 text-xl font-black text-white'
                  : 'flex h-7 min-w-10 items-center justify-center px-2 text-xl font-black text-neutral-500'
              }
            >
              •••
            </span>

            <span
              className={
                moreOpen ||
                pathname.startsWith('/statistik') ||
                pathname.startsWith('/shop')
                  ? 'text-[11px] font-black text-white'
                  : 'text-[11px] font-bold text-neutral-500'
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