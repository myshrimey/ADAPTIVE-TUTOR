// v62: the Class 6-9 Mathematics prerequisite graph that sits UNDER the Class 10 skills. Written by Claude from the
// general structure of the CBSE/NCERT Mathematics syllabus; the class a topic is "typically introduced around" can differ
// slightly between textbook editions, so every row is status needs_review until a Mathematics teacher confirms it
// (/admin/diagnostic-engine shows the count still waiting). Nothing here is an official CBSE document.
export interface FoundationDef {
  code: string; // m<class>.<slug>
  classLevel: number;
  chapter: string;
  name: string;
  domain: 'arithmetic' | 'algebra' | 'geometry' | 'mensuration' | 'data';
  requires: string[];
  idea: string; // one-line key idea shown on the repair screen
  importance?: number;
}

export const FOUNDATION_MATHS: FoundationDef[] = [
  // Class 6
  { code: 'm6.whole-ops', classLevel: 6, chapter: 'Whole numbers', name: 'Whole-number operations and order of operations', domain: 'arithmetic', requires: [], idea: 'Brackets first, then multiplication and division, then addition and subtraction, left to right.' },
  { code: 'm6.factors-multiples', classLevel: 6, chapter: 'Playing with numbers', name: 'Factors, multiples, HCF and LCM basics', domain: 'arithmetic', requires: ['m6.whole-ops'], idea: 'A factor divides a number exactly; HCF is the largest shared factor, LCM the smallest shared multiple.' },
  { code: 'm6.fractions-basic', classLevel: 6, chapter: 'Fractions', name: 'Fractions: equivalent fractions and comparison', domain: 'arithmetic', requires: ['m6.whole-ops'], idea: 'Multiply or divide top and bottom by the same number to get an equivalent fraction.' },
  { code: 'm6.decimals-basic', classLevel: 6, chapter: 'Decimals', name: 'Decimals: add, subtract and multiply', domain: 'arithmetic', requires: ['m6.whole-ops'], idea: 'Line up the decimal points to add or subtract; count decimal places when multiplying.' },
  { code: 'm6.ratio-basic', classLevel: 6, chapter: 'Ratio and proportion', name: 'Ratio and simple proportion', domain: 'arithmetic', requires: ['m6.fractions-basic'], idea: 'A ratio compares two quantities; equal ratios form a proportion.' },
  { code: 'm6.patterns', classLevel: 6, chapter: 'Patterns', name: 'Number patterns and sequences', domain: 'arithmetic', requires: ['m6.whole-ops'], idea: 'Find what is added each time to continue a pattern.' },
  { code: 'm6.algebra-intro', classLevel: 6, chapter: 'Algebra', name: 'Simple expressions: substituting values', domain: 'algebra', requires: ['m6.whole-ops'], idea: 'A letter stands for a number; replace it and calculate.' },
  { code: 'm6.simple-eq', classLevel: 6, chapter: 'Algebra', name: 'Simple equations (one step)', domain: 'algebra', requires: ['m6.algebra-intro'], idea: 'Do the same thing to both sides to find the unknown.' },
  { code: 'm6.angles-basic', classLevel: 6, chapter: 'Basic geometry', name: 'Angles: types and complementary / supplementary', domain: 'geometry', requires: [], idea: 'Complementary angles add to 90 degrees, supplementary to 180 degrees.' },
  { code: 'm6.perimeter-area', classLevel: 6, chapter: 'Mensuration', name: 'Perimeter and area of rectangles and squares', domain: 'mensuration', requires: ['m6.whole-ops'], idea: 'Perimeter is the distance around; area is length times breadth.' },
  // Class 7
  { code: 'm7.integers', classLevel: 7, chapter: 'Integers', name: 'Integer operations (negative numbers)', domain: 'arithmetic', requires: ['m6.whole-ops'], idea: 'Same signs add and keep the sign; different signs subtract and take the sign of the larger.' },
  { code: 'm7.fraction-ops', classLevel: 7, chapter: 'Fractions and decimals', name: 'Operations on fractions and decimals', domain: 'arithmetic', requires: ['m6.fractions-basic', 'm6.decimals-basic'], idea: 'Use a common denominator to add; multiply tops and bottoms to multiply.' },
  { code: 'm7.percent', classLevel: 7, chapter: 'Comparing quantities', name: 'Percentages, profit and loss', domain: 'arithmetic', requires: ['m7.fraction-ops', 'm6.ratio-basic'], idea: 'Percent means out of 100.' },
  { code: 'm7.exponents', classLevel: 7, chapter: 'Exponents and powers', name: 'Exponents and powers', domain: 'arithmetic', requires: ['m6.whole-ops'], idea: 'a^n means a multiplied by itself n times.' },
  { code: 'm7.alg-expr', classLevel: 7, chapter: 'Algebraic expressions', name: 'Algebraic expressions: like terms', domain: 'algebra', requires: ['m6.algebra-intro', 'm7.integers'], idea: 'Only like terms (same letters and powers) can be added or subtracted.' },
  { code: 'm7.linear-eq-1var', classLevel: 7, chapter: 'Simple equations', name: 'Linear equations in one variable (two steps)', domain: 'algebra', requires: ['m6.simple-eq', 'm7.integers'], idea: 'Undo addition or subtraction first, then multiplication or division.' },
  { code: 'm7.triangle-props', classLevel: 7, chapter: 'Triangles', name: 'Triangle properties: angle sum and exterior angle', domain: 'geometry', requires: ['m6.angles-basic'], idea: 'The three angles of a triangle add to 180 degrees.' },
  { code: 'm7.area-circle', classLevel: 7, chapter: 'Perimeter and area', name: 'Circles: circumference and area', domain: 'mensuration', requires: ['m6.perimeter-area', 'm6.decimals-basic'], idea: 'Circumference = 2 x pi x r; area = pi x r x r.' },
  { code: 'm7.mean-median-mode', classLevel: 7, chapter: 'Data handling', name: 'Mean, median and mode of simple data', domain: 'data', requires: ['m6.whole-ops'], idea: 'Mean is total divided by count; median is the middle value; mode is the most frequent.' },
  { code: 'm7.prob-intro', classLevel: 7, chapter: 'Data handling', name: 'Chance and basic probability', domain: 'data', requires: ['m6.fractions-basic'], idea: 'Probability = favourable outcomes divided by all outcomes.' },
  // Class 8
  { code: 'm8.squares-roots', classLevel: 8, chapter: 'Squares and square roots', name: 'Squares, square roots and cubes', domain: 'arithmetic', requires: ['m7.exponents'], idea: 'The square root undoes squaring.' },
  { code: 'm8.direct-inverse', classLevel: 8, chapter: 'Direct and inverse proportion', name: 'Direct and inverse proportion', domain: 'arithmetic', requires: ['m6.ratio-basic', 'm7.percent'], idea: 'Direct: both grow together. Inverse: one grows as the other shrinks.' },
  { code: 'm8.linear-eq-both', classLevel: 8, chapter: 'Linear equations', name: 'Linear equations with the unknown on both sides', domain: 'algebra', requires: ['m7.linear-eq-1var'], idea: 'Collect the unknowns on one side and the numbers on the other.' },
  { code: 'm8.identities', classLevel: 8, chapter: 'Algebraic identities', name: 'Algebraic identities and expanding', domain: 'algebra', requires: ['m7.alg-expr'], idea: '(a+b)^2 = a^2 + 2ab + b^2 and (a+b)(a-b) = a^2 - b^2.' },
  { code: 'm8.factorisation', classLevel: 8, chapter: 'Factorisation', name: 'Factorisation: common factors and identities', domain: 'algebra', requires: ['m8.identities'], idea: 'Factorising is expanding in reverse.' },
  { code: 'm8.pythagoras', classLevel: 8, chapter: 'Right triangles', name: 'Pythagoras theorem', domain: 'geometry', requires: ['m8.squares-roots', 'm7.triangle-props'], idea: 'In a right triangle, hypotenuse^2 = base^2 + height^2.' },
  { code: 'm8.solids', classLevel: 8, chapter: 'Mensuration', name: 'Surface area and volume of cuboid, cube and cylinder', domain: 'mensuration', requires: ['m6.perimeter-area', 'm7.area-circle'], idea: 'Volume = base area x height.' },
  { code: 'm8.data-handling', classLevel: 8, chapter: 'Data handling', name: 'Reading tables and graphs; probability of events', domain: 'data', requires: ['m7.mean-median-mode', 'm7.prob-intro'], idea: 'Read the title, axes and scale before answering.' },
  // Class 9
  { code: 'm9.number-systems', classLevel: 9, chapter: 'Number systems', name: 'Rational and irrational numbers; laws of exponents', domain: 'arithmetic', requires: ['m8.squares-roots', 'm7.fraction-ops'], idea: 'A rational number can be written p/q; sqrt(2) cannot.' },
  { code: 'm9.polynomials', classLevel: 9, chapter: 'Polynomials', name: 'Polynomials: degree, value and zeroes', domain: 'algebra', requires: ['m7.alg-expr', 'm8.linear-eq-both'], idea: 'A zero of a polynomial is a value that makes it equal 0.' },
  { code: 'm9.poly-factor', classLevel: 9, chapter: 'Polynomials', name: 'Factorising quadratic polynomials', domain: 'algebra', requires: ['m8.factorisation', 'm9.polynomials'], idea: 'Find two numbers with the given product and sum.' },
  { code: 'm9.coord-plane', classLevel: 9, chapter: 'Coordinate geometry', name: 'The coordinate plane: plotting and reading points', domain: 'geometry', requires: ['m7.integers'], idea: 'A point is (x, y): across first, then up or down.' },
  { code: 'm9.linear-2var', classLevel: 9, chapter: 'Linear equations in two variables', name: 'Linear equations in two variables', domain: 'algebra', requires: ['m8.linear-eq-both', 'm9.coord-plane'], idea: 'An equation like 2x + y = 7 has many (x, y) solutions that lie on a line.' },
  { code: 'm9.congruence', classLevel: 9, chapter: 'Triangles', name: 'Congruent triangles and similar-figure ideas', domain: 'geometry', requires: ['m7.triangle-props'], idea: 'Congruent triangles match in all sides and angles.' },
  { code: 'm9.circles', classLevel: 9, chapter: 'Circles', name: 'Circles: radius, chord, tangent and angle properties', domain: 'geometry', requires: ['m7.triangle-props', 'm8.pythagoras'], idea: 'The radius to the point where a tangent touches is perpendicular to the tangent.' },
  { code: 'm9.surface-volume', classLevel: 9, chapter: 'Surface areas and volumes', name: 'Surface area and volume of cone, sphere and hemisphere', domain: 'mensuration', requires: ['m8.solids', 'm7.area-circle'], idea: 'Sphere volume = (4/3) x pi x r^3.' },
  { code: 'm9.statistics', classLevel: 9, chapter: 'Statistics', name: 'Frequency tables, mean, median and mode', domain: 'data', requires: ['m7.mean-median-mode', 'm8.data-handling'], idea: 'Use the frequency as a weight when finding the mean.' },
  { code: 'm9.probability', classLevel: 9, chapter: 'Probability', name: 'Probability from experiments and events', domain: 'data', requires: ['m7.prob-intro'], idea: 'Probability is always between 0 and 1.' },
];

// Class 10 skill slug -> foundation competencies it needs (added on top of the prerequisites already in the seed files).
export const CLASS10_BRIDGES: Record<string, string[]> = {
  'integer-arithmetic': ['m7.integers', 'm6.whole-ops'],
  'euclid-hcf': ['m6.factors-multiples'],
  'prime-factorisation': ['m6.factors-multiples'],
  'hcf-lcm-prime-factorisation': ['m6.factors-multiples', 'm7.exponents'],
  'prove-irrationality': ['m9.number-systems', 'm8.squares-roots'],
  'evaluate-polynomial': ['m9.polynomials'],
  'zeroes-graph-relation': ['m9.coord-plane'],
  'multiply-binomials': ['m8.identities'],
  'factorise-trinomial': ['m9.poly-factor'],
  'find-zeroes-quadratic': ['m9.poly-factor'],
  'form-quadratic-from-zeroes': ['m8.identities'],
  'divide-polynomials': ['m9.polynomials'],
  'plot-linear-equation': ['m9.linear-2var', 'm9.coord-plane'],
  'interpret-line-relationships': ['m9.linear-2var'],
  'solve-linear-equation': ['m8.linear-eq-both'],
  'solve-by-substitution': ['m8.linear-eq-both', 'm9.linear-2var'],
  'solve-by-elimination': ['m9.linear-2var'],
  'formulate-linear-equations-word-problem': ['m7.linear-eq-1var'],
  'standard-form-quadratic': ['m8.identities'],
  'solve-quadratic-by-factorisation': ['m9.poly-factor'],
  'solve-quadratic-formula': ['m8.squares-roots', 'm8.linear-eq-both'],
  'discriminant-nature-of-roots': ['m8.squares-roots'],
  'formulate-quadratic-word-problem': ['m7.linear-eq-1var'],
  'find-nth-term-ap': ['m6.patterns'],
  'sum-first-n-terms-ap': ['m6.patterns', 'm8.linear-eq-both'],
  'determine-triangle-similarity': ['m9.congruence', 'm6.ratio-basic'],
  'apply-pythagoras-theorem': ['m8.pythagoras'],
  'find-distance-two-points': ['m9.coord-plane', 'm8.pythagoras'],
  'find-section-formula-point': ['m9.coord-plane', 'm6.ratio-basic'],
  'find-trig-ratios': ['m6.ratio-basic'],
  'apply-trig-identity': ['m8.identities'],
  'solve-height-distance-problem': ['m6.angles-basic'],
  'apply-tangent-perpendicular-property': ['m9.circles'],
  'find-tangent-length': ['m9.circles', 'm8.pythagoras'],
  'calculate-circle-area-circumference': ['m7.area-circle'],
  'calculate-sector-area': ['m7.area-circle', 'm6.fractions-basic'],
  'find-surface-area-combined-solid': ['m9.surface-volume'],
  'find-volume-combined-solid': ['m9.surface-volume'],
  'calculate-mean-grouped-data': ['m9.statistics'],
  'calculate-median-grouped-data': ['m9.statistics'],
  'calculate-simple-probability': ['m9.probability', 'm7.prob-intro'],
};

/** Class 10 skill slug -> domain. */
export const CLASS10_DOMAIN: Record<string, FoundationDef['domain']> = {
  'integer-arithmetic': 'arithmetic', 'euclid-hcf': 'arithmetic', 'prime-factorisation': 'arithmetic', 'hcf-lcm-prime-factorisation': 'arithmetic', 'prove-irrationality': 'arithmetic',
  'find-nth-term-ap': 'algebra', 'sum-first-n-terms-ap': 'algebra',
  'determine-triangle-similarity': 'geometry', 'apply-pythagoras-theorem': 'geometry', 'find-distance-two-points': 'geometry', 'find-section-formula-point': 'geometry',
  'find-trig-ratios': 'geometry', 'apply-trig-identity': 'geometry', 'solve-height-distance-problem': 'geometry', 'apply-tangent-perpendicular-property': 'geometry', 'find-tangent-length': 'geometry',
  'calculate-circle-area-circumference': 'mensuration', 'calculate-sector-area': 'mensuration', 'find-surface-area-combined-solid': 'mensuration', 'find-volume-combined-solid': 'mensuration',
  'calculate-mean-grouped-data': 'data', 'calculate-median-grouped-data': 'data', 'calculate-simple-probability': 'data',
};
export const classTenDomain = (slug: string): FoundationDef['domain'] => CLASS10_DOMAIN[slug] ?? 'algebra';
