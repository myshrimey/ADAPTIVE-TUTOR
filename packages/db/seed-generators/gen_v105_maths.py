# v105: Maths. Procedural questions for existing skills at difficulty 1 (warm-up) and 4 (harder, multi-step), the two levels the bank lacks.
# Every answer is computed by code AND re-derived by a second, independent method (sympy / brute force); the script stops if they ever disagree.
# All questions are written needs_review (never 'verified'): a teacher still has to look at them.
import json, math, os, random, sys
from fractions import Fraction
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
TR = standard_transformations + (implicit_multiplication_application,)
HERE = os.path.dirname(os.path.abspath(__file__)); SEED = os.path.join(HERE, '..', 'seed')
random.seed(20261104)
Q = []; SEEN = set()
for fn in ('cbse-class10-maths-diagnostic.json',):
    for q in json.load(open(os.path.join(SEED, fn)))['questions']: SEEN.add(q['prompt'].strip())

def add(skill, diff, qtype, prompt, answer, tags, expl, options=None):
    prompt = prompt.strip()
    if prompt in SEEN: return False
    SEEN.add(prompt)
    q = {'skill_slug': skill, 'difficulty': diff, 'question_type': qtype, 'prompt': prompt, 'expected_answer': {'value': str(answer)},
         'misconception_tags': tags, 'explanation': expl, 'content_status': 'needs_review'}
    if options is not None: q['options'] = options
    Q.append(q); return True

def fmt(x):
    x = Fraction(x)
    if x.denominator == 1: return str(x.numerator)
    return str(float(x)) if (x.denominator in (2, 4, 5, 8, 10, 20, 25, 50)) else f'{x.numerator}/{x.denominator}'
def check(a, b, what):
    if Fraction(a) != Fraction(b): sys.exit(f'MISMATCH {what}: {a} vs {b}')
def many(n, fn):
    got = 0; tries = 0
    while got < n and tries < 400:
        tries += 1
        if fn(): got += 1
    assert got == n, (fn.__name__, got)
x = sp.symbols('x')
FM, AE, SE, PE, CC, IR, AM = 'FORMULA_MISUSE', 'ARITHMETIC_ERROR', 'SIGN_ERROR', 'PROCEDURAL_ERROR', 'CONCEPT_CONFUSION', 'INCOMPLETE_REASONING', 'ALGEBRAIC_MANIPULATION'

# ---- 1 Real Numbers
def t_euclid_d4():
    g = random.choice([3, 4, 5, 6, 7, 9, 11, 13]); a0, b0 = random.sample(range(12, 60), 2)
    if math.gcd(a0, b0) != 1: return False
    a, b = a0 * g, b0 * g
    if a < b: a, b = b, a
    ans = g; check(ans, sp.gcd(a, b), 'euclid')
    return add('euclid-hcf', 4, 'numeric', f'Use Euclid\'s division algorithm to find the HCF of {a} and {b}.', ans, [PE, AE], f'Divide repeatedly until the remainder is 0; the last divisor is the HCF. HCF({a}, {b}) = {ans}.')
many(3, t_euclid_d4)
def t_euclid_d1():
    b = random.randint(3, 9); q = random.randint(4, 12); r = random.randint(1, b - 1); a = b * q + r
    check(a % b, r, 'rem')
    return add('euclid-hcf', 1, 'numeric', f'Euclid\'s division lemma says a = bq + r. If a = {a} and b = {b}, find r.', r, [PE], f'{a} = {b} x {q} + {r}, so r = {r}.')
many(3, t_euclid_d1)
def t_pf_d1():
    p = random.sample([2, 3, 5, 7, 11], 3); e = [random.randint(1, 2) for _ in p]
    n = 1
    for pi, ei in zip(p, e): n *= pi ** ei
    ans = len(sp.factorint(n)); check(ans, 3, 'pf')
    return add('prime-factorisation', 1, 'numeric', f'How many DIFFERENT prime numbers divide {n}?', ans, [CC], f'{n} = ' + ' x '.join(f'{pi}^{ei}' for pi, ei in zip(p, e)) + f', so {ans} distinct primes.')
many(3, t_pf_d1)
def t_hcflcm_d4():
    h = random.choice([2, 3, 4, 5, 6, 7, 8, 9]); m, n = random.sample([2, 3, 4, 5, 7, 8, 9, 10, 11], 2)
    if math.gcd(m, n) != 1: return False
    a, b = h * m, h * n; l = h * m * n
    check(a * b, h * l, 'hcf*lcm')
    return add('hcf-lcm-prime-factorisation', 4, 'numeric', f'The HCF of two numbers is {h} and their LCM is {l}. If one number is {a}, find the other.', b, [FM], f'HCF x LCM = product of the numbers, so the other = {h} x {l} / {a} = {b}.')
many(3, t_hcflcm_d4)
IRR_STEMS = ['Which of these numbers is irrational?', 'Which one of the following is NOT a rational number?', 'Identify the irrational number among the options.']
def t_irr_d1():
    irr = random.choice([2, 3, 5, 6, 7, 10, 11, 13]); sqs = random.sample([4, 9, 16, 25, 36, 49, 64], 2)
    ans = f'\u221a{irr}'
    opts = [f'\u221a{sqs[0]}', f'\u221a{sqs[1]}', random.choice(['0.25', '3/7', '0.6', '2.5']), ans]
    stem = IRR_STEMS[len(Q) % 3]
    random.shuffle(opts)
    return add('prove-irrationality', 1, 'mcq', f'{stem} Options are: ' + ', '.join(opts) + '.', ans, [CC], f'\u221a{irr} is not the square root of a perfect square, so it is irrational. The others are rational (perfect-square roots or terminating decimals or fractions).', opts)
many(3, t_irr_d1)

# ---- 2 Polynomials
def t_eval_d1():
    a, b, c, k = random.randint(1, 4), random.randint(-6, 6), random.randint(-9, 9), random.randint(-3, 4)
    ans = a * k * k + b * k + c; check(ans, sp.Poly(a * x**2 + b * x + c, x).eval(k), 'eval')
    p = sp.sstr(a * x**2 + b * x + c).replace('**', '^').replace('*', '')
    return add('evaluate-polynomial', 1, 'numeric', f'If p(x) = {p}, find p({k}).', ans, [SE, AE], f'Put x = {k}: p({k}) = {ans}.')
many(3, t_eval_d1)
def t_zeroes_d1():
    r1, r2 = random.sample(range(-6, 8), 2)
    if r1 + r2 == 0: return False
    S = r1 + r2; check(S, sum(sp.solve((x - r1) * (x - r2), x)), 'sumroots')
    ex = sp.expand((x - r1) * (x - r2)); p = sp.sstr(ex).replace('**', '^').replace('*', '')
    return add('find-zeroes-quadratic', 1, 'numeric', f'The zeroes of p(x) = {p} are {r1} and {r2}. What is their SUM?', S, [SE], f'Sum = {r1} + ({r2}) = {S}.')
many(3, t_zeroes_d1)
def t_alpha_d4():
    b, c = random.randint(-7, 7), random.randint(-8, 8)
    if b == 0: return False
    ans = b * b - 2 * c; ro = sp.Poly(x**2 + b * x + c, x).all_roots() if False else sp.solve(x**2 + b * x + c, x)
    check(ans, sp.simplify(sum(r**2 for r in ro)), 'alpha2')
    p = sp.sstr(x**2 + b * x + c).replace('**', '^').replace('*', '')
    return add('zeroes-graph-relation', 4, 'numeric', f'If α and β are the zeroes of x^2 + ({b})x + ({c}), find α^2 + β^2.', ans, [FM, SE], f'α + β = {-b}, αβ = {c}. α^2 + β^2 = ({-b})^2 - 2({c}) = {ans}.')
many(3, t_alpha_d4)
def t_form_d4():
    r1, r2 = random.sample(range(-7, 8), 2)
    S, P = r1 + r2, r1 * r2
    if S == 0 or P == 0: return False
    def term(co, var): return ('+ ' if co > 0 else '- ') + (str(abs(co)) if abs(co) != 1 or not var else '') + var
    ans = f'x^2 {term(-S, "x")} {"+" if P > 0 else "-"} {abs(P)}'
    check(sp.expand(parse_expr(ans.replace('^', '**'), transformations=TR, local_dict={'x': x}) - (x - r1) * (x - r2)), 0, 'form')
    return add('form-quadratic-from-zeroes', 4, 'short_answer', f'Write a quadratic polynomial whose zeroes are {r1} and {r2}, with leading coefficient 1.', ans, [FM, SE], f'x^2 - (sum)x + product, with sum = {S} and product = {P}.')
many(3, t_form_d4)
def t_remainder_d4():
    a, b, c, k = random.randint(-4, 5), random.randint(-6, 6), random.randint(-9, 9), random.randint(-3, 4)
    if k == 0: return False
    ans = k**3 + a * k * k + b * k + c; check(ans, sp.rem(x**3 + a * x**2 + b * x + c, x - k, x), 'rem')
    p = sp.sstr(x**3 + a * x**2 + b * x + c).replace('**', '^').replace('*', '')
    d = f'x - {k}' if k > 0 else f'x + {-k}'
    return add('divide-polynomials', 4, 'numeric', f'Find the remainder when {p} is divided by ({d}).', ans, [FM, SE], f'Remainder theorem: remainder = p({k}) = {ans}.')
many(3, t_remainder_d4)

# ---- 3 Pair of linear equations
def solve_sys():
    X, Y = random.randint(-5, 7), random.randint(-5, 7)
    a1, b1, a2, b2 = [random.randint(1, 5) for _ in range(4)]
    if a1 * b2 - a2 * b1 == 0: return None
    c1, c2 = a1 * X + b1 * Y, a2 * X + b2 * Y
    s = sp.solve([a1 * x + b1 * sp.Symbol('y') - c1, a2 * x + b2 * sp.Symbol('y') - c2], [x, sp.Symbol('y')])
    check(s[x], X, 'sysx'); check(s[sp.Symbol('y')], Y, 'sysy')
    return X, Y, a1, b1, c1, a2, b2, c2
def t_elim_d4():
    r = solve_sys()
    if not r: return False
    X, Y, a1, b1, c1, a2, b2, c2 = r
    return add('solve-by-elimination', 4, 'numeric', f'Solve by elimination: {a1}x + {b1}y = {c1} and {a2}x + {b2}y = {c2}. Find the value of x + y.', X + Y, [PE, SE], f'x = {X}, y = {Y}, so x + y = {X + Y}.')
many(3, t_elim_d4)
def t_elim_d1():
    X, Y = random.randint(1, 9), random.randint(1, 9)
    return add('solve-by-elimination', 1, 'numeric', f'If x + y = {X + Y} and x - y = {X - Y}, find x.', X, [PE], f'Add the equations: 2x = {2 * X}, so x = {X}.')
many(3, t_elim_d1)
def t_parallel_d4():
    a, b = random.randint(2, 6), random.choice([2, 3, 4, 6]); m = random.randint(2, 4)
    c1 = random.randint(3, 12); c2 = c1 * m + random.randint(1, 5)
    ans = a * m; chk = Fraction(ans, a) == Fraction(b * m, b)
    check(int(chk), 1, 'parallel')
    return add('interpret-line-relationships', 4, 'numeric', f'For what value of k do the lines {a}x + {b}y = {c1} and kx + {b * m}y = {c2} have NO solution (are parallel)?', ans, [CC, FM], f'Parallel lines need k/{a} = {b * m}/{b} and the constants not in the same ratio. So k = {a} x {m} = {ans}.')
many(3, t_parallel_d4)

# ---- 4 Quadratic equations
def t_disc_d1():
    a, b, c = random.randint(1, 3), random.randint(-6, 6), random.randint(-5, 5)
    ans = b * b - 4 * a * c; check(ans, sp.discriminant(a * x**2 + b * x + c, x), 'disc')
    p = sp.sstr(a * x**2 + b * x + c).replace('**', '^').replace('*', '')
    return add('discriminant-nature-of-roots', 1, 'numeric', f'Find the discriminant of {p} = 0.', ans, [FM, SE], f'D = b^2 - 4ac = ({b})^2 - 4({a})({c}) = {ans}.')
many(3, t_disc_d1)
def t_equalroots_d4():
    m = random.randint(1, 6); c = m * m; k = 2 * m
    ans = k; check(k * k, 4 * c, 'equal')
    return add('discriminant-nature-of-roots', 4, 'numeric', f'Find the POSITIVE value of k for which x^2 + kx + {c} = 0 has two equal roots.', ans, [FM], f'Equal roots need D = 0: k^2 - 4({c}) = 0, so k = {ans} (positive).')
many(3, t_equalroots_d4)
def t_larger_root_d4():
    r1, r2 = random.sample(range(-8, 10), 2)
    ex = sp.expand((x - r1) * (x - r2)); p = sp.sstr(ex).replace('**', '^').replace('*', '')
    ans = max(r1, r2); check(ans, max(sp.solve(ex, x)), 'roots')
    return add('solve-quadratic-by-factorisation', 4, 'numeric', f'Solve {p} = 0 and give the LARGER root.', ans, [SE, PE], f'Factorise: (x - {r1})(x - {r2}) = 0, so the roots are {r1} and {r2}. The larger is {ans}.')
many(3, t_larger_root_d4)
def t_consec_d4():
    n = random.randint(5, 25); prod = n * (n + 1)
    ans = n; check(sp.solve(x * (x + 1) - prod, x)[-1], n, 'consec')
    return add('formulate-quadratic-word-problem', 4, 'numeric', f'The product of two consecutive positive integers is {prod}. Find the smaller integer.', ans, [IR], f'x(x + 1) = {prod} gives x^2 + x - {prod} = 0, so x = {n} (the positive root).')
many(3, t_consec_d4)

# ---- 5 AP
def t_nth_d1():
    a, d, n = random.randint(-4, 9), random.randint(2, 7), random.randint(5, 15)
    ans = a + (n - 1) * d; check(ans, sum([a] + [d] * (n - 1)), 'nth')
    return add('find-nth-term-ap', 1, 'numeric', f'Find the {n}th term of the AP {a}, {a + d}, {a + 2 * d}, ...', ans, [FM, AE], f'a_n = a + (n - 1)d = {a} + {n - 1} x {d} = {ans}.')
many(3, t_nth_d1)
def t_which_term_d4():
    a, d, n = random.randint(2, 9), random.randint(2, 6), random.randint(12, 30)
    val = a + (n - 1) * d
    return add('find-nth-term-ap', 4, 'numeric', f'Which term of the AP {a}, {a + d}, {a + 2 * d}, ... is {val}?', n, [FM], f'{val} = {a} + (n - 1) x {d}, so n = {n}.')
many(3, t_which_term_d4)
def t_sum_d4():
    a, d = random.randint(1, 9), random.randint(1, 5); n = random.randint(8, 20)
    p3, p7 = a + 2 * d, a + 6 * d
    ans = n * (2 * a + (n - 1) * d) // 2; check(ans, sum(a + i * d for i in range(n)), 'sumap')
    return add('sum-first-n-terms-ap', 4, 'numeric', f'The 3rd term of an AP is {p3} and the 7th term is {p7}. Find the sum of its first {n} terms.', ans, [FM, IR], f'a + 2d = {p3}, a + 6d = {p7} give d = {d}, a = {a}. S_{n} = {n}/2 [2({a}) + {n - 1}({d})] = {ans}.')
many(3, t_sum_d4)

# ---- 6 Triangles
def t_pyth_d1():
    a, b, c = random.choice([(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25), (20, 21, 29)]); k = random.randint(1, 3)
    check((a * k)**2 + (b * k)**2, (c * k)**2, 'pyth')
    return add('apply-pythagoras-theorem', 1, 'numeric', f'The two legs of a right triangle are {a * k} cm and {b * k} cm. Find the hypotenuse in cm.', c * k, [FM], f'Hypotenuse = sqrt({(a * k)**2} + {(b * k)**2}) = {c * k}.')
many(3, t_pyth_d1)
def t_ladder_d4():
    a, b, c = random.choice([(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25)]); k = random.randint(1, 4)
    return add('apply-pythagoras-theorem', 4, 'numeric', f'A ladder {c * k} m long reaches a window {b * k} m above the ground. How far (in m) is the foot of the ladder from the wall?', a * k, [FM, IR], f'Base = sqrt({c * k}^2 - {b * k}^2) = {a * k} m.')
many(3, t_ladder_d4)
def t_sim_d4():
    m, n = random.choice([(2, 3), (3, 5), (2, 5), (3, 4), (4, 5)]); k = random.randint(2, 6)
    big = n * n * k; small = m * m * k; check(Fraction(small, big), Fraction(m * m, n * n), 'simratio')
    return add('determine-triangle-similarity', 4, 'numeric', f'Triangles ABC and DEF are similar. Corresponding sides AB : DE = {m} : {n}. If the area of triangle DEF is {big} cm^2, find the area of triangle ABC in cm^2.', small, [CC, FM], f'Areas are in the ratio of the squares of sides: {m}^2 : {n}^2. Area ABC = {big} x {m * m}/{n * n} = {small}.')
many(3, t_sim_d4)

# ---- 7 Coordinate geometry
def t_dist_d1():
    a, b, c = random.choice([(3, 4, 5), (5, 12, 13), (6, 8, 10), (8, 15, 17)]); x1, y1 = random.randint(-4, 4), random.randint(-4, 4)
    return add('find-distance-two-points', 1, 'numeric', f'Find the distance between ({x1}, {y1}) and ({x1 + a}, {y1 + b}).', c, [FM, AE], f'sqrt({a}^2 + {b}^2) = {c}.')
many(3, t_dist_d1)
def t_y_d4():
    a, b, c = random.choice([(3, 4, 5), (5, 12, 13), (6, 8, 10)]); x0, y0 = random.randint(-3, 3), random.randint(-3, 3)
    ans = y0 + b; check((x0 - (x0 + a))**2 + (ans - y0)**2, c * c, 'ydist')
    return add('find-distance-two-points', 4, 'numeric', f'The point ({x0 + a}, y) is {c} units from ({x0}, {y0}) and lies ABOVE the line y = {y0}. Find y.', ans, [SE, IR], f'{a}^2 + (y - {y0})^2 = {c}^2, so y - {y0} = {b}; above means y = {ans}.')
many(3, t_y_d4)
def t_ratio_d4():
    y1, y2 = random.randint(1, 8), random.randint(1, 8); g = math.gcd(y1, y2)
    xa, xb = random.randint(-5, 5), random.randint(-5, 5)
    ans = f'{y1 // g}:{y2 // g}'
    return add('find-section-formula-point', 4, 'short_answer', f'In what ratio does the x-axis divide the line segment joining ({xa}, {y1}) and ({xb}, -{y2})? Give the ratio as m:n in lowest terms.', ans, [FM, SE], f'On the x-axis y = 0: (m x (-{y2}) + n x {y1})/(m + n) = 0, so m : n = {y1} : {y2} = {ans}.')
many(3, t_ratio_d4)

# ---- 8 Trig
def t_ratio_d1():
    a, b, c = random.choice([(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25)])
    return add('find-trig-ratios', 1, 'short_answer', f'In a right triangle, sin A = {a}/{c}. Find cos A.', f'{b}/{c}', [FM, CC], f'Other side = sqrt({c}^2 - {a}^2) = {b}, so cos A = {b}/{c}.')
many(3, t_ratio_d1)
def t_tan_d4():
    a, b, c = random.choice([(3, 4, 5), (5, 12, 13), (8, 15, 17)])
    num = a + b; g = math.gcd(num, c); ans = f'{num // g}/{c // g}' if c // g != 1 else str(num // g)
    return add('find-trig-ratios', 4, 'short_answer', f'If tan θ = {a}/{b} and θ is acute, find sin θ + cos θ.', ans, [FM, IR], f'Hypotenuse = {c}, so sin θ = {a}/{c}, cos θ = {b}/{c}; the sum = {num}/{c} = {ans}.')
many(3, t_tan_d4)
def t_values_d1():
    vals = {'sin 30': Fraction(1, 2), 'cos 60': Fraction(1, 2), 'tan 45': Fraction(1), 'sin 90': Fraction(1), 'cos 0': Fraction(1), 'sin 0': Fraction(0), 'cos 90': Fraction(0)}
    k = random.sample(list(vals), 3); ans = vals[k[0]] + vals[k[1]] * 2 - vals[k[2]]
    return add('apply-trig-identity', 1, 'short_answer', f'Evaluate: {k[0]}° + 2 {k[1]}° - {k[2]}°.', fmt(ans), [CC, AE], f'Use the standard values: the result is {fmt(ans)}.')
many(3, t_values_d1)
def t_identity_d4():
    a = random.randint(2, 9)
    ans = a * a  # (a sin t)^2 + (a cos t)^2
    return add('apply-trig-identity', 4, 'numeric', f'Evaluate ({a} sin θ)^2 + ({a} cos θ)^2.', ans, [CC, FM], f'{a}^2 (sin^2 θ + cos^2 θ) = {a}^2 x 1 = {ans}.')
many(3, t_identity_d4)

# ---- 9 Applications of trig
def t_h45_d4():
    d, e = random.choice([20, 30, 40, 50, 60]), random.choice([1.5, 1.2, 1.6])
    ans = d + e
    return add('solve-height-distance-problem', 4, 'numeric', f'From a point {d} m from the foot of a tower, the angle of elevation of its top is 45°. The observer\'s eye is {e} m above the ground. Find the height of the tower in m.', fmt(Fraction(str(ans))), [IR, FM], f'tan 45 = 1, so height above eye level = {d} m. Add the eye height {e} m: {ans} m.')
many(3, t_h45_d4)
def t_ladder60_d4():
    L = random.choice([10, 20, 30, 40])
    ans = Fraction(L, 2) * Fraction('1.73')
    return add('solve-height-distance-problem', 4, 'numeric', f'A ladder {L} m long leans on a wall and makes an angle of 60° with the ground. How high (in m) does it reach? (Take √3 = 1.73)', fmt(ans), [FM], f'Height = {L} sin 60 = {L} x √3/2 = {L // 2} x 1.73 = {fmt(ans)}.')
many(3, t_ladder60_d4)

# ---- 10 Circles
def t_tangent_d1():
    r, d, t = random.choice([(3, 5, 4), (5, 13, 12), (8, 17, 15), (6, 10, 8)])
    check(d * d - r * r, t * t, 'tangent')
    return add('find-tangent-length', 1, 'numeric', f'A point P is {d} cm from the centre of a circle of radius {r} cm. Find the length of the tangent from P to the circle, in cm.', t, [FM, PE], f'Tangent^2 = {d}^2 - {r}^2, so the tangent = {t} cm.')
many(4, t_tangent_d1)
def t_tangent_d4():
    r, d, t = random.choice([(3, 5, 4), (5, 13, 12), (8, 17, 15), (6, 10, 8)])
    return add('find-tangent-length', 4, 'numeric', f'Two tangents are drawn to a circle from a point P, {d} cm from the centre. If the radius is {r} cm, find the TOTAL length of the two tangent segments, in cm.', 2 * t, [IR, FM], f'Each tangent = sqrt({d}^2 - {r}^2) = {t}. Two tangents from one point are equal, so the total is {2 * t}.')
many(3, t_tangent_d4)
def t_apt_d4():
    th = random.choice([40, 50, 60, 70, 80, 100, 110]); ans = 180 - th
    return add('apply-tangent-perpendicular-property', 4, 'numeric', f'Tangents PA and PB are drawn from an external point P to a circle with centre O. If ∠APB = {th}°, find ∠AOB in degrees.', ans, [CC, IR], f'∠OAP = ∠OBP = 90° (tangent is perpendicular to the radius), so ∠AOB = 360 - 90 - 90 - {th} = {ans}.')
many(3, t_apt_d4)

# ---- 11 Areas related to circles
def t_circle_d1():
    r = random.choice([7, 14, 21, 28]); ans = Fraction(22, 7) * r * r
    return add('calculate-circle-area-circumference', 1, 'numeric', f'Find the area of a circle of radius {r} cm, in cm^2. (Use π = 22/7)', fmt(ans), [FM], f'Area = πr^2 = 22/7 x {r} x {r} = {fmt(ans)}.')
many(3, t_circle_d1)
def t_ring_d4():
    r1, r2 = random.sample([7, 14, 21, 28, 35], 2); r1, r2 = max(r1, r2), min(r1, r2)
    ans = Fraction(22, 7) * (r1 * r1 - r2 * r2)
    return add('calculate-circle-area-circumference', 4, 'numeric', f'Two concentric circles have radii {r1} cm and {r2} cm. Find the area of the ring between them, in cm^2. (Use π = 22/7)', fmt(ans), [FM, IR], f'Ring = π({r1}^2 - {r2}^2) = {fmt(ans)}.')
many(3, t_ring_d4)
def t_sector_d4():
    r = random.choice([7, 14, 21]); th = random.choice([30, 45, 60, 90, 120, 180, 40, 72, 36, 150]); ans = Fraction(th, 360) * Fraction(22, 7) * r * r
    if ans.denominator not in (1, 2, 4): return False
    check(ans, sp.Rational(th, 360) * sp.Rational(22, 7) * r * r, 'sector')
    return add('calculate-sector-area', 4, 'numeric', f'Find the area of a sector of angle {th}° in a circle of radius {r} cm, in cm^2. (Use π = 22/7)', fmt(ans), [FM], f'Area = ({th}/360) x πr^2 = {fmt(ans)}.')
many(3, t_sector_d4)
def t_sector_d1():
    r = random.choice([7, 14, 21]); ans = Fraction(1, 4) * Fraction(22, 7) * r * r
    if ans.denominator not in (1, 2, 4): return False
    return add('calculate-sector-area', 1, 'numeric', f'Find the area of a QUADRANT (a quarter circle) of radius {r} cm, in cm^2. (Use π = 22/7)', fmt(ans), [FM, CC], f'A quadrant is 90/360 of the circle: 1/4 x 22/7 x {r}^2 = {fmt(ans)}.')
many(3, t_sector_d1)

# ---- 12 Surface areas and volumes
def t_combo_sa_d4():
    r = random.choice([7, 14]); h = random.randint(5, 20)
    ans = Fraction(22, 7) * r * (2 * h + 3 * r)  # CSA cyl 2 pi r h + base pi r^2 + hemisphere 2 pi r^2
    check(ans, sp.Rational(22, 7) * (2 * r * h + r * r + 2 * r * r), 'combo')
    return add('find-surface-area-combined-solid', 4, 'numeric', f'A solid is a cylinder of radius {r} cm and height {h} cm with a hemisphere of the same radius fixed on top. Find its TOTAL surface area in cm^2. (Use π = 22/7)', fmt(ans), [IR, FM], f'Curved cylinder 2πrh + bottom base πr^2 + hemisphere 2πr^2 = πr(2h + 3r) = {fmt(ans)}.')
many(3, t_combo_sa_d4)
def t_combo_vol_d4():
    for _ in range(80):
        r = random.choice([3, 6, 9, 12, 21]); h = random.choice([3, 6, 9, 12, 15, 21, 24])
        ans = Fraction(22, 7) * Fraction(r * r, 3) * (2 * r + h)
        if ans.denominator == 1: break
    else: return False
    check(ans, sp.Rational(22, 7) * (sp.Rational(2, 3) * r**3 + sp.Rational(1, 3) * r * r * h), 'vol')
    return add('find-volume-combined-solid', 4, 'numeric', f'A toy is a cone of height {h} cm placed on a hemisphere, both of radius {r} cm. Find the volume of the toy in cm^3. (Use π = 22/7)', fmt(ans), [IR, FM], f'Volume = 2/3 πr^3 + 1/3 πr^2 h = {fmt(ans)}.')
many(3, t_combo_vol_d4)
def t_cyl_d1():
    r = random.choice([7, 14, 21]); h = random.randint(3, 15); ans = Fraction(22, 7) * r * r * h
    return add('find-volume-combined-solid', 1, 'numeric', f'Find the volume of a cylinder of radius {r} cm and height {h} cm, in cm^3. (Use π = 22/7)', fmt(ans), [FM], f'V = πr^2 h = {fmt(ans)}.')
many(3, t_cyl_d1)

# ---- 13 Statistics
def t_mean_d1():
    for _ in range(300):
        f = [random.randint(2, 9) for _ in range(4)]; mids = [10, 20, 30, 40]
        tot = sum(f); s = sum(a * b for a, b in zip(f, mids))
        if s % tot == 0: break
    else: return False
    return add('calculate-mean-grouped-data', 1, 'numeric', f'Classes 5-15, 15-25, 25-35, 35-45 have frequencies {f[0]}, {f[1]}, {f[2]}, {f[3]}. Find the mean using class marks.', s // tot, [PE, AE], f'Class marks 10, 20, 30, 40. Mean = Σfx / Σf = {s}/{tot} = {s // tot}.')
many(3, t_mean_d1)
def t_median_d4():
    for _ in range(500):
        f = [random.randint(3, 12) for _ in range(5)]; N = sum(f)
        if N % 2: continue
        cf = 0
        for i, fi in enumerate(f):
            if cf + fi >= N / 2: break
            cf += fi
        l = 10 * i; med = Fraction(l) + Fraction(N // 2 - cf, f[i]) * 10
        if med.denominator in (1, 2): break
    else: return False
    return add('calculate-median-grouped-data', 4, 'numeric', f'Frequencies for classes 0-10, 10-20, 20-30, 30-40, 40-50 are {f[0]}, {f[1]}, {f[2]}, {f[3]}, {f[4]}. Find the median.', fmt(med), [FM, PE], f'N = {N}, N/2 = {N // 2}. Median class starts at {l}, cf before it = {cf}, f = {f[i]}. Median = {l} + ({N // 2} - {cf})/{f[i]} x 10 = {fmt(med)}.')
many(3, t_median_d4)

# ---- 14 Probability
def t_prob_d1():
    r, b, g = random.randint(2, 9), random.randint(2, 9), random.randint(1, 6); tot = r + b + g
    fr = Fraction(r, tot)
    ans = f'{fr.numerator}/{fr.denominator}' if fr.denominator != 1 else '1'
    return add('calculate-simple-probability', 1, 'short_answer', f'A bag has {r} red, {b} blue and {g} green balls. One ball is drawn at random. Find the probability that it is red. Give a fraction in lowest terms.', ans, [CC], f'P(red) = {r}/{tot} = {ans}.')
many(3, t_prob_d1)
def t_prob_d4():
    N = random.choice([30, 40, 50, 60, 80, 100]); a, b = random.sample([2, 3, 4, 5, 6, 7], 2)
    cnt = sum(1 for i in range(1, N + 1) if i % a == 0 or i % b == 0)
    check(cnt, N // a + N // b - N // (a * b // math.gcd(a, b)), 'incl-excl')
    fr = Fraction(cnt, N); ans = f'{fr.numerator}/{fr.denominator}'
    return add('calculate-simple-probability', 4, 'short_answer', f'A number is chosen at random from 1 to {N}. Find the probability that it is a multiple of {a} OR {b}. Give a fraction in lowest terms.', ans, [IR], f'Count multiples of {a} or {b} (no number counted twice): {cnt}. P = {cnt}/{N} = {ans}.')
many(3, t_prob_d4)

json.dump({'subject_slug': 'maths', 'questions': Q}, open(os.path.join(SEED, 'cbse-class10-maths-v105-diagnostic.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('maths questions', len(Q), 'difficulty', {d: sum(1 for q in Q if q['difficulty'] == d) for d in (1, 4)})
