// t120: tutor chat message / typed answer / payment claim are checked on the server before use (v120).
import { readFileSync } from 'fs';
import { checkTutorMessage, checkAnswerSize, cleanPaymentClaim, CHAT_ERROR_TEXT, PAYMENT_ERROR_TEXT, MAX_TUTOR_MESSAGE_CHARS, MAX_ANSWER_JSON_CHARS } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');

// --- tutor message
const m1: any = checkTutorMessage('  how do I factorise x^2 - 5x + 6?  ');
ok(m1.ok && m1.text === 'how do I factorise x^2 - 5x + 6?', 'normal message passes and is trimmed');
ok(checkTutorMessage('hint').ok && checkTutorMessage('मुझे उदाहरण दो').ok, 'short commands and Hindi pass');
ok((checkTutorMessage('a'.repeat(MAX_TUTOR_MESSAGE_CHARS)) as any).ok, 'exactly the limit passes');
ok((checkTutorMessage('a'.repeat(MAX_TUTOR_MESSAGE_CHARS + 1)) as any).code === 'message_too_long', 'one over the limit refused');
ok((checkTutorMessage('a'.repeat(1_000_000)) as any).code === 'message_too_long', 'a huge message refused');
ok((checkTutorMessage('   ') as any).code === 'message_empty' && (checkTutorMessage('') as any).code === 'message_empty' && (checkTutorMessage(undefined) as any).code === 'message_empty' && (checkTutorMessage(null) as any).code === 'message_empty', 'blank / missing refused as empty');
for (const bad of [42, { a: 1 }, ['x'], true]) ok((checkTutorMessage(bad) as any).code === 'message_invalid', `non-text refused: ${JSON.stringify(bad)}`);
ok((checkTutorMessage('hi\u0000\u0007 there\nnext') as any).text === 'hi there\nnext', 'control characters removed, line break kept');
ok((checkTutorMessage('\u0000\u0001') as any).code === 'message_empty', 'only control characters = empty');

// --- typed answer size
ok(checkAnswerSize('42').ok && checkAnswerSize(3.5).ok && checkAnswerSize(['a', 'b']).ok && checkAnswerSize({ x: 1 }).ok, 'ordinary answers pass');
ok((checkAnswerSize('x'.repeat(MAX_ANSWER_JSON_CHARS + 10)) as any).code === 'answer_too_long', 'huge answer refused');
ok((checkAnswerSize(Array(5000).fill('abc')) as any).code === 'answer_too_long', 'huge list refused');
const cyc: any = {}; cyc.self = cyc; ok((checkAnswerSize(cyc) as any).code === 'message_invalid', 'unserialisable answer refused');

// --- payment claim
const now = new Date('2026-11-09T10:00:00Z');
const good = { amount: 4999, paymentDate: '2026-11-09', transactionReference: 'UPI/123-456 AB', planCode: 'founding_family' };
const g: any = cleanPaymentClaim(good, now);
ok(g.ok && g.claim.amount === 4999 && g.claim.transactionReference === 'UPI/123-456 AB' && g.claim.planCode === 'founding_family', 'a normal claim passes');
ok(cleanPaymentClaim({ amount: 1, paymentDate: '2026-11-09' }, now).ok, 'reference and plan are optional');
const code = (b: any) => (cleanPaymentClaim(b, now) as any).code;
ok(code({}) === 'payment_fields_missing' && code(null) === 'payment_fields_missing' && code({ amount: 100 }) === 'payment_fields_missing' && code({ paymentDate: '2026-11-09' }) === 'payment_fields_missing', 'missing fields refused');
for (const a of [0, -5, 1_000_001, NaN, Infinity, '4999', {}, [5]]) ok(code({ ...good, amount: a }) === 'payment_amount_invalid', `amount refused: ${String(JSON.stringify(a))}`);
ok((cleanPaymentClaim({ ...good, amount: 99.999 }, now) as any).claim.amount === 100, 'amount rounded to 2 places');
for (const d of ['09-11-2026', '2026-13-01', '2026-02-31', 'tomorrow', '2026-11-09T00:00:00Z', 20261109, '2024-01-01', '2026-11-20']) ok(code({ ...good, paymentDate: d }) === 'payment_date_invalid', `date refused: ${String(d)}`);
ok(cleanPaymentClaim({ ...good, paymentDate: '2026-11-11' }, now).ok && cleanPaymentClaim({ ...good, paymentDate: '2025-11-09' }, now).ok, 'a day or two ahead (phone clock) and a year back are fine');
for (const r of ['x'.repeat(61), '<script>', 'a;b', 5, {}]) ok(code({ ...good, transactionReference: r }) === 'payment_reference_invalid', `reference refused: ${String(JSON.stringify(r)).slice(0, 20)}`);
ok((cleanPaymentClaim({ ...good, transactionReference: 'ref\u0000' }, now) as any).claim.transactionReference === 'ref', 'control characters in a reference are removed');
ok((cleanPaymentClaim({ ...good, transactionReference: '   ' }, now) as any).claim.transactionReference === undefined, 'blank reference becomes none');
ok((cleanPaymentClaim({ ...good, planCode: 'x'.repeat(100) }, now) as any).claim.planCode === undefined && (cleanPaymentClaim({ ...good, planCode: 7 }, now) as any).claim.planCode === undefined, 'odd plan code dropped');
ok(Object.values(CHAT_ERROR_TEXT).concat(Object.values(PAYMENT_ERROR_TEXT)).every((t) => /^[A-Z]/.test(t) && !/_/.test(t.replace(/ \. _ \/ -/, ''))), 'every refusal has a plain-words message');

// --- wiring
const msg = R('apps/web/app/api/session/message/route.ts');
ok(msg.indexOf('checkTutorMessage(') > -1 && msg.indexOf('checkTutorMessage(') < msg.indexOf('runOrchestratorTurn(supabase'), 'message route checks BEFORE the tutor runs');
ok(/studentMessage: message\b/.test(msg) && !/studentMessage: rawMessage/.test(msg), 'only the cleaned message reaches the tutor');
const ans = R('apps/web/app/api/session/answer/route.ts');
ok(ans.indexOf('checkAnswerSize(') > -1 && ans.indexOf('checkAnswerSize(') < ans.indexOf('runOrchestratorTurn(supabase'), 'answer route checks size before marking');
const pay = R('apps/web/app/api/pilot/payment/route.ts');
ok(pay.indexOf('cleanPaymentClaim(') > -1 && pay.indexOf('cleanPaymentClaim(') < pay.indexOf('submitPaymentClaim(supabase'), 'payment route cleans BEFORE saving');
ok(/submitPaymentClaim\(supabase, studentId, checked\.claim\)/.test(pay) && /getCurrentStudentId\(\)/.test(pay), 'cleaned claim saved; student still from session');
ok(/CHAT_ERROR_TEXT/.test(R('apps/web/app/learn/page.tsx')) && /PAYMENT_ERROR_TEXT/.test(R('apps/web/components/PilotPaymentForm.tsx')), 'pages show plain sentences');
console.log(`t120: ${n - f}/${n} passed`); if (f) process.exit(1);
