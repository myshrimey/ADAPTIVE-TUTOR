// Code-written practice questions (v60). No AI call: every answer is computed by this code, so the answer key cannot be wrong.
// Used by the "Fill to 1,000" tool for subjects where answers can be computed (Computer Applications: logic, addresses,
// spreadsheets, loops, HTML). Saved as source 'generated', content_status 'needs_review' like all other generated questions.
export interface CodeQuestion { prompt: string; questionType: 'mcq' | 'numeric' | 'short_answer'; options?: string[]; expectedAnswer: { value: string }; explanation: string; difficulty: number }
type Rng = () => number;
const pick = <T,>(r: Rng, a: T[]): T => a[Math.floor(r() * a.length)];
const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const shuffle = <T,>(r: Rng, a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const mcq = (r: Rng, prompt: string, right: string, wrong: string[], explanation: string, difficulty = 2): CodeQuestion => {
  const w = [...new Set(wrong.filter((x) => x !== right))].slice(0, 3);
  return { prompt, questionType: 'mcq', options: shuffle(r, [right, ...w]), expectedAnswer: { value: right }, explanation, difficulty };
};
const bit = (b: boolean) => (b ? '1' : '0');

type Gen = (r: Rng) => CodeQuestion;

const GATES: Record<string, (a: boolean, b: boolean) => boolean> = { AND: (a, b) => a && b, OR: (a, b) => a || b, NAND: (a, b) => !(a && b), NOR: (a, b) => !(a || b), XOR: (a, b) => a !== b };
const logic: Gen[] = [
  (r) => { const g = pick(r, Object.keys(GATES)); const a = r() < 0.5, b = r() < 0.5; const out = GATES[g](a, b); return mcq(r, `What is the output of a ${g} gate when A = ${bit(a)} and B = ${bit(b)}?`, bit(out), [bit(!out)], `${g} with inputs ${bit(a)} and ${bit(b)} gives ${bit(out)}.`, 1); },
  (r) => { const a = r() < 0.5; return mcq(r, `A NOT gate is given the input ${bit(a)}. What is its output?`, bit(!a), [bit(a)], `NOT flips the input: NOT ${bit(a)} = ${bit(!a)}.`, 1); },
  (r) => { const a = r() < 0.5, b = r() < 0.5, c = r() < 0.5; const out = (a && b) || !c; return mcq(r, `Evaluate (A AND B) OR (NOT C) for A = ${bit(a)}, B = ${bit(b)}, C = ${bit(c)}.`, bit(out), [bit(!out)], `A AND B = ${bit(a && b)}; NOT C = ${bit(!c)}; OR gives ${bit(out)}.`, 3); },
  (r) => { const a = r() < 0.5, b = r() < 0.5; const out = !(a && b); return mcq(r, `By De Morgan's law, NOT (A AND B) equals (NOT A) OR (NOT B). Check it: for A = ${bit(a)}, B = ${bit(b)}, what is NOT (A AND B)?`, bit(out), [bit(!out)], `A AND B = ${bit(a && b)}, so NOT (A AND B) = ${bit(out)}. (NOT A) OR (NOT B) = ${bit(!a || !b)} - the same.`, 3); },
  (r) => { const a = r() < 0.5, b = r() < 0.5; const out = !(a || b); return mcq(r, `For A = ${bit(a)}, B = ${bit(b)}, what is NOT (A OR B)?`, bit(out), [bit(!out)], `A OR B = ${bit(a || b)}, so NOT (A OR B) = ${bit(out)}; this equals (NOT A) AND (NOT B).`, 3); },
  (r) => { const n = pick(r, [2, 3]); const rows = 2 ** n; return mcq(r, `How many rows does a truth table with ${n} input variables have?`, String(rows), [String(rows * 2), String(n * 2), String(rows - 1)], `${n} inputs give 2^${n} = ${rows} combinations.`, 2); },
];

const ip = (r: Rng) => [int(r, 1, 254), int(r, 0, 255), int(r, 0, 255), int(r, 1, 254)];
const network: Gen[] = [
  (r) => { const o = ip(r); const bad = int(r, 0, 3); const good = o.join('.'); const octs = [...o]; octs[bad] = int(r, 256, 999); const badIp = octs.join('.'); return mcq(r, `Which of these is NOT a valid IPv4 address?`, badIp, [good, [int(r, 1, 254), 0, 0, 1].join('.'), [int(r, 1, 254), 10, 20, 30].join('.')], `Each IPv4 part must be from 0 to 255. ${badIp} has ${octs[bad]}, which is too large.`, 2); },
  (r) => { const o = ip(r); return mcq(r, `How many bits are in the IPv4 address ${o.join('.')}?`, '32', ['16', '64', '128'], 'An IPv4 address has four parts of 8 bits each: 4 x 8 = 32 bits.', 1); },
  (r) => { const k = pick(r, [['IPv4', '32'], ['IPv6', '128']]); return mcq(r, `An ${k[0]} address is how many bits long?`, k[1], ['16', '32', '64', '128', '48'].filter((x) => x !== k[1]), `${k[0]} addresses are ${k[1]} bits long.`, 1); },
  (r) => { const t = pick(r, [['a building or campus', 'LAN'], ['a whole city', 'MAN'], ['countries or the world', 'WAN'], ['one person\'s own devices, within a few metres', 'PAN']]); return mcq(r, `Which network usually covers ${t[0]}?`, t[1], ['LAN', 'MAN', 'WAN', 'PAN'], `${t[1]} networks are the ones that cover ${t[0]}.`, 1); },
  (r) => { const t = pick(r, [['star', 'a central hub or switch'], ['bus', 'a single shared cable'], ['ring', 'each device joined to two neighbours in a loop'], ['mesh', 'many direct links between devices']]); return mcq(r, `Which topology is built around ${t[1]}?`, t[0], ['star', 'bus', 'ring', 'mesh'], `A ${t[0]} topology uses ${t[1]}.`, 2); },
  (r) => { const d = pick(r, [['Router', 'forwards packets between different networks'], ['Switch', 'connects devices inside one LAN using MAC addresses'], ['Modem', 'converts digital signals to and from the signals of the telephone or cable line'], ['Repeater', 'regenerates a weakening signal']]); return mcq(r, `Which device ${d[1]}?`, d[0], ['Router', 'Switch', 'Modem', 'Repeater', 'Hub'], `A ${d[0]} ${d[1]}.`, 2); },
];

const sheet: Gen[] = [
  (r) => { const v = Array.from({ length: int(r, 3, 5) }, () => int(r, 1, 50)); const fn = pick(r, ['SUM', 'MAX', 'MIN', 'AVERAGE', 'COUNT']); const ans = fn === 'SUM' ? v.reduce((a, b) => a + b, 0) : fn === 'MAX' ? Math.max(...v) : fn === 'MIN' ? Math.min(...v) : fn === 'COUNT' ? v.length : v.reduce((a, b) => a + b, 0) / v.length; const rounded = Math.round(ans * 100) / 100; return { prompt: `Cells A1 to A${v.length} hold the numbers ${v.join(', ')}. What does =${fn}(A1:A${v.length}) return?`, questionType: 'numeric', expectedAnswer: { value: String(rounded) }, explanation: `${fn} of ${v.join(', ')} is ${rounded}.`, difficulty: fn === 'AVERAGE' ? 3 : 2 }; },
  (r) => { const col = pick(r, ['A', 'B', 'C']); const row = int(r, 1, 9); const copy = int(r, 1, 3); const next = String.fromCharCode(col.charCodeAt(0) + copy); const rel = `=${col}${row}*2`; return mcq(r, `The formula ${rel} in cell D${row} is copied ${copy} column${copy > 1 ? 's' : ''} to the right. What does the copied formula become?`, `=${next}${row}*2`, [`=${col}${row}*2`, `=${next}${row + copy}*2`, `=$${col}$${row}*2`], 'A relative reference moves with the copy: each step right moves the column letter one forward.', 3); },
  (r) => { const col = pick(r, ['A', 'B', 'C']); const row = int(r, 1, 9); return mcq(r, `Which reference stays fixed (does not change) when a formula is copied to other cells?`, `$${col}$${row}`, [`${col}${row}`, `$${col}${row}`, `${col}$${row}`], 'An absolute reference has a $ before both the column and the row.', 2); },
];

const loops: Gen[] = [
  (r) => { const a = int(r, 1, 3), b = int(r, 4, 9); let s = 0; for (let i = a; i <= b; i++) s += i; return { prompt: `An algorithm sets total = 0, then for i from ${a} to ${b} it does total = total + i. What is total at the end?`, questionType: 'numeric', expectedAnswer: { value: String(s) }, explanation: `Adding ${a} through ${b} gives ${s}.`, difficulty: 2 }; },
  (r) => { const n = int(r, 3, 7), m = int(r, 2, 5); return { prompt: `A loop runs ${n} times. In each run it adds ${m} to a counter that starts at 0. What is the counter after the loop?`, questionType: 'numeric', expectedAnswer: { value: String(n * m) }, explanation: `${n} x ${m} = ${n * m}.`, difficulty: 1 }; },
  (r) => { const x = int(r, 1, 20), t = int(r, 5, 15); const out = x > t ? 'Big' : 'Small'; return mcq(r, `Algorithm: if x > ${t} print "Big" otherwise print "Small". What is printed when x = ${x}?`, out, [out === 'Big' ? 'Small' : 'Big', 'Nothing', 'Error'], `${x} ${x > t ? 'is greater than' : 'is not greater than'} ${t}, so it prints ${out}.`, 2); },
  (r) => { const s = pick(r, [['Oval', 'Start / End'], ['Rectangle', 'Process (a step or calculation)'], ['Diamond', 'Decision (yes / no)'], ['Parallelogram', 'Input / Output'], ['Arrow', 'Flow of control']]); return mcq(r, `In a flowchart, what does a ${s[0].toLowerCase()} stand for?`, s[1], ['Start / End', 'Process (a step or calculation)', 'Decision (yes / no)', 'Input / Output', 'Flow of control'], `In flowcharts the ${s[0].toLowerCase()} is the symbol for ${s[1]}.`, 1); },
];

const html: Gen[] = [
  (r) => { const t = pick(r, [['<b>', 'bold'], ['<i>', 'italic'], ['<u>', 'underlined'], ['<h1>', 'the largest heading'], ['<p>', 'a paragraph'], ['<br>', 'a line break'], ['<ul>', 'an unordered (bulleted) list'], ['<ol>', 'an ordered (numbered) list'], ['<table>', 'a table'], ['<a>', 'a hyperlink'], ['<img>', 'an image']]); return mcq(r, `Which HTML tag is used for ${t[1]} text or content?`.replace('for the largest heading text or content', 'for the largest heading').replace(/ text or content$/, ''), t[0], ['<b>', '<i>', '<u>', '<h1>', '<p>', '<br>', '<ul>', '<ol>', '<table>', '<a>', '<img>'].filter((x) => x !== t[0]), `${t[0]} is the HTML tag for ${t[1]}.`, 1); },
  (r) => { const f = pick(r, ['index.html', 'page.htm', 'photo.jpg', 'about.html']); const url = `https://school.example/${f}`; return mcq(r, `Which tag shows the picture ${f.endsWith('jpg') ? f : 'photo.jpg'} on a web page?`, `<img src="${f.endsWith('jpg') ? f : 'photo.jpg'}">`, [`<image href="photo.jpg">`.replace('photo.jpg', f.endsWith('jpg') ? f : 'photo.jpg'), `<a src="${f.endsWith('jpg') ? f : 'photo.jpg'}">`, `<pic>${f.endsWith('jpg') ? f : 'photo.jpg'}</pic>`], 'The <img> tag uses the src attribute to name the picture file.' + (url ? '' : ''), 2); },
  (r) => { const w = pick(r, ['Home', 'Contact', 'Notes', 'Results']); const f = pick(r, ['home.html', 'contact.html', 'notes.html', 'results.html']); return mcq(r, `Which line makes the word "${w}" a link to ${f}?`, `<a href="${f}">${w}</a>`, [`<a src="${f}">${w}</a>`, `<link href="${f}">${w}</link>`, `<href="${f}">${w}</a>`], 'A hyperlink is written <a href="address">text</a>.', 2); },
  (r) => { const n = int(r, 2, 6); return { prompt: `A web page has an unordered list with ${n} <li> items. How many <li> tags are there in total (counting only opening tags)?`, questionType: 'numeric', expectedAnswer: { value: String(n) }, explanation: `Each list item has one opening <li> tag, so there are ${n}.`, difficulty: 1 }; },
  (r) => { const rws = int(r, 2, 5), cls = int(r, 2, 4); return { prompt: `An HTML table has ${rws} <tr> rows and each row has ${cls} <td> cells. How many <td> cells are there in all?`, questionType: 'numeric', expectedAnswer: { value: String(rws * cls) }, explanation: `${rws} x ${cls} = ${rws * cls}.`, difficulty: 2 }; },
];

const binary: Gen[] = [
  (r) => { const n = int(r, 5, 200); return { prompt: `Convert the decimal number ${n} to binary.`, questionType: 'short_answer', expectedAnswer: { value: n.toString(2) }, explanation: `${n} in binary is ${n.toString(2)}.`, difficulty: 3 }; },
  (r) => { const n = int(r, 5, 200); const b = n.toString(2); return { prompt: `Convert the binary number ${b} to decimal.`, questionType: 'numeric', expectedAnswer: { value: String(n) }, explanation: `${b} in decimal is ${n}.`, difficulty: 3 }; },
  (r) => { const n = int(r, 10, 255); return { prompt: `Write the decimal number ${n} in hexadecimal (capital letters).`, questionType: 'short_answer', expectedAnswer: { value: n.toString(16).toUpperCase() }, explanation: `${n} in hexadecimal is ${n.toString(16).toUpperCase()}.`, difficulty: 3 }; },
  (r) => { const a = int(r, 1, 31), b = int(r, 1, 31); return { prompt: `Add the binary numbers ${a.toString(2)} and ${b.toString(2)}. Give the answer in binary.`, questionType: 'short_answer', expectedAnswer: { value: (a + b).toString(2) }, explanation: `${a} + ${b} = ${a + b}, which is ${(a + b).toString(2)} in binary.`, difficulty: 4 }; },
];

export interface CodeGenerator { id: string; match: RegExp; gens: Gen[] }
/** Skill-name patterns the generators can serve. A skill whose name matches one of them gets code-written questions. */
export const CODE_GENERATORS: CodeGenerator[] = [
  { id: 'logic', match: /and,? or|not operations|de morgan|logic|boolean/i, gens: logic },
  { id: 'network', match: /network|ipv|dns|topolog|device/i, gens: network },
  { id: 'sheet', match: /spreadsheet|formula|cell reference/i, gens: sheet },
  { id: 'loops', match: /algorithm|flowchart|loop|decomposition/i, gens: loops },
  { id: 'html', match: /html|tag|hyperlink|list|table/i, gens: html },
  { id: 'binary', match: /binary|number system|hexadecimal/i, gens: binary },
];

export function generatorFor(skillName: string): CodeGenerator | null {
  return CODE_GENERATORS.find((g) => g.match.test(skillName)) ?? null;
}
export function generateCodeQuestion(skillName: string, rng: Rng = Math.random): CodeQuestion | null {
  const g = generatorFor(skillName);
  if (!g) return null;
  return pick(rng, g.gens)(rng);
}
