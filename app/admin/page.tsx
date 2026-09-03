'use client'

import { useState } from 'react'

export default function AdminDashboard() {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

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
    <div className="space-y-8">
      <div>
        <div className="text-xs font-black uppercase tracking-[.25em] text-red-400">
          Administration
        </div>

        <h1 className="mt-2 text-4xl font-black">
          Admin Dashboard
        </h1>
      </div>

      <section className="card p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[.2em] text-red-400">
              Push-notifikationer
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Test notifikationer 🔔
            </h2>

            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              Sender en testnotifikation til
              alle telefoner, der har
              aktiveret notifikationer.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={sendTestNotification}
              disabled={sending}
              className="rounded-xl bg-red-800 px-5 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending
                ? 'Sender...'
                : '🔔 Send testnotifikation'}
            </button>

            {message && (
              <p className="mt-3 text-sm text-neutral-300">
                {message}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}