import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { SocialGrowthBoard } from '@/components/SocialGrowthBoard';
import { AUDIENCES, OBJECTIVES, CONTENT_TYPES, SCOPES, LANGUAGES, STATUS_LABEL, REFINE_ACTIONS, FUTURE_CHANNELS, listPillars, loadSocialSettings, publisherStatus, imageGeneratorStatus } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';

// ADMIN ONLY (same ADMIN_EMAILS rule as every admin page). Manual publishing workflow: no social platform is connected.
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const service = createServiceClient();
  let installed = true;
  try { const { error } = await service.from('social_content').select('id').limit(1); if (error) installed = false; } catch { installed = false; }
  const [pillars, settings] = await Promise.all([listPillars(service), loadSocialSettings(service)]);
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>Social Media Growth Engine</h1>
        <p style={{ color: 'var(--slate)', margin: '0.2rem 0' }}>Generate, review, approve, publish (by you) and learn from results.</p>
        <AdminNav />
      </div>
      <SocialGrowthBoard email={g.email} installed={installed} pillars={pillars.map((x) => ({ id: x.id, name: x.name, active: x.active }))} settings={settings} publishers={publisherStatus()} imageNote={imageGeneratorStatus()} futureChannels={FUTURE_CHANNELS}
        labels={{ platforms: { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn' }, audiences: AUDIENCES, objectives: OBJECTIVES, types: CONTENT_TYPES, scopes: SCOPES, languages: LANGUAGES, status: STATUS_LABEL as any, refine: Object.fromEntries(Object.entries(REFINE_ACTIONS).map(([k]) => [k, ({ shorten: 'Make it shorter', expand: 'Make it longer', simplify: 'Simplify', professional: 'More professional', emotional: 'More emotional', educational: 'More educational', conversational: 'More conversational', translate_hi: 'Translate to Hindi', translate_en: 'Translate to English' } as any)[k] ?? k])) }} />
    </div></main>
  );
}
