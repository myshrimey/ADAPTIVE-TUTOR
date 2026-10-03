// Minimal stand-in for Supabase's hosted API gateway, which rewrites
// /rest/v1/* -> PostgREST's root path. Bare PostgREST has no such prefix.
// This is test-harness plumbing only — not part of the product.
const http = require('http');
const httpProxy = require('http');

const TARGET_PORT = 3001;
const PROXY_PORT = 3002;

const server = http.createServer((req, res) => {
  const newPath = req.url.replace(/^\/rest\/v1/, '');
  const proxyReq = http.request(
    { hostname: 'localhost', port: TARGET_PORT, path: newPath, method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  req.pipe(proxyReq);
  proxyReq.on('error', (err) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: err.message }));
  });
});

server.listen(PROXY_PORT, () => console.log(`rest-proxy listening on ${PROXY_PORT}, forwarding /rest/v1/* -> :${TARGET_PORT}/*`));
