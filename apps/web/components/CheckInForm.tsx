'use client';

import { useState } from 'react';
import { useLanguage } from './LanguageProvider';

export interface CheckinAnswers {
  mood: string | null;
  focus: string | null;
  confidenceBefore: number | null;
  availableMinutes: number | null;
  sessionGoal: string | null;
}

const MOODS: { v: string; en: string; hi: string }[] = [
  { v: 'very_good', en: 'Very good', hi: 'बहुत अच्छा' },
  { v: 'good', en: 'Good', hi: 'अच्छा' },
  { v: 'okay', en: 'Okay', hi: 'ठीक' },
  { v: 'not_great', en: 'Not great', hi: 'ठीक नहीं' },
  { v: 'tired', en: 'Tired', hi: 'थका हुआ' },
  { v: 'stressed', en: 'Stressed / upset', hi: 'तनाव में / परेशान' },
];
const FOCUS: { v: string; en: string; hi: string }[] = [
  { v: 'very_focused', en: 'Very focused', hi: 'बहुत केंद्रित' },
  { v: 'mostly_focused', en: 'Mostly focused', hi: 'काफी केंद्रित' },
  { v: 'a_little_distracted', en: 'A little distracted', hi: 'थोड़ा भटका हुआ' },
  { v: 'very_distracted', en: 'Very distracted', hi: 'बहुत भटका हुआ' },
];
const TIMES = [10, 20, 30, 45];
const GOALS: { v: string; en: string; hi: string }[] = [
  { v: 'learn', en: 'Learn', hi: 'सीखना' },
  { v: 'practise', en: 'Practise', hi: 'अभ्यास' },
  { v: 'revise', en: 'Revise', hi: 'दोहराना' },
  { v: 'fix_mistakes', en: 'Fix something I keep getting wrong', hi: 'जो बार-बार गलत होता है उसे ठीक करना' },
  { v: 'test_myself', en: 'Test myself', hi: 'खुद को परखना' },
];

function Choices({ options, value, onChange, lang }: { options: { v: string; en: string; hi: string }[]; value: string | null; onChange: (v: string) => void; lang: 'en' | 'hi' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          className={value === o.v ? 'btn btn--accent btn--small' : 'btn btn--ghost btn--small'}
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
        >
          {lang === 'hi' ? o.hi : o.en}
        </button>
      ))}
    </div>
  );
}

// Short pre-session check-in (target 30-60 seconds). Every question is
// optional and the whole thing can be skipped — it must never become a wall.
export function CheckInForm({ onSubmit, onSkip }: { onSubmit: (a: CheckinAnswers) => void; onSkip: () => void }) {
  const { t, lang } = useLanguage();
  const [mood, setMood] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [goal, setGoal] = useState<string | null>(null);

  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <p className="hero__eyebrow">{t('checkin.title')}</p>
        <p style={{ color: 'var(--slate)' }}>{t('checkin.intro')}</p>

        <div className="field">
          <span className="field__label">{t('checkin.mood')}</span>
          <Choices options={MOODS} value={mood} onChange={setMood} lang={lang} />
        </div>
        <div className="field">
          <span className="field__label">{t('checkin.focus')}</span>
          <Choices options={FOCUS} value={focus} onChange={setFocus} lang={lang} />
        </div>
        <div className="field">
          <span className="field__label">{t('checkin.confidence')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                className={confidence === n ? 'btn btn--accent btn--small' : 'btn btn--ghost btn--small'}
                aria-pressed={confidence === n}
                onClick={() => setConfidence(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label">{t('checkin.time')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
            {TIMES.map((m) => (
              <button
                key={m}
                type="button"
                className={minutes === m ? 'btn btn--accent btn--small' : 'btn btn--ghost btn--small'}
                aria-pressed={minutes === m}
                onClick={() => setMinutes(m)}
              >
                {m === 45 ? '45+' : m} min
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label">{t('checkin.goal')}</span>
          <Choices options={GOALS} value={goal} onChange={setGoal} lang={lang} />
        </div>

        <div className="hero__actions">
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => onSubmit({ mood, focus, confidenceBefore: confidence, availableMinutes: minutes, sessionGoal: goal })}
          >
            {t('checkin.start')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onSkip}>
            {t('checkin.skip')}
          </button>
        </div>
      </div>
    </main>
  );
}
