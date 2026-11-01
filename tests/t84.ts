import { parseOutlineText, pagesToOutlineText, extractFromFileAsync } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const t = pagesToOutlineText(['UNIT II ALGEBRA\nChapter 2 Polynomials\nTopic 2 Zeros of a polynomial\nChapter 3 covers many things in this long sentence about the book.\nThe chapter 5 is hard', 'Unit 3: Geometry']);
const ex = parseOutlineText(t);
const names = ex.nodes.map((x) => `${x.kind}:${x.name}@${x.page}`);
console.log(names.join(' | '));
ok(names.includes('unit:ALGEBRA@1') && names.includes('chapter:Polynomials@1') && names.includes('topic:Zeros of a polynomial@1'), 'colon-less headings read');
ok(names.includes('unit:Geometry@2'), 'colon headings still read');
ok(ex.nodes.find((x) => x.name === 'Polynomials')!.confidence === 0.7, 'loose headings lower confidence');
ok(ex.nodes.find((x) => x.name === 'Geometry')!.confidence === 0.9, 'colon headings unchanged');
ok(!names.some((x) => /sentence|is hard/.test(x)), 'prose sentences are not headings');
// parent links
const ch = ex.nodes.find((x) => x.name === 'Polynomials')!, un = ex.nodes.find((x) => x.name === 'ALGEBRA')!;
ok(ch.parentKey === un.key, 'chapter sits under its unit');
ok(parseOutlineText('Chapter 1: A\nChapter 1: A').nodes.length >= 1, 'old behaviour kept');
console.log(`t84: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
