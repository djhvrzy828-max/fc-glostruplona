import RegisterSW from '@/components/RegisterSW'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'FC Glostruplona | Officiel hjemmeside',

  description:
    'Kampe, resultater, spillertrup, statistik og merchandise fra FC Glostruplona.',

  manifest: '/manifest.webmanifest',

  applicationName: 'FC Glostruplona',

  appleWebApp: {
    capable: true,
    title: 'FC Glostruplona',
    statusBarStyle: 'black-translucent',
  },

  icons: {
    icon: [
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],

    apple: [
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#991b1b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <body>
        <RegisterSW />

        <Nav />

        <main className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-8 md:pb-10">
          {children}
        </main>

        <footer className="border-t border-white/10 px-4 py-10 text-center text-sm text-neutral-500">
          FC Glostruplona · Stiftet 1142 · Glostrup Nou ·
          9. divisionen · @fcglostruplona
        </footer>
      </body>
    </html>
  )
}