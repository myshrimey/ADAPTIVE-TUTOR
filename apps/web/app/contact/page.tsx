import { FOUNDER, t } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { SocialLinks } from '@/components/SocialLinks';

export default async function ContactPage() {
  const lang = await getServerLang();
  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-5)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{t('help.title', lang)}</h1>
          <p style={{ color: 'var(--slate)' }}>
            {lang === 'hi'
              ? 'इस प्रारंभिक चरण के दौरान, सहायक का हर प्रश्न सीधे संस्थापक द्वारा संभाला जाता है।'
              : 'During this early-access phase, every question about Sahayak is handled directly by the founder.'}
          </p>
          <section style={{ marginTop: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--step-1)' }}>{t('help.reachUs', lang)}</h2>
            <p>{FOUNDER.name}</p>
            <p>{t('pilot.contactPhone', lang, { phone: FOUNDER.contactPhone })}</p>
            <SocialLinks />
          </section>
        </div>
      </div>
    </main>
  );
}
