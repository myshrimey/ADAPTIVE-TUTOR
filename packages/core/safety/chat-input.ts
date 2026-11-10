// v120: size and shape checks for what a student types to the tutor and for a payment claim.
// Pure rules (no database, no network) so they are easy to test. Routes call these BEFORE doing anything else.
// A refusal is one of our own short codes; pages turn the code into a plain sentence (CHAT_ERROR_TEXT / PAYMENT_ERROR_TEXT).

export const MAX_TUTOR_MESSAGE_CHARS = 1000; // the Learn page box allows 500; the server allows a little slack
export const MAX_ANSWER_JSON_CHARS = 4000;   // a typed answer is short; this also covers structured answers
export const PAYMENT_MAX_INR = 1_000_000;
export const PAYMENT_REFERENCE_MAX = 60;
export const PAYMENT_PLAN_CODE_MAX = 40;
const PAYMENT_MAX_DAYS_BACK = 400;
const PAYMENT_MAX_DAYS_AHEAD = 2; // a phone in India can be a day ahead of the server clock

export type ChatErrorCode = 'message_empty' | 'message_too_long' | 'message_invalid' | 'answer_too_long';
export const CHAT_ERROR_TEXT: Record<ChatErrorCode, string> = {
  message_empty: 'Please type a message first.',
  message_too_long: 'That message is too long. Please keep it under 500 characters.',
  message_invalid: 'That message could not be read. Please type it again.',
  answer_too_long: 'That answer is too long. Please shorten it and try again.',
};

// Remove control characters (keeps normal spaces and line breaks), trim the ends.
function tidy(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

export function checkTutorMessage(raw: unknown): { ok: true; text: string } | { ok: false; code: ChatErrorCode } {
  if (typeof raw !== 'string') return { ok: false, code: raw === undefined || raw === null ? 'message_empty' : 'message_invalid' };
  if (raw.length > MAX_TUTOR_MESSAGE_CHARS * 4) return { ok: false, code: 'message_too_long' }; // refuse before doing any work on it
  const text = tidy(raw);
  if (!text) return { ok: false, code: 'message_empty' };
  if (text.length > MAX_TUTOR_MESSAGE_CHARS) return { ok: false, code: 'message_too_long' };
  return { ok: true, text };
}

/** A typed answer can be text, a number or a small list; only its size is checked here (the marking code judges it). */
export function checkAnswerSize(answer: unknown): { ok: true } | { ok: false; code: ChatErrorCode } {
  let size: number;
  try { size = JSON.stringify(answer)?.length ?? 0; } catch { return { ok: false, code: 'message_invalid' }; }
  return size > MAX_ANSWER_JSON_CHARS ? { ok: false, code: 'answer_too_long' } : { ok: true };
}

export type PaymentErrorCode = 'payment_fields_missing' | 'payment_amount_invalid' | 'payment_date_invalid' | 'payment_reference_invalid';
export const PAYMENT_ERROR_TEXT: Record<PaymentErrorCode, string> = {
  payment_fields_missing: 'Please fill in the amount and the date of payment.',
  payment_amount_invalid: 'Please enter the amount you paid in rupees (a number above 0).',
  payment_date_invalid: 'Please choose the date you paid (not in the future, and within the last year).',
  payment_reference_invalid: 'The payment reference can only have letters, numbers, spaces and . _ / - (up to 60 characters).',
};

export interface CleanPaymentClaim { amount: number; paymentDate: string; transactionReference?: string; planCode?: string }

export function cleanPaymentClaim(raw: unknown, now: Date = new Date()): { ok: true; claim: CleanPaymentClaim } | { ok: false; code: PaymentErrorCode } {
  const b: any = raw && typeof raw === 'object' ? raw : {};
  if (b.amount === undefined || b.amount === null || b.amount === '' || !b.paymentDate) return { ok: false, code: 'payment_fields_missing' };
  const amount = typeof b.amount === 'number' ? b.amount : NaN;
  if (!Number.isFinite(amount) || amount < 1 || amount > PAYMENT_MAX_INR) return { ok: false, code: 'payment_amount_invalid' };
  const d = typeof b.paymentDate === 'string' ? b.paymentDate : '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return { ok: false, code: 'payment_date_invalid' };
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const back = new Date(t);
  if (back.getUTCFullYear() !== +m[1] || back.getUTCMonth() !== +m[2] - 1 || back.getUTCDate() !== +m[3]) return { ok: false, code: 'payment_date_invalid' }; // e.g. 2026-02-31
  const days = (t - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86_400_000;
  if (days > PAYMENT_MAX_DAYS_AHEAD || days < -PAYMENT_MAX_DAYS_BACK) return { ok: false, code: 'payment_date_invalid' };
  let ref: string | undefined;
  if (b.transactionReference !== undefined && b.transactionReference !== null && b.transactionReference !== '') {
    if (typeof b.transactionReference !== 'string') return { ok: false, code: 'payment_reference_invalid' };
    ref = tidy(b.transactionReference);
    if (ref.length > PAYMENT_REFERENCE_MAX || !/^[A-Za-z0-9 ._\/-]*$/.test(ref)) return { ok: false, code: 'payment_reference_invalid' };
    if (!ref) ref = undefined;
  }
  const planCode = typeof b.planCode === 'string' && b.planCode.length <= PAYMENT_PLAN_CODE_MAX ? b.planCode : undefined;
  return { ok: true, claim: { amount: Math.round(amount * 100) / 100, paymentDate: d, transactionReference: ref, planCode } };
}
