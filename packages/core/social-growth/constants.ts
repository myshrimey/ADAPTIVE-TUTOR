// Social Media Growth Engine (v72): the fixed lists the founder chooses from. Pure data, no database.
export const PLATFORMS = ['facebook', 'instagram', 'linkedin'] as const;
export type Platform = (typeof PLATFORMS)[number];
/** Formats made only by "Repurpose" (copy-and-send or write elsewhere); they are not social platforms Sahayak publishes to. */
export const EXTRA_FORMATS = ['whatsapp', 'email', 'blog'] as const;
export type Format = Platform | (typeof EXTRA_FORMATS)[number];
export const FORMAT_LABEL: Record<Format, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', whatsapp: 'WhatsApp message', email: 'Email', blog: 'Blog outline' };
/** Channels the architecture is ready for but nothing is built or connected. */
export const FUTURE_CHANNELS = ['YouTube', 'X', 'WhatsApp', 'Telegram', 'Pinterest', 'Threads', 'Google Business Profile'];

export const AUDIENCES: Record<string, string> = {
  student: 'Student', parent: 'Parent', teacher: 'Teacher', tutor: 'Tutor', centre: 'Coaching Centre', school: 'School', gov_school: 'Government School',
  cbse_parent: 'CBSE Parent', cbse_student: 'CBSE Student', board_learner: 'Board-exam learner', competitive: 'Competitive-exam learner',
  nri: 'NRI / International CBSE family', founder_investor: 'Founder / investor', general: 'General education audience',
};
export const OBJECTIVES: Record<string, string> = {
  awareness: 'Awareness', education: 'Education', engagement: 'Engagement', lead: 'Lead generation', trial: 'Trial / signup', paid: 'Paid conversion', referral: 'Referral',
  trust: 'Trust building', founder_story: 'Founder story', demo: 'Product demonstration', social_proof: 'Social proof', problem: 'Problem awareness', exam_prep: 'Exam preparation',
  learning_science: 'Learning science', baseline_edu: 'Diagnostic / baseline education', ai_edu: 'AI education', parent_edu: 'Parent education', tutor_edu: 'Tutor education', centre_growth: 'Coaching-centre growth',
};
export const CONTENT_TYPES: Record<string, string> = {
  text: 'Text post', carousel: 'Carousel concept', reel: 'Short video / Reel concept', question: 'Question', poll: 'Poll', tip: 'Educational tip', myth: 'Myth vs fact', case_study: 'Case study',
  founder_story: 'Founder story', student_problem: 'Student problem', parent_problem: 'Parent problem', tutor_problem: 'Tutor problem', centre_problem: 'Coaching-centre problem', feature: 'Product feature',
  testimonial: 'Testimonial', faq: 'FAQ', countdown: 'Exam countdown', exam_prep: 'Exam preparation', daily_challenge: 'Daily challenge', cta: 'CTA post',
};
export const SCOPES: Record<string, string> = { india: 'India-specific', cbse: 'CBSE-specific', exam: 'Exam-specific', international: 'International', general: 'General education' };
export const LANGUAGES: Record<string, string> = { en: 'English', hi: 'Hindi' };
export const DEFAULT_PILLARS = ['Learning Gaps', 'Adaptive Learning', 'Exam Preparation', 'CBSE', 'Parent Education', 'Student Motivation', 'Tutor Support', 'Coaching Centre Growth', 'Teacher Support', 'AI in Education', 'Learning Science', 'Sahayak Product', 'Student Engagement', 'Founder Journey', 'Social Proof', 'Frequently Asked Questions', 'Exam Countdown', 'Study Skills', 'Multilingual Education', 'Education Accessibility'];
export const CAMPAIGN_IDEAS = ['CBSE 2027', 'Free Core', 'Founding Family', 'Founding Tutor', 'Founding Coaching Centre', 'Baseline Assessment', 'Handwritten Mock Evaluation', 'Student Engagement', 'Parent Awareness', 'Tutor Partnership', 'Coaching Centre Partnership', 'International CBSE', 'Referral Campaign'];

export const STATUSES = ['IDEA', 'DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;
export type SocialStatus = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<SocialStatus | 'SCHEDULED', string> = { IDEA: 'Idea', DRAFT: 'Draft', REVIEW: 'Awaiting approval', APPROVED: 'Approved', PUBLISHED: 'Published', REJECTED: 'Rejected', ARCHIVED: 'Archived', SCHEDULED: 'Scheduled' };

export interface SocialContent {
  id: string; slug: string; campaign_id: string | null; experiment_id: string | null; variant: string | null; parent_id: string | null;
  platform: string; audience: string; objective: string; pillar: string | null; content_type: string; scope: string; topic: string | null;
  hook: string | null; body: string; cta: string | null; hashtags: string[]; image_spec: ImageSpec | null; language: string; status: SocialStatus;
  planned_date: string | null; source: 'template' | 'ai' | 'manual'; ai_meta: AiMeta | null; quality: unknown; archived: boolean;
  created_by: string | null; approved_by: string | null; approved_at: string | null; published_at: string | null; external_url: string | null; created_at: string; updated_at: string;
}
export interface ImageSpec { concept: string; visual: string; headline: string; support: string; cta: string; ratio: string; prompt: string }
export interface AiMeta { provider?: string; model?: string; promptVersion: string; at: string; requestId?: string }
export interface DraftInput {
  platform: Format; audience: string; objective: string; contentType: string; scope: string; pillar: string; topic?: string; language?: string; cta?: string; seed?: number;
}
export interface Draft { hook: string; body: string; cta: string; hashtags: string[]; image: ImageSpec; topic: string }
