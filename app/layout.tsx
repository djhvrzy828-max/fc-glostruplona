import './globals.css'
import Nav from '@/components/Nav'
export const metadata={title:'FC Glostruplona | Officiel hjemmeside',description:'Kampe, resultater, spillertrup, statistik og merchandise fra FC Glostruplona.'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="da"><body><Nav/><main className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-8 md:pb-10">{children}</main><footer className="border-t border-white/10 px-4 py-10 text-center text-sm text-neutral-500">FC Glostruplona · Stiftet 1142 · Glostrup Nou · 9. divisionen · @fcglostruplona</footer></body></html>}
