import RegisterSW from '@/components/RegisterSW'
import type {
  Metadata,
  Viewport,
} from 'next'

import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title:
    'FC Glostruplona | Officiel klubapp',

  description:
    'Kampe, resultater, spillertrup, statistik og klubnyt fra FC Glostruplona.',

  manifest:
    '/manifest.webmanifest',

  applicationName:
    'FC Glostruplona',

  appleWebApp: {
    capable: true,

    title:
      'FC Glostruplona',

    statusBarStyle:
      'black-translucent',
  },

  icons: {
    icon: [
      {
        url:
          '/icon-192.png',

        sizes:
          '192x192',

        type:
          'image/png',
      },

      {
        url:
          '/icon-512.png',

        sizes:
          '512x512',

        type:
          'image/png',
      },
    ],

    apple: [
      {
        url:
          '/icon-192.png',

        sizes:
          '192x192',

        type:
          'image/png',
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor:
    '#070707',

  width:
    'device-width',

  initialScale:
    1,

  viewportFit:
    'cover',
}

export default function RootLayout({
  children,
}: {
  children:
    React.ReactNode
}) {
  return (
    <html lang="da">
      <body className="min-h-screen bg-[#070707]">
        <RegisterSW />

        <Nav />

        <main
          className="
            mx-auto
            min-h-screen
            max-w-7xl
            px-4
            pb-[calc(6.5rem+env(safe-area-inset-bottom))]
            pt-5
            sm:pt-6
            md:pb-12
            md:pt-8
          "
        >
          {children}
        </main>

        <footer
          className="
            hidden
            border-t
            border-white/10
            px-4
            py-10
            text-center
            text-xs
            text-neutral-600
            md:block
          "
        >
          <div className="font-black uppercase tracking-[.16em] text-neutral-500">
            FC Glostruplona
          </div>

          <div className="mt-2">
            Stiftet 2025 · Glostrup Nou · Mesterrækken · @fcglostruplona
          </div>
        </footer>
      </body>
    </html>
  )
}