// The single list of admin pages, grouped the way a founder thinks about them.
// Add a page here once and it appears in the top menu, the search box and the "everything in one place" map.
export interface AdminItem { href: string; label: string; note: string; keywords?: string }
export interface AdminGroup { id: string; label: string; blurb: string; items: AdminItem[] }

export const ADMIN_MENU: AdminGroup[] = [
  {
    id: 'overview', label: 'Overview', blurb: 'How the business is doing today',
    items: [
      { href: '/admin/command-centre', label: 'Founder Command Centre', note: 'Health, alerts, what to do next' },
      { href: '/admin/overview', label: 'Product dashboard', note: 'Detailed product numbers' },
      { href: '/admin/traffic', label: 'Website traffic', note: 'Visitors, pages, sources', keywords: 'analytics visitors google views' },
      { href: '/admin/funnel', label: 'Funnel', note: 'Visitor to paid, step by step', keywords: 'conversion' },
      { href: '/admin/metrics', label: 'Metrics and exports', note: 'Activity, retention, CSV downloads' },
    ],
  },
  {
    id: 'learning', label: 'Students & Learning', blurb: 'Who is learning and how the engines behave',
    items: [
      { href: '/admin/students', label: 'Students and plans', note: 'Create students, give or remove access' },
      { href: '/admin/diagnostic-engine', label: 'Adaptive diagnostic engine', note: 'Baseline, stopping rules, learning path' },
      { href: '/admin/challenge-tier', label: 'Challenge zone', note: 'Olympiad-style questions and badges', keywords: 'stretch olympiad' },
      { href: '/admin/engagement', label: 'Student engagement', note: 'Streaks, missions, badges in use' },
      { href: '/admin/engagement-settings', label: 'Engagement settings', note: 'XP, streak and badge rules' },
      { href: '/admin/engagement/ab', label: 'Experiments', note: 'Controlled tests of engagement features', keywords: 'ab test' },
      { href: '/admin/handwriting', label: 'Handwriting marking', note: 'Handwritten answers waiting for a teacher' },
    ],
  },
  {
    id: 'content', label: 'Content & Questions', blurb: 'Question quality, review and translation',
    items: [
      { href: '/admin/question-register', label: 'Question register', note: 'Who wrote, uploaded and reviewed each question' },
      { href: '/admin/question-bank', label: 'Question bank growth', note: 'Counts per subject, Fill to 1,000' },
      { href: '/admin/reviews', label: 'Question reviews', note: 'Teacher feedback to apply' },
      { href: '/admin/questions', label: 'Question statistics', note: 'Which questions are too hard or too easy' },
      { href: '/admin/quality', label: 'Quality gates', note: 'Sign-offs before a subject goes live' },
      { href: '/admin/translations', label: 'Hindi questions', note: 'Translations in progress' },
      { href: '/admin/translations/review', label: 'Check Hindi translations', note: 'Review queue' },
      { href: '/admin/subject-requests', label: 'Subject requests', note: 'What families are asking for' },
      { href: '/admin/teachers', label: 'Teachers', note: 'Approve and see teacher work' },
    ],
  },
  {
    id: 'ai', label: 'AI', blurb: 'Which model was used, why, and what it cost',
    items: [
      { href: '/admin/ai-infrastructure', label: 'AI Infrastructure', note: 'Providers, routing, fallbacks' },
      { href: '/admin/ai-economics', label: 'AI Economics', note: 'Cost per feature and per student' },
      { href: '/admin/ai-requests', label: 'AI requests', note: 'Every AI call, with its reason' },
      { href: '/admin/ai-costs', label: 'AI cost log', note: 'Older cost list' },
    ],
  },
  {
    id: 'money', label: 'Money', blurb: 'Prices, payments, costs and planning',
    items: [
      { href: '/admin/commercial', label: 'Commercial dashboard', note: 'Revenue, margin, plan mix' },
      { href: '/admin/pricing', label: 'Pricing and offers', note: 'Plans, prices, offers' },
      { href: '/admin/payments', label: 'Payments', note: 'Confirm or reject payments' },
      { href: '/admin/expenses', label: 'Money in / out', note: 'Record income and costs' },
      { href: '/admin/financial-simulator', label: 'Financial simulator', note: 'What-if planning scenarios' },
      { href: '/admin/funding', label: 'Funding & investors', note: 'Investor records' },
      { href: '/admin/funding/documents', label: 'Funding documents', note: 'Papers for investors' },
      { href: '/admin/investor-metrics', label: 'Investor metrics', note: 'ACTUAL / ESTIMATED figures' },
    ],
  },
  {
    id: 'growth', label: 'Customers & Growth', blurb: 'Families, schools, partners, referrals',
    items: [
      { href: '/admin/crm', label: 'Customers & leads', note: 'Conversations and follow-ups', keywords: 'crm' },
      { href: '/admin/crm?group=institutions', label: 'Schools', note: 'Schools and institutions' },
      { href: '/admin/partners', label: 'Parents, tutors, centres', note: 'Partner accounts' },
      { href: '/admin/interest', label: 'Applications and requests', note: 'People who asked to join' },
      { href: '/admin/social-growth', label: 'Social Media Growth Engine', note: 'Daily posts, calendar, campaigns, results', keywords: 'social facebook instagram linkedin content marketing posts hashtags campaign utm' },
      { href: '/admin/referral-rewards', label: 'Referral links and rewards', note: 'Bonus days for referrals' },
      { href: '/admin/engagement/referrals', label: 'Referrals (old)', note: 'Earlier referral list' },
    ],
  },
  {
    id: 'feedback', label: 'Feedback', blurb: 'What users tell us, grouped and waiting for your decision',
    items: [
      { href: '/admin/feedback-intelligence', label: 'Feedback Intelligence', note: 'Grouped issues; approve, reject, defer', keywords: 'bugs clusters review' },
      { href: '/admin/feedback', label: 'All feedback messages', note: 'Raw list, newest first' },
    ],
  },
  {
    id: 'settings', label: 'Settings & Safety', blurb: 'Rules, privacy, history',
    items: [
      { href: '/admin/configuration', label: 'Boards, exams, country prices', note: 'Exam dates, curriculum versions' },
      { href: '/admin/devices', label: 'Devices', note: 'Two devices per account' },
      { href: '/admin/data-requests', label: 'Data requests', note: 'Export or delete a family’s data', keywords: 'privacy' },
      { href: '/admin/audit-log', label: 'Audit log', note: 'Who changed what' },
      { href: '/admin/changelog', label: 'Change log', note: 'What each version changed' },
      { href: '/admin/memory', label: 'Project memory', note: 'Notes for future work' },
      { href: '/admin/tasks', label: 'Founder tasks', note: 'Your to-do list' },
      { href: '/admin/roadmap', label: 'What is built / not built', note: 'Honest status of the big prompt', keywords: 'roadmap master prompt' },
    ],
  },
];

const stripQuery = (h: string) => h.split('?')[0];

// Which group and item is the current page? Longest matching path wins, so /admin/engagement/ab beats /admin/engagement.
export function locate(pathname: string): { group?: AdminGroup; item?: AdminItem } {
  let best: { group: AdminGroup; item: AdminItem; len: number } | undefined;
  for (const group of ADMIN_MENU) for (const item of group.items) {
    const p = stripQuery(item.href);
    if ((pathname === p || pathname.startsWith(p + '/')) && (!best || p.length > best.len)) best = { group, item, len: p.length };
  }
  return best ? { group: best.group, item: best.item } : {};
}

export function searchMenu(q: string): { group: AdminGroup; item: AdminItem }[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const out: { group: AdminGroup; item: AdminItem }[] = [];
  for (const group of ADMIN_MENU) for (const item of group.items) {
    if (`${item.label} ${item.note} ${item.keywords ?? ''} ${group.label}`.toLowerCase().includes(needle)) out.push({ group, item });
  }
  return out;
}
