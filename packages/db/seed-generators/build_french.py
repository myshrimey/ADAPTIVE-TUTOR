# v123: builds the two French question files from the three generators, then validates them.
# Usage: python3 build_french.py   (from packages/db/seed-generators)
import json, os, re, collections, sys
import fr_lib as L
import gen_french_verbs as gv, gen_french_grammar as gg, gen_french_culture as gc
HERE = os.path.dirname(os.path.abspath(__file__)); SEED = os.path.join(HERE, '..', 'seed')
allq = [q for q in gv.Q + gg.Q + gc.Q if q]
cur = json.load(open(os.path.join(SEED, 'cbse-class10-french.json'), encoding='utf-8'))
skills = {s['slug'] for c in cur['chapters'] for t in c['topics'] for s in t['skills']}
# dedupe by (skill, prompt)
seen, qs = set(), []
for q in allq:
    key = (q['skill_slug'], q['prompt'])
    if key in seen: continue
    seen.add(key); qs.append(q)
errs = []
by = collections.defaultdict(list)
for q in qs:
    if q['skill_slug'] not in skills: errs.append(('unknown skill', q['skill_slug']))
    by[q['skill_slug']].append(q)
    if q['question_type'] == 'mcq':
        if q['expected_answer']['value'] not in q['options']: errs.append(('answer not in options', q['prompt']))
        if len(set(o.lower() for o in q['options'])) != 4: errs.append(('dup options', q['prompt']))
for s in skills - set(by): errs.append(('skill without questions', s))
for s, l in by.items():
    if len(l) < 4: errs.append(('fewer than 4 questions', s, len(l)))
if errs:
    for e in errs: print('ERR', e)
    sys.exit(1)
# diagnostic: the easiest question of every skill (lowest difficulty; first in file order on ties)
diag, rest = [], []
for s, l in by.items():
    first = min(l, key=lambda x: x['difficulty'])
    diag.append(first)
rest = [q for q in qs if q not in diag]
for q in qs: q['content_status'] = 'needs_review'
L.write(os.path.join(SEED, 'cbse-class10-french-diagnostic.json'), 'french', diag)
L.write(os.path.join(SEED, 'cbse-class10-french-v123-diagnostic.json'), 'french', rest)
print('skills', len(skills), 'questions', len(qs), 'types', collections.Counter(q['question_type'] for q in qs))
