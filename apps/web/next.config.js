/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@adaptive-tutor/core'],

  // CORS for /api/* — only relevant if a separately-hosted frontend (e.g. a
  // standalone Bolt app) calls this API directly rather than the pages in
  // apps/web/app being ported into it. See docs/bolt-integration.md.
  // BOLT_FRONTEND_ORIGIN is unset by default, which means these headers are
  // omitted entirely and cross-origin calls are blocked as normal — this is
  // opt-in, not a wildcard-open API.
  async headers() {
    const origin = process.env.BOLT_FRONTEND_ORIGIN;
    if (!origin) return [];
    return [
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
