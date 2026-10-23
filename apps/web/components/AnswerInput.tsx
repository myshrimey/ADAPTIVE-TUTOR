'use client';
// One answer box for every place a student types an answer (diagnostic, quiz, mock, practice, chat, challenge).
// Blocks wrong characters while typing (letters in a number answer, digits in a word answer), shows a plain warning,
// and offers an on-screen symbol keypad for maths and science answers.
import { useRef, useState } from 'react';
import { filterTyped, inputKindOf, validateAnswer, NUMBER_PAD, MATH_KEYPAD, type InputKind } from '@adaptive-tutor/core';

interface Props {
  value: string;
  onChange: (v: string) => void;
  questionType?: string | null;
  /** Server hint (number | text | expression). Wins over questionType. */
  inputKind?: InputKind | null;
  multiline?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** When false the keypad is never shown (e.g. plain chat). Default true. */
  keypad?: boolean;
  lang?: 'en' | 'hi';
  className?: string;
  maxLength?: number;
  /** Lets the parent block Submit: called with the problem text or null whenever the value changes. */
  onProblem?: (problem: string | null) => void;
}

export function AnswerInput({ value, onChange, questionType, inputKind, multiline, placeholder, autoFocus, disabled, keypad = true, lang = 'en', className, maxLength, onProblem }: Props) {
  const kind: InputKind = inputKind ?? inputKindOf(questionType);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const showPad = keypad && kind !== 'text' && kind !== 'choice';

  const apply = (raw: string) => {
    const r = filterTyped(kind, raw, lang, !!multiline);
    setWarning(r.warning);
    onChange(maxLength ? r.text.slice(0, maxLength) : r.text);
    onProblem?.(null);
  };
  const insert = (s: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + s + value.slice(end);
    apply(next);
    requestAnimationFrame(() => { el?.focus(); const p = start + s.length; el?.setSelectionRange(p, p); });
  };
  const back = () => {
    const el = ref.current; const start = el?.selectionStart ?? value.length; const end = el?.selectionEnd ?? value.length;
    if (start !== end) { apply(value.slice(0, start) + value.slice(end)); return; }
    if (start > 0) { const chars = Array.from(value.slice(0, start)); chars.pop(); const head = chars.join(''); apply(head + value.slice(start)); requestAnimationFrame(() => el?.setSelectionRange(head.length, head.length)); }
  };
  const common = {
    ref: ref as never, value, disabled, autoFocus, placeholder: placeholder ?? 'Your answer', className: className ?? 'field__input',
    inputMode: (kind === 'number' && !open ? 'decimal' : kind === 'number' ? 'none' : undefined) as 'decimal' | 'none' | undefined,
    autoComplete: 'off', autoCapitalize: 'off', spellCheck: false, 'aria-invalid': warning ? true : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => apply(e.target.value),
    onPaste: undefined,
  };
  const pad = kind === 'number' ? [{ id: 'n', label: '123', keys: NUMBER_PAD }] : MATH_KEYPAD;
  const keyStyle: React.CSSProperties = { minWidth: '2.4rem', minHeight: '2.4rem', padding: '0.2rem 0.5rem', border: '1px solid var(--line, #cbd5e1)', borderRadius: 8, background: '#fff', fontSize: '1.05rem', cursor: 'pointer' };

  return (
    <div>
      {multiline ? <textarea rows={4} {...(common as object)} /> : <input type="text" {...(common as object)} />}
      {warning && <p role="alert" style={{ color: '#b45309', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>⚠ {warning}</p>}
      {showPad && (
        <div style={{ marginTop: '0.4rem' }}>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ ...keyStyle, fontSize: '0.85rem' }}>
            {open ? 'Hide keypad ▲' : (kind === 'number' ? 'Number keypad ▼' : 'Symbols keypad ▼  (x², √, π, ≤ …)')}
          </button>
          {open && (
            <div style={{ marginTop: '0.4rem', padding: '0.5rem', border: '1px solid var(--line, #cbd5e1)', borderRadius: 10, background: '#f8fafc' }}>
              {pad.length > 1 && (
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.4rem' }}>
                  {pad.map((t, i) => (
                    <button type="button" key={t.id} onClick={() => setTab(i)} style={{ ...keyStyle, fontWeight: i === tab ? 700 : 400, background: i === tab ? '#e0e7ff' : '#fff' }}>{t.label}</button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {pad[Math.min(tab, pad.length - 1)].keys.map((key, i) => (
                  <button type="button" key={key.insert + i} title={key.title} aria-label={key.title ?? key.label} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(key.insert)} style={keyStyle}>{key.label}</button>
                ))}
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={back} style={{ ...keyStyle, background: '#fee2e2' }} aria-label="Delete">⌫</button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('')} style={{ ...keyStyle, background: '#fee2e2' }} aria-label="Clear">Clear</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Used by forms before sending: returns a message to show, or null when the answer is fine. */
export function answerProblem(kind: InputKind | null | undefined, questionType: string | null | undefined, text: string, lang: 'en' | 'hi' = 'en'): string | null {
  return validateAnswer(kind ?? inputKindOf(questionType), text, lang);
}
