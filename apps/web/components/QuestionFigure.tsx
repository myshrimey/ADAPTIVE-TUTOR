// Renders a question's optional figure (a geometry diagram, a circuit, a
// function graph, a labeled process) above its prompt. Questions without a
// figure render nothing. Every figure carries a visible label ("Figure" plus
// its caption) so a diagram is never shown unlabelled, in a diagnostic, quiz,
// mock test or printed paper. The image is shared across a skill and
// non-specific; the question text carries the actual values.
export function QuestionFigure({
  url,
  caption,
  number,
}: {
  url: string | null | undefined;
  caption?: string | null;
  number?: number;
}) {
  if (!url) return null;
  const text = caption && caption.trim() ? caption.trim() : 'Diagram for this question';
  return (
    <figure className="question-figure">
      <img src={url} alt={`Figure${number ? ' ' + number : ''}: ${text}`} className="question-figure__img" />
      <figcaption className="question-figure__caption">
        <strong>Figure{number ? ' ' + number : ''}.</strong> {text}
      </figcaption>
    </figure>
  );
}
