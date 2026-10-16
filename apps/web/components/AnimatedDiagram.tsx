'use client';

import { useState } from 'react';
import type { AnimationLevel } from '@adaptive-tutor/core';
import { useLanguage } from './LanguageProvider';

// A teaching diagram that reveals itself at a pace matched to the student's
// level on this skill (see packages/core/learning-animation/level.ts):
//   guided   - slow left-to-right "wipe" so labels appear one at a time, with a
//              gentle pointer to take it slowly, and a Replay button
//   standard - a short wipe, with Replay
//   brisk    - a quick fade only, no extra text
// The animation is presentation only. prefers-reduced-motion switches it off
// (global rule in globals.css), leaving the finished image.
export function AnimatedDiagram({ url, caption, level }: { url: string; caption: string; level: AnimationLevel }) {
  const { t } = useLanguage();
  const tt = t as (k: string) => string;
  const [run, setRun] = useState(0);
  return (
    <figure className={`diagram-anim diagram-anim--${level}`} style={{ margin: '0.4rem 0 0.6rem' }}>
      <img key={run} className="diagram-anim__img" src={url} alt={caption} />
      {level === 'guided' && <figcaption className="diagram-anim__hint">{tt('anim.guidedHint')}</figcaption>}
      {level !== 'brisk' && (
        <button type="button" className="btn btn--ghost btn--small" onClick={() => setRun((n) => n + 1)}>
          ↻ {tt('anim.replay')}
        </button>
      )}
    </figure>
  );
}
