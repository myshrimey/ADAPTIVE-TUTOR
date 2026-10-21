import type { SupabaseClient } from '@supabase/supabase-js';

export const CLASSIFICATIONS: Record<string, string> = {
  A: 'Free, production-suitable', B: 'Free but limited', C: 'Trial / temporary', D: 'Paid', E: 'Open-weight (hosting not free)', F: 'Not approved',
};
export const VERIFY_CHECKS = ['api_availability', 'authentication', 'quota', 'model_capability', 'latency', 'failure_retry', 'commercial_terms', 'data_policy', 'cost'] as const;
export const VERIFY_LABELS: Record<string, string> = {
  api_availability: 'API availability test', authentication: 'Authentication test', quota: 'Quota test', model_capability: 'Model capability test', latency: 'Latency test',
  failure_retry: 'Failure / retry test', commercial_terms: 'Commercial-use / terms review', data_policy: 'Data-policy review', cost: 'Cost test',
};
export const ADAPTERS = ['gemini', 'groq', 'openai', 'claude', 'openai_compatible'] as const;

export interface ProviderRow {
  id: string; adapter: string; provider_name: string; region: string | null; model: string | null; model_version: string | null; endpoint: string | null;
  auth_method: string; key_env: string | null; priority: number; status: 'candidate' | 'testing' | 'active' | 'paused' | 'retired'; classification: string;
  free_tier_available: boolean | null; free_quota_note: string | null; rpm: number | null; rpd: number | null; tpm: number | null; tpd: number | null;
  input_price_usd_m: number | null; output_price_usd_m: number | null; image_price_usd: number | null; audio_stt_price_usd: number | null; tts_price_usd: number | null;
  context_window: number | null; languages: string | null; vision: boolean | null; structured_output: boolean | null; tool_calling: boolean | null;
  commercial_use: 'yes' | 'no' | 'unknown'; data_policy: string | null; policy_status: 'unknown' | 'acceptable' | 'not_acceptable'; verification_required: string | null;
  free_tier_expiry: string | null; quota_reset: 'daily' | 'monthly' | 'none'; last_verified: string | null; source_url: string | null;
  verification: Record<string, boolean>; legacy: boolean; notes: string | null;
}

export const KEY_ENV_RE = /^[A-Z][A-Z0-9_]{2,60}$/;
export function keyPresent(p: Pick<ProviderRow, 'key_env'>, env: Record<string, string | undefined> = process.env): boolean {
  return !!p.key_env && KEY_ENV_RE.test(p.key_env) && !!env[p.key_env];
}

/** A route is "free" only while the provider is flagged free, is class A/B/C and its free tier has not expired. Anything else is treated as paid. */
export function isFreeRoute(p: ProviderRow, today: string = new Date().toISOString().slice(0, 10)): boolean {
  if (p.free_tier_available !== true) return false;
  if (!['A', 'B', 'C'].includes(p.classification)) return false;
  if (p.free_tier_expiry && p.free_tier_expiry < today) return false;
  return true;
}

export function verificationComplete(p: Pick<ProviderRow, 'verification'>): boolean {
  return VERIFY_CHECKS.every((k) => p.verification?.[k] === true);
}

/** Why a provider cannot be switched to ACTIVE yet ('' = it can). Legacy providers are exempt but still shown as unverified. */
export function activationBlocker(p: ProviderRow): string {
  if (p.classification === 'F') return 'Classification F (not approved). Set A-E after verifying.';
  if (!p.key_env || !KEY_ENV_RE.test(p.key_env)) return 'No valid key name (environment variable).';
  if (p.adapter === 'openai_compatible') {
    if (!p.endpoint || !/^https:\/\//.test(p.endpoint)) return 'An https endpoint is required.';
  }
  if (!p.model) return 'A model name is required.';
  if (!p.legacy) {
    if (!verificationComplete(p)) return 'All 9 verification checks must be ticked.';
    if (!p.last_verified) return 'Enter the date you verified the current official documentation.';
    if (!p.source_url) return 'Enter the official documentation URL you verified.';
  }
  if (p.policy_status === 'not_acceptable') return 'Data policy marked not acceptable.';
  return '';
}

export async function loadProviders(service: SupabaseClient): Promise<ProviderRow[]> {
  const { data, error } = await service.from('ai_providers').select('*').order('priority', { ascending: true }).limit(200);
  if (error) throw new Error(`ai_registry_unavailable: ${error.message}`);
  return (data ?? []) as ProviderRow[];
}
