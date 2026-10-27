import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanBase } from './utm';
export interface SocialSettings {
  aiEnabled: boolean; dailyAiLimit: number; monthlyAiLimit: number; maxMonthlyAiSpendInr: number | null;
  defaultLanguage: string; defaultAudience: string; defaultPlatform: string; defaultCta: string; siteUrl: string; landingPath: string;
  /** Always false: there is no connected platform API, so nothing can be posted automatically. Shown, never editable. */
  autoPublish: false;
}
export const DEFAULT_SOCIAL: SocialSettings = { aiEnabled: true, dailyAiLimit: 20, monthlyAiLimit: 300, maxMonthlyAiSpendInr: null, defaultLanguage: 'en', defaultAudience: 'cbse_parent', defaultPlatform: 'facebook', defaultCta: '', siteUrl: '', landingPath: '/', autoPublish: false };
const int = (v: unknown, d: number, lo: number, hi: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
export function cleanSocialSettings(raw: any): SocialSettings {
  const r = raw && typeof raw === 'object' ? raw : {}; const d = DEFAULT_SOCIAL;
  const spend = r.maxMonthlyAiSpendInr === null || r.maxMonthlyAiSpendInr === '' || r.maxMonthlyAiSpendInr === undefined ? null : Number(r.maxMonthlyAiSpendInr);
  return {
    aiEnabled: r.aiEnabled === undefined ? d.aiEnabled : r.aiEnabled === true,
    dailyAiLimit: int(r.dailyAiLimit, d.dailyAiLimit, 0, 1000), monthlyAiLimit: int(r.monthlyAiLimit, d.monthlyAiLimit, 0, 20000),
    maxMonthlyAiSpendInr: spend !== null && Number.isFinite(spend) && spend >= 0 ? spend : null,
    defaultLanguage: ['en', 'hi'].includes(r.defaultLanguage) ? r.defaultLanguage : d.defaultLanguage,
    defaultAudience: typeof r.defaultAudience === 'string' && r.defaultAudience ? r.defaultAudience.slice(0, 30) : d.defaultAudience,
    defaultPlatform: ['facebook', 'instagram', 'linkedin'].includes(r.defaultPlatform) ? r.defaultPlatform : d.defaultPlatform,
    defaultCta: String(r.defaultCta ?? '').slice(0, 140),
    siteUrl: cleanBase(r.siteUrl), landingPath: typeof r.landingPath === 'string' && /^\/[A-Za-z0-9/_-]*$/.test(r.landingPath) ? r.landingPath : '/',
    autoPublish: false,
  };
}
export async function loadSocialSettings(service: SupabaseClient): Promise<SocialSettings> {
  try { const { data } = await service.from('commerce_settings').select('value').eq('key', 'social_growth').maybeSingle(); return cleanSocialSettings(data?.value); } catch { return DEFAULT_SOCIAL; }
}
export async function saveSocialSettings(service: SupabaseClient, v: unknown): Promise<SocialSettings> {
  const clean = cleanSocialSettings(v);
  const { error } = await service.from('commerce_settings').upsert({ key: 'social_growth', value: clean, note: 'v72 social media growth engine', updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error('Could not save the settings. Please try again.');
  return clean;
}
/** The website address used in tracked links: the saved setting, else the NEXT_PUBLIC_SITE_URL variable if it is a proper https address, else '' (the page then asks the founder to enter it). */
export const siteBase = (s: SocialSettings) => s.siteUrl || cleanBase(process.env.NEXT_PUBLIC_SITE_URL);
