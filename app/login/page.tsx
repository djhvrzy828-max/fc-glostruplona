'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Page() {
  const [error, setError] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const router =
    useRouter()

  async function submit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const fd =
        new FormData(
          e.currentTarget
        )

      const s =
        createClient()

      const {
        error,
      } =
        await s.auth.signInWithPassword(
          {
            email: String(
              fd.get('email')
            ),

            password:
              String(
                fd.get(
                  'password'
                )
              ),
          }
        )

      if (error) {
        setError(
          'Forkert email eller adgangskode'
        )

        return
      }

      router.push(
        '/admin'
      )

      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fcg-page fcg-fade-in flex min-h-[75vh] items-center justify-center py-8 sm:py-12">

      <section
        className="
          relative
          w-full
          max-w-md
          overflow-hidden
          rounded-[30px]
          border
          border-white/10
          bg-black
          p-6
          shadow-[0_30px_90px_rgba(0,0,0,.6)]
          sm:p-8
        "
      >
        {/* GLOW */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-700/15 blur-[90px]" />

        <div className="pointer-events-none absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-red-950/20 blur-[80px]" />

        <div className="relative z-10">

          {/* LOGO */}
          <div
            className="
              mx-auto
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-[24px]
              border
              border-white/10
              bg-white/[0.03]
              shadow-xl
            "
          >
            <Image
              src="/fcg-logo.png"
              alt="FC Glostruplona"
              width={64}
              height={64}
              priority
              className="h-14 w-14 object-contain"
            />
          </div>

          {/* TITLE */}
          <div className="mt-6 text-center">

            <div className="fcg-label">
              Sikker adgang
            </div>

            <h1
              className="
                mt-2
                text-3xl
                font-black
                uppercase
                tracking-[-.04em]
                sm:text-4xl
              "
            >
              FCG
              <span className="text-red-500">
                {' '}
                ADMIN
              </span>
            </h1>

            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Kun godkendte administratorer
              har adgang til klubbens
              kontrolpanel.
            </p>
          </div>

          {/* FORM */}
          <form
            onSubmit={
              submit
            }
            className="mt-7 grid gap-4"
          >
            <div>
              <label className="label mb-2 block">
                Email
              </label>

              <input
                className="input w-full"
                name="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label mb-2 block">
                Adgangskode
              </label>

              <input
                className="input w-full"
                name="password"
                type="password"
                placeholder="Adgangskode"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div
                className="
                  rounded-[16px]
                  border
                  border-red-500/20
                  bg-red-950/20
                  p-3
                  text-sm
                  font-bold
                  text-red-300
                "
              >
                {error}
              </div>
            )}

            <button
              className="btn mt-1 min-h-[52px]"
              type="submit"
              disabled={
                loading
              }
            >
              {loading
                ? 'LOGGER IND...'
                : 'LOG IND'}
            </button>
          </form>

          {/* FOOTER */}
          <div
            className="
              mt-6
              border-t
              border-white/[0.07]
              pt-5
              text-center
            "
          >
            <div className="text-[9px] font-black uppercase tracking-[.2em] text-neutral-700">
              FC GLOSTRUPLONA · EST. 2025
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}