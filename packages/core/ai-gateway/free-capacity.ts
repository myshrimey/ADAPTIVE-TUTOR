// v88: "how much free AI capacity do we really have, and what would add more?" Pure; admin only.
// Counts only what the founder entered: a daily limit left blank is "not entered" and is never guessed or added up.
import { isFreeRoute, activationBlocker, type ProviderRow } from './registry';

export interface FreeRoute { id: string; name: string; model: string | null; limitEntered: boolean; dailyRequests: number | null; usedToday: number; remaining: number | null }
export interface FreeCandidate { id: string; name: string; needs: string }
export interface FreeCapacity { routes: FreeRoute[]; knownDailyRequests: number | null; routesWithoutLimit: number; candidates: FreeCandidate[]; billedRisk: string[] }

/** A route a FREE-plan student can really be sent to right now (the same rules the router applies). */
export function isLiveFreeRoute(p: ProviderRow, hasKey: boolean, today: string): boolean {
  return p.status === 'active' && p.classification !== 'F' && !!p.model && hasKey && isFreeRoute(p, today)
    && (p.adapter !== 'openai_compatible' || !!p.endpoint) && p.policy_status !== 'not_acceptable';
}

export function freeCapacity(providers: ProviderRow[], requestsToday: Record<string, number>, hasKey: (p: ProviderRow) => boolean, today: string = new Date().toISOString().slice(0, 10)): FreeCapacity {
  const routes: FreeRoute[] = providers.filter((p) => isLiveFreeRoute(p, hasKey(p), today)).sort((a, b) => a.priority - b.priority).map((p) => {
    const used = requestsToday[p.id] ?? 0; const lim = p.rpd && p.rpd > 0 ? p.rpd : null;
    return { id: p.id, name: p.provider_name, model: p.model, limitEntered: lim !== null, dailyRequests: lim, usedToday: used, remaining: lim === null ? null : Math.max(0, lim - used) };
  });
  const known = routes.filter((r) => r.dailyRequests !== null);
  // Candidates: not paid (class D) and not yet live. We say what is missing, in the registry's own words.
  const candidates: FreeCandidate[] = providers.filter((p) => p.classification !== 'D' && !isLiveFreeRoute(p, hasKey(p), today) && p.status !== 'retired')
    .sort((a, b) => a.priority - b.priority).map((p) => {
      const parts: string[] = [];
      if (!hasKey(p)) parts.push(`set the key ${p.key_env ?? '(name)'} on the server`);
      const blocker = activationBlocker(p); if (blocker) parts.push(blocker.replace(/\.$/, ''));
      if (p.status !== 'active') parts.push(`switch status from "${p.status}" to active`);
      if (p.free_tier_available !== true) parts.push('confirm and record that a free tier exists');
      return { id: p.id, name: p.provider_name, needs: parts.join('; ') };
    });
  // Anything billed today while free-only is expected: shown by the alerts; here we list routes that could bill if misconfigured.
  const billedRisk = providers.filter((p) => p.status === 'active' && !isFreeRoute(p, today) && p.classification !== 'F').map((p) => p.provider_name);
  return { routes, knownDailyRequests: known.length ? known.reduce((a, r) => a + (r.dailyRequests as number), 0) : null, routesWithoutLimit: routes.length - known.length, candidates, billedRisk };
}
