import { friendlyFeedbackStatus } from '../packages/core';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };
const all = ['new', 'analysed', 'proposed', 'under_review', 'approved', 'rejected', 'modified', 'deferred', 'implemented', 'verified', 'rolled_back', null, undefined, 'weird'];
for (const s of all) { const r = friendlyFeedbackStatus(s as any); ok(!!r.label && !!r.note && !/priority|P0|P1|reviewer|cluster|\bAI\b|\brule/i.test(r.label + r.note), 'safe wording for ' + s); }
ok(friendlyFeedbackStatus('new').key === 'received' && friendlyFeedbackStatus(null).key === 'received' && friendlyFeedbackStatus('weird').key === 'received', 'unknown/new = received');
ok(friendlyFeedbackStatus('verified').key === 'fixed' && friendlyFeedbackStatus('rejected').key === 'declined' && friendlyFeedbackStatus('approved').key === 'planned', 'mapping');
ok(!/lazy|careless|wrong/i.test(JSON.stringify(all.map((s) => friendlyFeedbackStatus(s as any)))), 'kind wording');
console.log('t78', f ? 'FAILED ' + f : 'ok');
