import { LegalPageLayout } from '@/components/LegalPageLayout';
import { PRIVACY_EN, PRIVACY_HI } from '@/content/legal/privacy';
import { getServerLang } from '@/lib/language';

export default async function PrivacyPage() {
  const lang = await getServerLang();
  return <LegalPageLayout content={lang === 'hi' ? PRIVACY_HI : PRIVACY_EN} />;
}
