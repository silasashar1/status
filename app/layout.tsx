import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Service Health Dashboard',
  description: 'Vue.ai',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
     
        <link rel="alternate icon" type="image/png" href="/favicon.png" />
       
      </head>
      <body>{children}</body>
    </html>
  )
}
