# v125: turns a hand-written raw question list into a seed file, with checks.
# Raw input (JSON): {"subject_slug": "...", "questions": [{"skill_slug","difficulty","prompt","correct","wrong":[3 strings],"explanation","tag"}]}
# Output: packages/db/seed/cbse-class10-<subject>-v125-diagnostic.json  (all content_status needs_review; correct option rotated by crc32 so it is not always in one position)
import json, sys, os, glob, zlib, collections
HERE = os.path.dirname(os.path.abspath(__file__)); SEED = os.path.join(HERE, '..', 'seed')
TAGS = {'CONCEPT_CONFUSION','PREREQUISITE_GAP','TERMINOLOGY_CONFUSION','INCOMPLETE_REASONING','PROCEDURAL_ERROR','COMPREHENSION_GAP','GRAMMAR_RULE','VOCABULARY_GAP','STRUCTURE_FORMAT','WRITTEN_EXPRESSION','INCOMPLETE_ANSWER'}
def main(raw_path):
    raw = json.load(open(raw_path, encoding='utf-8')); sub = raw['subject_slug']
    cur = json.load(open(os.path.join(SEED, f'cbse-class10-{sub}.json'), encoding='utf-8'))
    skills = {s['slug'] for c in cur['chapters'] for t in c['topics'] for s in t['skills']}
    old = set()
    for f in glob.glob(os.path.join(SEED, '*diagnostic.json')):
        if f.endswith('-v125-diagnostic.json'): continue
        j = json.load(open(f, encoding='utf-8'))
        if j.get('subject_slug') == sub: old |= {q['prompt'].strip() for q in j['questions']}
    out, errs, seen = [], [], set()
    for i, q in enumerate(raw['questions']):
        w = []
        if q['skill_slug'] not in skills: w.append('unknown skill')
        p = q['prompt'].strip()
        if len(p) < 15: w.append('prompt too short')
        if p in old or p in seen: w.append('duplicate prompt')
        seen.add(p)
        if q.get('difficulty') not in (1, 2, 3, 4, 5): w.append('difficulty')
        if q.get('tag') not in TAGS: w.append('tag ' + str(q.get('tag')))
        opts = [q['correct']] + list(q['wrong'])
        if len(q['wrong']) != 3 or len({o.strip().lower() for o in opts}) != 4: w.append('need 3 distinct wrong options different from correct')
        if any((not o.strip()) or len(o) > 160 for o in opts): w.append('option empty or too long')
        if len(q.get('explanation', '').strip()) < 20: w.append('explanation too short')
        if w: errs.append((i, p[:50], w)); continue
        wr = list(q['wrong']); pos = zlib.crc32((q['skill_slug'] + p).encode('utf-8')) % 4; wr.insert(pos, q['correct'])
        out.append({'skill_slug': q['skill_slug'], 'difficulty': q['difficulty'], 'question_type': 'mcq', 'prompt': p,
                    'expected_answer': {'value': q['correct']}, 'misconception_tags': [q['tag']], 'options': wr,
                    'explanation': q['explanation'].strip(), 'content_status': 'needs_review'})
    for e in errs: print('ERR', e)
    if errs: sys.exit(1)
    dest = os.path.join(SEED, f'cbse-class10-{sub}-v125-diagnostic.json')
    json.dump({'subject_slug': sub, 'questions': out}, open(dest, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    c = collections.Counter(q['skill_slug'] for q in out)
    print('wrote', dest, len(out), 'questions over', len(c), 'skills; skills without new questions:', sorted(skills - set(c))[:40])
main(sys.argv[1])
