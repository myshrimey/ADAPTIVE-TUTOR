// v79: invitation tokens. 32 random bytes → HMAC-SHA256(server secret, nonce) → base64url (43 chars, unguessable).
// Only sha256(token) is used to look an invitation up; the nonce is stored so the founder can re-show the link, but the nonce is useless without the server secret.
const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer | Uint8Array) => { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export function inviteSecret(): string { return process.env.INVITE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''; }
export async function sha256Hex(s: string): Promise<string> { const d = await crypto.subtle.digest('SHA-256', enc.encode(s)); return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, '0')).join(''); }
export async function tokenFromNonce(nonce: string, secret = inviteSecret()): Promise<string> {
  if (!secret) throw new Error('invite_secret_missing');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(nonce)));
}
export function newNonce(): string { const b = new Uint8Array(32); crypto.getRandomValues(b); return b64u(b); }
export const looksLikeToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);
export async function newToken(): Promise<{ token: string; nonce: string; hash: string }> { const nonce = newNonce(); const token = await tokenFromNonce(nonce); return { token, nonce, hash: await sha256Hex(token) }; }
