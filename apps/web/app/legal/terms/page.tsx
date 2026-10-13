import { LegalPageLayout } from '@/components/LegalPageLayout';
import { TERMS_EN, TERMS_HI } from '@/content/legal/terms';
import { getServerLang } from '@/lib/language';

export default async function TermsPage() {
  const lang = await getServerLang();
  return <LegalPageLayout content={lang === 'hi' ? TERMS_HI : TERMS_EN} />;
}
