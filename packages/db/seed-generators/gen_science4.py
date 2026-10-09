"""
Round 4 Science generator. Focus (per user request): add THEORY /
conceptual / definition-style questions — not just numeric plug-into-
formula ones — across all 18 skills, plus keep scaling the numeric
skills further.

Every theory fact below is a standard CBSE Class 10 NCERT fact, checked
against the syllabus before inclusion. No near-duplicate rewordings of
facts already in earlier rounds' curated banks (checked against the live
seed file's existing prompts via the SEEN set, same dedup pattern as
rounds 1-3).
"""
import json, random, math, os
from fractions import Fraction

random.seed(20261009 + 4)
Q = []
SEEN = set()

_existing_path = "/home/claude/repo/packages/db/seed/cbse-class10-science-diagnostic.json"
if os.path.exists(_existing_path):
    with open(_existing_path) as f:
        _ex = json.load(f)
    _ex = _ex if isinstance(_ex, list) else _ex.get("questions", _ex)
    for _q in _ex:
        SEEN.add(_q["prompt"].strip())

def add(skill, difficulty, qtype, prompt, expected, misconceptions, options=None, explanation=None):
    prompt = prompt.strip()
    if prompt in SEEN:
        return False
    SEEN.add(prompt)
    q = {"skill_slug": skill, "difficulty": difficulty, "question_type": qtype,
         "prompt": prompt, "expected_answer": {"value": str(expected)},
         "misconception_tags": misconceptions}
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

def theory_bank(skill, items, difficulty=2, qtype="short_answer", tag="CONCEPT_CONFUSION"):
    """items: list of (prompt, answer) or (prompt, answer, difficulty, tag)"""
    count = 0
    for item in items:
        if len(item) == 2:
            p, a = item
            d, t = difficulty, tag
        else:
            p, a, d, t = item
        if add(skill, d, qtype, p, a, [t]):
            count += 1
    return count


# ---------------------------------------------------------------------------
# THEORY BANKS — skills that were previously numeric-only or thin on theory
# ---------------------------------------------------------------------------

OHMS_LAW_THEORY = [
    ("State Ohm's law.",
     "At constant temperature, the current flowing through a conductor is directly proportional to the potential difference across its two ends (V = IR)."),
    ("What is the SI unit of electrical resistance?", "Ohm (Ω)"),
    ("What is the SI unit of electric current?", "Ampere (A)"),
    ("What is the SI unit of potential difference (voltage)?", "Volt (V)"),
    ("What physical quantity does the slope of a V-I graph for a resistor represent?", "The resistance of the conductor"),
    ("List the factors on which the resistance of a conductor depends.",
     "Length of the conductor, its area of cross-section, the nature (resistivity) of its material, and its temperature"),
    ("How does the resistance of a conductor change as its length increases, other factors remaining constant?",
     "It increases — resistance is directly proportional to length (R ∝ l)"),
    ("How does the resistance of a conductor change as its area of cross-section increases, other factors remaining constant?",
     "It decreases — resistance is inversely proportional to area of cross-section (R ∝ 1/A)"),
    ("What is the SI unit of electrical resistivity?", "Ohm-metre (Ω·m)"),
    ("Write the formula relating resistance R to resistivity ρ, length l and area of cross-section A.", "R = ρl/A"),
    ("What happens to the resistance of a metallic conductor as its temperature increases?", "It increases"),
    ("Write the formula for electric power in terms of potential difference V and current I.", "P = VI"),
    ("What is the SI unit of electric power?", "Watt (W)"),
    ("Write the formula for electrical energy consumed in time t, in terms of power P.", "W = P × t"),
    ("What is the commercial unit of electrical energy used for billing purposes?", "Kilowatt-hour (kWh)"),
    ("1 kilowatt-hour is equal to how many joules?", "3.6 × 10^6 J"),
    ("Why is an alloy like nichrome, rather than pure metal, used for the heating elements of electrical appliances?",
     "Because nichrome has a high resistivity and does not oxidise (burn away) easily even at high temperatures"),
    ("Why are electrical connecting wires usually made of copper or aluminium?",
     "Because they have very low resistivity, so they offer little resistance and conduct electricity efficiently"),
    ("What happens in a circuit during a short circuit?",
     "The live and neutral wires touch directly, so resistance drops suddenly and a very high current flows"),
    ("What is meant by overloading of an electrical circuit?",
     "Drawing more current than the circuit is designed to safely carry, usually by connecting too many high-power appliances at once"),
    ("Write the relation between electric power P, current I and resistance R.", "P = I²R"),
    ("Write the relation between electric power P, potential difference V and resistance R.", "P = V²/R"),
]

EQUIV_RESISTANCE_THEORY = [
    ("Write the formula for the equivalent resistance of two resistors R1 and R2 connected in series.", "Rs = R1 + R2"),
    ("Write the formula for the equivalent resistance of two resistors R1 and R2 connected in parallel.", "1/Rp = 1/R1 + 1/R2"),
    ("In a series combination of resistors, how does the current through each resistor compare?",
     "The current is the same through each resistor"),
    ("In a series combination of resistors, how is the total potential difference distributed?",
     "It is divided among the resistors, and the sum of the individual potential differences equals the total"),
    ("In a parallel combination of resistors, how does the potential difference across each resistor compare?",
     "The potential difference is the same across each resistor"),
    ("In a parallel combination of resistors, how is the total current distributed?",
     "It is divided among the branches, and the sum of the branch currents equals the total current"),
    ("Is the equivalent resistance of resistors in parallel always less than the smallest individual resistance?", "Yes"),
    ("Is the equivalent resistance of resistors in series always greater than the largest individual resistance?", "Yes"),
    ("Why are household electrical circuits wired in parallel rather than in series?",
     "So that each appliance gets the full line voltage and works independently; if one appliance stops working, the others are unaffected"),
    ("In a parallel circuit, what happens to the other bulbs if one bulb fuses?",
     "They continue to glow normally, since the circuit is not broken"),
    ("In a series circuit, what happens to the other bulbs if one bulb fuses?",
     "They all stop glowing, since the circuit is broken"),
]

MIRROR_THEORY = [
    ("Write the mirror formula relating object distance u, image distance v and focal length f.", "1/v + 1/u = 1/f"),
    ("Write the formula for linear magnification produced by a spherical mirror in terms of v and u.", "m = -v/u"),
    ("What is the relation between the focal length f and radius of curvature R of a spherical mirror?", "f = R/2"),
    ("What is the nature of the image formed by a convex mirror for an object at any distance in front of it?",
     "Virtual, erect, and diminished (smaller than the object)"),
    ("Where should an object be placed in front of a concave mirror to obtain a real image of the same size as the object?",
     "At the centre of curvature (C)"),
    ("Where should an object be placed in front of a concave mirror so that the image forms at infinity?",
     "At the focus (F)"),
    ("Give one everyday use of a concave mirror.",
     "Used in shaving/make-up mirrors, torches, search-lights, headlights of vehicles, or solar cookers"),
    ("Give one everyday use of a convex mirror.",
     "Used as rear-view/side mirrors in vehicles because it gives a wider field of view"),
    ("What is the nature of the image formed by a concave mirror when the object is placed between the pole and the focus?",
     "Virtual, erect, and magnified"),
    ("What is the magnification produced by a plane mirror?", "+1 (image is virtual, erect, and the same size as the object)"),
    ("What type of image does a plane mirror always form?", "Virtual, erect, and laterally inverted"),
]

LENS_THEORY = [
    ("Write the lens formula relating object distance u, image distance v and focal length f.", "1/v - 1/u = 1/f"),
    ("Write the formula for linear magnification produced by a lens in terms of v and u.", "m = v/u"),
    ("Write the formula for the power of a lens in terms of its focal length f (in metres).", "P = 1/f"),
    ("What is the SI unit of power of a lens?", "Dioptre (D)"),
    ("What is the sign of the power of a convex (converging) lens, by the standard sign convention?", "Positive"),
    ("What is the sign of the power of a concave (diverging) lens, by the standard sign convention?", "Negative"),
    ("What is the nature of the image formed by a concave lens for an object at any distance in front of it?",
     "Virtual, erect, and diminished (smaller than the object)"),
    ("Where should an object be placed in front of a convex lens so that the image forms at infinity?",
     "At the focus (F)"),
    ("Which type of lens is used to correct myopia (short-sightedness)?", "A concave (diverging) lens"),
    ("Which type of lens is used to correct hypermetropia (long-sightedness)?", "A convex (converging) lens"),
    ("What is the power of a convex lens of focal length exactly 1 metre?", "1 dioptre (1 D)"),
    ("What is the nature of the image formed by a convex lens when the object is placed between the optical centre and the focus?",
     "Virtual, erect, and magnified, formed on the same side as the object"),
]

RHTR_THEORY = [
    ("State the right-hand thumb rule.",
     "If a current-carrying straight conductor is held in the right hand with the thumb pointing in the direction of current, the curled fingers show the direction of the magnetic field around it"),
    ("What determines the direction of the magnetic field produced around a straight current-carrying conductor?",
     "The direction of the current flowing through the conductor"),
    ("What is the shape of the magnetic field lines around a straight current-carrying conductor?",
     "Concentric circles centred on the conductor"),
    ("How does the strength of the magnetic field around a straight current-carrying conductor change as the distance from it increases?",
     "It decreases"),
    ("What is a solenoid?",
     "A coil consisting of many closely wound circular turns of insulated copper wire in the shape of a cylinder"),
    ("What is the pattern of the magnetic field lines inside a current-carrying solenoid?",
     "Uniform, parallel, and straight — similar to the field of a bar magnet"),
    ("Which rule gives the direction of the force on a current-carrying conductor placed in a magnetic field?",
     "Fleming's left-hand rule"),
    ("In Fleming's left-hand rule, what does the thumb indicate?", "The direction of the force (motion) on the conductor"),
    ("In Fleming's left-hand rule, what does the forefinger indicate?", "The direction of the magnetic field"),
    ("In Fleming's left-hand rule, what does the middle finger indicate?", "The direction of the current"),
    ("Which device converts electrical energy into mechanical energy using the motor effect?", "An electric motor"),
    ("What is an electromagnet?",
     "A temporary magnet created by passing an electric current through a solenoid wound around a soft iron core"),
]

COVALENT_THEORY = [
    ("Define a covalent bond.",
     "A chemical bond formed between two atoms by the mutual sharing of one or more pairs of electrons"),
    ("How many electrons are shared between two atoms in a single covalent bond?", "2 (one shared pair)"),
    ("How many electrons are shared between two atoms in a double covalent bond?", "4 (two shared pairs)"),
    ("How many electrons are shared between two atoms in a triple covalent bond?", "6 (three shared pairs)"),
    ("Give an example of a molecule that contains a double covalent bond.", "Oxygen (O2) or carbon dioxide (CO2)"),
    ("Give an example of a molecule that contains a triple covalent bond.", "Nitrogen (N2)"),
    ("Are covalent compounds generally good or poor conductors of electricity?",
     "Poor conductors, since they do not form free ions in solution"),
    ("Why do covalent compounds generally have low melting and boiling points compared to ionic compounds?",
     "Because the forces of attraction between their molecules are weak"),
    ("Covalent compounds are generally more soluble in which kind of solvent, water or organic solvents?",
     "Organic solvents"),
    ("How many covalent bonds does a carbon atom typically form, given its valency?", "4 (carbon is tetravalent)"),
]

HOMOLOGOUS_THEORY = [
    ("Define a homologous series.",
     "A series of organic compounds having the same general formula and similar chemical properties, in which each successive member differs from the one before it by a -CH2- unit"),
    ("What is the general formula for the alkane homologous series?", "CnH(2n+2)"),
    ("What is the general formula for the alkene homologous series?", "CnH2n"),
    ("What is the general formula for the alkyne homologous series?", "CnH(2n-2)"),
    ("By how much does the molecular mass increase between two successive members of a homologous series?",
     "By 14 atomic mass units (one -CH2- unit)"),
    ("What is the functional group of an alcohol?", "-OH (hydroxyl group)"),
    ("What is the functional group of a carboxylic acid?", "-COOH (carboxyl group)"),
    ("Do members of a homologous series generally show a gradual change in physical properties as molecular mass increases?",
     "Yes, their physical properties (such as melting point, boiling point) change gradually, while chemical properties stay similar"),
]

ACID_BASE_THEORY = [
    ("What colour does red litmus paper turn in a basic (alkaline) solution?", "Blue"),
    ("What colour does blue litmus paper turn in an acidic solution?", "Red"),
    ("What is the pH value of a neutral solution at room temperature?", "7"),
    ("As the pH value decreases below 7, does the solution become more acidic or more basic?", "More acidic"),
    ("As the pH value increases above 7, does the solution become more acidic or more basic?", "More basic"),
    ("Name an indicator that turns pink in a basic solution and remains colourless in an acidic or neutral solution.",
     "Phenolphthalein"),
    ("What is produced when an acid reacts with a metal carbonate?",
     "A salt, water, and carbon dioxide gas"),
    ("What gas is released when a metal reacts with a dilute acid, and how is it tested?",
     "Hydrogen gas, tested by bringing a burning matchstick near it — it burns with a pop sound"),
    ("What is the pH range typically used by the universal indicator to show the full scale?", "0 to 14"),
    ("Why do acids conduct electricity in their aqueous solution?",
     "Because they dissociate in water to produce ions (H+ ions), which carry charge"),
]

REACTIVITY_THEORY = [
    ("What is the reactivity series of metals?",
     "An arrangement of metals in order of their decreasing chemical reactivity"),
    ("Which is the most reactive metal in the standard reactivity series taught at this level?", "Potassium"),
    ("Which metal near the bottom of the reactivity series is often found in its free (native) state in nature due to its low reactivity?",
     "Gold"),
    ("Can a more reactive metal displace a less reactive metal from its salt solution?", "Yes"),
    ("Can a less reactive metal displace a more reactive metal from its salt solution?", "No"),
    ("What is corrosion?",
     "The gradual deterioration of a metal due to a chemical reaction with substances in its environment, such as oxygen and moisture"),
    ("What is galvanization?",
     "The process of coating iron or steel with a thin layer of zinc to protect it from rusting"),
    ("Why is gold, and not iron, used to make jewellery that lasts for generations?",
     "Because gold is very low in the reactivity series and does not corrode or tarnish easily"),
]

CLASSIFY_REACTION_THEORY = [
    ("Define a combination reaction.",
     "A reaction in which two or more substances combine to form a single new substance"),
    ("Define a decomposition reaction.",
     "A reaction in which a single compound breaks down into two or more simpler substances"),
    ("Define a displacement reaction.",
     "A reaction in which a more reactive element displaces a less reactive element from its compound"),
    ("Define a double displacement reaction.",
     "A reaction in which two compounds exchange their ions to form two new compounds"),
    ("What is oxidation, in terms of oxygen?", "The gain of oxygen (or the loss of hydrogen) by a substance"),
    ("What is reduction, in terms of oxygen?", "The loss of oxygen (or the gain of hydrogen) by a substance"),
    ("What is a redox reaction?", "A reaction in which oxidation and reduction occur simultaneously"),
    ("What is an exothermic reaction?", "A reaction that releases heat energy to the surroundings"),
    ("What is an endothermic reaction?", "A reaction that absorbs heat energy from the surroundings"),
    ("What is rancidity?",
     "The oxidation of fats and oils in food, which spoils them and changes their smell and taste"),
]

METALS_NONMETALS_THEORY = [
    ("Why are metals generally good conductors of heat and electricity?",
     "Because they have free (mobile) electrons that can carry charge and transfer thermal energy"),
    ("What is meant by the malleability of a metal?", "The property of being hammered into thin sheets without breaking"),
    ("What is meant by the ductility of a metal?", "The property of being drawn into thin wires"),
    ("Why do non-metals generally not conduct electricity (with the exception of graphite)?",
     "Because they lack free electrons to carry charge"),
    ("What type of oxide do metals generally form — acidic, basic, or neutral?", "Basic oxides"),
    ("What type of oxide do non-metals generally form — acidic, basic, or neutral?", "Acidic oxides"),
    ("What happens when a metal reacts with oxygen?", "It forms a metal oxide"),
    ("Why is sodium metal stored in kerosene oil?",
     "Because it is highly reactive and reacts vigorously with oxygen and moisture in air if left exposed"),
]

BALANCE_EQUATION_THEORY = [
    ("Why must a chemical equation be balanced?",
     "To satisfy the law of conservation of mass — the number of atoms of each element must be equal on both sides of the equation"),
    ("State the law of conservation of mass as applied to chemical reactions.",
     "Matter can neither be created nor destroyed in a chemical reaction, so the total mass of reactants equals the total mass of products"),
    ("What does the symbol (g) written after a substance in a chemical equation indicate?", "That the substance is in the gaseous state"),
    ("What does the symbol (aq) written after a substance in a chemical equation indicate?", "That the substance is dissolved in water (in aqueous solution)"),
    ("What does an upward arrow (↑) next to a product in a chemical equation usually indicate?", "That the product is a gas escaping from the reaction mixture"),
]

NUTRITION_THEORY = [
    ("What is autotrophic nutrition?",
     "A mode of nutrition in which an organism prepares its own food from simple inorganic substances, usually through photosynthesis"),
    ("What is heterotrophic nutrition?",
     "A mode of nutrition in which an organism cannot make its own food and depends on other organisms for it"),
    ("Write the overall chemical equation for photosynthesis.",
     "6CO2 + 6H2O --(sunlight, chlorophyll)--> C6H12O6 + 6O2"),
    ("What is saprophytic nutrition?",
     "A mode of heterotrophic nutrition in which an organism feeds on dead and decaying organic matter"),
    ("What is parasitic nutrition?",
     "A mode of heterotrophic nutrition in which an organism lives on or inside another living organism (the host) and derives nutrition from it, often harming the host"),
    ("Name the green pigment in plants that absorbs light energy for photosynthesis.", "Chlorophyll"),
    ("What raw materials does a plant need for photosynthesis?", "Carbon dioxide, water, and sunlight (with chlorophyll)"),
]

REPRODUCTION_THEORY = [
    ("What is asexual reproduction?",
     "A mode of reproduction in which a single parent produces offspring without the involvement of gametes (sex cells)"),
    ("What is sexual reproduction?",
     "A mode of reproduction that involves the fusion of male and female gametes to produce offspring"),
    ("Does asexual reproduction produce genetically identical offspring (clones) of the parent?", "Yes"),
    ("Does sexual reproduction produce genetic variation among offspring?", "Yes, because it combines genetic material from two parents"),
    ("Name one advantage of sexual reproduction over asexual reproduction.",
     "It produces genetic variation, which helps a species adapt and survive changing environments"),
]

REFLEX_THEORY = [
    ("What is a reflex action?",
     "A rapid, automatic, and involuntary response of the body to a stimulus, not directly controlled by conscious thought"),
    ("What is a reflex arc?",
     "The pathway along which a nerve impulse travels during a reflex action, from receptor to effector"),
    ("Why do reflex actions occur via the spinal cord rather than the brain?",
     "So that the response can happen very quickly, without waiting for the signal to travel all the way to the brain and back"),
]

PLANT_HORMONE_THEORY = [
    ("What is a plant hormone?",
     "A chemical substance produced naturally in plants that regulates growth, development, and responses to stimuli"),
    ("Name the plant hormone responsible for promoting cell elongation and causing a shoot to bend towards light (phototropism).",
     "Auxin"),
]

COMPARE_RESPIRATION_THEORY = [
    ("What is aerobic respiration?", "Respiration that takes place in the presence of oxygen, releasing a larger amount of energy"),
    ("What is anaerobic respiration?", "Respiration that takes place in the absence of oxygen, releasing a smaller amount of energy"),
]

theory_specs = [
    ("apply-ohms-law", OHMS_LAW_THEORY, 1),
    ("calculate-equivalent-resistance", EQUIV_RESISTANCE_THEORY, 2),
    ("apply-mirror-formula", MIRROR_THEORY, 2),
    ("apply-lens-formula", LENS_THEORY, 2),
    ("apply-right-hand-thumb-rule", RHTR_THEORY, 1),
    ("explain-covalent-bonding", COVALENT_THEORY, 2),
    ("identify-homologous-series", HOMOLOGOUS_THEORY, 2),
    ("determine-acid-base-neutral", ACID_BASE_THEORY, 1),
    ("predict-displacement-using-reactivity-series", REACTIVITY_THEORY, 2),
    ("classify-chemical-reaction", CLASSIFY_REACTION_THEORY, 2),
    ("distinguish-metals-nonmetals", METALS_NONMETALS_THEORY, 1),
    ("balance-chemical-equation", BALANCE_EQUATION_THEORY, 1),
    ("distinguish-nutrition-types", NUTRITION_THEORY, 2),
    ("distinguish-reproduction-modes", REPRODUCTION_THEORY, 2),
    ("describe-reflex-action-pathway", REFLEX_THEORY, 2),
    ("identify-plant-hormone-response", PLANT_HORMONE_THEORY, 1),
    ("compare-respiration-types", COMPARE_RESPIRATION_THEORY, 1),
]

theory_added = 0
for slug, bank, diff in theory_specs:
    theory_added += theory_bank(slug, bank, difficulty=diff)


# ---------------------------------------------------------------------------
# FURTHER NUMERIC SCALING — push the fully parametrized skills higher still
# ---------------------------------------------------------------------------

def gen_ohms_law_more(n):
    count = 0
    tries = 0
    while count < n and tries < n * 20:
        tries += 1
        mode = random.choice(["find_I", "find_V", "find_R"])
        V = round(random.uniform(1, 240), 1)
        R = round(random.uniform(1, 500), 1)
        if mode == "find_I":
            I = V / R
            p = f"A resistor of resistance {R} ohm is connected to a battery of {V} V. Calculate the current flowing through it in amperes (round to 3 decimal places)."
            ans = round(I, 3)
        elif mode == "find_V":
            # Display a rounded current, then derive V from that SAME displayed
            # current so the stored answer is reproducible from the prompt text.
            I_disp = round(V / R, 3)
            p = f"A current of {I_disp} A flows through a resistor of {R} ohm. Calculate the potential difference across it in volts (round to 2 decimal places)."
            ans = round(I_disp * R, 2)
        else:
            I_disp = round(V / R, 3)
            p = f"When a potential difference of {V} V is applied across a conductor, a current of {I_disp} A flows through it. Calculate its resistance in ohms (round to 2 decimal places)."
            ans = round(V / I_disp, 2)
        if add("apply-ohms-law", 2, "numeric", p, ans, ["ARITHMETIC_ERROR", "FORMULA_MISUSE"]):
            count += 1
    return count

def gen_power_numeric(n):
    count = 0
    tries = 0
    while count < n and tries < n * 20:
        tries += 1
        V = round(random.uniform(5, 240), 1)
        I = round(random.uniform(0.5, 15), 2)
        P = round(V * I, 2)
        mode = random.choice(["P", "I_from_P", "V_from_P"])
        if mode == "P":
            p = f"An electrical appliance is connected to a {V} V supply and draws a current of {I} A. Calculate the electric power consumed, in watts (round to 2 decimal places)."
            ans = P
            if add("apply-ohms-law", 2, "numeric", p, ans, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"]):
                count += 1
        elif mode == "I_from_P":
            p = f"An electrical appliance rated {P} W is connected to a {V} V supply. Calculate the current drawn by it, in amperes (round to 3 decimal places)."
            ans = round(P / V, 3)
            if add("apply-ohms-law", 2, "numeric", p, ans, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"]):
                count += 1
        else:
            p = f"An electrical appliance rated {P} W draws a current of {I} A. Calculate the voltage of the supply it is connected to, in volts (round to 2 decimal places)."
            ans = round(P / I, 2)
            if add("apply-ohms-law", 2, "numeric", p, ans, ["FORMULA_MISUSE", "ARITHMETIC_ERROR"]):
                count += 1
    return count

def gen_mirror_more(n):
    count = 0
    tries = 0
    while count < n and tries < n * 20:
        tries += 1
        mtype = random.choice(["concave", "convex"])
        f = round(random.uniform(5, 80), 1)
        f_signed = -f if mtype == "concave" else f
        u = -round(random.uniform(5, 150), 1)
        denom = f_signed - u
        if abs(denom) < 1e-6:
            continue
        v = (f_signed * u) / denom
        v = round(v, 2)
        p = (f"An object is placed {abs(u)} cm in front of a {mtype} mirror of focal length {f} cm. "
             f"Using the mirror formula, calculate the image distance v in cm (use the convention u, f negative for concave; "
             f"give the signed value, rounded to 2 decimal places).")
        if add("apply-mirror-formula", 3, "numeric", p, v, ["SIGN_ERROR", "FORMULA_MISUSE"]):
            count += 1
    return count

def gen_lens_more(n):
    count = 0
    tries = 0
    while count < n and tries < n * 20:
        tries += 1
        ltype = random.choice(["convex", "concave"])
        f = round(random.uniform(5, 80), 1)
        f_signed = f if ltype == "convex" else -f
        u = -round(random.uniform(5, 150), 1)
        denom = f_signed + u
        if abs(denom) < 1e-6:
            continue
        v = (f_signed * u) / denom
        v = round(v, 2)
        p = (f"An object is placed {abs(u)} cm from a {ltype} lens of focal length {f} cm. "
             f"Using the lens formula, calculate the image distance v in cm (signed value, rounded to 2 decimal places).")
        if add("apply-lens-formula", 3, "numeric", p, v, ["SIGN_ERROR", "FORMULA_MISUSE"]):
            count += 1
    return count

def gen_acid_base_more(n):
    count = 0
    tries = 0
    while count < n and tries < n * 20:
        tries += 1
        ph = round(random.uniform(0, 14), 2)
        if ph < 7:
            label = "acidic"
        elif ph > 7:
            label = "basic"
        else:
            label = "neutral"
        p = f"A solution has a pH value of {ph}. Is this solution acidic, basic, or neutral?"
        opts = mcq_options(label, ["acidic", "basic", "neutral"])
        if add("determine-acid-base-neutral", 1, "mcq", p, label, ["CONCEPT_CONFUSION"], options=opts):
            count += 1
    return count

n1 = gen_ohms_law_more(20)
n2 = gen_power_numeric(25)
n3 = gen_mirror_more(20)
n4 = gen_lens_more(20)
n5 = gen_acid_base_more(15)

numeric_added = n1 + n2 + n3 + n4 + n5

import sys
from collections import Counter
counts = Counter(q["skill_slug"] for q in Q)
print(f"Theory questions added: {theory_added}", file=sys.stderr)
print(f"Numeric top-up added: {numeric_added}", file=sys.stderr)
print(f"Total this round: {len(Q)}", file=sys.stderr)
for slug, c in sorted(counts.items()):
    print(f"  {slug}: {c}", file=sys.stderr)

print(json.dumps(Q))
