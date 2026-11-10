# v123: helpers for the French question files. Original questions written for Sahayak (nothing copied from the textbook or any question bank).
# - mcq()/short(): same shape as v104_lib, with the correct option placed at a rotating position.
# - conj()/bare(): verb forms come from the rule-based verbecc conjugator (Verbiste data), so answer keys for verb questions are
#   computed, not typed from memory. Handwritten questions are separately checked by check_french.py (spelling, structure).
import json, re, zlib, logging
logging.disable(logging.CRITICAL)
from verbecc import CompleteConjugator

_cg = CompleteConjugator(lang='fr')
_cache = {}
PRONS = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles']

def _forms(verb):
    if verb not in _cache:
        d = _cg.conjugate(verb).get_data()['moods']
        out = {}
        for mood, ts in d.items():
            for tense, entries in ts.items():
                out[(str(getattr(mood, 'value', mood)), str(getattr(tense, 'value', tense)))] = [e['c'][0] for e in entries]
        _cache[verb] = out
    return _cache[verb]

def conj(verb, mood, tense, pron, g='m'):
    """Full form with its subject pronoun, e.g. conj('finir','indicatif','present'...) -> 'nous finissons'. g picks the participle agreement
    (m or f) for the pronouns je/tu/nous/vous/on where both exist."""
    entries = _forms(verb)[(mood, tense)]
    starts = {'je': ('je ', "j'"), 'tu': ('tu ', "t'"), 'il': ('il ', "qu'il ", "s'"), 'elle': ('elle ',), 'on': ('on ',), 'nous': ('nous ',), 'vous': ('vous ',), 'ils': ('ils ',), 'elles': ('elles ',)}
    cands = [e for e in entries if _subject_of(e) == pron]
    assert cands, (verb, mood, tense, pron, entries)
    if len(cands) == 1:
        return cands[0]
    return cands[0] if g == 'f' else cands[1]

_SUBJ_RE = re.compile(r"^(?:que |qu')?(je |j'|tu |t'|il |elle |on |nous |vous |ils |elles |s'|se )")
def _subject_of(entry):
    e = re.sub(r"^(que |qu')", '', entry)
    if e.startswith(("je ", "j'")) or e.startswith("me "): return 'je'
    for p in ('tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'):
        if e.startswith(p + ' ') or (p == 'il' and e.startswith("il")) and e.split(' ')[0].replace("'", '') == p:
            return p
    m = re.match(r"^(t')", e)
    if m: return 'tu'
    if e.startswith(("il ", "s'")): return 'il'
    return None

def bare(full):
    """Remove the subject pronoun (and que/qu'): 'nous finissons' -> 'finissons'; "j'ai mangé" -> 'ai mangé'. Keeps reflexive pronouns."""
    s = re.sub(r"^(que |qu')", '', full)
    for p in ("je ", "j'", "tu ", "il ", "elle ", "on ", "nous ", "vous ", "ils ", "elles "):
        if s.startswith(p):
            s = s[len(p):]
            break
    return s

def imper(verb, person):
    """Impératif form, person in {'tu','nous','vous'}: 'finis', 'finissons', 'finissez'."""
    for (mood, tense), entries in _forms(verb).items():
        if mood == 'imperatif' and tense == 'imperatif-présent':
            idx = {'tu': 0, 'nous': 1, 'vous': 2}[person]
            return entries[idx]
    raise KeyError((verb, person))

def part(verb):
    for (mood, tense), entries in _forms(verb).items():
        if mood == 'participe' and tense == 'participe-passé':
            return entries[0]
    raise KeyError(verb)

def _pos(skill, prompt):
    return zlib.crc32((skill + prompt).encode('utf-8')) % 4

def mcq(skill, diff, prompt, correct, wrongs, explanation, tag='GRAMMAR_RULE'):
    wrongs = list(wrongs)
    assert len(wrongs) == 3, (skill, prompt, wrongs)
    allopts = [correct] + wrongs
    assert len({o.strip().lower() for o in allopts}) == 4, ('duplicate options', skill, prompt, allopts)
    opts = list(wrongs)
    opts.insert(_pos(skill, prompt), correct)
    return {'skill_slug': skill, 'difficulty': diff, 'question_type': 'mcq', 'prompt': prompt,
            'expected_answer': {'value': correct}, 'misconception_tags': [tag], 'options': opts, 'explanation': explanation}

def short(skill, diff, prompt, answer, explanation, tag='GRAMMAR_RULE'):
    assert ',' not in answer and '=' not in answer and '+' not in answer, ('short answers must not contain , = +', answer)
    return {'skill_slug': skill, 'difficulty': diff, 'question_type': 'short_answer', 'prompt': prompt,
            'expected_answer': {'value': answer}, 'misconception_tags': [tag], 'explanation': explanation}

TENSE_LABEL = {('indicatif', 'présent'): 'présent', ('indicatif', 'imparfait'): 'imparfait', ('indicatif', 'futur-simple'): 'futur simple',
               ('indicatif', 'passé-composé'): 'passé composé', ('indicatif', 'plus-que-parfait'): 'plus-que-parfait',
               ('indicatif', 'futur-antérieur'): 'futur antérieur', ('conditionnel', 'présent'): 'conditionnel présent', ('subjonctif', 'présent'): 'subjonctif présent'}

def fill(skill, diff, sentence, verb, mood, tense, pron, g='m', kind='mcq', note='', hint=None, others=None):
    """A fill-in-the-blank verb question. `sentence` contains ___ where the verb form goes (the subject is already in the sentence).
    The answer is computed from the conjugator. Wrong options: the same verb in other persons (same tense) and in other tenses."""
    ans = bare(conj(verb, mood, tense, pron, g))
    label = TENSE_LABEL[(mood, tense)]
    plabel = ("à l'" + label) if label.startswith(('imparfait', 'indicatif')) else ('au ' + label)
    pool = []
    for p in PRONS:
        if p == pron: continue
        f = bare(conj(verb, mood, tense, p, g))
        if f != ans and f not in pool: pool.append(f)
    tpool = []
    for (m2, t2) in TENSE_LABEL:
        if (m2, t2) == (mood, tense): continue
        try:
            f = bare(conj(verb, m2, t2, pron, g))
        except Exception:
            continue
        if f != ans and f not in tpool and f not in pool: tpool.append(f)
    if others is not None:
        wrong = list(others)
    else:
        key = lambda s: zlib.crc32((skill + sentence + s).encode('utf-8'))
        w1 = sorted(pool, key=key)[:1]
        w2 = sorted(tpool, key=key)[:2]
        wrong = w2 + w1
        if len(wrong) < 3:
            for s in sorted(pool, key=key):
                if s not in wrong: wrong.append(s)
                if len(wrong) == 3: break
    expl = f"{verb.capitalize()} {plabel} avec « {pron} » : {conj(verb, mood, tense, pron, g)}." + (' ' + note if note else '')
    prompt = (hint or f"Complétez avec le verbe « {verb} » {plabel} :") + ' ' + sentence if kind == 'mcq' else f"Écrivez la forme correcte du verbe « {verb} » {plabel} : {sentence}"
    if kind == 'mcq':
        return mcq(skill, diff, prompt, ans, wrong[:3], expl)
    return short(skill, diff, prompt, ans, expl)

def write(path, subject_slug, questions):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'subject_slug': subject_slug, 'questions': questions}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(path, len(questions))
