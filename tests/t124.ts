// t124: typed maths answers that were marked wrong in a student's screenshots are now accepted (v124).
import { gradeAnswer } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const g = (e: string, x: string) => gradeAnswer({ value: e }, x);
// the three screenshots
ok(g('x = 5, -1', '5,-1'), 'roots typed without "x =" are accepted (screenshot 1)');
ok(g('x = -8, 6', '6 or -8'), '"6 or -8" is accepted for two roots (screenshot 2)');
ok(g('29106', '29,106'), 'a thousands comma is accepted (screenshot 3)');
// more forms of the same idea
ok(g('x = 5, -1', '5, -1') && g('x = 5, -1', '-1 and 5') && g('x = 5, -1', 'x = 5 or x = -1') && g('x=5,-1', 'x=-1; x=5'), 'spaces, and, semicolon and repeated "x =" are accepted');
ok(g('1250000', '12,50,000') && g('2917', '2,917'), 'Indian and western thousands commas are accepted');
ok(g('20', '20.') && g('x = 2', '2') && g('2', 'x=2'), 'a final full stop and a bare "x =" are ignored');
// still wrong
ok(!g('x = 5, -1', '5') && !g('x = 5, -1', '5,-2') && !g('x = 5, -1', '5 or 1') && !g('x = 5, -1', '-5, 1'), 'a missing, wrong or sign-flipped root is still wrong');
ok(!g('29106', '29,107') && !g('29106', '2,91,06') && !g('29106', '291,06'), 'a wrong number or odd comma placing is still wrong');
ok(!g('x = 2', 'y = 2'), 'a different variable name is still wrong');
ok(g('5,106', '5,106') && g('5,106', '106,5') && !g('5,106', '5106'), 'when the expected answer itself has a comma it is a list, not a thousands comma');
ok(g('x^2 - 2x - 15', '-2x + x^2 - 15') && !g('20', '21'), 'older behaviour unchanged');
ok(g("j'ai mangé", 'J’ai mangé') && !g('été', 'ete'), 'French accent rules unchanged');
console.log(`t124: ${n - f}/${n} passed`); if (f) process.exit(1);
