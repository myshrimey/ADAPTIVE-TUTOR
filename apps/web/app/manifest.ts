import type { MetadataRoute } from 'next';

// v102: makes Sahayak installable as an app (add to Home Screen / install on a computer).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sahayak - Adaptive CBSE Class 10 Tutor',
    short_name: 'Sahayak',
    description: 'Measure your growth, master your subjects.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbf9f4',
    theme_color: '#1b2a4a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
