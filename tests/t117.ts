// t117: changing or resetting a password follows the same rules as sign-up, and never shows a raw error (v117).
import { readFileSync } from 'fs';
import { passwordProblemFor, validatePassword, IDENTITY_ERROR_TEXT } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const PH = 'riya_k@users.sahayak.invalid';

ok(passwordProblemFor('Sunflower#47', PH) === null, 'a good password is fine');
ok(passwordProblemFor('short1', PH) === IDENTITY_ERROR_TEXT.password_short, 'too short is refused in plain words');
ok(passwordProblemFor('12345678', PH) === IDENTITY_ERROR_TEXT.password_weak, 'a common password is refused');
ok(passwordProblemFor('aaaaaaaaaa', PH) === IDENTITY_ERROR_TEXT.password_weak, 'one repeated character is refused');
ok(passwordProblemFor('riya_k', 'riya_k@users.sahayak.invalid') === IDENTITY_ERROR_TEXT.password_short, 'username as password is refused (too short here)');
ok(passwordProblemFor('riyakumar', 'riyakumar@users.sahayak.invalid') === IDENTITY_ERROR_TEXT.password_same_as_username, 'password equal to the username is refused');
ok(passwordProblemFor('RiyaKumar', 'riyakumar@users.sahayak.invalid') === IDENTITY_ERROR_TEXT.password_same_as_username, '... whatever the capital letters');
ok(passwordProblemFor('Sunflower#47', null) === null && passwordProblemFor('Sunflower#47', undefined) === null, 'no known address: the other rules still run');
ok(passwordProblemFor('x', null) === IDENTITY_ERROR_TEXT.password_short, 'still short with no address');
ok(passwordProblemFor('Sunflower#47', PH) === (validatePassword('Sunflower#47', 'riya_k') ? 'x' : null), 'same answer as the sign-up rule');
ok(!/error|invalid|exception|undefined|null/i.test(Object.values(IDENTITY_ERROR_TEXT).filter((t) => /assword/.test(t)).join(' ')), 'password messages are plain words');

for (const [file, tag] of [['apps/web/app/profile/page.tsx', 'profile'], ['apps/web/app/reset-password/page.tsx', 'reset']] as const) {
  const s = R(file);
  ok(/passwordProblemFor\(/.test(s) && s.indexOf('passwordProblemFor(') < s.indexOf('auth.updateUser('), `${tag}: the rules run BEFORE the password is changed`);
  ok(!/(pwErr|updateError)\.message\s*\)?\s*;?\s*(return)?[^\n]*set(PwMsg|Error)\(\s*(pwErr|updateError)\.message/.test(s) && !/set(PwMsg|Error)\((pwErr|updateError)\.message\)/.test(s), `${tag}: the raw error is not shown`);
  ok(/console\.error\('\[(change|reset)-password\]'/.test(s), `${tag}: the reason is still logged`);
}
console.log(`t117: ${n - f}/${n} passed`); if (f) process.exit(1);
