/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@adaptive-tutor/core'],
  // v83: the PDF reader (unpdf) is loaded from node_modules at run time, not bundled (bundling gives an import.meta warning).
  serverExternalPackages: ['unpdf'],

  // CORS for /api/* — only relevant if a separately-hosted frontend (e.g. a
  // standalone Bolt app) calls this API directly rather than the pages in
  // apps/web/app being ported into it. See docs/bolt-integration.md.
  // BOLT_FRONTEND_ORIGIN is unset by default, which means these headers are
  // omitted entirely and cross-origin calls are blocked as normal — this is
  // opt-in, not a wildcard-open API.
  async headers() {
    const origin = process.env.BOLT_FRONTEND_ORIGIN;
    // v112: safe browser protections on every page. Deliberately NOT included: a Content-Security-Policy (needs a careful trial on
    // the live site first, or it can break pages) and HSTS (the host already sends it).
    const safety = {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
      ],
    };
    if (!origin) return [safety];
    return [
      safety,
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: origin },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
