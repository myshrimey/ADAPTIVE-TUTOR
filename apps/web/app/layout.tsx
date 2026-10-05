import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { FeedbackWidget } from '@/components/FeedbackWidget';
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
  description: 'An adaptive 1-to-1 tutor for CBSE Class 10 Maths and Science. Same syllabus, a different path for every student.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
