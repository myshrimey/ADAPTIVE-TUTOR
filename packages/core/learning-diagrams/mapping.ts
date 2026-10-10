// Maps a skill's slug to a general-purpose teaching diagram shown alongside
// the tutor's explanation during a learning session (not a diagnostic
// question image — see packages/core/diagnostic/engine.ts for that separate,
// per-question image_url field). These diagrams are deliberately generic
// (no specific numbers baked in) since the same skill is taught at many
// different difficulties/values across sessions — the diagram illustrates
// the concept/formula/labeling, and the tutor's own words carry the
// specific numbers for that turn.
//
// First batch (round 1): the 20 skills judged most to benefit from a visual
// — anything involving a shape, graph, circuit, ray diagram, or a labeled
// biological/chemical process. Not every skill has one yet; skills that are
// purely symbolic/verbal (e.g. solving an equation step by step) don't gain
// much from a static image and are left out for now. More can be added in
// later rounds the same way the question banks were.
//
// File paths are served from apps/web/public/learning-diagrams/ — same
// pattern as apps/web/public/diagnostic-images/ already used for diagnostic
// question images.

export interface LearningDiagram {
  url: string; // relative to the site root, e.g. /learning-diagrams/foo.svg
  caption: string; // short, student-facing description read naturally by the tutor
}

export const LEARNING_DIAGRAMS: Record<string, LearningDiagram> = {
  // Maths
  'apply-pythagoras-theorem': {
    url: '/learning-diagrams/pythagoras-generic.svg',
    caption: 'A right triangle with its two legs and hypotenuse labeled a, b, c',
  },
  'find-trig-ratios': {
    url: '/learning-diagrams/trig-ratios-generic.svg',
    caption: 'A right triangle showing the opposite, adjacent and hypotenuse sides relative to angle theta, with sin/cos/tan defined',
  },
  'calculate-circle-area-circumference': {
    url: '/learning-diagrams/circle-area-generic.svg',
    caption: 'A circle with its radius labeled, and the area and circumference formulas',
  },
  'calculate-sector-area': {
    url: '/learning-diagrams/sector-area-generic.svg',
    caption: 'A circle with a sector (pie-slice) shaded, showing the angle theta and radius used in the sector area formula',
  },
  'find-surface-area-combined-solid': {
    url: '/learning-diagrams/combined-solid-generic.svg',
    caption: 'A cone sitting on top of a cylinder, showing how a combined solid is made of simpler parts',
  },
  'find-volume-combined-solid': {
    url: '/learning-diagrams/combined-solid-generic.svg',
    caption: 'A cone sitting on top of a cylinder, showing how a combined solid is made of simpler parts',
  },
  'zeroes-graph-relation': {
    url: '/learning-diagrams/zeroes-graph-generic.svg',
    caption: 'A parabola crossing the x-axis at two points, showing where the zeroes of a quadratic are',
  },
  'interpret-line-relationships': {
    url: '/learning-diagrams/line-relationships-generic.svg',
    caption: 'Three pairs of lines side by side: intersecting, parallel, and coincident, with how many solutions each gives',
  },
  'apply-tangent-perpendicular-property': {
    url: '/learning-diagrams/tangent-perpendicular-generic.svg',
    caption: 'A circle with a tangent line touching it, showing the radius meeting the tangent at a right angle',
  },
  'find-tangent-length': {
    url: '/learning-diagrams/tangent-length-generic.svg',
    caption: 'A circle, an external point, and the tangent line between them, showing the right triangle used to find tangent length',
  },

  // Science
  'apply-ohms-law': {
    url: '/learning-diagrams/ohms-law-circuit-generic.svg',
    caption: "A simple circuit with a battery and a resistor, illustrating Ohm's law V = IR",
  },
  'calculate-equivalent-resistance': {
    url: '/learning-diagrams/series-parallel-generic.svg',
    caption: 'Two resistors shown wired in series and in parallel, side by side, with their equivalent-resistance formulas',
  },
  'apply-mirror-formula': {
    url: '/learning-diagrams/concave-mirror-generic.svg',
    caption: 'A ray diagram for a concave mirror, showing an object, its centre of curvature and focus, and the real inverted image formed',
  },
  'apply-lens-formula': {
    url: '/learning-diagrams/convex-lens-generic.svg',
    caption: 'A ray diagram for a convex lens, showing an object, the two foci, and the real inverted image formed',
  },
  'apply-right-hand-thumb-rule': {
    url: '/learning-diagrams/right-hand-thumb-rule-generic.svg',
    caption: 'A straight current-carrying wire with circular magnetic field lines around it, showing the right-hand thumb rule',
  },
  'describe-reflex-action-pathway': {
    url: '/learning-diagrams/reflex-arc-labeled.svg',
    caption: 'The five stages of a reflex arc in order: stimulus, sensory neuron, spinal cord, motor neuron, effector',
  },
  'identify-plant-hormone-response': {
    url: '/learning-diagrams/phototropism-generic.svg',
    caption: 'A plant shoot bending towards a light source, illustrating auxin-driven phototropism',
  },
  'predict-displacement-using-reactivity-series': {
    url: '/learning-diagrams/reactivity-series-generic.svg',
    caption: 'The reactivity series of metals listed from most reactive (potassium) to least reactive (gold)',
  },
  'explain-covalent-bonding': {
    url: '/learning-diagrams/covalent-bond-generic.svg',
    caption: 'Two atoms sharing a pair of electrons between them, illustrating a covalent bond',
  },
  'distinguish-reproduction-modes': {
    url: '/learning-diagrams/reproduction-modes-generic.svg',
    caption: 'Asexual reproduction (one parent, identical offspring) shown next to sexual reproduction (two parents, varied offspring)',
  },
};

export function getLearningDiagram(skillSlug: string | undefined | null): LearningDiagram | null {
  if (!skillSlug) return null;
  return LEARNING_DIAGRAMS[skillSlug] ?? null;
}
