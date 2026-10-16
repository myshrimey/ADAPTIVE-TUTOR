'use client';

import { accessErrorMessage } from '@/lib/access-errors';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from './LanguageProvider';

interface Entry {
  id: string;
  name: string;
  slug: string;
  status: 'ready' | 'pilot' | 'in_development' | 'coming_soon';
  description: string | null;
  registered: boolean;
  active: boolean;
}

// Lets a student/parent register more subjects after onboarding and choose
// which one to study now. "Coming soon" subjects are shown but can't be added.
export function SubjectManager({ initial }: { initial: Entry[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Entry[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(subjectId: string, action: 'register' | 'activate', thenGo?: string) {
    setBusyId(subjectId);
    setError(null);
    try {
      const res = await fetch('/api/student/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, action }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSubjects(json.data.subjects);
      if (thenGo) router.push(thenGo);
      else router.refresh();
    } catch (e: any) {
      setError(accessErrorMessage(e.message) ?? e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && <p className="alert">{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {subjects.map((s) => {
          const usable = s.status === 'ready' || s.status === 'pilot';
          return (
            <div key={s.id} className="subject-card" data-subject={s.slug} style={{ cursor: 'default' }}>
              <div>
                <div style={{ fontWeight: 500 }}>
                  {s.name}{' '}
                  <span className="subject-chip__score" style={{ marginLeft: '0.4rem' }}>
                    {t(`subject.status.${s.status}` as any)}
                  </span>
                </div>
                {s.description && <div style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>{s.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {usable && !s.registered && (
                  <button type="button" className="btn btn--ghost" disabled={busyId === s.id} onClick={() => act(s.id, 'register')}>
                    {t('subject.add')}
                  </button>
                )}
                {usable && s.registered && (
                  <>
                    <span style={{ alignSelf: 'center', fontSize: '0.82rem', color: 'var(--slate)' }}>{t('subject.registered')}</span>
                    <button type="button" className="btn btn--accent" disabled={busyId === s.id} onClick={() => act(s.id, 'activate', '/learn')}>
                      {t('nav.learn')}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
