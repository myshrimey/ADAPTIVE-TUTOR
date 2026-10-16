-- Adds optional figure/image support to question banks so a question that
-- genuinely needs a diagram, graph, or data table (a geometry figure, a
-- circuit, a function graph, a labeled diagram) can show one instead of
-- relying on students to picture it from the prompt text alone. Nullable on
-- both tables — most questions still have none, and that's fine; the
-- frontend only renders a figure when one is present.
--
-- Deliberately reuses the same generic-diagram approach already used for
-- apps/web/public/learning-diagrams (see packages/core/learning-diagrams/
-- mapping.ts): the image illustrates the setup/shape/circuit generically,
-- and the question's own prompt text carries the specific numbers — so one
-- figure can be shared across every question on that skill rather than
-- needing a bespoke image drawn per question.

alter table diagnostic_questions
  add column if not exists figure_url text,
  add column if not exists figure_caption text;

alter table questions
  add column if not exists figure_url text,
  add column if not exists figure_caption text;
