import { createHash } from 'crypto';

/** Daily-rotating visitor hash. The raw IP address and browser string are never stored; tomorrow the same person gets a different hash.
 *  Set ANALYTICS_SALT (any long random text) on the server for a hash nobody else can reproduce. */
export function visitorHash(ip: string, ua: string, day: string): string {
  const salt = process.env.ANALYTICS_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sahayak-analytics';
  return createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('hex').slice(0, 32);
}

/** v76: pseudonymous id of a browser for matching a tracked-link arrival to the account made later. A salted hash of the device cookie: not the cookie itself, no IP, no user agent. */
export function anonId(deviceCookie: string): string {
  const salt = process.env.ANALYTICS_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sahayak-analytics';
  return createHash('sha256').update(`${salt}|acq|${deviceCookie}`).digest('hex').slice(0, 32);
}
