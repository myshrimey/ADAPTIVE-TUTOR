import { studentPage } from '@/lib/student-page';
import { getServerLang } from '@/lib/language';
import { ChallengeRunner } from '@/components/engagement/ChallengeRunner';

export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await studentPage(); const sp = await searchParams;
  const start = { mode: sp.mode, subjectId: sp.subject, skillId: sp.skill, chapterId: sp.chapter, category: sp.category, sourceAttemptId: sp.source, orgChallengeId: sp.org, friendChallengeId: sp.friend };
  return <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><ChallengeRunner start={start} lang={await getServerLang()} /></div></main>;
}
