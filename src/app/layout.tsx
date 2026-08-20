import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SIREN — Geofenced Alert & Broadcast Service',
  description:
    'Drop-in emergency notifications for any stack: REST API, embeddable widget, and React component. Geofencing, acknowledgement tracking, and an escalation ladder.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
