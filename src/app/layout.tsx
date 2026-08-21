import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

/* Self-hosted at build time by next/font — no runtime font requests, which
   matters for a module that must demo with the venue wifi off. */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  title: 'SIREN — Geofenced Alert & Broadcast Service',
  description:
    'Drop-in emergency notifications for any stack: REST API, embeddable widget, and React component. Geofencing, acknowledgement tracking, and an escalation ladder.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
