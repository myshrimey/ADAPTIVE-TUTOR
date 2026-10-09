"""
Procedural generator for CBSE Class 10 Maths diagnostic questions.
Every answer is computed by code (not hand-typed), so correctness is
guaranteed by construction, not by manual checking. This lets the question
bank scale toward 1000 questions per subject without each one needing a
human/LLM to re-derive the answer.

Run: python3 -I gen_maths.py > out_maths.json
"""
import json, math, random, os, sys
from fractions import Fraction

random.seed(20261008 + int(sys.argv[1]) if len(sys.argv) > 1 else 20261008)

Q = []  # collected questions
SEEN_PROMPTS = set()

# Pre-load prompts already in the live seed file so a second/third
# generator run tops up existing skills instead of producing duplicates
# that would just get dropped at merge time.
_existing_seed_path = os.environ.get("EXISTING_SEED_PATH")
if _existing_seed_path and os.path.exists(_existing_seed_path):
    with open(_existing_seed_path) as _f:
        _existing = json.load(_f)
    _existing = _existing if isinstance(_existing, list) else _existing.get("questions", _existing)
    for _q in _existing:
        SEEN_PROMPTS.add(_q["prompt"].strip())

def add(skill, difficulty, qtype, prompt, expected, misconceptions, options=None, explanation=None):
    prompt = prompt.strip()
    if prompt in SEEN_PROMPTS:
        return False
    SEEN_PROMPTS.add(prompt)
    q = {
        "skill_slug": skill,
        "difficulty": difficulty,
        "question_type": qtype,
        "prompt": prompt,
        "expected_answer": {"value": str(expected)},
        "misconception_tags": misconceptions,
    }
    if options is not None:
        q["options"] = options
    if explanation:
        q["explanation"] = explanation
    Q.append(q)
    return True

def mcq_options(correct, distractors):
    # de-duplicate (a generator can occasionally produce a distractor equal
    # to the correct answer or to another distractor) while keeping the
    # correct answer present exactly once.
    seen = {correct}
    uniq = []
    for d in distractors:
        if d not in seen:
            seen.add(d)
            uniq.append(d)
    opts = [correct] + uniq
    random.shuffle(opts)
    return opts

def term(coef, var):
    """Format a coefficient+variable term, dropping a redundant leading 1."""
    if coef == 1:
        return var
    if coef == -1:
        return f"-{var}"
    return f"{coef}{var}"

# ---------- real-numbers ----------

def gen_euclid_hcf(n=24):
    made = 0
    while made < n:
        a = random.randint(20, 400)
        b = random.randint(10, 300)
        if a == b:
            continue
        hcf = math.gcd(a, b)
        if add("euclid-hcf", random.choice([1, 2, 2, 3]), "numeric",
               f"Using Euclid's division algorithm, find the HCF of {max(a,b)} and {min(a,b)}.",
               hcf, ["PROCEDURAL_ERROR", "ARITHMETIC_ERROR"]):
            made += 1

def gen_integer_arithmetic(n=18):
    made = 0
    while made < n:
        a = random.randint(50, 500)
        b = random.randint(3, 25)
        q_, r_ = divmod(a, b)
        kind = random.choice(["quotient", "remainder"])
        val = q_ if kind == "quotient" else r_
        if add("integer-arithmetic", 1, "numeric",
               f"When {a} is divided by {b}, what is the {kind}?",
               val, ["ARITHMETIC_ERROR"]):
            made += 1

def gen_prime_factorisation(n=24):
    made = 0
    candidates = [12,18,20,24,28,30,36,40,45,48,50,54,60,63,64,72,75,80,84,90,96,100,108,120,126,144,150,180,196,200,225]
    random.shuffle(candidates)
    for num in candidates:
        if made >= n:
            break
        x = num
        factors = {}
        d = 2
        while d * d <= x:
            while x % d == 0:
                factors[d] = factors.get(d, 0) + 1
                x //= d
            d += 1
        if x > 1:
            factors[x] = factors.get(x, 0) + 1
        correct = " × ".join(f"{p}{'' if e==1 else '^'+str(e)}" for p, e in sorted(factors.items())).replace('^2','²').replace('^3','³').replace('^4','⁴')
        # build 3 plausible distractors by tweaking one exponent
        items = sorted(factors.items())
        def render(fs):
            return " × ".join(f"{p}{'' if e==1 else '^'+str(e)}" for p, e in fs).replace('^2','²').replace('^3','³').replace('^4','⁴')
        distractors = set()
        tries = 0
        while len(distractors) < 3 and tries < 30:
            tries += 1
            tweak = items[:]
            i = random.randrange(len(tweak))
            p, e = tweak[i]
            new_e = max(1, e + random.choice([-1, 1]))
            tweak[i] = (p, new_e)
            cand = render(tweak)
            if cand != correct:
                distractors.add(cand)
        distractors = list(distractors)[:3]
        while len(distractors) < 3:
            distractors.append(render(items) + " (incorrect)")
        if add("prime-factorisation", random.choice([1,2,2,3]), "mcq",
               f"{num} can be expressed as a product of its primes as:",
               correct, ["PROCEDURAL_ERROR"], options=mcq_options(correct, distractors)):
            made += 1

def gen_hcf_lcm(n=26):
    made = 0
    while made < n:
        a = random.randint(20, 150)
        b = random.randint(20, 150)
        if a == b:
            continue
        hcf = math.gcd(a, b)
        lcm = a * b // hcf
        kind = random.choice(["hcf", "lcm", "product"])
        if kind == "hcf":
            ok = add("hcf-lcm-prime-factorisation", 2, "numeric",
                      f"Find the HCF of {a} and {b} using prime factorisation.",
                      hcf, ["PROCEDURAL_ERROR"])
        elif kind == "lcm":
            ok = add("hcf-lcm-prime-factorisation", 2, "numeric",
                      f"Find the LCM of {a} and {b} using prime factorisation.",
                      lcm, ["PROCEDURAL_ERROR"])
        else:
            ok = add("hcf-lcm-prime-factorisation", 3, "numeric",
                      f"If the HCF of {a} and {b} is {hcf}, find their LCM.",
                      lcm, ["FORMULA_MISUSE"],
                      explanation=f"HCF × LCM = product of the numbers, so LCM = ({a}×{b})/{hcf} = {lcm}.")
        if ok:
            made += 1

def gen_prove_irrationality(n=14):
    made = 0
    # Non-perfect-square roots (√n is irrational iff n is not a perfect square)
    non_squares = [2,3,5,6,7,8,10,11,12,13,14,15,17,18,19,20,21,22,23,24,26,27]
    perfect_squares = [1,4,9,16,25,36,49,64,81,100]
    irr_forms = [f"√{n}" for n in non_squares]
    rat_forms = [f"√{n}" for n in perfect_squares]
    # rational ± irrational, and integer × irrational, are themselves irrational
    for n in random.sample(non_squares, 8):
        k = random.randint(1, 9)
        irr_forms.append(f"{k} + √{n}")
        irr_forms.append(f"{k} - √{n}")
        irr_forms.append(f"{k}√{n}")
    # plain rationals: integers, terminating/recurring decimals, fractions
    for _ in range(10):
        a, b = random.randint(1, 20), random.randint(2, 20)
        if math.gcd(a, b) == 1:
            rat_forms.append(f"{a}/{b}")
    for _ in range(8):
        rat_forms.append(str(round(random.uniform(-9, 9), 2)))
    rat_forms += [str(n) for n in range(-9, 10)]

    tries = 0
    while made < n and tries < 3000:
        tries += 1
        if random.random() < 0.5:
            num = random.choice(irr_forms)
            ans = "Irrational"
        else:
            num = random.choice(rat_forms)
            ans = "Rational"
        if add("prove-irrationality", 3, "mcq",
               f"Is {num} rational or irrational?",
               ans, ["CONCEPT_CONFUSION"],
               options=["Rational", "Irrational"]):
            made += 1

# ---------- polynomials ----------

def gen_evaluate_polynomial(n=20):
    made = 0
    while made < n:
        a, b, c = random.randint(1, 5), random.randint(-6, 6), random.randint(-6, 6)
        x = random.randint(-4, 4)
        val = a * x * x + b * x + c
        poly = f"{term(a,'x^2')} {'+' if b>=0 else '-'} {abs(b)}x {'+' if c>=0 else '-'} {abs(c)}"
        if add("evaluate-polynomial", 2, "numeric",
               f"If p(x) = {poly}, find p({x}).",
               val, ["ARITHMETIC_ERROR"]):
            made += 1

def gen_zeroes_graph_relation(n=10):
    made = 0
    scenarios = [
        ("The graph of a quadratic polynomial touches the x-axis at exactly one point.", "It has one real zero (a repeated/double root)."),
        ("The graph of a quadratic polynomial does not intersect the x-axis at all.", "It has no real zeroes."),
        ("The graph of a quadratic polynomial crosses the x-axis at two distinct points.", "It has two distinct real zeroes."),
        ("The graph of a linear polynomial crosses the x-axis.", "It has exactly one real zero."),
    ]
    distractor_pool = ["It has two distinct real zeroes.", "It has no real zeroes.", "It has one real zero (a repeated/double root).", "It has three real zeroes.", "It has exactly one real zero."]
    for desc, correct in scenarios:
        pool = [d for d in distractor_pool if d != correct]
        distractors = random.sample(pool, 3)
        if add("zeroes-graph-relation", 2, "mcq",
               f"{desc} What does this tell you about its zeroes?",
               correct, ["CONCEPT_CONFUSION"], options=mcq_options(correct, distractors)):
            made += 1
    # A much larger parametrized pool: a parabola opening upward (a > 0) with
    # its vertex a given number of units above/below/on the x-axis — the
    # vertex position alone (independent of the exact number) determines how
    # many real zeroes it has, so many different numbers give many distinct,
    # still-correct prompts.
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        direction = random.choice(["upward", "downward"])
        position = random.choice(["above", "below", "on"])
        units = random.randint(1, 12)
        if position == "on":
            correct = "It has one real zero (a repeated/double root)."
            desc = f"A parabola that opens {direction} has its vertex exactly on the x-axis."
        else:
            # upward + above  -> no real zero;  upward + below -> two distinct
            # downward + below -> no real zero; downward + above -> two distinct
            touches_axis = (direction == "upward" and position == "below") or (direction == "downward" and position == "above")
            correct = "It has two distinct real zeroes." if touches_axis else "It has no real zeroes."
            desc = f"A parabola that opens {direction} has its vertex {units} units {position} the x-axis."
        pool = [d for d in distractor_pool if d != correct]
        distractors = random.sample(pool, 3)
        if add("zeroes-graph-relation", 2, "mcq",
               f"{desc} What does this tell you about its zeroes?",
               correct, ["CONCEPT_CONFUSION"], options=mcq_options(correct, distractors)):
            made += 1

def gen_multiply_binomials(n=20):
    made = 0
    while made < n:
        a, b = random.randint(1, 6), random.randint(-8, 8)
        c, d = random.randint(1, 6), random.randint(-8, 8)
        if b == 0 or d == 0:
            continue
        A = a * c
        B = a * d + b * c
        C = b * d
        poly = f"{term(A,'x^2')} {'+' if B>=0 else '-'} {abs(B)}x {'+' if C>=0 else '-'} {abs(C)}"
        left = f"({term(a,'x')} {'+' if b>=0 else '-'} {abs(b)})({term(c,'x')} {'+' if d>=0 else '-'} {abs(d)})"
        if add("multiply-binomials", 2, "short_answer",
               f"Expand: {left}",
               poly, ["ALGEBRAIC_MANIPULATION"]):
            made += 1

def gen_factorise_trinomial(n=20):
    made = 0
    while made < n:
        r1 = random.randint(-9, 9)
        r2 = random.randint(-9, 9)
        if r1 == 0 or r2 == 0:
            continue
        b = -(r1 + r2)
        c = r1 * r2
        poly = f"x^2 {'+' if b>=0 else '-'} {abs(b)}x {'+' if c>=0 else '-'} {abs(c)}"
        f1 = f"(x {'+' if -r1>=0 else '-'} {abs(r1)})" if False else f"(x {'-' if r1>=0 else '+'} {abs(r1)})"
        f2 = f"(x {'-' if r2>=0 else '+'} {abs(r2)})"
        factored = f"{f1}{f2}"
        if add("factorise-trinomial", 2, "short_answer",
               f"Factorise: {poly}",
               factored, ["ALGEBRAIC_MANIPULATION"],
               explanation=f"The trinomial has zeroes x = {r1} and x = {r2}."):
            made += 1

def gen_find_zeroes_quadratic(n=18):
    made = 0
    while made < n:
        r1 = random.randint(-8, 8)
        r2 = random.randint(-8, 8)
        if r1 == 0 or r2 == 0 or r1 == r2:
            continue
        b = -(r1 + r2)
        c = r1 * r2
        poly = f"x^2 {'+' if b>=0 else '-'} {abs(b)}x {'+' if c>=0 else '-'} {abs(c)}"
        zeroes = ", ".join(str(z) for z in sorted([r1, r2]))
        if add("find-zeroes-quadratic", 2, "short_answer",
               f"Find the zeroes of the polynomial p(x) = {poly}.",
               zeroes, ["FORMULA_MISUSE"]):
            made += 1

def gen_form_quadratic_from_zeroes(n=16):
    made = 0
    while made < n:
        r1 = random.randint(-7, 7)
        r2 = random.randint(-7, 7)
        if r1 == 0 or r2 == 0 or r1 == r2:
            continue
        s = r1 + r2
        p = r1 * r2
        poly = f"x^2 {'-' if s>=0 else '+'} {abs(s)}x {'+' if p>=0 else '-'} {abs(p)}"
        if add("form-quadratic-from-zeroes", 2, "short_answer",
               f"Form a quadratic polynomial whose zeroes are {r1} and {r2}.",
               poly, ["FORMULA_MISUSE"],
               explanation="If the zeroes are α and β, the polynomial is x² − (α+β)x + αβ."):
            made += 1

def gen_divide_polynomials(n=14):
    made = 0
    while made < n:
        # (x + m)(x + n) / (x + m) = (x + n)
        m = random.randint(-9, 9)
        nn = random.randint(-9, 9)
        if m == nn:
            continue
        b = m + nn
        c = m * nn
        dividend = f"x^2 {'+' if b>=0 else '-'} {abs(b)}x {'+' if c>=0 else '-'} {abs(c)}"
        divisor = f"(x {'+' if m>=0 else '-'} {abs(m)})"
        quotient = f"x {'+' if nn>=0 else '-'} {abs(nn)}"
        if add("divide-polynomials", 3, "short_answer",
               f"Divide {dividend} by {divisor}.",
               quotient, ["PROCEDURAL_ERROR"]):
            made += 1

# ---------- pair-linear-equations ----------

def gen_plot_linear_equation(n=12):
    made = 0
    pts = []
    while made < n:
        a = random.randint(1, 5)
        b = random.randint(1, 5)
        c = random.randint(-10, 10)
        x = random.choice([0, 1, 2, -1])
        # ax + by = c -> y = (c - ax)/b must be integer
        num = c - a * x
        if num % b != 0:
            continue
        y = num // b
        if add("plot-linear-equation", 2, "numeric",
               f"If the point (x, y) lies on the line {term(a,'x')} + {term(b,'y')} = {c}, and x = {x}, find y.",
               y, ["PROCEDURAL_ERROR"]):
            made += 1

def gen_interpret_line_relationships(n=12):
    made = 0
    # Generic "how many solutions" MCQ (small, fixed pool) ...
    cases = [
        ("intersecting lines", "exactly one solution"),
        ("parallel lines", "no solution"),
        ("coincident lines", "infinitely many solutions"),
    ]
    options_all = ["exactly one solution", "no solution", "infinitely many solutions"]
    for label, correct in cases:
        distractors = [o for o in options_all if o != correct]
        if add("interpret-line-relationships", 2, "mcq",
               f"A pair of linear equations represents {label}. How many solutions does the system have?",
               correct, ["CONCEPT_CONFUSION"], options=mcq_options(correct, distractors)):
            made += 1
    # ... plus a much larger, parametrized pool: classify an actual pair of
    # equations a1x+b1y=c1, a2x+b2y=c2 by comparing the coefficient ratios.
    tries = 0
    while made < n and tries < 3000:
        tries += 1
        a1, b1 = random.randint(1, 6), random.randint(1, 6)
        k = random.randint(1, 4)
        kind = random.choice(["intersecting", "parallel", "coincident"])
        a2, b2 = a1 * k + random.choice([0, 0, 1]), b1 * k  # occasionally break proportionality for "intersecting"
        if kind == "intersecting":
            a2 = a1 * k + random.choice([1, 2, 3])
            b2 = b1 * k
            if a1 * b2 == a2 * b1:
                continue
            c1 = random.randint(-10, 10)
            c2 = random.randint(-10, 10)
            correct = "intersecting (exactly one solution)"
        elif kind == "parallel":
            a2, b2 = a1 * k, b1 * k
            c1 = random.randint(-10, 10)
            c2 = (c1 * k) + random.choice([1, 2, 3, -1, -2])  # breaks the c-ratio
            if c2 == c1 * k:
                continue
            correct = "parallel (no solution)"
        else:  # coincident
            a2, b2 = a1 * k, b1 * k
            c1 = random.randint(-10, 10)
            c2 = c1 * k
            correct = "coincident (infinitely many solutions)"
        eq1 = f"{term(a1,'x')} + {term(b1,'y')} = {c1}"
        eq2 = f"{term(a2,'x')} + {term(b2,'y')} = {c2}"
        all_opts = ["intersecting (exactly one solution)", "parallel (no solution)", "coincident (infinitely many solutions)"]
        distractors = [o for o in all_opts if o != correct]
        if add("interpret-line-relationships", 2, "mcq",
               f"Without solving, classify the pair of linear equations: {eq1} and {eq2}.",
               correct, ["CONCEPT_CONFUSION"], options=mcq_options(correct, distractors)):
            made += 1

def gen_solve_linear_equation(n=20):
    made = 0
    while made < n:
        a = random.randint(2, 12)
        x = random.randint(-15, 15)
        b = random.randint(-20, 20)
        c = a * x + b
        if add("solve-linear-equation", 1, "numeric",
               f"Solve for x: {a}x {'+' if b>=0 else '-'} {abs(b)} = {c}",
               x, ["ARITHMETIC_ERROR"]):
            made += 1

def gen_solve_by_substitution(n=18):
    made = 0
    while made < n:
        x = random.randint(-10, 10)
        y = random.randint(-10, 10)
        a1, b1 = random.randint(1, 5), random.randint(1, 5)
        a2, b2 = random.randint(1, 5), random.randint(1, 5)
        if a1 * b2 == a2 * b1:
            continue
        c1 = a1 * x + b1 * y
        c2 = a2 * x + b2 * y
        if add("solve-by-substitution", 3, "short_answer",
               f"Solve by substitution: {term(a1,'x')} + {term(b1,'y')} = {c1} and {term(a2,'x')} + {term(b2,'y')} = {c2}.",
               f"x = {x}, y = {y}", ["PROCEDURAL_ERROR"]):
            made += 1

def gen_solve_by_elimination(n=18):
    made = 0
    while made < n:
        x = random.randint(-10, 10)
        y = random.randint(-10, 10)
        a1, b1 = random.randint(1, 5), random.randint(1, 5)
        a2, b2 = random.randint(1, 5), random.randint(1, 5)
        if a1 * b2 == a2 * b1:
            continue
        c1 = a1 * x + b1 * y
        c2 = a2 * x + b2 * y
        if add("solve-by-elimination", 3, "short_answer",
               f"Solve by elimination: {term(a1,'x')} + {term(b1,'y')} = {c1} and {term(a2,'x')} + {term(b2,'y')} = {c2}.",
               f"x = {x}, y = {y}", ["SIGN_ERROR", "PROCEDURAL_ERROR"]):
            made += 1

def gen_formulate_linear_word_problem(n=14):
    made = 0
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        s = random.randint(8, 20)          # son's present age (unknown to the solver)
        k = random.randint(2, 5)           # father is k times as old, now
        t = random.randint(2, 10)          # "t years ago"
        if s - t <= 0:
            continue
        f = k * s
        if f - t <= 0:
            continue
        m = Fraction(f - t, s - t)          # father was m times as old, t years ago
        if m.denominator != 1 or int(m) == k or int(m) <= 1:
            continue
        m = int(m)
        if add("formulate-linear-equations-word-problem", 3, "numeric",
               f"A father is {k} times as old as his son. {t} years ago, the father was {m} times as old as the son was then. "
               f"Find the father's present age (in years).",
               f, ["INCOMPLETE_REASONING"],
               explanation=f"Let the son's present age be s and father's be f. f = {k}s and f-{t} = {m}(s-{t}). Solving gives s = {s}, f = {f}."):
            made += 1

# ---------- quadratic-equations ----------

def gen_standard_form_quadratic(n=14):
    made = 0
    while made < n:
        a = random.randint(1, 6)
        b = random.randint(-9, 9)
        c = random.randint(-9, 9)
        if a == 0:
            continue
        lhs = f"{term(a,'x^2')} {'+' if b>=0 else '-'} {abs(b)}x {'+' if c>=0 else '-'} {abs(c)} = 0"
        correct = f"a = {a}, b = {b}, c = {c}"
        distractors = [
            f"a = {b}, b = {a}, c = {c}",
            f"a = {a}, b = {c}, c = {b}",
            f"a = {-a}, b = {b}, c = {c}",
        ]
        if add("standard-form-quadratic", 1, "mcq",
               f"For the quadratic equation {lhs}, identify the standard-form coefficients a, b, c.",
               correct, ["CONCEPT_CONFUSION"], options=mcq_options(correct, distractors)):
            made += 1

def gen_solve_quadratic_factorisation(n=22):
    made = 0
    while made < n:
        r1 = random.randint(-9, 9)
        r2 = random.randint(-9, 9)
        if r1 == 0 or r2 == 0 or r1 == r2:
            continue
        b = -(r1 + r2)
        c = r1 * r2
        eq = f"x^2 {'+' if b>=0 else '-'} {abs(b)}x {'+' if c>=0 else '-'} {abs(c)} = 0"
        ans = ", ".join(str(z) for z in sorted([r1, r2]))
        if add("solve-quadratic-by-factorisation", 2, "short_answer",
               f"Solve by factorisation: {eq}",
               ans, ["PROCEDURAL_ERROR"]):
            made += 1

def gen_solve_quadratic_formula(n=18):
    made = 0
    while made < n:
        a = random.randint(1, 3)
        r1 = random.choice([Fraction(x) for x in range(-8, 9) if x != 0])
        r2 = random.choice([Fraction(x) for x in range(-8, 9) if x != 0])
        if r1 == r2:
            continue
        b = -a * (r1 + r2)
        c = a * r1 * r2
        if b.denominator != 1 or c.denominator != 1:
            continue
        b, c = int(b), int(c)
        disc = b * b - 4 * a * c
        if disc < 0:
            continue
        sq = math.isqrt(disc)
        if sq * sq != disc:
            continue
        eq = f"{term(a,'x^2')} {'+' if b>=0 else '-'} {abs(b)}x {'+' if c>=0 else '-'} {abs(c)} = 0"
        x1 = Fraction(-b + sq, 2 * a)
        x2 = Fraction(-b - sq, 2 * a)
        ans = ", ".join(str(v) for v in sorted({x1, x2}))
        if add("solve-quadratic-formula", 3, "short_answer",
               f"Solve using the quadratic formula: {eq}",
               ans, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"]):
            made += 1

def gen_discriminant_nature(n=16):
    made = 0
    while made < n:
        a = random.randint(1, 5)
        b = random.randint(-10, 10)
        c = random.randint(-10, 10)
        disc = b * b - 4 * a * c
        if disc > 0:
            nature = "Two distinct real roots"
        elif disc == 0:
            nature = "Two equal real roots"
        else:
            nature = "No real roots"
        eq = f"{term(a,'x^2')} {'+' if b>=0 else '-'} {abs(b)}x {'+' if c>=0 else '-'} {abs(c)} = 0"
        all_opts = ["Two distinct real roots", "Two equal real roots", "No real roots"]
        distractors = [o for o in all_opts if o != nature]
        if add("discriminant-nature-of-roots", 2, "mcq",
               f"Using the discriminant, determine the nature of the roots of {eq}.",
               nature, ["FORMULA_MISUSE"], options=mcq_options(nature, distractors)):
            made += 1

def gen_formulate_quadratic_word_problem(n=14):
    made = 0
    while made < n:
        # rectangle: length is k more than breadth, area = A -> breadth is the unknown
        b = random.randint(4, 15)
        k = random.randint(2, 8)
        l = b + k
        area = l * b
        if add("formulate-quadratic-word-problem", 3, "numeric",
               f"The length of a rectangular field is {k} m more than its breadth. If the area of the field is {area} m², find its breadth (in m).",
               b, ["INCOMPLETE_REASONING"]):
            made += 1

# ---------- arithmetic-progressions ----------

def gen_find_nth_term_ap(n=22):
    made = 0
    while made < n:
        a1 = random.randint(-10, 20)
        d = random.randint(-8, 8)
        if d == 0:
            continue
        k = random.randint(5, 25)
        term = a1 + (k - 1) * d
        seq = ", ".join(str(a1 + i * d) for i in range(4)) + ", ..."
        if add("find-nth-term-ap", 2, "numeric",
               f"Find the {k}th term of the AP: {seq}",
               term, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"]):
            made += 1

def gen_sum_first_n_terms_ap(n=18):
    made = 0
    while made < n:
        a1 = random.randint(-10, 20)
        d = random.randint(-8, 8)
        if d == 0:
            continue
        k = random.randint(5, 20)
        s = k * (2 * a1 + (k - 1) * d) // 2 if (k * (2 * a1 + (k - 1) * d)) % 2 == 0 else None
        total = k * (2 * a1 + (k - 1) * d)
        if total % 2 != 0:
            continue
        s = total // 2
        seq = ", ".join(str(a1 + i * d) for i in range(4)) + ", ..."
        if add("sum-first-n-terms-ap", 2, "numeric",
               f"Find the sum of the first {k} terms of the AP: {seq}",
               s, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"]):
            made += 1

# ---------- triangles ----------

def gen_determine_triangle_similarity(n=16):
    made = 0
    while made < n:
        ratio = random.choice([Fraction(2,3), Fraction(3,4), Fraction(1,2), Fraction(4,5), Fraction(5,2)])
        a1, a2, a3 = random.randint(3,9), random.randint(3,9), random.randint(3,9)
        b1, b2, b3 = int(a1*ratio), int(a2*ratio), int(a3*ratio)
        if b1 == 0 or b2 == 0 or b3 == 0 or Fraction(b1,a1) != ratio or Fraction(b2,a2)!=ratio or Fraction(b3,a3)!=ratio:
            continue
        correct = "Yes, by the SSS similarity criterion"
        distractors = ["No, the triangles are not similar", "Yes, by the AA similarity criterion", "Cannot be determined from the given information"]
        if add("determine-triangle-similarity", 3, "mcq",
               f"Triangle ABC has sides {a1}, {a2}, {a3} cm. Triangle PQR has sides {b1}, {b2}, {b3} cm. Are the two triangles similar?",
               correct, ["CONCEPT_CONFUSION"], options=mcq_options(correct, distractors)):
            made += 1

def gen_apply_pythagoras(n=20):
    made = 0
    triples = [(3,4,5),(5,12,13),(6,8,10),(8,15,17),(7,24,25),(9,12,15),(20,21,29),(12,16,20),
               (10,24,26),(18,24,30),(9,40,41),(12,35,37),(11,60,61),(28,45,53),(33,56,65),
               (16,30,34),(21,28,35),(14,48,50),(15,20,25),(24,32,40),(10,24,26),(15,36,39)]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        base = random.choice(triples)
        k = random.choice([1,1,1,2])
        a, b, c = base[0]*k, base[1]*k, base[2]*k
        missing = random.choice(["hyp", "leg"])
        if missing == "hyp":
            ok = add("apply-pythagoras-theorem", 2, "numeric",
                     f"A right triangle has legs of length {a} and {b}. Find the length of the hypotenuse.",
                     c, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"])
        else:
            ok = add("apply-pythagoras-theorem", 3, "numeric",
                     f"A right triangle has a hypotenuse of length {c} and one leg of length {a}. Find the length of the other leg.",
                     b, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"])
        if ok:
            made += 1

# ---------- coordinate-geometry ----------

def gen_find_distance(n=20):
    made = 0
    while made < n:
        x1, y1 = random.randint(-10, 10), random.randint(-10, 10)
        dx = random.choice([3,4,5,6,8,9,12])
        dy_options = {3:4, 4:3, 6:8, 8:6, 5:12, 12:5, 9:12}
        dy = dy_options.get(dx, 4)
        sx, sy = random.choice([1,-1]), random.choice([1,-1])
        x2, y2 = x1 + sx*dx, y1 + sy*dy
        dist = math.isqrt(dx*dx+dy*dy)
        if add("find-distance-two-points", 2, "numeric",
               f"Find the distance between the points ({x1}, {y1}) and ({x2}, {y2}).",
               dist, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"]):
            made += 1

def gen_find_section_formula(n=16):
    made = 0
    while made < n:
        x1, y1 = random.randint(-10, 10), random.randint(-10, 10)
        x2, y2 = random.randint(-10, 10), random.randint(-10, 10)
        m, nratio = random.choice([(1,1),(1,2),(2,1),(1,3),(3,1),(2,3),(3,2)])
        px = Fraction(m*x2 + nratio*x1, m+nratio)
        py = Fraction(m*y2 + nratio*y1, m+nratio)
        if px.denominator != 1 or py.denominator != 1:
            continue
        if add("find-section-formula-point", 3, "short_answer",
               f"Find the coordinates of the point that divides the line segment joining ({x1}, {y1}) and ({x2}, {y2}) in the ratio {m}:{nratio}.",
               f"({int(px)}, {int(py)})", ["FORMULA_MISUSE"]):
            made += 1

# ---------- intro-trigonometry ----------

def gen_find_trig_ratios(n=22):
    made = 0
    triples = [(3,4,5),(5,12,13),(8,15,17),(7,24,25),(9,12,15),(20,21,29),(6,8,10),
               (9,40,41),(12,35,37),(11,60,61),(28,45,53),(33,56,65),(16,30,34),
               (21,28,35),(14,48,50),(15,20,25),(24,32,40),(15,36,39),(10,24,26)]
    ratio_name = {"sin":"opp/hyp", "cos":"adj/hyp", "tan":"opp/adj"}
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        opp, adj, hyp = random.choice(triples)
        which = random.choice(["sin", "cos", "tan"])
        g = math.gcd(opp, adj if which=="tan" else (hyp if which!="tan" else adj))
        if which == "sin":
            val = Fraction(opp, hyp)
        elif which == "cos":
            val = Fraction(adj, hyp)
        else:
            val = Fraction(opp, adj)
        ref = "opposite" if which in ("sin","tan") else "adjacent"
        if add("find-trig-ratios", 3, "short_answer",
               f"In a right triangle, the side opposite angle θ is {opp}, the side adjacent to θ is {adj}, and the hypotenuse is {hyp}. Find {which} θ.",
               str(val), ["CONCEPT_CONFUSION", "FORMULA_MISUSE"]):
            made += 1

def gen_apply_trig_identity(n=14):
    made = 0
    tries = 0
    verbs = [("sin", "cos"), ("cos", "sin"), ("tan", "cot"), ("cot", "tan"), ("sec", "cosec"), ("cosec", "sec")]
    while made < n and tries < 2000:
        tries += 1
        a = random.randint(1, 89)
        b = 90 - a
        f1, f2 = random.choice(verbs)
        distractors = {str(a), str(180 - a if 180 - a != b else b + 5)}
        distractors.add(str(abs(90 - 2*a)) if abs(90-2*a) not in (a, b) else str(b + 10))
        if add("apply-trig-identity", 3, "mcq",
               f"If {f1} {a}° = {f2} x°, and {a} + x = 90, what is the value of x?",
               b, ["CONCEPT_CONFUSION"], options=mcq_options(str(b), list(distractors)[:3])):
            made += 1

def gen_solve_height_distance(n=18):
    made = 0
    objects = ["tower", "pole", "building", "tree", "flagpole", "chimney", "lighthouse", "monument"]
    shadow_lengths = list(range(4, 41))
    phrasings = [
        "A {obj} casts a shadow of {d} m when the angle of elevation of the sun is 45°. Find the height of the {obj} (in m).",
        "The angle of elevation of the top of a {obj} from a point {d} m away from its base is 45°. Find the height of the {obj} (in m).",
        "A {obj} is {d} m away from an observer. If the angle of elevation of its top is 45°, find the height of the {obj} (in m).",
    ]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        obj = random.choice(objects)
        d = random.choice(shadow_lengths)
        phrasing = random.choice(phrasings)
        prompt = phrasing.format(obj=obj, d=d)
        if add("solve-height-distance-problem", 3, "numeric", prompt, d,
               ["FORMULA_MISUSE", "CONCEPT_CONFUSION"],
               explanation=f"At 45° elevation, tan 45° = height/distance = 1, so height = distance = {d} m."):
            made += 1

# ---------- circles ----------

def gen_apply_tangent_perp(n=10):
    made = 0
    # The tangent line is named by two letters: the point of tangency, and a
    # second point further along the same line (so the angle asked about —
    # centre, point-of-tangency, other-point — is genuinely the angle between
    # the radius and the tangent line, not an arbitrary unrelated point).
    centres = ["O", "C", "M", "K"]
    letter_pool = ["T", "P", "Q", "R", "N", "S", "D", "E", "A", "B", "X", "Y", "U", "V", "W", "Z", "F", "G", "H", "L"]
    phrasings = [
        "A tangent {tangent} touches a circle with centre {centre} at point {point}. What is the measure of angle {centre}{point}{ext} (in degrees)?",
        "A circle with centre {centre} has a tangent {tangent} touching it at point {point}. Find the angle between the radius {centre}{point} and the tangent, i.e. angle {centre}{point}{ext} (in degrees).",
        "{tangent} is a tangent to a circle with centre {centre}, touching it at point {point}. What is angle {centre}{point}{ext} (in degrees)?",
    ]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        centre = random.choice(centres)
        available = [l for l in letter_pool if l != centre]
        point, ext = random.sample(available, 2)   # point = point of tangency, ext = the other point on the tangent line
        tangent = ext + point  # the tangent segment's own two named points
        phrasing = random.choice(phrasings)
        prompt = phrasing.format(tangent=tangent, centre=centre, point=point, ext=ext)
        if add("apply-tangent-perpendicular-property", 2, "numeric", prompt, 90, ["CONCEPT_CONFUSION"]):
            made += 1

def gen_find_tangent_length(n=18):
    made = 0
    triples = [(3,4,5),(5,12,13),(6,8,10),(8,15,17),(9,12,15),(7,24,25),(20,21,29),
               (9,40,41),(12,35,37),(11,60,61),(28,45,53),(33,56,65),(16,30,34),
               (21,28,35),(14,48,50),(15,20,25),(24,32,40),(15,36,39),(10,24,26)]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        r, tan_len, d = random.choice(triples)
        if add("find-tangent-length", 3, "numeric",
               f"From an external point, the distance to the centre of a circle of radius {r} cm is {d} cm. Find the length of the tangent from this point to the circle (in cm).",
               tan_len, ["FORMULA_MISUSE"],
               explanation=f"Tangent length = √(d² − r²) = √({d}² − {r}²) = √{d*d-r*r} = {tan_len}."):
            made += 1

# ---------- areas-related-to-circles ----------

def gen_circle_area_circumference(n=20):
    made = 0
    radii = [7,14,21,28,35,42,49,56,63,70,77,84,91,98,105,112,119,126,133,140]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        r = random.choice(radii)
        kind = random.choice(["area","circumference"])
        if kind == "circumference":
            val = 2 * Fraction(22,7) * r
            ok = add("calculate-circle-area-circumference", 2, "numeric",
                     f"Find the circumference of a circle with radius {r} cm. (Use π = 22/7)",
                     int(val), ["FORMULA_MISUSE", "ARITHMETIC_ERROR"])
        else:
            val = Fraction(22,7) * r * r
            if val.denominator != 1:
                continue
            ok = add("calculate-circle-area-circumference", 2, "numeric",
                     f"Find the area of a circle with radius {r} cm, in cm². (Use π = 22/7)",
                     int(val), ["FORMULA_MISUSE", "ARITHMETIC_ERROR"])
        if ok:
            made += 1

def gen_sector_area(n=16):
    made = 0
    radii = [7,14,21,28,35,42,49,56,63,70,77,84,91,98,105,112,119,126]
    angles = [30,36,40,45,60,72,90,108,120,144,150,180,210,240,270,300,315,330]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        r = random.choice(radii)
        theta = random.choice(angles)
        val = Fraction(theta,360) * Fraction(22,7) * r * r
        if val.denominator not in (1,2):
            continue
        display = str(val) if val.denominator==1 else str(float(val))
        if add("calculate-sector-area", 3, "numeric",
               f"Find the area of a sector of a circle with radius {r} cm and central angle {theta}°, in cm². (Use π = 22/7)",
               display, ["FORMULA_MISUSE"]):
            made += 1

# ---------- surface-areas-volumes ----------

def gen_surface_area_combined(n=16):
    made = 0
    radii = [7,14,21,28,35,42]
    heights = [10,14,15,20,21,25,28,30,35,36,40,42,45,49,50]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        r = random.choice(radii)
        h = random.choice(heights)
        csa = 2 * Fraction(22,7) * r * h
        if csa.denominator != 1:
            continue
        if add("find-surface-area-combined-solid", 2, "numeric",
               f"A solid cylinder has radius {r} cm and height {h} cm. Find its curved surface area, in cm². (Use π = 22/7)",
               int(csa), ["FORMULA_MISUSE", "ARITHMETIC_ERROR"]):
            made += 1

def gen_volume_combined(n=16):
    made = 0
    radii = [7,14,21,28,35,42]
    heights = [10,14,15,20,21,25,28,30,35,36,40,42,45,49,50]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        r = random.choice(radii)
        h = random.choice(heights)
        vol = Fraction(22,7) * r * r * h
        if vol.denominator != 1:
            continue
        if add("find-volume-combined-solid", 3, "numeric",
               f"A solid cylinder has radius {r} cm and height {h} cm. Find its volume, in cm³. (Use π = 22/7)",
               int(vol), ["FORMULA_MISUSE", "ARITHMETIC_ERROR"]):
            made += 1

# ---------- statistics ----------

def gen_calculate_mean(n=20):
    made = 0
    while made < n:
        count = random.randint(4, 7)
        nums = [random.randint(1, 30) for _ in range(count)]
        total = sum(nums)
        if total % count != 0:
            continue
        mean = total // count
        if add("calculate-mean-grouped-data", 2, "numeric",
               f"Find the mean of the numbers {', '.join(map(str, nums))}.",
               mean, ["PROCEDURAL_ERROR", "ARITHMETIC_ERROR"]):
            made += 1

def gen_calculate_median(n=16):
    made = 0
    while made < n:
        count = random.choice([5,7,9])
        nums = sorted(random.sample(range(1, 60), count))
        median = nums[count // 2]
        if add("calculate-median-grouped-data", 2, "numeric",
               f"Find the median of the numbers: {', '.join(map(str, nums))}.",
               median, ["PROCEDURAL_ERROR"]):
            made += 1

# ---------- probability ----------

def gen_simple_probability(n=20):
    made = 0
    scenarios = []
    for _ in range(n * 3):
        kind = random.choice(["die", "coin", "cards", "bag"])
        if kind == "die":
            event = random.choice(["an even number", "an odd number", "a number greater than 4", "a number less than 3", "a prime number", "the number 6"])
            favourable = {
                "an even number": 3, "an odd number": 3, "a number greater than 4": 2,
                "a number less than 3": 2, "a prime number": 3, "the number 6": 1,
            }[event]
            total = 6
            prompt = f"A die is rolled once. What is the probability of getting {event}?"
        elif kind == "coin":
            event = random.choice(["heads", "tails"])
            favourable, total = 1, 2
            prompt = f"A fair coin is tossed once. What is the probability of getting {event}?"
        elif kind == "cards":
            event = random.choice([("a king", 4, 52), ("a red card", 26, 52), ("an ace", 4, 52), ("a face card", 12, 52), ("a spade", 13, 52)])
            name, favourable, total = event
            prompt = f"A card is drawn at random from a well-shuffled deck of 52 playing cards. What is the probability that it is {name}?"
        else:
            red = random.randint(2, 8)
            blue = random.randint(2, 8)
            total = red + blue
            favourable = red
            prompt = f"A bag contains {red} red balls and {blue} blue balls. One ball is drawn at random. What is the probability that it is red?"
        g = math.gcd(favourable, total)
        frac = f"{favourable//g}/{total//g}"
        key = prompt
        if key in SEEN_PROMPTS:
            continue
        if add("calculate-simple-probability", 2, "short_answer", prompt, frac, ["CONCEPT_CONFUSION", "PROCEDURAL_ERROR"]):
            made += 1
        if made >= n:
            break

# ---- run all generators ----
gen_euclid_hcf(6)
gen_integer_arithmetic(6)
gen_prime_factorisation(4)
gen_hcf_lcm(4)
gen_prove_irrationality(18)
gen_evaluate_polynomial(4)
gen_zeroes_graph_relation(22)
gen_multiply_binomials(4)
gen_factorise_trinomial(4)
gen_find_zeroes_quadratic(8)
gen_form_quadratic_from_zeroes(10)
gen_divide_polynomials(10)
gen_plot_linear_equation(12)
gen_interpret_line_relationships(24)
gen_solve_linear_equation(4)
gen_solve_by_substitution(8)
gen_solve_by_elimination(8)
gen_formulate_linear_word_problem(16)
gen_standard_form_quadratic(10)
gen_solve_quadratic_factorisation(4)
gen_solve_quadratic_formula(8)
gen_discriminant_nature(10)
gen_formulate_quadratic_word_problem(10)
gen_find_nth_term_ap(4)
gen_sum_first_n_terms_ap(8)
gen_determine_triangle_similarity(10)
gen_apply_pythagoras(10)
gen_find_distance(4)
gen_find_section_formula(12)
gen_find_trig_ratios(12)
gen_apply_trig_identity(18)
gen_solve_height_distance(18)
gen_apply_tangent_perp(22)
gen_find_tangent_length(22)
gen_circle_area_circumference(12)
gen_sector_area(20)
gen_surface_area_combined(16)
gen_volume_combined(16)
gen_calculate_mean(6)
gen_calculate_median(12)
gen_simple_probability(8)

print(json.dumps(Q))
import sys
print(f"TOTAL_GENERATED={len(Q)}", file=sys.stderr)
from collections import Counter
cnt = Counter(q["skill_slug"] for q in Q)
for k,v in cnt.items():
    print(f"  {k}: {v}", file=sys.stderr)
