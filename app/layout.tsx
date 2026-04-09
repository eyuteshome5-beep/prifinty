import type { Metadata } from 'next'
import { Geist, Geist_Mono, Noto_Sans_Ethiopic } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'
import { LanguageProvider } from '@/lib/language-context'
import { AppBackground } from '@/components/app-background'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const notoEthiopic = Noto_Sans_Ethiopic({ 
  subsets: ["ethiopic"], 
  variable: "--font-ethiopic",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: 'Prefinity - AI-Powered Recommendations',
  description: 'Discover personalized recommendations for movies, music, and books with special focus on Ethiopian content. Powered by AI recommendation engine.',
  keywords: ['recommendations', 'movies', 'music', 'books', 'Ethiopian', 'AI', 'personalized'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${notoEthiopic.variable} scroll-smooth`}>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <AuthProvider>
          <LanguageProvider>
            <AppBackground />
            {children}
            <Toaster position="top-right" richColors />
          </LanguageProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
