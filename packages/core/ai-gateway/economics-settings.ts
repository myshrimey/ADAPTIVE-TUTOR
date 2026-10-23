import type { SupabaseClient } from '@supabase/supabase-js';
import { USD_TO_INR } from '../ai-provider/usage';

/** Founder-edited assumptions for AI economics (setting `ai_economics`). None of these is a verified provider fact. */
export interface AiEconomics {
  fx_usd_inr: number; cap_basis: 'billed' | 'economic'; route_objective: 'configured_order' | 'lowest_cost_meeting_quality';
  spend_warn_pct: number; spend_critical_pct: number;
  handwritten_target_price_inr: number; handwritten_min_margin_pct: number; handwritten_min_contribution_inr: number | null;
  storage_cost_per_image_inr: number | null; processing_cost_per_eval_inr: number | null;
  quality_min: Record<string, number>; max_cost_per_call_inr: Record<string, number>; max_latency_ms: Record<string, number>;
}
export const DEFAULT_ECONOMICS: AiEconomics = {
  fx_usd_inr: USD_TO_INR, cap_basis: 'billed', route_objective: 'configured_order', spend_warn_pct: 80, spend_critical_pct: 90,
  handwritten_target_price_inr: 499, handwritten_min_margin_pct: 85, handwritten_min_contribution_inr: null,
  storage_cost_per_image_inr: null, processing_cost_per_eval_inr: null, quality_min: {}, max_cost_per_call_inr: {}, max_latency_ms: {},
};

const num = (v: any, min: number, max: number): number | null | typeof NaN => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max ? Number(v) : NaN);
function taskMap(v: any, min: number, max: number): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v ?? {})) {
    if (!/^[a-z_]{2,40}$/.test(k)) return null;
    if (x === null || x === '' || x === undefined) continue;
    const n = Number(x); if (!Number.isFinite(n) || n < min || n > max) return null;
    out[k] = n;
  }
  return out;
}

export function validateEconomics(input: any, base: AiEconomics = DEFAULT_ECONOMICS): { ok: true; value: AiEconomics } | { ok: false; error: string } {
  const v: any = { ...base, ...(input ?? {}) };
  const out: AiEconomics = { ...DEFAULT_ECONOMICS };
  const fx = num(v.fx_usd_inr, 1, 1000); if (fx === null || Number.isNaN(fx)) return { ok: false, error: 'Exchange rate must be a number from 1 to 1000.' }; out.fx_usd_inr = fx;
  if (!['billed', 'economic'].includes(v.cap_basis)) return { ok: false, error: 'Spend limits can count "billed" or "economic" cost.' }; out.cap_basis = v.cap_basis;
  if (!['configured_order', 'lowest_cost_meeting_quality'].includes(v.route_objective)) return { ok: false, error: 'Unknown routing objective.' }; out.route_objective = v.route_objective;
  const w = num(v.spend_warn_pct, 1, 100), c = num(v.spend_critical_pct, 1, 100);
  if (w === null || c === null || Number.isNaN(w) || Number.isNaN(c) || w >= c) return { ok: false, error: 'Spend warning % must be lower than critical %, both 1-100.' };
  out.spend_warn_pct = w; out.spend_critical_pct = c;
  const price = num(v.handwritten_target_price_inr, 0, 1e6); if (price === null || Number.isNaN(price)) return { ok: false, error: 'Handwritten target price must be a number.' }; out.handwritten_target_price_inr = price;
  const m = num(v.handwritten_min_margin_pct, 0, 100); if (m === null || Number.isNaN(m)) return { ok: false, error: 'Minimum margin must be 0-100.' }; out.handwritten_min_margin_pct = m;
  for (const k of ['handwritten_min_contribution_inr', 'storage_cost_per_image_inr', 'processing_cost_per_eval_inr'] as const) {
    const n = num(v[k], 0, 1e6); if (Number.isNaN(n as any)) return { ok: false, error: `${k} must be a positive number or empty.` }; out[k] = n as number | null;
  }
  const q = taskMap(v.quality_min, 0, 100), cc = taskMap(v.max_cost_per_call_inr, 0, 1e5), l = taskMap(v.max_latency_ms, 100, 600000);
  if (!q) return { ok: false, error: 'Quality minimums must be {task: 0-100}.' };
  if (!cc) return { ok: false, error: 'Cost ceilings must be {task: rupees}.' };
  if (!l) return { ok: false, error: 'Latency limits must be {task: 100-600000 ms}.' };
  out.quality_min = q; out.max_cost_per_call_inr = cc; out.max_latency_ms = l;
  return { ok: true, value: out };
}

export async function loadEconomics(service: SupabaseClient): Promise<AiEconomics> {
  try {
    const { data } = await service.from('commerce_settings').select('value').eq('key', 'ai_economics').maybeSingle();
    const r = validateEconomics(data?.value ?? {}, DEFAULT_ECONOMICS);
    return r.ok ? r.value : DEFAULT_ECONOMICS;
  } catch { return DEFAULT_ECONOMICS; } // migration 0036 not run yet, or a damaged setting: safe defaults
}
