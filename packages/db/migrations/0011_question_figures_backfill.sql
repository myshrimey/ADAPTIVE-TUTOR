-- Backfills figure_url/figure_caption (added in migration 0010) onto the
-- diagnostic/quiz question bank, for the skills where a question is
-- genuinely easier to answer with a picture: a geometry figure, a circuit,
-- a ray diagram, a graph. Reuses the SVGs already drawn for
-- packages/core/learning-diagrams/mapping.ts (apps/web/public/learning-diagrams/)
-- rather than authoring new art — same generic-diagram approach: one
-- shared, non-specific image per skill, with the question's own prompt
-- text carrying that question's actual numbers.
--
-- Safe to re-run: every statement is an unconditional UPDATE keyed by skill
-- slug, so running this migration twice sets the same values both times
-- (per this repo's migrations needing to be re-runnable — see CLAUDE.md).
--
-- Deliberately a small, curated first batch (12 geometry/physics skills plus
-- 2 statistics skills sharing one new frequency-table figure) rather than every
-- skill that has a learning-diagram — these are the ones where a diagnostic
-- or quiz *question* (not just the teaching explanation) is meaningfully
-- harder to answer without seeing the figure. More can be added the same
-- way in a later migration.

update diagnostic_questions dq
set figure_url = v.figure_url, figure_caption = v.figure_caption
from skills sk, (values
  ('apply-pythagoras-theorem', '/learning-diagrams/pythagoras-generic.svg', 'A right triangle with its two legs and hypotenuse labeled a, b, c'),
  ('find-trig-ratios', '/learning-diagrams/trig-ratios-generic.svg', 'A right triangle showing the opposite, adjacent and hypotenuse sides relative to angle theta'),
  ('calculate-circle-area-circumference', '/learning-diagrams/circle-area-generic.svg', 'A circle with its radius labeled'),
  ('calculate-sector-area', '/learning-diagrams/sector-area-generic.svg', 'A circle with a sector (pie-slice) shaded, showing the angle theta and radius'),
  ('zeroes-graph-relation', '/learning-diagrams/zeroes-graph-generic.svg', 'A parabola crossing the x-axis, showing where the zeroes of a quadratic are'),
  ('interpret-line-relationships', '/learning-diagrams/line-relationships-generic.svg', 'Two lines shown as intersecting, parallel, or coincident'),
  ('apply-tangent-perpendicular-property', '/learning-diagrams/tangent-perpendicular-generic.svg', 'A circle with a tangent line touching it, meeting the radius at a right angle'),
  ('find-tangent-length', '/learning-diagrams/tangent-length-generic.svg', 'A circle, an external point, and the tangent line between them'),
  ('apply-ohms-law', '/learning-diagrams/ohms-law-circuit-generic.svg', 'A simple circuit with a battery and a resistor'),
  ('calculate-equivalent-resistance', '/learning-diagrams/series-parallel-generic.svg', 'Two resistors wired in series and in parallel, side by side'),
  ('apply-mirror-formula', '/learning-diagrams/concave-mirror-generic.svg', 'A ray diagram for a concave mirror, showing the object, centre of curvature, focus and image'),
  ('apply-lens-formula', '/learning-diagrams/convex-lens-generic.svg', 'A ray diagram for a convex lens, showing the object, the two foci and the image'),
  ('mean-grouped-data', '/learning-diagrams/frequency-table-generic.svg', 'A frequency distribution table with class intervals in one column and frequencies in the other'),
  ('median-mode-grouped-data', '/learning-diagrams/frequency-table-generic.svg', 'A frequency distribution table with class intervals in one column and frequencies in the other')
) as v(skill_slug, figure_url, figure_caption)
where sk.slug = v.skill_slug
  and dq.skill_id = sk.id;

update questions q
set figure_url = v.figure_url, figure_caption = v.figure_caption
from skills sk, (values
  ('apply-pythagoras-theorem', '/learning-diagrams/pythagoras-generic.svg', 'A right triangle with its two legs and hypotenuse labeled a, b, c'),
  ('find-trig-ratios', '/learning-diagrams/trig-ratios-generic.svg', 'A right triangle showing the opposite, adjacent and hypotenuse sides relative to angle theta'),
  ('calculate-circle-area-circumference', '/learning-diagrams/circle-area-generic.svg', 'A circle with its radius labeled'),
  ('calculate-sector-area', '/learning-diagrams/sector-area-generic.svg', 'A circle with a sector (pie-slice) shaded, showing the angle theta and radius'),
  ('zeroes-graph-relation', '/learning-diagrams/zeroes-graph-generic.svg', 'A parabola crossing the x-axis, showing where the zeroes of a quadratic are'),
  ('interpret-line-relationships', '/learning-diagrams/line-relationships-generic.svg', 'Two lines shown as intersecting, parallel, or coincident'),
  ('apply-tangent-perpendicular-property', '/learning-diagrams/tangent-perpendicular-generic.svg', 'A circle with a tangent line touching it, meeting the radius at a right angle'),
  ('find-tangent-length', '/learning-diagrams/tangent-length-generic.svg', 'A circle, an external point, and the tangent line between them'),
  ('apply-ohms-law', '/learning-diagrams/ohms-law-circuit-generic.svg', 'A simple circuit with a battery and a resistor'),
  ('calculate-equivalent-resistance', '/learning-diagrams/series-parallel-generic.svg', 'Two resistors wired in series and in parallel, side by side'),
  ('apply-mirror-formula', '/learning-diagrams/concave-mirror-generic.svg', 'A ray diagram for a concave mirror, showing the object, centre of curvature, focus and image'),
  ('apply-lens-formula', '/learning-diagrams/convex-lens-generic.svg', 'A ray diagram for a convex lens, showing the object, the two foci and the image'),
  ('mean-grouped-data', '/learning-diagrams/frequency-table-generic.svg', 'A frequency distribution table with class intervals in one column and frequencies in the other'),
  ('median-mode-grouped-data', '/learning-diagrams/frequency-table-generic.svg', 'A frequency distribution table with class intervals in one column and frequencies in the other')
) as v(skill_slug, figure_url, figure_caption)
where sk.slug = v.skill_slug
  and q.skill_id = sk.id;
