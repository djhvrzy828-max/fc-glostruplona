'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function AdminDashboard() {
  const [sending, setSending] =
    useState(false)

  const [message, setMessage] =
    useState('')

  async function sendTestNotification() {
    try {
      setSending(true)
      setMessage('')

      const response = await fetch(
        '/api/push/test',
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        throw new Error(
          'Kunne ikke sende testnotifikation.'
        )
      }

      setMessage(
        '✅ Testnotifikationen blev sendt.'
      )
    } catch (error) {
      console.error(error)

      setMessage(
        '❌ Der opstod en fejl.'
      )
    } finally {
      setSending(false)
    }
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
            Administration
          </div>

          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-5xl">
            ADMIN
            <span className="text-red-500">
              {' '}
              DASHBOARD
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
            Administrér kampe, spillere,
            holdkort, meddelelser og resten af
            FC Glostruplona-appen.
          </p>
        </div>
      </section>

      {/* ==================================================
          QUICK ACTIONS
         ================================================== */}

      <section>
        <div className="mb-4">
          <div className="fcg-label">
            Hurtig adgang
          </div>

          <h2 className="fcg-heading mt-1">
            Administration
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/kampe"
            className="card p-5 transition hover:border-red-500/30"
          >
            <div className="text-2xl">
              ⚽
            </div>

            <div className="mt-3 text-lg font-black">
              Kampe
            </div>

            <div className="mt-1 text-sm text-neutral-500">
              Events, lineup og MOTM
            </div>
          </Link>

          <Link
            href="/admin/spillere"
            className="card p-5 transition hover:border-red-500/30"
          >
            <div className="text-2xl">
              👥
            </div>

            <div className="mt-3 text-lg font-black">
              Spillere
            </div>

            <div className="mt-1 text-sm text-neutral-500">
              Trup og spillerdata
            </div>
          </Link>

          <Link
            href="/admin/meddelelser"
            className="card p-5 transition hover:border-red-500/30"
          >
            <div className="text-2xl">
              📣
            </div>

            <div className="mt-3 text-lg font-black">
              Meddelelser
            </div>

            <div className="mt-1 text-sm text-neutral-500">
              Forside og push
            </div>
          </Link>

          <Link
            href="/"
            className="card p-5 transition hover:border-red-500/30"
          >
            <div className="text-2xl">
              👁️
            </div>

            <div className="mt-3 text-lg font-black">
              Se appen
            </div>

            <div className="mt-1 text-sm text-neutral-500">
              Tilbage til forsiden
            </div>
          </Link>
        </div>
      </section>

      {/* ==================================================
          PUSH TEST
         ================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-[26px]
          border
          border-white/10
          bg-[#0d0d0d]
          p-5
          shadow-xl
          sm:p-7
        "
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-700/10 blur-[70px]" />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="fcg-label">
              Push-notifikationer
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Test notifikationer
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
              Sender en testnotifikation til
              alle telefoner, der har aktiveret
              notifikationer.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={
                sendTestNotification
              }
              disabled={sending}
              className="
                btn
                min-w-[220px]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {sending
                ? 'SENDER...'
                : '🔔 SEND TESTNOTIFIKATION'}
            </button>

            {message && (
              <p className="mt-3 text-sm text-neutral-300">
                {message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          ADMIN NOTE
         ================================================== */}

      <section
        className="
          rounded-[22px]
          border
          border-white/[0.07]
          bg-white/[0.025]
          p-4
        "
      >
        <div className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-600">
          FCG ADMIN
        </div>

        <div className="mt-2 text-sm leading-6 text-neutral-500">
          Brug admin til at opdatere
          kampdata, startopstillinger,
          spillerstatistik og
          klubmeddelelser.
        </div>
      </section>

    </div>
  )
}