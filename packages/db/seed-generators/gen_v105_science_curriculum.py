# v105: adds the three 2026-27 Science chapters the app did not have (Heredity, Human Eye and Colourful World, Our Environment). Additive and re-runnable.
import json, os
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'seed', 'cbse-class10-science.json')
j = json.load(open(P, encoding='utf-8'))
def sk(n, s): return {'name': n, 'slug': s, 'requires': []}
NEW = [
 ('Heredity', 'heredity', 11, [('Inheritance of Traits', 'inheritance-of-traits', [
    sk('Apply Mendel\'s monohybrid cross and the 3:1 and 1:2:1 ratios', 'sci-mendel-ratios'),
    sk('Distinguish dominant and recessive traits, genotype and phenotype', 'sci-dominant-recessive')]),
   ('Sex Determination', 'sex-determination', [sk('Explain how the sex of a child is determined in humans', 'sci-sex-determination')])]),
 ('The Human Eye and the Colourful World', 'human-eye-colourful-world', 12, [('The Human Eye', 'human-eye', [
    sk('Explain the functions of the parts of the human eye and accommodation', 'sci-eye-parts'),
    sk('Identify common vision defects and how lenses correct them', 'sci-vision-defects')]),
   ('Light in the Atmosphere', 'light-in-atmosphere', [sk('Explain dispersion, scattering and atmospheric refraction', 'sci-dispersion-scattering')])]),
 ('Our Environment', 'our-environment', 13, [('Ecosystem and Energy Flow', 'ecosystem-energy-flow', [sk('Explain food chains, trophic levels and the 10 per cent energy rule', 'sci-food-chain-energy')]),
   ('Environmental Problems', 'environmental-problems', [sk('Explain ozone depletion and classify waste as biodegradable or not', 'sci-ozone-waste')])]),
]
have = {c['slug'] for c in j['chapters']}
for name, slug, seq, topics in NEW:
    if slug in have: continue
    j['chapters'].append({'name': name, 'slug': slug, 'sequence': seq, 'topics': [{'name': tn, 'slug': ts, 'sequence': i + 1, 'skills': skl} for i, (tn, ts, skl) in enumerate(topics)]})
json.dump(j, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2); open(P, 'a').write('\n')
print('chapters', len(j['chapters']), 'skills', sum(len(t['skills']) for c in j['chapters'] for t in c['topics']))
