// Lists used by the Founder Command Centre. Admin-only screens; nothing here touches student data.

export const CRM_KINDS: Record<string, string> = {
  parent: 'Parent', student: 'Student', tutor: 'Tutor', centre: 'Coaching centre', school: 'Private school', govt_school: 'Government school / KV / JNV',
  govt_institution: 'Government institution / department', partner: 'Strategic partner', other: 'Other',
};
export const INSTITUTION_KINDS = ['school', 'govt_school', 'govt_institution'];

export const CRM_STAGES: [string, string][] = [
  ['new_lead', 'New lead'], ['contacted', 'Contacted'], ['interested', 'Interested'], ['demo', 'Demo'], ['trial_pilot', 'Trial / pilot'],
  ['negotiation', 'Negotiation'], ['payment_pending', 'Payment pending'], ['paid', 'Paid'], ['active', 'Active'], ['renewal_upsell', 'Renewal / upsell'], ['referral', 'Referral'],
];
export const CRM_STATUS = ['open', 'won', 'lost', 'paused'];

export const SOURCES = ['whatsapp', 'family_friend', 'linkedin', 'facebook', 'instagram', 'youtube', 'google', 'school', 'tutor', 'coaching_centre', 'referral', 'direct', 'other'] as const;
export function normaliseSource(raw: string | null | undefined): string {
  const s = String(raw ?? '').toLowerCase().trim().replace(/[^a-z_ ]/g, '').replace(/\s+/g, '_');
  if (!s) return 'direct';
  const alias: Record<string, string> = { wa: 'whatsapp', whats_app: 'whatsapp', fb: 'facebook', ig: 'instagram', yt: 'youtube', li: 'linkedin', friend: 'family_friend', family: 'family_friend', ref: 'referral', coaching: 'coaching_centre', centre: 'coaching_centre' };
  const k = alias[s] ?? s;
  return (SOURCES as readonly string[]).includes(k) ? k : 'other';
}

export const FUNDING_KINDS: Record<string, string> = { investor: 'Investor', government: 'Government scheme', incubator: 'Incubator', accelerator: 'Accelerator', csr: 'CSR / impact', debt: 'Debt / startup loan', other: 'Other' };
export const FUNDING_SUBTYPES: Record<string, string[]> = {
  investor: ['HNI', 'Angel investor', 'Angel network', 'Family office', 'Venture capital', 'Seed fund', 'EdTech-focused VC', 'AI-focused VC', 'Consumer-tech VC', 'Impact investor', 'Education-focused fund', 'Corporate venture capital', 'Strategic investor', 'Coaching-centre investor', 'School / education entrepreneur', 'Other'],
  government: ['Startup India', 'DPIIT', 'MeitY', 'TIDE', 'NIDHI', 'DST', 'BIRAC', 'State startup mission', 'State innovation fund', 'State IT / AI programme', 'Education innovation programme', 'Other'],
  incubator: ['Incubator', 'University incubator', 'Other'], accelerator: ['Accelerator', 'Other'], csr: ['CSR programme', 'Foundation', 'NGO partner', 'Other'], debt: ['Startup loan', 'Other'], other: ['Other'],
};
export const FUNDING_STAGES: [string, string][] = [
  ['researching', 'Researching'], ['shortlisted', 'Shortlisted'], ['warm_intro_needed', 'Warm intro needed'], ['introduction_requested', 'Introduction requested'],
  ['contacted', 'Contacted'], ['initial_conversation', 'Initial conversation'], ['deck_sent', 'Deck sent'], ['due_diligence', 'Due diligence'], ['term_discussion', 'Term discussion'],
  ['committed', 'Committed'], ['funds_received', 'Funds received'], ['passed', 'Passed'], ['future_follow_up', 'Future follow-up'],
];
export const ELIGIBILITY_STATUSES: [string, string][] = [
  ['potential_fit', 'Potential fit'], ['needs_verification', 'Needs verification'], ['not_eligible', 'Not eligible'], ['applied', 'Applied'], ['shortlisted', 'Shortlisted'], ['rejected', 'Rejected'], ['funded', 'Funded'],
];
export const CONFIDENCE = ['unknown', 'low', 'medium', 'high'];

export const FIT_CRITERIA: [string, string][] = [
  ['education', 'Education relevance'], ['ai', 'AI relevance'], ['edtech', 'EdTech relevance'], ['stage', 'Stage compatibility'], ['cheque', 'Cheque-size compatibility'],
  ['india', 'India relevance'], ['strategic', 'Strategic value'], ['warm_intro', 'Warm introduction'], ['portfolio', 'Portfolio fit'], ['founder', 'Founder fit'],
];

export const EXPENSE_CATEGORIES: Record<string, string> = {
  ai_api: 'AI / API', infrastructure: 'Infrastructure (Supabase, Vercel, other)', teacher: 'Teacher', evaluator: 'Evaluator', content: 'Content creator', reviewer: 'Reviewer',
  marketing: 'Marketing / advertising', referral: 'Referral incentives', legal_accounting: 'Legal / accounting', other: 'Other',
};

export const UNKNOWN_TEXT = 'UNKNOWN — VERIFY';
export const LEGAL_NOTE = 'LEGAL / CA / CS ADVICE REQUIRED before any investment agreement, term sheet, SAFE, convertible or equity discussion. Sahayak does not give legal advice.';
