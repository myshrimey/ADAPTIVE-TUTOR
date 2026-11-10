# v123: French (CBSE Class X, code 018) curriculum. Written from the public CBSE 2026-27 syllabus summary (grammar topics 1-9,
# reading, writing, culture and civilisation from Entre Jeunes lessons 2-8 and 10). Skill names and structure are original.
# Output: packages/db/seed/cbse-class10-french.json. Run: python3 packages/db/seed-generators/gen_french_curriculum.py
import json, os

def S(slug, name, requires=()):
    return {'name': name, 'slug': slug, 'requires': list(requires)}

CHAPTERS = [
  ('les-verbes', 'Grammar: Verbs', [
    ('verbes-present-imperatif', 'Infinitive, present and imperative', [
      S('present-tense', 'Conjugate regular and irregular verbs in the présent'),
      S('pronominal-verbs', 'Conjugate pronominal verbs (se lever, s\'habiller)', ['present-tense']),
      S('imperative', 'Form the impératif, affirmative and negative', ['present-tense']),
      S('infinitive-use', 'Use the infinitive after aller, vouloir, pouvoir, devoir and prepositions', ['present-tense']),
    ]),
    ('verbes-passe', 'Past tenses', [
      S('passe-compose-auxiliary', 'Form the passé composé and choose avoir or être', ['present-tense']),
      S('passe-compose-agreement', 'Make the past participle agree (être verbs, pronominal verbs)', ['passe-compose-auxiliary']),
      S('imparfait', 'Form and use the imparfait', ['present-tense']),
      S('imparfait-vs-passe-compose', 'Choose between the imparfait and the passé composé', ['imparfait', 'passe-compose-auxiliary']),
      S('plus-que-parfait', 'Form and use the plus-que-parfait', ['passe-compose-agreement', 'imparfait']),
    ]),
    ('verbes-futur-conditionnel', 'Future tenses and the conditional', [
      S('futur-proche', 'Form and use the futur proche', ['infinitive-use']),
      S('futur-simple', 'Form and use the futur simple', ['present-tense']),
      S('futur-anterieur', 'Form and use the futur antérieur', ['futur-simple', 'passe-compose-agreement']),
      S('conditionnel-present', 'Form and use the conditionnel présent', ['futur-simple', 'imparfait']),
      S('si-clauses', 'Use si-clauses (si + présent, si + imparfait, si + plus-que-parfait)', ['conditionnel-present']),
    ]),
  ]),
  ('pronoms-personnels', 'Grammar: Personal pronouns', [
    ('pronoms-cod-coi', 'Direct and indirect object pronouns', [
      S('cod-pronouns', 'Replace a direct object with le, la, l\', les'),
      S('coi-pronouns', 'Replace an indirect object with lui, leur', ['cod-pronouns']),
      S('tonic-pronouns', 'Use the stressed pronouns moi, toi, lui, elle, nous, vous, eux, elles'),
    ]),
    ('pronoms-y-en', 'The pronouns y and en', [
      S('pronoun-y', 'Replace a place or a thing introduced by à with y', ['cod-pronouns']),
      S('pronoun-en', 'Replace a quantity or a thing introduced by de with en', ['cod-pronouns']),
      S('pronoun-placement', 'Place pronouns correctly (passé composé, impératif, infinitif)', ['cod-pronouns', 'coi-pronouns', 'pronoun-y', 'pronoun-en']),
    ]),
  ]),
  ('la-negation', 'Grammar: Negation', [
    ('negation-forms', 'Negative forms', [
      S('negation-forms', 'Use ne…pas, ne…jamais, ne…plus, ne…rien, ne…personne'),
      S('negation-tenses', 'Make negatives in the passé composé, with an infinitive and in the impératif', ['negation-forms', 'passe-compose-auxiliary']),
      S('negation-replies', 'Reply negatively to a question (pas encore, jamais, rien, personne)', ['negation-forms']),
    ]),
  ]),
  ('trouver-la-question', 'Grammar: Finding the question', [
    ('questions', 'Asking questions', [
      S('question-forms', 'Form questions (intonation, est-ce que, inversion)'),
      S('question-words', 'Choose the right question word (qui, que, où, quand, comment, pourquoi, combien)', ['question-forms']),
      S('find-the-question', 'Find the question for an underlined answer', ['question-words']),
    ]),
  ]),
  ('discours-direct-indirect', 'Grammar: Direct and indirect speech', [
    ('discours-indirect', 'Reporting what someone said', [
      S('indirect-statements', 'Turn a statement into indirect speech (dire que)'),
      S('indirect-commands', 'Turn a command into indirect speech (dire de, demander de)', ['imperative']),
      S('indirect-questions', 'Turn a question into indirect speech (demander si, ce que, qui, où)', ['question-words']),
    ]),
  ]),
  ('pronoms-relatifs', 'Grammar: Relative pronouns', [
    ('relatifs', 'Simple and compound relative pronouns', [
      S('relative-qui-que-ou', 'Join sentences with qui, que and où'),
      S('relative-dont', 'Join sentences with dont', ['relative-qui-que-ou']),
      S('relative-compose', 'Use the compound forms (lequel, laquelle, auquel, duquel…)', ['relative-qui-que-ou', 'relative-dont']),
    ]),
  ]),
  ('adjectifs-pronoms-demonstratifs', 'Grammar: Demonstrative adjectives and pronouns', [
    ('demonstratifs', 'Demonstratives', [
      S('demonstrative-adjectives', 'Use ce, cet, cette, ces'),
      S('demonstrative-pronouns-simple', 'Use celui, celle, ceux, celles', ['demonstrative-adjectives']),
      S('demonstrative-pronouns-compound', 'Use celui-ci, celui-là, ceci, cela, ce', ['demonstrative-pronouns-simple']),
    ]),
  ]),
  ('adjectifs-pronoms-possessifs', 'Grammar: Possessive adjectives and pronouns', [
    ('possessifs', 'Possessives', [
      S('possessive-adjectives', 'Use mon, ma, mes, ton, ta, tes, son, sa, ses, notre, votre, leur'),
      S('possessive-pronouns', 'Use le mien, la tienne, les siens, le nôtre, le leur…', ['possessive-adjectives']),
    ]),
  ]),
  ('le-subjonctif', 'Grammar: The subjunctive', [
    ('subjonctif', 'The subjonctif présent', [
      S('subjonctif-formation', 'Form the subjonctif présent of regular verbs', ['present-tense']),
      S('subjonctif-irregular', 'Use the irregular subjunctives (être, avoir, aller, faire, pouvoir, savoir, vouloir)', ['subjonctif-formation']),
      S('subjonctif-triggers', 'Choose the subjunctive after il faut que, vouloir que, souhaiter que and similar', ['subjonctif-formation']),
    ]),
  ]),
  ('reading-comprehension', 'Reading comprehension', [
    ('unseen-passage', 'Unseen passage', [
      S('passage-true-false', 'Decide whether a statement about a passage is true or false'),
      S('passage-short-answer', 'Answer short questions about a passage', ['passage-true-false']),
      S('vocabulary-search', 'Find nouns, verbs, opposites and synonyms in a passage'),
      S('data-and-picture-reading', 'Read information from a short advert, timetable or picture description'),
    ]),
  ]),
  ('writing-tasks', 'Writing', [
    ('letters-messages', 'Letter and message', [
      S('informal-letter', 'Write an informal letter (layout and useful phrases)'),
      S('message-writing', 'Write a short message (layout and useful phrases)'),
    ]),
    ('dialogue-story', 'Dialogue and story', [
      S('dialogue-rearranging', 'Put the lines of a dialogue in the right order'),
      S('story-completion', 'Complete a text with the help of clues', ['passe-compose-auxiliary']),
    ]),
  ]),
  ('apres-le-bac', 'Lesson 2: Après le bac', [
    ('systemes-education', 'Education systems', [
      S('education-system-france-india', 'Describe the French and the Indian school systems (stages, ages, diplomas)'),
      S('studies-after-the-bac', 'Talk about studies and plans after the bac (IUT, université, bourses)', ['education-system-france-india']),
    ]),
    ('mots-etudes', 'Words about studies', [
      S('verb-noun-forms', 'Give the noun that goes with a verb (arriver, une arrivée)'),
      S('study-expressions', 'Use expressions about exams and studies (passer un examen, suivre des cours)'),
    ]),
  ]),
  ('chercher-du-travail', 'Lesson 3: Chercher du travail', [
    ('monde-du-travail', 'The world of work', [
      S('office-vocabulary', 'Name common office objects and the tasks of a secretary'),
      S('job-search-vocabulary', 'Use vocabulary for finding a job (CV, chômage, intérim, annonces)'),
      S('travail-expressions', 'Use expressions with the word travail'),
    ]),
  ]),
  ('le-plaisir-de-lire', 'Lesson 4: Le plaisir de lire', [
    ('lecture', 'Reading and libraries', [
      S('library-facts', 'Explain how to join and use a library (carte de lecteur)'),
      S('reading-genres-and-authors', 'Match literary genres, books and authors (roman, conte, fable, BD)'),
      S('newspaper-sections', 'Name the sections of a newspaper (les rubriques)'),
    ]),
  ]),
  ('les-medias', 'Lesson 5: Les médias', [
    ('medias', 'The media', [
      S('media-vocabulary', 'Use media vocabulary (chaîne, émission, zapper, feuilleton)'),
      S('french-media-facts', 'Recall French newspapers, channels and radio, and how often a magazine appears'),
    ]),
  ]),
  ('chacun-ses-gouts', 'Lesson 6: Chacun ses goûts', [
    ('gouts-loisirs', 'Tastes and leisure', [
      S('hobbies-and-tastes', 'Talk about hobbies and tastes (jardinage, lecture, passe-temps)'),
      S('museums-and-cinema', 'Recall facts about the Louvre and the musée d\'Orsay and invite someone out'),
      S('proverbs-and-expressions', 'Complete common French proverbs and expressions'),
    ]),
  ]),
  ('en-pleine-forme', 'Lesson 7: En pleine forme', [
    ('sante', 'Health', [
      S('healthy-lifestyle', 'Talk about healthy habits (sport, eau, fast-food, sommeil)'),
      S('at-the-doctor', 'Use vocabulary for a visit to the doctor (ordonnance, pharmacie, rhume, fièvre)'),
      S('health-expressions-securite-sociale', 'Use health expressions (avoir mal à…) and explain la sécurité sociale'),
    ]),
  ]),
  ('lenvironnement', 'Lesson 8: L\'environnement', [
    ('environnement', 'The environment', [
      S('environment-vocabulary', 'Use environment vocabulary (gaspillage, réchauffement, pollution, recyclage)'),
      S('protecting-the-planet', 'Explain actions that protect the environment (eau, énergie, biodiversité)'),
    ]),
  ]),
  ('vive-la-republique', 'Lesson 10: Vive la République !', [
    ('republique', 'The Republic and the telephone', [
      S('french-political-system', 'Describe the French political system (Président, Assemblée nationale, Sénat, Élysée)'),
      S('indian-political-system-in-french', 'Compare the Indian and French political systems (Lok Sabha, Rajya Sabha, Premier ministre)', ['french-political-system']),
      S('telephone-expressions', 'Use telephone expressions (coup de fil, faux numéro, répondeur)'),
    ]),
  ]),
]

def build():
    chapters = []
    seen = set()
    for ci, (cslug, cname, topics) in enumerate(CHAPTERS, 1):
        tlist = []
        for ti, (tslug, tname, skills) in enumerate(topics, 1):
            for sk in skills:
                assert sk['slug'] not in seen, sk['slug']
                seen.add(sk['slug'])
            tlist.append({'name': tname, 'slug': tslug, 'sequence': ti, 'skills': skills})
        chapters.append({'name': cname, 'slug': cslug, 'sequence': ci, 'topics': tlist})
    # every prerequisite must exist
    for ch in chapters:
        for t in ch['topics']:
            for sk in t['skills']:
                for r in sk['requires']:
                    assert r in seen, (sk['slug'], r)
    return {
        'curriculum': {'board': 'CBSE', 'class': '10', 'version': 'v1'},
        'subject': {
            'name': 'French', 'slug': 'french', 'status': 'pilot',
            'description': 'CBSE Class X French (code 018): grammar, reading, writing and the Entre Jeunes lessons 2-8 and 10. Questions were written for Sahayak; a French teacher has not reviewed them yet.',
        },
        'chapters': chapters,
    }

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'seed', 'cbse-class10-french.json')
    d = build()
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')
    n = sum(len(t['skills']) for c in d['chapters'] for t in c['topics'])
    print(out, len(d['chapters']), 'chapters,', n, 'skills')
