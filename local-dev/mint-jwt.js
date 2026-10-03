// Mints an HS256 JWT with a `service_role` claim, for talking to the local
// PostgREST stack the way Supabase's real service-role key would. The
// signing secret is generated once and persisted to local-dev/.jwt-secret
// (gitignored) so repeated runs of setup.sh produce a token PostgREST (already
// configured with the same secret) will actually accept.
//
// Usage:
//   node local-dev/mint-jwt.js          -> prints a signed JWT
//   node local-dev/mint-jwt.js secret   -> prints just the secret (for postgrest.conf)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SECRET_PATH = path.join(__dirname, '.jwt-secret');

function getOrCreateSecret() {
  if (fs.existsSync(SECRET_PATH)) return fs.readFileSync(SECRET_PATH, 'utf-8').trim();
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_PATH, secret);
  return secret;
}

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function mint(secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { role: 'service_role', iss: 'adaptive-tutor-local-dev', iat: Math.floor(Date.now() / 1000) };
  const signingInput = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(payload)))}`;
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest();
  return `${signingInput}.${b64url(signature)}`;
}

const secret = getOrCreateSecret();
if (process.argv[2] === 'secret') {
  console.log(secret);
} else {
  console.log(mint(secret));
}
