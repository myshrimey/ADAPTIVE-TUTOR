"""
Procedural generator for CBSE Class 10 Science diagnostic questions —
covers only the NUMERIC/formula-based skills, where an answer can be
computed and independently re-verified by code, the same approach used
for Maths. Concept/fact-recall Science skills (acid-base-salt,
reactivity series, reflex arcs, etc.) are NOT generated here — those
need a curated fact bank, which is a separate, future piece of work.
"""
import json, random
from fractions import Fraction

random.seed(20261008)
Q = []
SEEN = set()

def add(skill, difficulty, qtype, prompt, expected, misconceptions, options=None, explanation=None):
    prompt = prompt.strip()
    if prompt in SEEN:
        return False
    SEEN.add(prompt)
    q = {
        "skill_slug": skill, "difficulty": difficulty, "question_type": qtype,
        "prompt": prompt, "expected_answer": {"value": str(expected)},
        "misconception_tags": misconceptions,
    }
    if options is not None:
        q["options"] = options
    if explanation:
        q["explanation"] = explanation
    Q.append(q)
    return True

def mcq_options(correct, distractors):
    seen = {correct}
    uniq = []
    for d in distractors:
        if d not in seen:
            seen.add(d); uniq.append(d)
    opts = [correct] + uniq
    random.shuffle(opts)
    return opts

# ---------- apply-ohms-law: V = IR ----------
def gen_ohms_law(n=24):
    made = 0
    tries = 0
    while made < n and tries < 3000:
        tries += 1
        r = random.randint(1, 50)
        i = random.randint(1, 20)
        v = r * i
        kind = random.choice(["find_r", "find_i", "find_v"])
        if kind == "find_r":
            ok = add("apply-ohms-law", 1, "numeric",
                     f"A resistor has voltage {v} V across it and current {i} A through it. Find its resistance (in ohms).",
                     r, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"])
        elif kind == "find_i":
            ok = add("apply-ohms-law", 1, "numeric",
                     f"A resistor of {r} Ω has a voltage of {v} V across it. Find the current through it (in A).",
                     i, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"])
        else:
            ok = add("apply-ohms-law", 1, "numeric",
                     f"A current of {i} A flows through a resistor of {r} Ω. Find the voltage across it (in V).",
                     v, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"])
        if ok:
            made += 1

# ---------- calculate-equivalent-resistance: series and parallel ----------
def gen_equivalent_resistance(n=24):
    made = 0
    tries = 0
    while made < n and tries < 3000:
        tries += 1
        r1 = random.randint(2, 20)
        r2 = random.randint(2, 20)
        kind = random.choice(["series2", "series3", "parallel2"])
        if kind == "series2":
            val = r1 + r2
            ok = add("calculate-equivalent-resistance", 2, "numeric",
                     f"A {r1} Ω resistor and a {r2} Ω resistor are connected in series with a battery. Find the equivalent resistance of the circuit (in Ω).",
                     val, ["FORMULA_MISUSE"],
                     explanation=f"In series, resistances add: {r1} + {r2} = {val} Ω.")
        elif kind == "series3":
            r3 = random.randint(2, 20)
            val = r1 + r2 + r3
            ok = add("calculate-equivalent-resistance", 2, "numeric",
                     f"Three resistors of {r1} Ω, {r2} Ω, and {r3} Ω are connected in series. Find the equivalent resistance of the circuit (in Ω).",
                     val, ["FORMULA_MISUSE"],
                     explanation=f"In series, resistances add: {r1} + {r2} + {r3} = {val} Ω.")
        else:
            val = Fraction(r1 * r2, r1 + r2)
            if val.denominator != 1:
                continue
            val = int(val)
            ok = add("calculate-equivalent-resistance", 3, "numeric",
                     f"A {r1} Ω resistor and a {r2} Ω resistor are connected in parallel. Find the equivalent resistance of the circuit (in Ω).",
                     val, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"],
                     explanation=f"For two resistors in parallel: 1/R = 1/{r1} + 1/{r2}, so R = ({r1}×{r2})/({r1}+{r2}) = {val} Ω.")
        if ok:
            made += 1

# ---------- apply-mirror-formula: 1/v + 1/u = 1/f (sign convention: real
# object distance u is always entered as negative; concave mirrors have
# negative f, convex mirrors have positive f) ----------
def gen_mirror_formula(n=20):
    made = 0
    pairs = [(f, u) for f in range(5, 41) for u in range(5, 81) if u != f]
    random.shuffle(pairs)
    for f, u in pairs:
        if made >= n:
            break
        mtype = random.choice(["concave", "convex"])
        uu = -u
        ff = -f if mtype == "concave" else f
        # 1/v = 1/f - 1/u
        rhs = Fraction(1, ff) - Fraction(1, uu)
        if rhs == 0:
            continue
        vv_frac = 1 / rhs
        if vv_frac.denominator != 1:
            continue
        vv = int(vv_frac)
        prompt = (f"An object is placed {u} cm from a {mtype} mirror of focal length {f} cm. "
                  f"Using 1/v + 1/u = 1/f (take u = {uu}, f = {ff}), find the image distance v (in cm).")
        if add("apply-mirror-formula", 3, "numeric", prompt, vv, ["SIGN_ERROR", "FORMULA_MISUSE"]):
            made += 1

# ---------- apply-lens-formula: 1/v - 1/u = 1/f (sign convention: real
# object distance u is always entered as negative; convex lenses have
# positive f, concave lenses have negative f) ----------
def gen_lens_formula(n=18):
    made = 0
    pairs = [(f, u) for f in range(5, 41) for u in range(5, 81)]
    random.shuffle(pairs)
    for f, u in pairs:
        if made >= n:
            break
        ltype = random.choice(["convex", "concave"])
        ff = f if ltype == "convex" else -f
        uu = -u
        # 1/v = 1/f + 1/u
        rhs = Fraction(1, ff) + Fraction(1, uu)
        if rhs == 0:
            continue
        vv_frac = 1 / rhs
        if vv_frac.denominator != 1:
            continue
        vv = int(vv_frac)
        prompt = (f"An object is placed {u} cm from a {ltype} lens of focal length {f} cm. "
                  f"Using 1/v - 1/u = 1/f (take u = {uu}, f = {ff}), find the image distance v (in cm).")
        if add("apply-lens-formula", 3, "numeric", prompt, vv, ["SIGN_ERROR", "FORMULA_MISUSE"]):
            made += 1

gen_ohms_law(24)
gen_equivalent_resistance(22)
gen_mirror_formula(18)
gen_lens_formula(16)

print(json.dumps(Q))
import sys
print(f"TOTAL={len(Q)}", file=sys.stderr)
from collections import Counter
for k, v in Counter(q['skill_slug'] for q in Q).items():
    print(f"  {k}: {v}", file=sys.stderr)
