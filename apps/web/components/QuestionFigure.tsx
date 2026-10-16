// Renders a question's optional figure (a geometry diagram, a circuit, a
// function graph, a labeled process) above its prompt. Most questions still
// have no figure at all — this renders nothing in that case rather than an
// empty box. The same generic-diagram approach as
// packages/core/learning-diagrams/mapping.ts: the image is shared across
// every question on a skill and stays non-specific (no baked-in numbers),
// so the question's own prompt text carries the actual values for that
// question.
export function QuestionFigure({ url, caption }: { url: string | null | undefined; caption?: string | null }) {
  if (!url) return null;
  return (
    <div className="question-figure">
      <img src={url} alt={caption ?? 'Question figure'} className="question-figure__img" />
      {caption && <p className="question-figure__caption">{caption}</p>}
    </div>
  );
}
