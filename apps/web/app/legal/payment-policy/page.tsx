import { LegalPageLayout } from '@/components/LegalPageLayout';
import { PAYMENT_POLICY_EN, PAYMENT_POLICY_HI } from '@/content/legal/payment-policy';
import { getServerLang } from '@/lib/language';

export default async function PaymentPolicyPage() {
  const lang = await getServerLang();
  return <LegalPageLayout content={lang === 'hi' ? PAYMENT_POLICY_HI : PAYMENT_POLICY_EN} />;
}
