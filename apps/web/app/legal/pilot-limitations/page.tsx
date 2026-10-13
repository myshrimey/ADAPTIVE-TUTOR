import { LegalPageLayout } from '@/components/LegalPageLayout';
import { PILOT_LIMITATIONS_EN, PILOT_LIMITATIONS_HI } from '@/content/legal/pilot-limitations';
import { getServerLang } from '@/lib/language';

export default async function PilotLimitationsPage() {
  const lang = await getServerLang();
  return <LegalPageLayout content={lang === 'hi' ? PILOT_LIMITATIONS_HI : PILOT_LIMITATIONS_EN} />;
}
