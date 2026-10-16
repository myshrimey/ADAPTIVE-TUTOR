'use client';

import type { AnimationLevel } from '@adaptive-tutor/core';
import { useLanguage } from './LanguageProvider';

// A brief, level-matched cue after an answer. Correct answers get a pop sized
// to the level (bigger and warmer when the student is still building the skill,
// small for a student who is already strong). A wrong answer never shakes or
// turns red — just a calm, supportive line. Parent controls how long it shows.
export function AnswerFeedback({ correct, level }: { correct: boolean; level: AnimationLevel }) {
  const { t } = useLanguage();
  const tt = t as (k: string) => string;
  const text = tt(`anim.${correct ? 'ok' : 'retry'}.${level}`);
  return (
    <div role="status" className={`answer-pop answer-pop--${correct ? 'ok' : 'retry'} answer-pop--${level}`}>
      <span className="answer-pop__icon" aria-hidden="true">
        {correct ? '✓' : '↺'}
      </span>
      <span>{text}</span>
    </div>
  );
}
