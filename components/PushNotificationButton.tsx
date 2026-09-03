'use client'

import { useState } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat(
    (4 - (base64String.length % 4)) % 4
  )

  const base64 = (
    base64String + padding
  )
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0)
    )
  )
}

export default function PushNotificationButton() {
  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  async function enableNotifications() {
    try {
      setLoading(true)
      setMessage('')

      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setMessage(
          'Din enhed understøtter ikke push-notifikationer.'
        )
        return
      }

      const permission =
        await Notification.requestPermission()

      if (permission !== 'granted') {
        setMessage(
          'Du skal tillade notifikationer for at aktivere dem.'
        )
        return
      }

      const registration =
        await navigator.serviceWorker.ready

      const publicKey =
        process.env
          .NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!publicKey) {
        setMessage(
          'VAPID public key mangler.'
        )
        return
      }

      const existingSubscription =
        await registration.pushManager.getSubscription()

      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(
              publicKey
            ),
        }))

      const response = await fetch(
        '/api/push/subscribe',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(
            subscription.toJSON()
          ),
        }
      )

      if (!response.ok) {
        throw new Error(
          'Kunne ikke gemme abonnement.'
        )
      }

      setMessage(
        '✅ Notifikationer er aktiveret!'
      )
    } catch (error) {
      console.error(error)

      setMessage(
        'Der opstod en fejl. Prøv igen.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={enableNotifications}
        disabled={loading}
        className="rounded-xl bg-red-800 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {loading
          ? 'Aktiverer...'
          : '🔔 Aktivér notifikationer'}
      </button>

      {message && (
        <p className="text-sm text-neutral-400">
          {message}
        </p>
      )}
    </div>
  )
}