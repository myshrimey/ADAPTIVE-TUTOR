import { studentPage } from '@/lib/student-page';
import { getServerLang } from '@/lib/language';
import { loadReviewPlan, loadSettings } from '@adaptive-tutor/core';
import { ReviewSession } from '@/components/ReviewSession';

export const dynamic = 'force-dynamic';

// Student page: a short mixed review of the skills that are due today, planned from the student's own earlier answers.
// Never shows a mark, a rank or a label. A skill you miss comes back sooner; one you keep right waits longer.
export default async function ReviewPage() {
  const { studentId, service } = await studentPage();
  const lang = await getServerLang(); const hi = lang === 'hi';
  const s = await loadSettings(service);
  const plan = await loadReviewPlan(service, studentId, s.boards.board1_date ?? null);
  const T = (en: string, h: string) => (hi ? h : en);
  return (
    <main className="page"><div className="shell shell--narrow">
      <div className="hero-banner fade-slide-in" style={{ marginTop: 'var(--space-4)' }}>
        <p className="hero__eyebrow">{T('Revise today', 'आज की पुनरावृत्ति')}</p>
        <h1 style={{ fontSize: 'var(--step-3)' }}>{plan.mode === 'pre_exam' ? T('Exam revision', 'परीक्षा की पुनरावृत्ति') : T('Short mixed review', 'छोटी मिली-जुली पुनरावृत्ति')}</h1>
        <p className="hero__lede" style={{ marginBottom: 0 }}>{plan.daily.length === 0 ? (plan.dueTotal === 0 && plan.weekly.count === 0 ? T('Nothing to revise yet. Revision starts after you practise a skill.', 'अभी पुनरावृत्ति के लिए कुछ नहीं। किसी कौशल का अभ्यास करने के बाद यह शुरू होगी।') : T('Nothing is due today. Well done.', 'आज कुछ बाकी नहीं। शाबाश।')) : plan.note}</p>
      </div>
      {plan.error && <p className="alert">{plan.error}</p>}
      <div className="stat-tile-row" style={{ marginTop: 'var(--space-3)' }}>
        <div className="stat-tile"><span className="stat-tile__value">{plan.dueTotal}</span><span className="stat-tile__label">{T('skills due today', 'आज के कौशल')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{plan.weekly.count}</span><span className="stat-tile__label">{T('due in the next 7 days', 'अगले 7 दिनों में')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{plan.cumulative}</span><span className="stat-tile__label">{T('long-gap skills (14+ days)', 'लंबे अंतराल वाले (14+ दिन)')}</span></div>
      </div>
      <div style={{ marginTop: 'var(--space-3)' }}><ReviewSession plan={plan} hi={hi} /></div>
      {plan.extra.length >= 3 && (
        <section style={{ marginTop: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{T('Optional: mixed practice', 'वैकल्पिक: मिली-जुली प्रैक्टिस')}</h2>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{T('Skills you already handle well, mixed from different topics. Switching between topics is harder, and that is what makes memory stronger. It does not change your review dates unless you miss a question.', 'जो कौशल आप अच्छी तरह कर लेते हैं, अलग-अलग विषयों से मिलाकर। विषय बदलना कठिन है और इसी से याद पक्की होती है। कोई प्रश्न छूटे तो ही आपकी पुनरावृत्ति की तिथियाँ बदलेंगी।')}</p>
          <ReviewSession plan={plan} hi={hi} mixed />
        </section>
      )}
      {plan.dueTotal > plan.daily.length && <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{T(`${plan.dueTotal - plan.daily.length} more are waiting; they are not lost. Come back tomorrow or revise again.`, `${plan.dueTotal - plan.daily.length} और प्रतीक्षा में हैं; वे खोए नहीं हैं।`)}</p>}
    </div></main>
  );
}
