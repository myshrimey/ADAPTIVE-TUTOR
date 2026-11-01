import { SOCIAL_LINKS, visibleSocials } from '../apps/web/lib/social';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };
const v = visibleSocials();
ok(v.length === 1 && v[0].id === 'facebook' && v[0].url === 'https://www.facebook.com/share/1Bj2epb7xk/', 'only Facebook visible now');
ok(SOCIAL_LINKS.map((s) => s.id).join() === 'facebook,instagram,linkedin,youtube', 'placeholders for instagram, linkedin, youtube exist');
ok(SOCIAL_LINKS.filter((s) => s.id !== 'facebook').every((s) => s.url === ''), 'placeholders are empty and hidden');
console.log('t65', f ? 'FAILED' : 'ok');
