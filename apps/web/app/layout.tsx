import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { Footer } from '@/components/Footer';
import { TrackPageView } from '@/components/TrackPageView';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import { LanguageProvider } from '@/components/LanguageProvider';
import { getServerLang } from '@/lib/language';
import 'katex/dist/katex.min.css';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Sahayak — Adaptive CBSE Class 10 Tutor',
  icons: { icon: [{ url: '/icon-32.png', sizes: '32x32' }, { url: '/icon-192.png', sizes: '192x192' }], apple: '/apple-touch-icon.png' },
  openGraph: { title: 'Sahayak — Measure Your Growth, Master Your Subjects', images: [{ url: '/logo.png' }] },
  description: 'CBSE Class 10 board preparation: find learning gaps, practise with a personalised plan, and track progress toward the 2027 board exams.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialLang = await getServerLang();
  return (
    <html lang={initialLang} className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <LanguageProvider initialLang={initialLang}>
          <SiteHeader />
          <TrackPageView />
          {children}
          <Footer />
          <FeedbackWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
