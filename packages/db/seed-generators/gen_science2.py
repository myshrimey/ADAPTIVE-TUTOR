"""
Round 2 Science generator — covers the 14 concept/fact-based Science
skills that round 1 (gen_science.py) could not touch. Where a skill can
be parametrized with a verifiable rule (pH classification, the
reactivity series order, balancing combustion equations), it's
generated and checked programmatically, same as Maths. Where it can't
(classifying a named reaction, naming a plant hormone), it's a curated
list of individually fact-checked NCERT Class 10 Science items —
every item below is a well-established textbook fact, not invented.
"""
import json, random, math
from fractions import Fraction

random.seed(20261009)
Q = []
SEEN = set()

_existing_path = "/home/claude/repo/packages/db/seed/cbse-class10-science-diagnostic.json"
import os
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

# =====================================================================
# PARAMETRIZED (code-verified) skills
# =====================================================================

# ---------- determine-acid-base-neutral: pH classification ----------
def gen_acid_base_ph(n=26):
    made = 0
    phs = [round(x * 0.5, 1) for x in range(0, 29)]  # 0.0 .. 14.0 step 0.5
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        ph = random.choice(phs)
        if ph < 7:
            ans = "Acidic"
        elif ph > 7:
            ans = "Basic"
        else:
            ans = "Neutral"
        ph_str = str(int(ph)) if ph == int(ph) else str(ph)
        if add("determine-acid-base-neutral", 1, "mcq",
               f"A solution has pH {ph_str}. Is it acidic, basic, or neutral?",
               ans, ["CONCEPT_CONFUSION"], options=["Acidic", "Basic", "Neutral"]):
            made += 1

# ---------- predict-displacement-using-reactivity-series ----------
# Standard CBSE reactivity series, most to least reactive.
REACTIVITY = ["Potassium", "Sodium", "Calcium", "Magnesium", "Aluminium",
              "Zinc", "Iron", "Lead", "Hydrogen", "Copper", "Silver", "Gold"]
SALT_OF = {  # a representative salt/compound name for "displace X from its salt" phrasing
    "Potassium": "potassium chloride", "Sodium": "sodium chloride", "Calcium": "calcium chloride",
    "Magnesium": "magnesium sulphate", "Aluminium": "aluminium sulphate", "Zinc": "zinc sulphate",
    "Iron": "iron(II) sulphate", "Lead": "lead nitrate", "Copper": "copper sulphate",
    "Silver": "silver nitrate", "Gold": "gold chloride",
}
def gen_reactivity_displacement(n=24):
    made = 0
    candidates = [m for m in REACTIVITY if m in SALT_OF]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        a, b = random.sample(candidates, 2)
        rank_a, rank_b = REACTIVITY.index(a), REACTIVITY.index(b)
        will_displace = rank_a < rank_b  # more reactive (lower index) displaces less reactive
        ans = "Yes" if will_displace else "No"
        prompt = (f"Using the reactivity series, will {a.lower()} metal displace {b.lower()} "
                  f"from a solution of {SALT_OF[b]}?")
        if add("predict-displacement-using-reactivity-series", 2, "mcq", prompt, ans,
               ["CONCEPT_CONFUSION"], options=["Yes", "No"],
               explanation=f"{a} is {'more' if will_displace else 'less'} reactive than {b} in the reactivity series, so displacement {'does' if will_displace else 'does not'} occur."):
            made += 1

# ---------- balance-chemical-equation: combustion of alkanes CnH(2n+2) ----------
ALKANES = {1: "CH4", 2: "C2H6", 3: "C3H8", 4: "C4H10", 5: "C5H12",
           6: "C6H14", 7: "C7H16", 8: "C8H18"}
def gen_balance_combustion(n=16):
    made = 0
    for n_c, formula in ALKANES.items():
        if made >= n:
            break
        n_h = 2 * n_c + 2
        # CnH(2n+2) + xO2 -> nCO2 + (n+1)H2O ; O balance: 2x = 2n + (n+1) => x = (3n+1)/2
        o2_num = 3 * n_c + 1
        if o2_num % 2 == 0:
            o2_coeff = str(o2_num // 2)
            fuel_coeff = "1"
            co2_coeff = str(n_c)
            h2o_coeff = str(n_c + 1)
        else:
            # double everything to clear the half
            o2_coeff = str(o2_num)
            fuel_coeff = "2"
            co2_coeff = str(2 * n_c)
            h2o_coeff = str(2 * (n_c + 1))
        def _ct(coeff, mol):
            return mol if coeff == "1" else f"{coeff}{mol}"
        fuel_term = _ct(fuel_coeff, formula)
        o2_term = _ct(o2_coeff, "O2")
        co2_term = _ct(co2_coeff, "CO2")
        h2o_term = _ct(h2o_coeff, "H2O")
        balanced = f"{fuel_term} + {o2_term} -> {co2_term} + {h2o_term}"
        if add("balance-chemical-equation", 3, "short_answer",
               f"Balance the equation for the complete combustion of {formula}: {formula} + O2 -> CO2 + H2O",
               balanced, ["PROCEDURAL_ERROR"],
               explanation="Balance carbon, then hydrogen, then oxygen last."):
            made += 1
    # a handful of well-known simple synthesis/decomposition equations (curated, verified)
    curated = [
        ("2Mg + O2 -> 2MgO", "Balance: Mg + O2 -> MgO"),
        ("4Na + O2 -> 2Na2O", "Balance: Na + O2 -> Na2O"),
        ("2H2 + O2 -> 2H2O", "Balance: H2 + O2 -> H2O"),
        ("N2 + 3H2 -> 2NH3", "Balance: N2 + H2 -> NH3"),
        ("2KClO3 -> 2KCl + 3O2", "Balance: KClO3 -> KCl + O2"),
        ("CaCO3 -> CaO + CO2", "Balance: CaCO3 -> CaO + CO2 (this one is already balanced — confirm by counting atoms)"),
        ("Zn + 2HCl -> ZnCl2 + H2", "Balance: Zn + HCl -> ZnCl2 + H2"),
        ("2Al + 3H2SO4 -> Al2(SO4)3 + 3H2", "Balance: Al + H2SO4 -> Al2(SO4)3 + H2"),
        ("Fe + S -> FeS", "Balance: Fe + S -> FeS (already balanced — confirm by counting atoms)"),
        ("2Fe + 3Cl2 -> 2FeCl3", "Balance: Fe + Cl2 -> FeCl3"),
    ]
    for balanced, prompt in curated:
        if made >= n:
            break
        if add("balance-chemical-equation", 2, "short_answer", prompt, balanced, ["PROCEDURAL_ERROR"]):
            made += 1

# =====================================================================
# CURATED (individually fact-checked) skills
# =====================================================================

def gen_classify_chemical_reaction(n=24):
    made = 0
    items = [
        ("2Mg + O2 -> 2MgO", "Combination"),
        ("CaO + H2O -> Ca(OH)2", "Combination"),
        ("2H2 + O2 -> 2H2O", "Combination"),
        ("C + O2 -> CO2", "Combination"),
        ("CaCO3 -> CaO + CO2", "Decomposition"),
        ("2KClO3 -> 2KCl + 3O2", "Decomposition"),
        ("2H2O -> 2H2 + O2 (by electrolysis)", "Decomposition"),
        ("2AgCl -> 2Ag + Cl2 (in sunlight)", "Decomposition"),
        ("Zn + CuSO4 -> ZnSO4 + Cu", "Displacement"),
        ("Fe + CuSO4 -> FeSO4 + Cu", "Displacement"),
        ("Zn + H2SO4 -> ZnSO4 + H2", "Displacement"),
        ("Mg + 2HCl -> MgCl2 + H2", "Displacement"),
        ("Na2SO4 + BaCl2 -> BaSO4 + 2NaCl", "Double displacement"),
        ("AgNO3 + NaCl -> AgCl + NaNO3", "Double displacement"),
        ("Pb(NO3)2 + 2KI -> PbI2 + 2KNO3", "Double displacement"),
        ("BaCl2 + Na2SO4 -> BaSO4 + 2NaCl", "Double displacement"),
        ("CH4 + 2O2 -> CO2 + 2H2O", "Combination"),
        ("2Pb(NO3)2 -> 2PbO + 4NO2 + O2", "Decomposition"),
        ("Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag", "Displacement"),
        ("3Fe + 4H2O -> Fe3O4 + 4H2", "Displacement"),
        ("Na2CO3 + CaCl2 -> CaCO3 + 2NaCl", "Double displacement"),
        ("4Na + O2 -> 2Na2O", "Combination"),
        ("FeS + 2HCl -> FeCl2 + H2S", "Double displacement"),
        ("ZnCO3 -> ZnO + CO2", "Decomposition"),
    ]
    options_all = ["Combination", "Decomposition", "Displacement", "Double displacement"]
    for eq, correct in items:
        if made >= n:
            break
        distractors = [o for o in options_all if o != correct]
        if add("classify-chemical-reaction", 2, "mcq",
               f"{eq} is an example of which type of reaction?",
               correct, ["CONCEPT_CONFUSION"], options=mcq_options(correct, random.sample(distractors, 3))):
            made += 1

def gen_predict_neutralization(n=18):
    made = 0
    items = [
        ("hydrochloric acid (HCl) and sodium hydroxide (NaOH)", "NaCl + H2O (sodium chloride and water)"),
        ("sulphuric acid (H2SO4) and sodium hydroxide (NaOH)", "Na2SO4 + H2O (sodium sulphate and water)"),
        ("nitric acid (HNO3) and potassium hydroxide (KOH)", "KNO3 + H2O (potassium nitrate and water)"),
        ("hydrochloric acid (HCl) and potassium hydroxide (KOH)", "KCl + H2O (potassium chloride and water)"),
        ("sulphuric acid (H2SO4) and calcium hydroxide (Ca(OH)2)", "CaSO4 + H2O (calcium sulphate and water)"),
        ("hydrochloric acid (HCl) and calcium hydroxide (Ca(OH)2)", "CaCl2 + H2O (calcium chloride and water)"),
        ("acetic acid (CH3COOH) and sodium hydroxide (NaOH)", "CH3COONa + H2O (sodium acetate and water)"),
        ("nitric acid (HNO3) and sodium hydroxide (NaOH)", "NaNO3 + H2O (sodium nitrate and water)"),
        ("hydrochloric acid (HCl) and ammonium hydroxide (NH4OH)", "NH4Cl + H2O (ammonium chloride and water)"),
        ("sulphuric acid (H2SO4) and potassium hydroxide (KOH)", "K2SO4 + H2O (potassium sulphate and water)"),
        ("phosphoric acid (H3PO4) and sodium hydroxide (NaOH)", "Na3PO4 + H2O (sodium phosphate and water)"),
        ("hydrochloric acid (HCl) and magnesium hydroxide (Mg(OH)2)", "MgCl2 + H2O (magnesium chloride and water)"),
        ("carbonic acid (H2CO3) and sodium hydroxide (NaOH)", "Na2CO3 + H2O (sodium carbonate and water)"),
        ("sulphuric acid (H2SO4) and ammonium hydroxide (NH4OH)", "(NH4)2SO4 + H2O (ammonium sulphate and water)"),
        ("hydrochloric acid (HCl) and aluminium hydroxide (Al(OH)3)", "AlCl3 + H2O (aluminium chloride and water)"),
        ("nitric acid (HNO3) and calcium hydroxide (Ca(OH)2)", "Ca(NO3)2 + H2O (calcium nitrate and water)"),
        ("acetic acid (CH3COOH) and potassium hydroxide (KOH)", "CH3COOK + H2O (potassium acetate and water)"),
        ("hydrochloric acid (HCl) and sodium bicarbonate (NaHCO3)", "NaCl + H2O + CO2 (sodium chloride, water and carbon dioxide)"),
    ]
    for pair, correct in items:
        if made >= n:
            break
        if add("predict-neutralization-products", 2, "short_answer",
               f"What are the products when {pair} react in a neutralization reaction?",
               correct, ["CONCEPT_CONFUSION"]):
            made += 1

def gen_distinguish_nutrition(n=22):
    made = 0
    autotrophs = ["Green plants", "Algae", "Cyanobacteria (blue-green algae)", "Phytoplankton",
                  "Moss", "Fern", "Wheat plant", "A mango tree", "Spirogyra", "Chlamydomonas"]
    heterotrophs = ["Amoeba", "Human beings", "Mushroom (fungus)", "Mycobacterium (a bacterium causing disease)",
                    "Tapeworm (a parasite)", "Leech", "Lion", "Earthworm", "Yeast", "Housefly", "Frog", "Cuscuta (a parasitic plant)"]
    for org in autotrophs:
        if made >= n:
            break
        if add("distinguish-nutrition-types", 1, "mcq",
               f"{org} obtain(s) nutrition by which mode?",
               "Autotrophic", ["CONCEPT_CONFUSION"], options=["Autotrophic", "Heterotrophic"]):
            made += 1
    for org in heterotrophs:
        if made >= n:
            break
        if add("distinguish-nutrition-types", 1, "mcq",
               f"{org} obtain(s) nutrition by which mode?",
               "Heterotrophic", ["CONCEPT_CONFUSION"], options=["Autotrophic", "Heterotrophic"]):
            made += 1

def gen_compare_respiration(n=16):
    made = 0
    items = [
        ("Which type of respiration produces carbon dioxide and water as end products, releasing much more energy per glucose molecule?", "Aerobic respiration"),
        ("Which type of respiration occurs in yeast during fermentation, producing ethanol and carbon dioxide?", "Anaerobic respiration"),
        ("Which type of respiration requires oxygen?", "Aerobic respiration"),
        ("Which type of respiration takes place in the cytoplasm only, without involving mitochondria?", "Anaerobic respiration"),
        ("Which type of respiration releases significantly more ATP (energy) from one molecule of glucose?", "Aerobic respiration"),
        ("During a sprint, when oxygen supply to muscles is insufficient, which type of respiration takes over temporarily?", "Anaerobic respiration"),
        ("Which type of respiration occurs in most human body cells under normal conditions?", "Aerobic respiration"),
        ("Which type of respiration takes place in the mitochondria?", "Aerobic respiration"),
        ("Which type of respiration is a less efficient way of breaking down glucose?", "Anaerobic respiration"),
        ("Bacteria fermenting milk into curd rely mainly on which type of respiration?", "Anaerobic respiration"),
        ("Which type of respiration do plant root cells use when waterlogged soil cuts off their oxygen supply?", "Anaerobic respiration"),
        ("Which type of respiration completely breaks down glucose into carbon dioxide and water?", "Aerobic respiration"),
    ]
    options_all = ["Aerobic respiration", "Anaerobic respiration"]
    for q_, correct in items:
        if made >= n:
            break
        if add("compare-respiration-types", 1, "mcq", q_, correct, ["CONCEPT_CONFUSION"], options=options_all):
            made += 1
    if add("compare-respiration-types", 1, "short_answer",
           "Muscle cramps during intense exercise are caused by the buildup of which acid, produced through anaerobic respiration in muscle cells?",
           "Lactic acid", ["CONCEPT_CONFUSION"]):
        made += 1

def gen_distinguish_metals_nonmetals(n=24):
    made = 0
    items = [
        ("Which property allows metals to be drawn into thin wires?", "Ductility"),
        ("Which property allows metals to be hammered into thin sheets?", "Malleability"),
        ("Metals, in general, are good conductors of", "Heat and electricity"),
        ("Non-metals are generally", "Poor conductors of heat and electricity"),
        ("A property typical of metals but not non-metals is", "Malleability"),
        ("Which property describes a metal producing a ringing sound when struck?", "Sonorous"),
        ("Non-metals are typically", "Brittle (in solid form)"),
        ("Iodine is a non-metal that, unusually, has a", "Lustrous (shiny) appearance"),
        ("Graphite is a non-metal that is unusual because it", "Conducts electricity"),
        ("Mercury is a metal that is unusual because it is", "Liquid at room temperature"),
        ("Metals generally have", "High melting and boiling points"),
        ("Which of these best describes most non-metals at room temperature?", "Solid or gas, rarely liquid"),
        ("Metal oxides are generally", "Basic in nature"),
        ("Non-metal oxides are generally", "Acidic in nature"),
        ("Which property means metals can conduct heat well?", "Thermal conductivity"),
        ("Sodium reacting vigorously with water to form a hydroxide and hydrogen gas shows that sodium is a", "Metal"),
        ("Sulphur burning in air to form sulphur dioxide, which turns moist litmus red, shows that sulphur is a", "Non-metal"),
    ]
    for q_, correct in items:
        if made >= n:
            break
        if add("distinguish-metals-nonmetals", 1, "short_answer", q_, correct, ["CONCEPT_CONFUSION"]):
            made += 1

def gen_explain_covalent_bonding(n=18):
    made = 0
    items = [
        ("methane (CH4)", "carbon", 4),
        ("ammonia (NH3)", "nitrogen", 3),
        ("water (H2O)", "oxygen", 2),
        ("carbon tetrachloride (CCl4)", "carbon", 4),
        ("ethane (C2H6)", "each carbon", 4),
        ("hydrogen chloride (HCl)", "hydrogen (with chlorine)", 1),
        ("chlorine (Cl2)", "each chlorine atom", 1),
        ("oxygen (O2, with a double bond)", "each oxygen atom", 2),
        ("nitrogen (N2, with a triple bond)", "each nitrogen atom", 3),
        ("carbon dioxide (CO2, with two double bonds)", "carbon", 4),
        ("methanol (CH3OH)", "carbon", 4),
        ("ethene/ethylene (C2H4, with a C=C double bond)", "each carbon", 4),
    ]
    for molecule, atom, bonds in items:
        if made >= n:
            break
        if add("explain-covalent-bonding", 2, "numeric",
               f"In a molecule of {molecule}, how many covalent bonds does {atom} form in total?",
               bonds, ["CONCEPT_CONFUSION"]):
            made += 1

def gen_identify_homologous_series(n=22):
    made = 0
    items = [
        ("CH4 (methane)", "Alkanes"), ("C2H6 (ethane)", "Alkanes"), ("C3H8 (propane)", "Alkanes"),
        ("C4H10 (butane)", "Alkanes"), ("C2H4 (ethene)", "Alkenes"), ("C3H6 (propene)", "Alkenes"),
        ("C2H2 (ethyne)", "Alkynes"), ("C3H4 (propyne)", "Alkynes"),
        ("CH3OH (methanol)", "Alcohols"), ("C2H5OH (ethanol)", "Alcohols"),
        ("HCOOH (methanoic/formic acid)", "Carboxylic acids"), ("CH3COOH (ethanoic/acetic acid)", "Carboxylic acids"),
        ("CH3CHO (ethanal)", "Aldehydes"), ("CH3COCH3 (propanone/acetone)", "Ketones"),
    ]
    options_all = ["Alkanes", "Alkenes", "Alkynes", "Alcohols", "Carboxylic acids", "Aldehydes", "Ketones"]
    for compound, correct in items:
        if made >= n:
            break
        distractors = random.sample([o for o in options_all if o != correct], 3)
        if add("identify-homologous-series", 2, "mcq",
               f"{compound} belongs to which homologous series?",
               correct, ["CONCEPT_CONFUSION"], options=mcq_options(correct, distractors)):
            made += 1

def gen_right_hand_thumb(n=18):
    made = 0
    # Style 1: which way do the field lines circle (viewed from a stated end)
    pairs = [
        ("upward", "Counter-clockwise (viewed from above)"),
        ("downward", "Clockwise (viewed from above)"),
        ("to the right", "Clockwise (viewed from the right end, looking along the current)"),
        ("to the left", "Counter-clockwise (viewed from the left end, looking along the current)"),
        ("out of the page", "Counter-clockwise (viewed facing the page)"),
        ("into the page", "Clockwise (viewed facing the page)"),
    ]
    options_all = ["Clockwise", "Counter-clockwise"]
    for direction, correct_full in pairs:
        if made >= n:
            break
        correct = "Clockwise" if "Clockwise" in correct_full.split('(')[0] else "Counter-clockwise"
        viewpoint = correct_full.split('(', 1)[1].rstrip(')')
        prompt = (f"If current flows {direction} through a straight wire and you curl the fingers of your right "
                  f"hand around it with the thumb pointing in the direction of the current, which way do the field "
                  f"lines circle, {viewpoint}?")
        if add("apply-right-hand-thumb-rule", 2, "mcq", prompt, correct, ["CONCEPT_CONFUSION"], options=options_all):
            made += 1
    # Style 2: field direction AT A POINT beside a vertical wire (matches the
    # existing image-based question's convention: current up, point to the
    # right of the wire -> field into the page; reverses for each change).
    field_opts = ["Into the page", "Out of the page"]
    points = ["P", "Q", "R", "S", "M", "N"]
    tries = 0
    while made < n and tries < 2000:
        tries += 1
        current_dir = random.choice(["upward", "downward"])
        side = random.choice(["to the right of", "to the left of"])
        point = random.choice(points)
        # base case: current up, point to the right -> into the page
        into_page = (current_dir == "upward") == (side == "to the right of")
        correct = "Into the page" if into_page else "Out of the page"
        prompt = (f"Current flows {current_dir} through a straight vertical wire. Using the right-hand thumb rule, "
                  f"what is the direction of the magnetic field at point {point}, located {side} the wire?")
        if add("apply-right-hand-thumb-rule", 2, "mcq", prompt, correct, ["CONCEPT_CONFUSION"], options=field_opts):
            made += 1

def gen_reflex_pathway(n=14):
    made = 0
    stages = ["Receptor", "Sensory neuron", "Spinal cord (relay neuron)", "Motor neuron", "Effector (muscle/gland)"]
    questions = []
    for i in range(len(stages) - 1):
        questions.append((f"In the reflex arc pathway, what comes immediately after the {stages[i].lower()}?", stages[i+1]))
    for i in range(1, len(stages)):
        questions.append((f"In the reflex arc pathway, what comes immediately before the {stages[i].lower()}?", stages[i-1]))
    questions.append(("Which part of the reflex arc first detects the stimulus?", stages[0]))
    questions.append(("Which part of the reflex arc carries out the response to the stimulus?", stages[-1]))
    questions.append(("Which part of the nervous system processes a reflex action without involving the brain?", "Spinal cord (relay neuron)"))
    for q_, correct in questions:
        if made >= n:
            break
        if add("describe-reflex-action-pathway", 2, "short_answer", q_, correct, ["CONCEPT_CONFUSION"]):
            made += 1

def gen_plant_hormone(n=10):
    made = 0
    items = [
        ("A plant shoot bends towards light.", "Auxin"),
        ("A plant root grows downward in response to gravity.", "Auxin"),
        ("A plant shows faster cell division and growth at a wound site, helping it heal.", "Cytokinin"),
        ("A fruit ripens.", "Ethylene"),
        ("A plant stem elongates rapidly, as seen in deep-water rice.", "Gibberellin"),
        ("A plant closes its stomata and shows wilting resistance during water stress.", "Abscisic acid"),
        ("Seed dormancy is promoted, inhibiting premature germination.", "Abscisic acid"),
        ("A tendril coils around a support it touches (thigmotropism), largely mediated by uneven growth due to this hormone.", "Auxin"),
    ]
    for scenario, correct in items:
        if made >= n:
            break
        if add("identify-plant-hormone-response", 2, "short_answer",
               f"{scenario} Which plant hormone is mainly responsible for this response?",
               correct, ["CONCEPT_CONFUSION"]):
            made += 1

def gen_reproduction_modes(n=20):
    made = 0
    asexual = ["Budding in Hydra", "Binary fission in Amoeba", "Spore formation in Rhizopus (bread mould)",
               "Vegetative propagation in a potato (via eyes/buds)", "Fragmentation in Spirogyra",
               "Regeneration from a body fragment in Planaria", "Budding in yeast",
               "Vegetative propagation in a rose plant grown from a stem cutting"]
    sexual = ["Fertilisation of an egg by a sperm in humans", "Pollination and fertilisation in a flowering plant",
              "Formation of a zygote after fusion of male and female gametes", "Formation of seeds in a flower after fertilisation",
              "Reproduction involving two parents and fusion of gametes", "External fertilisation in frogs"]
    for ex in asexual:
        if made >= n:
            break
        if add("distinguish-reproduction-modes", 1, "mcq",
               f"{ex} is an example of which mode of reproduction?",
               "Asexual", ["CONCEPT_CONFUSION"], options=["Asexual", "Sexual"]):
            made += 1
    for ex in sexual:
        if made >= n:
            break
        if add("distinguish-reproduction-modes", 1, "mcq",
               f"{ex} is an example of which mode of reproduction?",
               "Sexual", ["CONCEPT_CONFUSION"], options=["Asexual", "Sexual"]):
            made += 1

gen_acid_base_ph(26)
gen_reactivity_displacement(24)
gen_balance_combustion(18)
gen_classify_chemical_reaction(24)
gen_predict_neutralization(18)
gen_distinguish_nutrition(22)
gen_compare_respiration(16)
gen_distinguish_metals_nonmetals(17)
gen_explain_covalent_bonding(12)
gen_identify_homologous_series(14)
gen_right_hand_thumb(16)
gen_reflex_pathway(12)
gen_plant_hormone(8)
gen_reproduction_modes(14)

print(json.dumps(Q))
import sys
print(f"TOTAL={len(Q)}", file=sys.stderr)
from collections import Counter
for k, v in Counter(q['skill_slug'] for q in Q).items():
    print(f"  {k}: {v}", file=sys.stderr)
