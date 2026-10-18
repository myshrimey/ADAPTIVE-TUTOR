-- v48: every skill that has a labelled teaching diagram also shows it on questions that point at a figure
-- ("in the diagram", "shown", "circuit", "graph"...). Only fills questions that have no figure yet. Re-runnable.
update diagnostic_questions dq
set figure_url = v.figure_url, figure_caption = v.figure_caption
from skills sk, (values
  ('apply-pythagoras-theorem', '/learning-diagrams/pythagoras-generic.svg', 'A right triangle with its two legs and hypotenuse labeled a, b, c'),
  ('find-trig-ratios', '/learning-diagrams/trig-ratios-generic.svg', 'A right triangle showing the opposite, adjacent and hypotenuse sides relative to angle theta, with sin/cos/tan defined'),
  ('calculate-circle-area-circumference', '/learning-diagrams/circle-area-generic.svg', 'A circle with its radius labeled, and the area and circumference formulas'),
  ('calculate-sector-area', '/learning-diagrams/sector-area-generic.svg', 'A circle with a sector (pie-slice) shaded, showing the angle theta and radius used in the sector area formula'),
  ('find-surface-area-combined-solid', '/learning-diagrams/combined-solid-generic.svg', 'A cone sitting on top of a cylinder, showing how a combined solid is made of simpler parts'),
  ('find-volume-combined-solid', '/learning-diagrams/combined-solid-generic.svg', 'A cone sitting on top of a cylinder, showing how a combined solid is made of simpler parts'),
  ('zeroes-graph-relation', '/learning-diagrams/zeroes-graph-generic.svg', 'A parabola crossing the x-axis at two points, showing where the zeroes of a quadratic are'),
  ('interpret-line-relationships', '/learning-diagrams/line-relationships-generic.svg', 'Three pairs of lines side by side: intersecting, parallel, and coincident, with how many solutions each gives'),
  ('apply-tangent-perpendicular-property', '/learning-diagrams/tangent-perpendicular-generic.svg', 'A circle with a tangent line touching it, showing the radius meeting the tangent at a right angle'),
  ('find-tangent-length', '/learning-diagrams/tangent-length-generic.svg', 'A circle, an external point, and the tangent line between them, showing the right triangle used to find tangent length'),
  ('apply-ohms-law', '/learning-diagrams/ohms-law-circuit-generic.svg', 'A simple circuit with a battery and a resistor, illustrating Ohm''s law V = IR'),
  ('calculate-equivalent-resistance', '/learning-diagrams/series-parallel-generic.svg', 'Two resistors shown wired in series and in parallel, side by side, with their equivalent-resistance formulas'),
  ('apply-mirror-formula', '/learning-diagrams/concave-mirror-generic.svg', 'A ray diagram for a concave mirror, showing an object, its centre of curvature and focus, and the real inverted image formed'),
  ('apply-lens-formula', '/learning-diagrams/convex-lens-generic.svg', 'A ray diagram for a convex lens, showing an object, the two foci, and the real inverted image formed'),
  ('apply-right-hand-thumb-rule', '/learning-diagrams/right-hand-thumb-rule-generic.svg', 'A straight current-carrying wire with circular magnetic field lines around it, showing the right-hand thumb rule'),
  ('describe-reflex-action-pathway', '/learning-diagrams/reflex-arc-labeled.svg', 'The five stages of a reflex arc in order: stimulus, sensory neuron, spinal cord, motor neuron, effector'),
  ('identify-plant-hormone-response', '/learning-diagrams/phototropism-generic.svg', 'A plant shoot bending towards a light source, illustrating auxin-driven phototropism'),
  ('predict-displacement-using-reactivity-series', '/learning-diagrams/reactivity-series-generic.svg', 'The reactivity series of metals listed from most reactive (potassium) to least reactive (gold)'),
  ('explain-covalent-bonding', '/learning-diagrams/covalent-bond-generic.svg', 'Two atoms sharing a pair of electrons between them, illustrating a covalent bond'),
  ('distinguish-reproduction-modes', '/learning-diagrams/reproduction-modes-generic.svg', 'Asexual reproduction (one parent, identical offspring) shown next to sexual reproduction (two parents, varied offspring)')
) as v(skill_slug, figure_url, figure_caption)
where sk.slug = v.skill_slug and dq.skill_id = sk.id
  and dq.figure_url is null
  and dq.prompt ~* '(shown|diagram|figure|circuit|graph|ray)';

update questions q
set figure_url = v.figure_url, figure_caption = v.figure_caption
from skills sk, (values
  ('apply-pythagoras-theorem', '/learning-diagrams/pythagoras-generic.svg', 'A right triangle with its two legs and hypotenuse labeled a, b, c'),
  ('find-trig-ratios', '/learning-diagrams/trig-ratios-generic.svg', 'A right triangle showing the opposite, adjacent and hypotenuse sides relative to angle theta, with sin/cos/tan defined'),
  ('calculate-circle-area-circumference', '/learning-diagrams/circle-area-generic.svg', 'A circle with its radius labeled, and the area and circumference formulas'),
  ('calculate-sector-area', '/learning-diagrams/sector-area-generic.svg', 'A circle with a sector (pie-slice) shaded, showing the angle theta and radius used in the sector area formula'),
  ('find-surface-area-combined-solid', '/learning-diagrams/combined-solid-generic.svg', 'A cone sitting on top of a cylinder, showing how a combined solid is made of simpler parts'),
  ('find-volume-combined-solid', '/learning-diagrams/combined-solid-generic.svg', 'A cone sitting on top of a cylinder, showing how a combined solid is made of simpler parts'),
  ('zeroes-graph-relation', '/learning-diagrams/zeroes-graph-generic.svg', 'A parabola crossing the x-axis at two points, showing where the zeroes of a quadratic are'),
  ('interpret-line-relationships', '/learning-diagrams/line-relationships-generic.svg', 'Three pairs of lines side by side: intersecting, parallel, and coincident, with how many solutions each gives'),
  ('apply-tangent-perpendicular-property', '/learning-diagrams/tangent-perpendicular-generic.svg', 'A circle with a tangent line touching it, showing the radius meeting the tangent at a right angle'),
  ('find-tangent-length', '/learning-diagrams/tangent-length-generic.svg', 'A circle, an external point, and the tangent line between them, showing the right triangle used to find tangent length'),
  ('apply-ohms-law', '/learning-diagrams/ohms-law-circuit-generic.svg', 'A simple circuit with a battery and a resistor, illustrating Ohm''s law V = IR'),
  ('calculate-equivalent-resistance', '/learning-diagrams/series-parallel-generic.svg', 'Two resistors shown wired in series and in parallel, side by side, with their equivalent-resistance formulas'),
  ('apply-mirror-formula', '/learning-diagrams/concave-mirror-generic.svg', 'A ray diagram for a concave mirror, showing an object, its centre of curvature and focus, and the real inverted image formed'),
  ('apply-lens-formula', '/learning-diagrams/convex-lens-generic.svg', 'A ray diagram for a convex lens, showing an object, the two foci, and the real inverted image formed'),
  ('apply-right-hand-thumb-rule', '/learning-diagrams/right-hand-thumb-rule-generic.svg', 'A straight current-carrying wire with circular magnetic field lines around it, showing the right-hand thumb rule'),
  ('describe-reflex-action-pathway', '/learning-diagrams/reflex-arc-labeled.svg', 'The five stages of a reflex arc in order: stimulus, sensory neuron, spinal cord, motor neuron, effector'),
  ('identify-plant-hormone-response', '/learning-diagrams/phototropism-generic.svg', 'A plant shoot bending towards a light source, illustrating auxin-driven phototropism'),
  ('predict-displacement-using-reactivity-series', '/learning-diagrams/reactivity-series-generic.svg', 'The reactivity series of metals listed from most reactive (potassium) to least reactive (gold)'),
  ('explain-covalent-bonding', '/learning-diagrams/covalent-bond-generic.svg', 'Two atoms sharing a pair of electrons between them, illustrating a covalent bond'),
  ('distinguish-reproduction-modes', '/learning-diagrams/reproduction-modes-generic.svg', 'Asexual reproduction (one parent, identical offspring) shown next to sexual reproduction (two parents, varied offspring)')
) as v(skill_slug, figure_url, figure_caption)
where sk.slug = v.skill_slug and q.skill_id = sk.id
  and q.figure_url is null
  and q.prompt ~* '(shown|diagram|figure|circuit|graph|ray)';
