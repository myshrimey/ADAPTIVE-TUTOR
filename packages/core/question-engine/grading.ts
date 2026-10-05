// Deterministic answer comparison for anything with a symbolic/numeric expected
// answer (docs/architecture.md §11, §13 — avoids an LLM call to grade "x=2"
// against "x=2"). Free-text/"explain why" answers fall back to the evaluation
// prompt instead (see prompts/evaluation.prompt.ts), not this function.
//
// This is intentionally structural rather than exact-string matching, per the
// PRD's "require structured answer evaluation whenever possible": it handles
// the three shapes the CBSE Class 10 seed content actually produces —
// - a single value ("20", "6")
// - a set of roots in any order ("x = -2, -3" == "x = -3, -2")
// - a polynomial/expression whose terms can appear in any order
//   ("x^2 - 2x - 15" == "-2x + x^2 - 15")
// It is NOT a general computer-algebra system — it won't recognize that
// "2(x+1)" equals "2x+2". That's a deliberate MVP boundary; closing it further
// would mean parsing into an actual expression tree, which is more than this
// grading step needs to earn its keep yet.

export function gradeAnswer(expected: unknown, given: unknown): boolean {
  const expectedStr = extractString(expected);
  const givenStr = extractString(given);

  const expectedSets = splitIntoComparableSets(expectedStr);
  const givenSets = splitIntoComparableSets(givenStr);

  if (expectedSets.length !== givenSets.length) return false;
  return expectedSets.every((set, i) => sameSet(set, givenSets[i]));
}

export function extractString(v: unknown): string {
  if (typeof v === 'object' && v !== null && 'value' in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>).value ?? '');
  }
  return String(v ?? '');
}

/**
 * Splits an answer string on "=" (e.g. "x = -2, -3" -> ["x", "-2, -3"]), then
 * within each side splits on "," (multiple roots) and on top-level +/- (terms
 * of an expression), producing arrays of normalized tokens that can be
 * order-independently compared. A plain single value ("20") comes back as
 * [["20"]] — one side, one token.
 */
function splitIntoComparableSets(raw: string): string[][] {
  const normalized = normalize(raw);
  const sides = normalized.split('=').map((s) => s.trim());
  return sides.map((side) => tokenize(side));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\*\*/g, '^')
    .replace(/×/g, '*');
}

/**
 * Tokenizes one side into either comma-separated values (root lists) or
 * +/-  separated terms (expressions) — whichever the string contains. A term's
 * own leading sign is kept attached to it so "-2x" and "+x^2" compare correctly
 * regardless of position.
 */
function tokenize(side: string): string[] {
  if (side.includes(',')) {
    return side.split(',').map((t) => t.trim()).filter(Boolean).sort();
  }
  // Split on + or - that isn't the very first character, re-attaching the
  // sign consumed by the split to the term that follows it.
  const terms: string[] = [];
  let current = '';
  for (let i = 0; i < side.length; i++) {
    const ch = side[i];
    if ((ch === '+' || ch === '-') && i > 0) {
      terms.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) terms.push(current);

  // A term with no explicit sign (only possible for the first term, since
  // every later term starts with the +/- that split it off) is implicitly
  // positive — normalize it to start with "+" so it sorts and compares
  // consistently with the same term appearing elsewhere with an explicit "+".
  const normalizedTerms = terms.map((t) => (t[0] === '+' || t[0] === '-' ? t : `+${t}`));
  return normalizedTerms.length > 1 ? normalizedTerms.sort() : normalizedTerms;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((token, i) => token === b[i]);
}
