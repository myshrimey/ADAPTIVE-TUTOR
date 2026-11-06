# v104: shared helper for the question files written in v104. Original questions written for Sahayak (no copied question banks).
# mcq(skill, difficulty, prompt, correct, [3 wrong options], explanation, tag): the correct option is placed at a rotating position
# so answers are not always in the same place. Every question is loaded as needs_review (see seed-diagnostic.js).
import json, zlib

def mcq(skill, diff, prompt, correct, wrongs, explanation, tag='CONCEPT_CONFUSION'):
    assert len(wrongs) == 3, (skill, prompt)
    opts = list(wrongs)
    pos = zlib.crc32((skill + prompt).encode('utf-8')) % 4
    opts.insert(pos, correct)
    return {
        'skill_slug': skill, 'difficulty': diff, 'question_type': 'mcq', 'prompt': prompt,
        'expected_answer': {'value': correct}, 'misconception_tags': [tag],
        'options': opts, 'explanation': explanation,
    }

def short(skill, diff, prompt, answer, explanation, tag='CONCEPT_CONFUSION'):
    return {
        'skill_slug': skill, 'difficulty': diff, 'question_type': 'short_answer', 'prompt': prompt,
        'expected_answer': {'value': answer}, 'misconception_tags': [tag], 'explanation': explanation,
    }

def write(path, subject_slug, questions):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'subject_slug': subject_slug, 'questions': questions}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(path, len(questions))
