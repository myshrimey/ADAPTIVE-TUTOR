import { redirect } from 'next/navigation';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { loadSubjectCatalogue, t } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { SubjectManager } from '@/components/SubjectManager';

export default async function SubjectsPage() {
  let studentId: string;
  try {
    studentId = await getCurrentStudentId();
  } catch {
    redirect('/');
  }
  const lang = await getServerLang();
  const supabase = await createServerClient();
  const subjects = await loadSubjectCatalogue(supabase, studentId);

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>{t('subject.manageTitle', lang)}</h1>
          <p style={{ color: 'var(--slate)' }}>{t('subject.manageIntro', lang)}</p>
          <SubjectManager initial={subjects} />
        </div>
      </div>
    </main>
  );
}
