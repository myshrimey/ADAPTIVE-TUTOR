import { studentPage } from '@/lib/student-page';
import { getServerLang } from '@/lib/language';
import { ChallengeRunner } from '@/components/engagement/ChallengeRunner';

export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string; skill?: string }> }) {
  await studentPage(); const sp = await searchParams;
  return <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><ChallengeRunner start={{ mode: 'mistake_review', category: sp.category, skillId: sp.skill }} lang={await getServerLang()} /></div></main>;
}
