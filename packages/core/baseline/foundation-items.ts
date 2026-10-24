// v62: code-written questions for the Class 6-9 foundation competencies. No AI: every answer is computed by this code, so
// the answer key cannot be wrong (the wording and difficulty tags are still for a teacher to review). They are saved with
// quality_status 'DRAFT' and origin 'code_generated' and are used in diagnostics only while the admin setting
// "allow unreviewed questions" is on (default on, because there is nothing else for these lower-class skills).
export interface FoundationQ {
  prompt: string;
  questionType: 'mcq' | 'numeric' | 'short_answer';
  options?: string[];
  expectedAnswer: { value: string };
  explanation: string;
  difficulty: number; // 1-5
  dimension: string; // cognitive dimension
  family: string; // same family = same skill, different numbers
  tags?: string[]; // misconception tags of the distractors, aligned with options order is NOT needed; presence means "has misconception distractors"
}
export type Rng = () => number;
export const seededRng = (seed: number): Rng => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: Rng, a: T[]): T => a[Math.floor(r() * a.length)];
const shuffle = <T,>(r: Rng, a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const r2 = (x: number) => Math.round(x * 100) / 100;
const s = (x: number) => String(r2(x));
const signed = (x: number) => (x < 0 ? `(${x})` : String(x));
const lin = (a: number, b: number) => (b === 0 ? `${a === 1 ? '' : a === -1 ? '-' : a}x` : `${a === 1 ? '' : a === -1 ? '-' : a}x ${b < 0 ? '-' : '+'} ${Math.abs(b)}`);

function mcq(r: Rng, family: string, dim: string, d: number, prompt: string, right: string, wrong: string[], explanation: string, tags?: string[]): FoundationQ {
  const w = [...new Set(wrong.filter((x) => x !== right))];
  let k = 1; while (w.length < 3) { const extra = /^-?\d+(\.\d+)?$/.test(right) ? String(r2(Number(right) + k * (k % 2 ? 1 : -1) * Math.max(1, Math.round(Math.abs(Number(right)) * 0.1)))) : ['None of these', 'Cannot be determined', 'Not enough information'][k - 1] ?? `Option ${k}`; if (extra !== right && !w.includes(extra)) w.push(extra); k++; }
  return { prompt, questionType: 'mcq', options: shuffle(r, [right, ...w.slice(0, 3)]), expectedAnswer: { value: right }, explanation, difficulty: d, dimension: dim, family, tags };
}
const numq = (family: string, dim: string, d: number, prompt: string, ans: number | string, explanation: string): FoundationQ => ({ prompt, questionType: 'numeric', expectedAnswer: { value: typeof ans === 'number' ? s(ans) : ans }, explanation, difficulty: d, dimension: dim, family });

export interface FGen { d: number; f: (r: Rng) => FoundationQ }
const G = (d: number, f: (r: Rng) => FoundationQ): FGen => ({ d, f });

export const FOUNDATION_GENERATORS: Record<string, FGen[]> = {
  'm6.whole-ops': [
    G(1, (r) => { const a = int(r, 12, 90), b = int(r, 12, 90); return numq('whole-add', 'knowledge', 1, `Find ${a} + ${b}.`, a + b, `${a} + ${b} = ${a + b}.`); }),
    G(2, (r) => { const a = int(r, 2, 9), b = int(r, 3, 12), c = int(r, 2, 9); return numq('whole-order', 'application', 2, `Calculate ${a} + ${b} × ${c}.`, a + b * c, `Multiply first: ${b} × ${c} = ${b * c}; then add ${a}: ${a + b * c}.`); }),
    G(3, (r) => { const a = int(r, 2, 6), b = int(r, 2, 9), c = int(r, 2, 9), d = int(r, 1, 5); return numq('whole-brackets', 'application', 3, `Calculate (${a} + ${b}) × ${c} − ${d}.`, (a + b) * c - d, `Brackets: ${a + b}; × ${c} = ${(a + b) * c}; − ${d} = ${(a + b) * c - d}.`); }),
  ],
  'm6.factors-multiples': [
    G(1, (r) => { const n = pick(r, [12, 18, 20, 24, 30, 36]); const f = [...Array(n)].map((_, i) => i + 1).filter((x) => n % x === 0); const nf = pick(r, [5, 7, 8, 9, 11].filter((x) => n % x !== 0)); return mcq(r, 'factor-which', 'knowledge', 1, `Which of these is NOT a factor of ${n}?`, String(nf), f.filter((x) => x > 1 && x < n).slice(0, 4).map(String), `${nf} does not divide ${n} exactly.`); }),
    G(2, (r) => { const a = pick(r, [12, 18, 24, 30, 36, 48]), b = pick(r, [8, 20, 27, 40, 45, 16]); return numq('hcf', 'application', 2, `Find the HCF of ${a} and ${b}.`, gcd(a, b), `The largest number dividing both ${a} and ${b} is ${gcd(a, b)}.`); }),
    G(3, (r) => { const a = int(r, 4, 12); let b = int(r, 4, 15); if (b === a) b = a + 1; const l = (a * b) / gcd(a, b); return numq('lcm', 'application', 3, `Find the LCM of ${a} and ${b}.`, l, `LCM = (${a} × ${b}) ÷ HCF = ${a * b} ÷ ${gcd(a, b)} = ${l}.`); }),
  ],
  'm6.fractions-basic': [
    G(1, (r) => { const a = int(r, 1, 4), b = int(r, 5, 9), k = int(r, 2, 5); return mcq(r, 'frac-equiv', 'knowledge', 1, `Which fraction is equivalent to ${a}/${b}?`, `${a * k}/${b * k}`, [`${a + k}/${b + k}`, `${a * k}/${b}`, `${a}/${b * k}`], `Multiply top and bottom by ${k}: ${a * k}/${b * k}.`, ['add_to_both']); }),
    G(2, (r) => { const n = int(r, 1, 6), d = int(r, 7, 12), n2 = int(r, 1, 6), d2 = int(r, 7, 12); const bigger = n / d > n2 / d2 ? `${n}/${d}` : `${n2}/${d2}`; if (n * d2 === n2 * d) return numq('frac-compare', 'conceptual', 2, `Write ${n}/${d} as a decimal rounded to 2 places.`, r2(n / d), `${n} ÷ ${d} ≈ ${r2(n / d)}.`); return mcq(r, 'frac-compare', 'conceptual', 2, `Which is larger: ${n}/${d} or ${n2}/${d2}?`, bigger, [bigger === `${n}/${d}` ? `${n2}/${d2}` : `${n}/${d}`, 'They are equal', 'Cannot be compared'], `Compare by writing both over a common denominator or as decimals: ${r2(n / d)} and ${r2(n2 / d2)}.`); }),
    G(3, (r) => { const g = int(r, 2, 6); const [a, b] = pick(r, [[2, 3], [3, 4], [5, 7], [2, 5], [3, 5], [4, 5], [5, 6], [3, 7]]); return mcq(r, 'frac-simplify', 'application', 3, `Simplify ${a * g}/${b * g}.`, `${a}/${b}`, [`${a * g}/${b}`, `${a}/${b * g}`, `${a + g}/${b + g}`], `Divide top and bottom by ${g}: ${a}/${b}.`); }),
  ],
  'm6.decimals-basic': [
    G(1, (r) => { const a = int(r, 11, 99) / 10, b = int(r, 11, 99) / 10; return numq('dec-add', 'knowledge', 1, `Find ${a} + ${b}.`, r2(a + b), `Line up the decimal points: ${a} + ${b} = ${r2(a + b)}.`); }),
    G(2, (r) => { const a = int(r, 20, 99) / 10, b = int(r, 11, 49) / 10; return numq('dec-sub', 'application', 2, `Find ${a} − ${b}.`, r2(a - b), `${a} − ${b} = ${r2(a - b)}.`); }),
    G(3, (r) => { const a = int(r, 11, 59) / 10, b = int(r, 2, 9) / 10; return numq('dec-mul', 'application', 3, `Find ${a} × ${b}.`, r2(a * b), `${a * 10} × ${b * 10} = ${Math.round(a * 10 * b * 10)}; two decimal places in all, so ${r2(a * b)}.`); }),
  ],
  'm6.ratio-basic': [
    G(1, (r) => { const a = int(r, 2, 9) * 2, b = int(r, 2, 9) * 2; const g = gcd(a, b); return mcq(r, 'ratio-simplify', 'knowledge', 1, `Write the ratio ${a} : ${b} in its simplest form.`, `${a / g} : ${b / g}`, [`${a} : ${b}`, `${b / g} : ${a / g}`, `${a / g + 1} : ${b / g}`], `Divide both by ${g}.`); }),
    G(2, (r) => { const a = int(r, 2, 5), b = int(r, 3, 7), k = int(r, 2, 6); return numq('proportion-find', 'application', 2, `If ${a} : ${b} = ${a * k} : x, find x.`, b * k, `Both terms are multiplied by ${k}, so x = ${b} × ${k} = ${b * k}.`); }),
    G(3, (r) => { const a = int(r, 2, 5), b = int(r, 2, 5) + 3, total = (a + b) * int(r, 4, 12); return numq('ratio-share', 'application', 3, `Share ${total} rupees in the ratio ${a} : ${b}. How many rupees does the first person get?`, (total / (a + b)) * a, `One part = ${total} ÷ ${a + b} = ${total / (a + b)}; first share = ${a} parts = ${(total / (a + b)) * a}.`); }),
  ],
  'm6.patterns': [
    G(1, (r) => { const a = int(r, 2, 9), d = int(r, 2, 7); return numq('pattern-next', 'knowledge', 1, `What comes next: ${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, ... ?`, a + 4 * d, `Each term adds ${d}, so the next is ${a + 4 * d}.`); }),
    G(2, (r) => { const a = int(r, 3, 12), d = int(r, 3, 9), n = int(r, 6, 10); return numq('pattern-nth', 'application', 2, `A pattern starts at ${a} and adds ${d} each time. What is the ${n}th term?`, a + (n - 1) * d, `${a} + ${n - 1} × ${d} = ${a + (n - 1) * d}.`); }),
    G(3, (r) => { const a = int(r, 2, 5), q = int(r, 2, 3); return numq('pattern-mult', 'application', 3, `What is the 5th term of ${a}, ${a * q}, ${a * q * q}, ... ?`, a * q ** 4, `Each term is multiplied by ${q}: ${a} × ${q}^4 = ${a * q ** 4}.`); }),
  ],
  'm6.algebra-intro': [
    G(1, (r) => { const a = int(r, 2, 6), x = int(r, 2, 9); return numq('subst', 'knowledge', 1, `Find the value of ${a}x when x = ${x}.`, a * x, `${a} × ${x} = ${a * x}.`); }),
    G(2, (r) => { const a = int(r, 2, 6), b = int(r, 1, 9), x = int(r, 2, 8); return numq('subst', 'application', 2, `Find the value of ${a}x + ${b} when x = ${x}.`, a * x + b, `${a} × ${x} + ${b} = ${a * x + b}.`); }),
    G(3, (r) => { const a = int(r, 2, 5), b = int(r, 2, 6), x = int(r, 2, 5), y = int(r, 2, 5); return numq('subst2', 'application', 3, `Find the value of ${a}x + ${b}y when x = ${x} and y = ${y}.`, a * x + b * y, `${a}×${x} + ${b}×${y} = ${a * x} + ${b * y} = ${a * x + b * y}.`); }),
  ],
  'm6.simple-eq': [
    G(1, (r) => { const x = int(r, 2, 15), b = int(r, 2, 12); return numq('eq1', 'knowledge', 1, `Solve x + ${b} = ${x + b}.`, x, `Subtract ${b} from both sides: x = ${x}.`); }),
    G(2, (r) => { const x = int(r, 2, 12), a = int(r, 2, 9); return numq('eq1', 'application', 2, `Solve ${a}x = ${a * x}.`, x, `Divide both sides by ${a}: x = ${x}.`); }),
    G(3, (r) => { const a = int(r, 2, 9), b = int(r, 2, 9); return numq('eq1-div', 'application', 3, `Solve x ÷ ${a} = ${b}.`, a * b, `Multiply both sides by ${a}: x = ${a * b}.`); }),
  ],
  'm6.angles-basic': [
    G(1, (r) => { const a = int(r, 20, 80); return numq('complement', 'knowledge', 1, `Find the complement of ${a}°.`, 90 - a, `Complementary angles add to 90°: 90 − ${a} = ${90 - a}.`); }),
    G(2, (r) => { const a = int(r, 40, 150); return numq('supplement', 'application', 2, `Find the supplement of ${a}°.`, 180 - a, `Supplementary angles add to 180°: 180 − ${a} = ${180 - a}.`); }),
    G(3, (r) => { const a = int(r, 30, 70); return numq('angle-eq', 'application', 3, `Two angles are supplementary. One is ${a}° more than the other (so x and x + ${a}). Find the smaller angle.`, (180 - a) / 2, `x + x + ${a} = 180, so 2x = ${180 - a}, x = ${(180 - a) / 2}.`); }),
  ],
  'm6.perimeter-area': [
    G(1, (r) => { const l = int(r, 5, 20), b = int(r, 3, l - 1); return numq('rect-perim', 'knowledge', 1, `Find the perimeter of a rectangle ${l} cm long and ${b} cm wide.`, 2 * (l + b), `2 × (${l} + ${b}) = ${2 * (l + b)} cm.`); }),
    G(2, (r) => { const l = int(r, 6, 20), b = int(r, 3, l - 1); return numq('rect-area', 'application', 2, `Find the area of a rectangle ${l} cm by ${b} cm (in square cm).`, l * b, `${l} × ${b} = ${l * b}.`); }),
    G(3, (r) => { const a = int(r, 4, 12); return numq('square-perim-from-area', 'application', 3, `A square has area ${a * a} square cm. Find its perimeter in cm.`, 4 * a, `Side = ${a} cm, so perimeter = 4 × ${a} = ${4 * a}.`); }),
  ],
  'm7.integers': [
    G(1, (r) => { const a = -int(r, 3, 15), b = int(r, 2, 12); return numq('int-add', 'knowledge', 1, `Find ${a} + ${b}.`, a + b, `${a} + ${b} = ${a + b}.`); }),
    G(2, (r) => { const a = int(r, 2, 15), b = int(r, 3, 15); return numq('int-sub', 'application', 2, `Find ${a} − (−${b}).`, a + b, `Subtracting a negative adds: ${a} + ${b} = ${a + b}.`); }),
    G(3, (r) => { const a = -int(r, 2, 9), b = -int(r, 2, 9); return numq('int-mul', 'application', 3, `Find ${signed(a)} × ${signed(b)}.`, a * b, `A negative times a negative is positive: ${a * b}.`); }),
  ],
  'm7.fraction-ops': [
    G(2, (r) => { const d = pick(r, [4, 6, 8, 10]); const a = int(r, 1, d - 1), b = int(r, 1, d - 1); const n = a + b, g = gcd(n, d); return mcq(r, 'frac-add-same', 'application', 2, `Find ${a}/${d} + ${b}/${d}.`, `${n / g}/${d / g}`, [`${n}/${d * 2}`, `${a * b}/${d}`, `${n / g + 1}/${d / g}`], `Same denominator: add the tops, ${n}/${d}${g > 1 ? ` = ${n / g}/${d / g}` : ''}.`, ['add_denominators']); }),
    G(3, (r) => { const a = int(r, 1, 3), b = int(r, 2, 5) + 1, c = int(r, 1, 3), d = int(r, 2, 5) + b; const num = a * d + c * b, den = b * d; const g = gcd(num, den); return mcq(r, 'frac-add-diff', 'application', 3, `Find ${a}/${b} + ${c}/${d}.`, `${num / g}/${den / g}`, [`${a + c}/${b + d}`, `${num / g}/${den}`, `${a * c}/${den / g}`], `Use the common denominator ${b * d}: (${a}×${d} + ${c}×${b})/${den} = ${num}/${den}${g > 1 ? ` = ${num / g}/${den / g}` : ''}.`, ['add_denominators']); }),
    G(2, (r) => { const b = int(r, 3, 8), d = int(r, 3, 8), a = int(r, 1, b - 1), c = int(r, 1, d - 1); const n = a * c, den = b * d, g = gcd(n, den); return mcq(r, 'frac-mul', 'application', 2, `Find ${a}/${b} × ${c}/${d}.`, `${n / g}/${den / g}`, [`${a + c}/${b + d}`, `${a * d}/${b * c}`, `${n}/${b + d}`], `Multiply tops and bottoms: ${n}/${den}${g > 1 ? ` = ${n / g}/${den / g}` : ''}.`); }),
  ],
  'm7.percent': [
    G(1, (r) => { const p = pick(r, [10, 20, 25, 50]), n = pick(r, [40, 60, 80, 120, 200]); return numq('pct-of', 'knowledge', 1, `Find ${p}% of ${n}.`, (p * n) / 100, `${p}/100 × ${n} = ${(p * n) / 100}.`); }),
    G(2, (r) => { const cp = pick(r, [200, 250, 400, 500]), g = pick(r, [10, 20, 25]); return numq('profit-sp', 'application', 2, `An article bought for ₹${cp} is sold at a profit of ${g}%. Find the selling price in ₹.`, cp + (cp * g) / 100, `Profit = ${g}% of ${cp} = ${(cp * g) / 100}; SP = ${cp + (cp * g) / 100}.`); }),
    G(3, (r) => { const mp = pick(r, [500, 800, 1200, 2000]), d = pick(r, [10, 15, 20, 25]); return numq('discount', 'application', 3, `A shirt marked ₹${mp} is sold at ${d}% discount. What is the price paid, in ₹?`, mp - (mp * d) / 100, `Discount = ${(mp * d) / 100}; price = ${mp - (mp * d) / 100}.`); }),
  ],
  'm7.exponents': [
    G(1, (r) => { const a = int(r, 2, 5), n = int(r, 2, 4); return numq('exp-eval', 'knowledge', 1, `Find the value of ${a}^${n}.`, a ** n, `${a}^${n} = ${a ** n}.`); }),
    G(2, (r) => { const a = pick(r, [2, 3, 5]), m = int(r, 2, 6), n = int(r, 2, 6); return mcq(r, 'exp-mul', 'conceptual', 2, `Simplify ${a}^${m} × ${a}^${n} as a single power of ${a}.`, `${a}^${m + n}`, [`${a}^${m * n}`, `${a * a}^${m + n}`, `${a}^${Math.abs(m - n)}`], `Same base: add the powers, ${m} + ${n} = ${m + n}.`, ['multiply_powers']); }),
    G(3, (r) => { const a = pick(r, [2, 3]), m = int(r, 5, 8), n = int(r, 2, 4); return numq('exp-div', 'application', 3, `Find the value of ${a}^${m} ÷ ${a}^${n}.`, a ** (m - n), `Subtract powers: ${a}^${m - n} = ${a ** (m - n)}.`); }),
  ],
  'm7.alg-expr': [
    G(1, (r) => { const a = int(r, 2, 9), b = int(r, 2, 9); return mcq(r, 'like-terms', 'knowledge', 1, `Simplify ${a}x + ${b}x.`, `${a + b}x`, [`${a * b}x`, `${a + b}x^2`, `${a + b}`], `Like terms: add the numbers in front: ${a + b}x.`, ['multiply_coefficients']); }),
    G(2, (r) => { const a = int(r, 3, 9), b = int(r, 1, 8), c = int(r, 1, 8), d = int(r, 1, 8); return mcq(r, 'like-terms-2', 'application', 2, `Simplify (${a}x + ${b}) + (${c}x + ${d}).`, `${a + c}x + ${b + d}`, [`${a + c}x + ${b * d}`, `${a * c}x + ${b + d}`, `${a + c + b + d}x`], `Add like terms: ${a}x + ${c}x = ${a + c}x and ${b} + ${d} = ${b + d}.`); }),
    G(3, (r) => { const a = int(r, 3, 9), b = int(r, 1, 8), c = int(r, 1, 3), d = int(r, 1, 8); return mcq(r, 'like-terms-sub', 'application', 3, `Simplify (${a}x + ${b}) − (${c}x − ${d}).`, `${a - c}x + ${b + d}`, [`${a - c}x ${b - d < 0 ? '−' : '+'} ${Math.abs(b - d)}`, `${a - c}x − ${b + d}`, `${a + c}x + ${b + d}`], `Subtracting (${c}x − ${d}) changes both signs: ${a}x − ${c}x + ${b} + ${d} = ${a - c}x + ${b + d}.`, ['sign_error_in_brackets']); }),
  ],
  'm7.linear-eq-1var': [
    G(2, (r) => { const x = int(r, 2, 12), a = int(r, 2, 7), b = int(r, 1, 12); return numq('eq2', 'application', 2, `Solve ${a}x + ${b} = ${a * x + b}.`, x, `Subtract ${b}: ${a}x = ${a * x}; divide by ${a}: x = ${x}.`); }),
    G(3, (r) => { const x = int(r, 2, 10), a = int(r, 2, 7), b = int(r, 1, 12); return numq('eq2-minus', 'application', 3, `Solve ${a}x − ${b} = ${a * x - b}.`, x, `Add ${b}: ${a}x = ${a * x}; divide by ${a}: x = ${x}.`); }),
    G(3, (r) => { const x = int(r, 4, 15), k = int(r, 2, 6); return numq('eq-word', 'reasoning', 3, `${k} times a number plus 3 is ${k * x + 3}. Find the number.`, x, `${k}x + 3 = ${k * x + 3}, so ${k}x = ${k * x} and x = ${x}.`); }),
  ],
  'm7.triangle-props': [
    G(1, (r) => { const a = int(r, 30, 80), b = int(r, 30, 80); return numq('angle-sum', 'knowledge', 1, `Two angles of a triangle are ${a}° and ${b}°. Find the third angle.`, 180 - a - b, `Angles add to 180°: 180 − ${a} − ${b} = ${180 - a - b}.`); }),
    G(2, (r) => { const a = int(r, 30, 80), b = int(r, 30, 80); return numq('ext-angle', 'application', 2, `In a triangle two interior angles are ${a}° and ${b}°. Find the exterior angle opposite to them.`, a + b, `The exterior angle equals the sum of the two interior opposite angles: ${a + b}.`); }),
    G(3, (r) => { const a = int(r, 25, 70); return numq('isosceles', 'application', 3, `In an isosceles triangle the apex angle is ${a * 2}°. Find each base angle.`, (180 - a * 2) / 2, `Base angles are equal: (180 − ${a * 2}) ÷ 2 = ${(180 - a * 2) / 2}.`); }),
  ],
  'm7.area-circle': [
    G(2, (r) => { const rad = pick(r, [7, 14, 21]); return numq('circumference', 'application', 2, `Find the circumference of a circle of radius ${rad} cm (use π = 22/7).`, 2 * (22 / 7) * rad, `2 × 22/7 × ${rad} = ${s(2 * (22 / 7) * rad)} cm.`); }),
    G(3, (r) => { const rad = pick(r, [7, 14, 21]); return numq('circle-area', 'application', 3, `Find the area of a circle of radius ${rad} cm (use π = 22/7), in square cm.`, (22 / 7) * rad * rad, `22/7 × ${rad} × ${rad} = ${s((22 / 7) * rad * rad)}.`); }),
    G(2, (r) => { const d = pick(r, [14, 28, 42]); return numq('circ-from-d', 'application', 2, `A circle has diameter ${d} cm. Find its circumference (π = 22/7), in cm.`, (22 / 7) * d, `π × d = 22/7 × ${d} = ${s((22 / 7) * d)}.`); }),
  ],
  'm7.mean-median-mode': [
    G(1, (r) => { const v = [int(r, 2, 20), int(r, 2, 20), int(r, 2, 20), int(r, 2, 20), int(r, 2, 20)]; const t = v.reduce((x, y) => x + y, 0); const adj = v.slice(); adj[4] += (5 - (t % 5)) % 5; const tt = adj.reduce((x, y) => x + y, 0); return numq('mean', 'knowledge', 1, `Find the mean of ${adj.join(', ')}.`, tt / 5, `Total = ${tt}; mean = ${tt} ÷ 5 = ${tt / 5}.`); }),
    G(2, (r) => { const v = [int(r, 1, 30), int(r, 1, 30), int(r, 1, 30), int(r, 1, 30), int(r, 1, 30)]; const sorted = [...v].sort((a, b) => a - b); return numq('median', 'application', 2, `Find the median of ${v.join(', ')}.`, sorted[2], `Sorted: ${sorted.join(', ')}; the middle value is ${sorted[2]}.`); }),
    G(2, (r) => { const m = int(r, 2, 9); const v = shuffle(r, [m, m, m, m + 1, m + 3, m + 4]); return numq('mode', 'knowledge', 2, `Find the mode of ${v.join(', ')}.`, m, `${m} appears most often.`); }),
  ],
  'm7.prob-intro': [
    G(1, (r) => { const red = int(r, 2, 8), blue = int(r, 2, 8); const g = gcd(red, red + blue); return mcq(r, 'prob-bag', 'knowledge', 1, `A bag has ${red} red and ${blue} blue balls. One ball is picked at random. What is the probability it is red?`, `${red / g}/${(red + blue) / g}`, [`${red}/${blue}`, `${blue / gcd(blue, red + blue)}/${(red + blue) / gcd(blue, red + blue)}`, `1/${red + blue}`], `Favourable ${red} out of ${red + blue} total.`, ['ratio_not_probability']); }),
    G(2, (r) => { const n = pick(r, [6, 10, 12, 20]); const k = int(r, 1, 3); const g = gcd(k, n); return mcq(r, 'prob-die', 'application', 2, `A fair ${n}-sided die has faces 1 to ${n}. What is the probability of getting a number less than or equal to ${k}?`, `${k / g}/${n / g}`, [`${k}/${n - 1}`, `1/${n}`, `${(n - k) / gcd(n - k, n)}/${n / gcd(n - k, n)}`], `${k} favourable faces out of ${n}.`); }),
    G(3, (r) => { const a = int(r, 3, 9); return numq('prob-complement', 'conceptual', 3, `If the probability of rain is ${a}/10, what is the probability of no rain? (give a decimal)`, (10 - a) / 10, `1 − ${a}/10 = ${(10 - a) / 10}.`); }),
  ],
  'm8.squares-roots': [
    G(1, (r) => { const a = int(r, 6, 20); return numq('sq', 'knowledge', 1, `Find ${a}².`, a * a, `${a} × ${a} = ${a * a}.`); }),
    G(2, (r) => { const a = int(r, 6, 25); return numq('sqrt', 'knowledge', 2, `Find the square root of ${a * a}.`, a, `${a} × ${a} = ${a * a}, so the square root is ${a}.`); }),
    G(3, (r) => { const a = int(r, 2, 9); return numq('cube', 'application', 3, `Find the cube root of ${a ** 3}.`, a, `${a} × ${a} × ${a} = ${a ** 3}.`); }),
  ],
  'm8.direct-inverse': [
    G(2, (r) => { const p = int(r, 3, 9), c = int(r, 4, 20), q = int(r, 10, 30); return numq('direct', 'application', 2, `${p} notebooks cost ₹${p * c}. How much do ${q} notebooks cost (in ₹)?`, q * c, `One notebook costs ₹${c}; ${q} cost ${q * c}.`); }),
    G(3, (r) => { const w = int(r, 3, 8), d = pick(r, [12, 18, 24]); const w2 = pick(r, [w * 2, w * 3]); return numq('inverse', 'application', 3, `${w} workers finish a job in ${d} days. How many days will ${w2} workers take (same speed)?`, (w * d) / w2, `Total work = ${w} × ${d} = ${w * d} worker-days; ÷ ${w2} = ${(w * d) / w2}.`); }),
    G(2, (r) => { const sp = int(r, 40, 80), t = int(r, 2, 5); return numq('speed', 'application', 2, `A car at ${sp} km/h covers how many km in ${t} hours?`, sp * t, `Distance = speed × time = ${sp * t}.`); }),
  ],
  'm8.linear-eq-both': [
    G(2, (r) => { const x = int(r, 2, 10), a = int(r, 3, 8), b = int(r, 1, a - 1), c = int(r, 1, 10); return numq('eq-both', 'application', 2, `Solve ${a}x + ${c} = ${b}x + ${(a - b) * x + c}.`, x, `Collect x terms: ${a - b}x = ${(a - b) * x}, so x = ${x}.`); }),
    G(3, (r) => { const x = int(r, 2, 9), k = int(r, 2, 4); return numq('eq-bracket', 'application', 3, `Solve ${k}(x + 3) = ${k * (x + 3)}.`, x, `Divide by ${k}: x + 3 = ${x + 3}, so x = ${x}.`); }),
    G(4, (r) => { const x = int(r, 3, 9), a = int(r, 5, 9), b = int(r, 2, 4); const c = int(r, 1, Math.min(6, (a - b) * x - 1)); return numq('eq-both-minus', 'reasoning', 4, `Solve ${a}x − ${c} = ${b}x + ${(a - b) * x - c}.`, x, `Collect x terms: ${a - b}x = ${(a - b) * x}, so x = ${x}.`); }),
  ],
  'm8.identities': [
    G(2, (r) => { const a = int(r, 2, 9); return mcq(r, 'identity-sq', 'knowledge', 2, `Expand (x + ${a})².`, `x² + ${2 * a}x + ${a * a}`, [`x² + ${a * a}`, `x² + ${a}x + ${a * a}`, `x² + ${2 * a}x + ${2 * a}`], `(a + b)² = a² + 2ab + b²: x² + 2·${a}·x + ${a}².`, ['forgot_middle_term']); }),
    G(3, (r) => { const a = int(r, 2, 9); return mcq(r, 'identity-diff', 'application', 3, `Expand (x + ${a})(x − ${a}).`, `x² − ${a * a}`, [`x² + ${a * a}`, `x² − ${2 * a}x`, `x² − ${a}`], `(a + b)(a − b) = a² − b².`, ['sign_of_difference']); }),
    G(3, (r) => { const a = int(r, 2, 7), b = int(r, 2, 7); return mcq(r, 'binomial-product', 'application', 3, `Expand (x + ${a})(x + ${b}).`, `x² + ${a + b}x + ${a * b}`, [`x² + ${a * b}x + ${a + b}`, `x² + ${a + b}`, `x² + ${a * b}`], `Multiply each term: x² + ${b}x + ${a}x + ${a * b}.`, ['swap_sum_product']); }),
  ],
  'm8.factorisation': [
    G(2, (r) => { const a = int(r, 2, 7), b = int(r, 2, 9); return mcq(r, 'common-factor', 'knowledge', 2, `Factorise ${a * b}x + ${a * 3}.`, `${a}(${b}x + 3)`, [`${a}(${b}x + ${a * 3})`, `${b}(${a}x + 3)`, `x(${a * b} + ${a * 3})`], `${a} is common to both terms.`); }),
    G(3, (r) => { const a = int(r, 2, 9); return mcq(r, 'diff-squares', 'application', 3, `Factorise x² − ${a * a}.`, `(x + ${a})(x − ${a})`, [`(x − ${a})²`, `(x + ${a})²`, `(x − ${a * a})(x + 1)`], `a² − b² = (a + b)(a − b).`); }),
    G(3, (r) => { const a = int(r, 2, 6); return mcq(r, 'perfect-sq', 'application', 3, `Factorise x² + ${2 * a}x + ${a * a}.`, `(x + ${a})²`, [`(x + ${a})(x − ${a})`, `(x + ${2 * a})²`, `x(x + ${2 * a + a * a})`], `It is (a + b)² with b = ${a}.`); }),
  ],
  'm8.pythagoras': [
    G(2, (r) => { const t = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [7, 24, 25]]); return numq('hypotenuse', 'application', 2, `A right triangle has legs ${t[0]} cm and ${t[1]} cm. Find the hypotenuse in cm.`, t[2], `${t[0]}² + ${t[1]}² = ${t[0] ** 2 + t[1] ** 2} = ${t[2]}².`); }),
    G(3, (r) => { const t = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10]]); return numq('leg', 'application', 3, `The hypotenuse of a right triangle is ${t[2]} cm and one leg is ${t[0]} cm. Find the other leg in cm.`, t[1], `${t[2]}² − ${t[0]}² = ${t[2] ** 2 - t[0] ** 2} = ${t[1]}².`); }),
    G(4, (r) => { const t = pick(r, [[5, 12, 13], [8, 15, 17], [7, 24, 25]]); return numq('ladder', 'application', 4, `A ladder ${t[2]} m long leans against a wall; its foot is ${t[0]} m from the wall. How high up the wall does it reach, in m?`, t[1], `Height² = ${t[2]}² − ${t[0]}² = ${t[1] ** 2}, so ${t[1]} m.`); }),
  ],
  'm8.solids': [
    G(2, (r) => { const l = int(r, 3, 9), b = int(r, 3, 9), h = int(r, 2, 8); return numq('cuboid-vol', 'application', 2, `Find the volume of a cuboid ${l} cm × ${b} cm × ${h} cm (cubic cm).`, l * b * h, `${l} × ${b} × ${h} = ${l * b * h}.`); }),
    G(3, (r) => { const a = int(r, 3, 12); return numq('cube-sa', 'application', 3, `Find the total surface area of a cube of side ${a} cm (square cm).`, 6 * a * a, `6 × ${a}² = ${6 * a * a}.`); }),
    G(4, (r) => { const rad = pick(r, [7, 14]), h = int(r, 3, 10); return numq('cyl-vol', 'application', 4, `Find the volume of a cylinder with radius ${rad} cm and height ${h} cm (π = 22/7), in cubic cm.`, (22 / 7) * rad * rad * h, `π r² h = 22/7 × ${rad}² × ${h} = ${s((22 / 7) * rad * rad * h)}.`); }),
  ],
  'm8.data-handling': [
    G(1, (r) => { const v = [int(r, 10, 40), int(r, 10, 40), int(r, 10, 40), int(r, 10, 40)]; const names = ['Mon', 'Tue', 'Wed', 'Thu']; const mx = Math.max(...v); return mcq(r, 'read-table', 'interpretation', 1, `Books read on ${names.join(', ')} were ${v.join(', ')} respectively. On which day were the most books read?`, names[v.indexOf(mx)], names.filter((n) => n !== names[v.indexOf(mx)]), `${mx} is the largest value, on ${names[v.indexOf(mx)]}.`); }),
    G(2, (r) => { const t = int(r, 20, 60) * 5; const p = pick(r, [20, 25, 40]); return numq('pie-share', 'interpretation', 2, `In a pie chart of ${t} students, a sector shows ${p}% choosing cricket. How many students is that?`, (t * p) / 100, `${p}% of ${t} = ${(t * p) / 100}.`); }),
    G(3, (r) => { const a = int(r, 30, 60), b = int(r, 20, 50); return numq('graph-diff', 'interpretation', 3, `A bar graph shows ${a} votes for A and ${b} votes for B. By how many votes does A lead?`, a - b, `${a} − ${b} = ${a - b}.`); }),
  ],
  'm9.number-systems': [
    G(2, (r) => { const bad = pick(r, [2, 3, 5, 6, 7]); const good = pick(r, [4, 9, 16, 25]); return mcq(r, 'irrational-which', 'conceptual', 2, `Which of these is an irrational number?`, `√${bad}`, [`√${good}`, `${int(r, 1, 9)}/${int(r, 2, 9)}`, `${int(r, 1, 9)}.${int(r, 1, 9)}`], `√${bad} cannot be written as p/q; the others are rational.`, ['sqrt_always_irrational']); }),
    G(3, (r) => { const a = pick(r, [2, 3, 5]), m = int(r, 2, 4), n = int(r, 2, 4); return mcq(r, 'exp-power-power', 'application', 3, `Simplify (${a}^${m})^${n}.`, `${a}^${m * n}`, [`${a}^${m + n}`, `${a * m}^${n}`, `${a}^${m ** n}`], `Power of a power: multiply the powers, ${m} × ${n}.`, ['add_powers']); }),
    G(3, (r) => { const t = pick(r, [['0.5', '1/2'], ['0.25', '1/4'], ['0.75', '3/4'], ['0.2', '1/5'], ['0.6', '3/5'], ['0.125', '1/8']]); return mcq(r, 'dec-to-frac', 'application', 3, `Write ${t[0]} as a fraction in simplest form.`, t[1], ['1/3', '2/5', '1/10', '3/8', '5/6'], `${t[0]} = ${t[1]} in simplest form.`); }),
  ],
  'm9.polynomials': [
    G(2, (r) => { const a = int(r, 2, 5), b = int(r, 1, 9), c = int(r, 1, 9), x = int(r, 1, 4); return numq('poly-eval', 'application', 2, `Find the value of ${a}x² + ${b}x + ${c} at x = ${x}.`, a * x * x + b * x + c, `${a}×${x * x} + ${b}×${x} + ${c} = ${a * x * x + b * x + c}.`); }),
    G(2, (r) => { const n = int(r, 3, 7); return numq('poly-degree', 'knowledge', 2, `What is the degree of the polynomial 4x^${n} + 3x² − 7?`, n, `The highest power of x is ${n}.`); }),
    G(3, (r) => { const z = int(r, 2, 7), a = int(r, 2, 5); return numq('poly-zero', 'application', 3, `If x = ${z} is a zero of p(x) = ${a}x − k, find k.`, a * z, `p(${z}) = ${a * z} − k = 0, so k = ${a * z}.`); }),
  ],
  'm9.poly-factor': [
    G(3, (r) => { const a = int(r, 1, 6), b = int(r, 1, 6); return mcq(r, 'factor-quad', 'application', 3, `Factorise x² + ${a + b}x + ${a * b}.`, `(x + ${a})(x + ${b})`, [`(x + ${a * b})(x + 1)`, `(x − ${a})(x − ${b})`, `(x + ${a + b})(x + ${a * b})`], `Find two numbers with sum ${a + b} and product ${a * b}: ${a} and ${b}.`, ['swap_sum_product']); }),
    G(3, (r) => { const a = int(r, 1, 7), b = int(r, 1, 7); return mcq(r, 'factor-quad-neg', 'application', 3, `Factorise x² − ${a + b}x + ${a * b}.`, `(x − ${a})(x − ${b})`, [`(x + ${a})(x + ${b})`, `(x − ${a * b})(x − 1)`, `(x − ${a})(x + ${b})`], `Both numbers are negative: sum −${a + b}, product ${a * b}.`, ['sign_error']); }),
    G(4, (r) => { const a = int(r, 2, 8), b = int(r, 1, a - 1); return mcq(r, 'factor-quad-mixed', 'reasoning', 4, `Factorise x² + ${a - b}x − ${a * b}.`, `(x + ${a})(x − ${b})`, [`(x − ${a})(x + ${b})`, `(x + ${a})(x + ${b})`, `(x − ${a})(x − ${b})`], `Numbers with product −${a * b} and sum ${a - b}: ${a} and −${b}.`, ['sign_error']); }),
  ],
  'm9.coord-plane': [
    G(1, (r) => { const x = int(r, -6, 6), y = int(r, -6, 6); const q = x > 0 && y > 0 ? 'I' : x < 0 && y > 0 ? 'II' : x < 0 && y < 0 ? 'III' : x > 0 && y < 0 ? 'IV' : 'on an axis'; return mcq(r, 'quadrant', 'knowledge', 1, `In which quadrant does the point (${x}, ${y}) lie?`, q === 'on an axis' ? 'on an axis' : `Quadrant ${q}`, ['Quadrant I', 'Quadrant II', 'Quadrant III', 'Quadrant IV', 'on an axis'].filter((o) => o !== (q === 'on an axis' ? 'on an axis' : `Quadrant ${q}`)), `Signs of (x, y) = (${Math.sign(x) || 0}, ${Math.sign(y) || 0}) decide the quadrant.`); }),
    G(2, (r) => { const x = int(r, 1, 8), y = int(r, 1, 8); return mcq(r, 'x-axis-dist', 'application', 2, `What is the distance of the point (${x}, ${y}) from the x-axis?`, String(y), [String(x), String(x + y), String(Math.abs(x - y) || 1)], `Distance from the x-axis is the y-value, ${y}.`, ['x_y_swap']); }),
    G(3, (r) => { const x = int(r, 1, 8); return numq('reflect', 'application', 3, `The point (${x}, 5) is reflected in the y-axis. What is the new x-coordinate?`, -x, `Reflection in the y-axis changes the sign of x: ${-x}.`); }),
  ],
  'm9.linear-2var': [
    G(2, (r) => { const x = int(r, 1, 6), y = int(r, 1, 6), a = int(r, 2, 5), b = int(r, 1, 5); return numq('lin2-sol', 'application', 2, `Find y if ${a}x + ${b}y = ${a * x + b * y} and x = ${x}.`, y, `${a}×${x} + ${b}y = ${a * x + b * y} gives ${b}y = ${b * y}, so y = ${y}.`); }),
    G(3, (r) => { const m = int(r, 2, 6), c = int(r, 1, 9), x = int(r, 1, 5); return numq('lin2-line', 'application', 3, `For the line y = ${m}x + ${c}, find y when x = ${x}.`, m * x + c, `${m}×${x} + ${c} = ${m * x + c}.`); }),
    G(3, (r) => { const a = int(r, 2, 6), b = int(r, 2, 6); return numq('lin2-intercept', 'application', 3, `Where does ${a}x + ${b}y = ${a * b} cut the x-axis? Give the x-value.`, b, `Put y = 0: ${a}x = ${a * b}, x = ${b}.`); }),
  ],
  'm9.congruence': [
    G(2, (r) => { return mcq(r, 'cong-criteria', 'knowledge', 2, `Which is NOT a rule for congruence of triangles?`, 'AAA', ['SSS', 'SAS', 'ASA'], 'AAA gives similar triangles, not necessarily congruent ones.', ['aaa_is_congruence']); }),
    G(3, (r) => { const a = int(r, 30, 80), b = int(r, 30, 80); return numq('cong-angle', 'application', 3, `Triangles ABC and PQR are congruent with A = P. If angle B = ${a}° and angle C = ${b}°, find angle P (angle A) in degrees.`, 180 - a - b, `Angle A = 180 − ${a} − ${b} = ${180 - a - b}, and P = A.`); }),
    G(2, (r) => { const s1 = int(r, 4, 12); return numq('cong-side', 'application', 2, `Triangles ABC and DEF are congruent with AB = DE. If AB = ${s1} cm, what is DE in cm?`, s1, 'Corresponding sides of congruent triangles are equal.'); }),
  ],
  'm9.circles': [
    G(2, (r) => { const rad = int(r, 3, 12); return numq('diam', 'knowledge', 2, `The radius of a circle is ${rad} cm. What is the longest chord, in cm?`, 2 * rad, `The longest chord is the diameter, 2 × ${rad}.`); }),
    G(3, (r) => { const a = int(r, 25, 70); return numq('tangent-angle', 'application', 3, `A tangent touches a circle at P and OP is the radius. In triangle OPQ (Q on the tangent) the angle at O is ${a}°. Find angle OQP in degrees.`, 90 - a, `OP is perpendicular to the tangent, so angle P = 90°; angle Q = 180 − 90 − ${a} = ${90 - a}.`); }),
    G(3, (r) => { const t = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17]]); return numq('tangent-len', 'application', 3, `A point is ${t[2]} cm from the centre of a circle of radius ${t[0]} cm. Find the length of the tangent from the point, in cm.`, t[1], `Tangent² = ${t[2]}² − ${t[0]}² = ${t[1] ** 2}.`); }),
  ],
  'm9.surface-volume': [
    G(2, (r) => { const rad = pick(r, [7, 14, 21]); return numq('sphere-sa', 'application', 2, `Find the surface area of a sphere of radius ${rad} cm (π = 22/7), in square cm.`, 4 * (22 / 7) * rad * rad, `4πr² = 4 × 22/7 × ${rad}² = ${s(4 * (22 / 7) * rad * rad)}.`); }),
    G(3, (r) => { const rad = pick(r, [3, 6, 9]); return numq('sphere-vol', 'application', 3, `Find the volume of a sphere of radius ${rad} cm in terms of π: give the number multiplying π.`, (4 / 3) * rad ** 3, `(4/3) × ${rad}³ = ${s((4 / 3) * rad ** 3)}.`); }),
    G(3, (r) => { const rad = pick(r, [3, 6, 9]), h = int(r, 2, 4) * 3; return numq('cone-vol', 'application', 3, `A cone has radius ${rad} cm and height ${h} cm. Find its volume in terms of π (the number multiplying π).`, (rad * rad * h) / 3, `(1/3) r² h = ${(rad * rad * h) / 3}.`); }),
  ],
  'm9.statistics': [
    G(2, (r) => { const x = [int(r, 2, 5), int(r, 6, 9)], f = [int(r, 2, 6), int(r, 2, 6)]; const t = x[0] * f[0] + x[1] * f[1], n = f[0] + f[1]; return numq('mean-freq', 'application', 2, `Value ${x[0]} occurs ${f[0]} times and value ${x[1]} occurs ${f[1]} times. Find the mean (2 decimal places).`, t / n, `Mean = (${x[0]}×${f[0]} + ${x[1]}×${f[1]}) ÷ ${n} = ${s(t / n)}.`); }),
    G(3, (r) => { const f = [int(r, 2, 6), int(r, 2, 6), int(r, 2, 6)]; return numq('total-freq', 'knowledge', 3, `A frequency table has frequencies ${f.join(', ')}. How many observations are there in all?`, f[0] + f[1] + f[2], `Add the frequencies.`); }),
    G(3, (r) => { const m = int(r, 3, 9), k = int(r, 2, 6); return numq('mean-shift', 'conceptual', 3, `The mean of some numbers is ${m}. If ${k} is added to every number, what is the new mean?`, m + k, `Adding ${k} to each value adds ${k} to the mean.`); }),
  ],
  'm9.probability': [
    G(2, (r) => { const n = int(r, 20, 60), k = int(r, 3, 15); const g = gcd(k, n); return mcq(r, 'exp-prob', 'application', 2, `A coin is tossed ${n} times and heads comes ${k} times. What is the experimental probability of heads?`, `${k / g}/${n / g}`, [`${(n - k) / gcd(n - k, n)}/${n / gcd(n - k, n)}`, `${k}/${n - k}`, `1/${n}`], `${k} out of ${n} tosses.`, ['ratio_not_probability']); }),
    G(3, (r) => { const n = int(r, 4, 8); return mcq(r, 'prob-range', 'conceptual', 3, `Which cannot be the probability of an event?`, `${n}/${n - 2}`, ['0', '1', `1/${n}`], 'A probability is never more than 1.', ['prob_over_one']); }),
    G(3, (r) => { const t = pick(r, [[4, 'an ace'], [13, 'a heart'], [26, 'a red card'], [12, 'a face card']]); const g = gcd(Number(t[0]), 52); return mcq(r, 'prob-cards', 'application', 3, `One card is drawn from a well-shuffled pack of 52 cards. What is the probability of getting ${t[1]}?`, `${Number(t[0]) / g}/${52 / g}`, ['1/52', '1/2', '1/26', '1/4', '1/13'], `${t[0]} favourable cards out of 52.`); }),
  ],
};
export const foundationCodes = () => Object.keys(FOUNDATION_GENERATORS);

/** Picks one question for a competency near the wanted difficulty; `avoid` holds prompts already used. */
export function generateFoundationItem(code: string, wantedDifficulty: number, rng: Rng, avoid: Set<string> = new Set()): FoundationQ | null {
  const gens = FOUNDATION_GENERATORS[code];
  if (!gens || gens.length === 0) return null;
  const sorted = [...gens].sort((a, b) => Math.abs(a.d - wantedDifficulty) - Math.abs(b.d - wantedDifficulty) || rng() - 0.5);
  for (let attempt = 0; attempt < 14; attempt++) {
    const g = sorted[attempt % Math.min(sorted.length, 3)];
    const q = g.f(rng);
    if (q.prompt && !avoid.has(q.prompt)) return q;
  }
  return null;
}
