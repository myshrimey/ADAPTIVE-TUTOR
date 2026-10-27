import { AUDIENCES, DEFAULT_PILLARS, type Draft, type DraftInput, type Format, type ImageSpec } from './constants';
// Deterministic (no AI, no cost) drafts. Every sentence about Sahayak is something the product really does today.
// Nothing here contains a number, a result, a testimonial or a partner. Same input + same seed = same draft.
export const TEMPLATE_VERSION = 'tpl-v1';
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const pick = <T,>(a: readonly T[], seed: number, salt = ''): T => a[hash(`${seed}|${salt}`) % a.length];

interface Bank { topics: string[]; points: string[] }
const BANK: Record<string, Bank> = {
  'Learning Gaps': { topics: ['Why one missed basic idea quietly lowers later chapters', 'Finding the exact gap, not just the weak chapter'], points: ['Most trouble in a chapter starts with a skill from an earlier class.', 'A low score tells you something is wrong; it does not tell you what.'] },
  'Adaptive Learning': { topics: ['Practice that changes with the answers', 'Why the next question should depend on the last answer'], points: ['Sahayak chooses the next question from what the learner just showed, not from a fixed list.', 'Questions that are too easy waste time; questions that are too hard shut students down.'] },
  'Exam Preparation': { topics: ['A calmer way to plan the weeks before boards', 'Revise what is fading, not only what is new'], points: ['Sahayak brings back topics at spaced intervals so they are not forgotten before the exam.', 'Short daily practice beats one long night before.'] },
  'CBSE': { topics: ['What Class 10 CBSE practice should really cover', 'Understanding the CBSE paper pattern before practising'], points: ['Sahayak starts with CBSE Class 10 and is built around the board syllabus.', 'Knowing the question types helps a student practise the right way.'] },
  'Parent Education': { topics: ['How parents can help without sitting with the book', 'The one question to ask your child about studies today'], points: ['Parents can see progress and practice in Sahayak without having to teach the subject.', 'Asking "what was hard today?" gives more than asking "how many marks?".'] },
  'Student Motivation': { topics: ['Small wins that keep study going', 'Why streaks of practice matter more than long sessions'], points: ['Progress that can be seen is easier to keep up than a distant exam.', 'Ten focused minutes a day add up.'] },
  'Tutor Support': { topics: ['Knowing which student needs you today', 'Less time on checking, more on teaching'], points: ['Tutors linked to students can see who needs attention and what kind of mistakes keep repeating.', 'Sahayak supports tutors; it does not replace them.'] },
  'Coaching Centre Growth': { topics: ['Seeing every batch at a glance', 'Spotting the quiet student before the test result does'], points: ['Centres can group students into batches and note what help was tried and whether it worked.', 'Evidence of progress helps parents trust a centre.'] },
  'Teacher Support': { topics: ['Practice that gives teachers evidence, not guesswork', 'Where a whole class is stuck'], points: ['Practice results show which ideas a student is shaky on.', 'Teachers keep the final say; Sahayak gives them information.'] },
  'AI in Education': { topics: ['What AI should and should not do in study', 'AI that asks before it tells'], points: ['Sahayak\'s AI tutor guides with hints and questions rather than only giving answers.', 'AI-written content in Sahayak is checked by people before it is trusted.'] },
  'Learning Science': { topics: ['Retrieval beats re-reading', 'Spacing: why revisiting a topic later works'], points: ['Trying to recall an answer strengthens memory more than reading it again.', 'Revisiting a topic after a few days helps it last.'] },
  'Sahayak Product': { topics: ['What the Sahayak baseline check does', 'How Sahayak decides what to practise next'], points: ['The baseline check finds where a learner actually starts before anything else.', 'Parents, tutors and centres each see a view meant for them.'] },
  'Student Engagement': { topics: ['Daily challenges that take five minutes', 'Practice that feels like progress'], points: ['Sahayak offers short daily practice so studying stays a habit.', 'Seeing improvement in one skill is a real reason to come back tomorrow.'] },
  'Founder Journey': { topics: ['Why I am building Sahayak', 'What I learned talking to students and parents'], points: ['Sahayak is being built step by step with real feedback from families.', 'Starting with one board and one class lets us do it properly.'] },
  'Social Proof': { topics: ['What families tell us (only real, permitted words)'], points: ['Share only feedback that a real person agreed to share.'] },
  'Frequently Asked Questions': { topics: ['"Is it only for weak students?"', '"Will it replace my tutor?"'], points: ['No. It is for any learner who wants to know where they stand and what to do next.', 'No. Sahayak is designed to support tutors and teachers.'] },
  'Exam Countdown': { topics: ['What to do with the weeks that are left', 'A short daily plan before the exam'], points: ['Start with a baseline, fix the biggest gaps first, then revise on a schedule.', 'Boards dates should be taken from the official CBSE announcement.'] },
  'Study Skills': { topics: ['How to read a question before answering', 'Checking your work in the last two minutes'], points: ['Many lost marks come from misreading the question or skipping a step.', 'A fixed checking routine catches small slips.'] },
  'Multilingual Education': { topics: ['Learning in the language you think in', 'Explanations in English and Hindi'], points: ['Sahayak supports English and Hindi so a concept is not lost in language.', 'Understanding comes first; language should not be the barrier.'] },
  'Education Accessibility': { topics: ['Good practice should not depend on where you live', 'Free Core: starting without a bill'], points: ['Sahayak\'s Free Core is currently available at no charge. Usage limits may apply.', 'A phone and an internet connection are enough to start.'] },
};
const HOOKS: Record<string, string[]> = {
  parent: ['Does your child say "I studied" but the marks say otherwise?', 'A question for parents of Class 10 students:', 'Before you buy another guide book, read this.', 'What if you could see exactly where your child is stuck?'],
  student: ['Studying a lot but still stuck on the same questions?', 'One small habit that fixes silly mistakes.', 'Stop revising what you already know.', 'Try this before your next practice test.'],
  tutor: ['Tutors: which of your students needs you most this week?', 'You teach well. Can you see who is quietly falling behind?'],
  centre: ['Running a coaching centre? Here is what parents ask first.', 'How do you show parents progress, not just test marks?'],
  school: ['What does a class really understand after a chapter test?'],
  founder_investor: ['Building in education taught me this.', 'An honest update from the Sahayak journey.'],
  default: ['Here is something worth knowing about learning.', 'Where does a learner really start?', 'Understand the starting point before deciding what comes next.'],
};
const CTAS: Record<string, string[]> = {
  awareness: ['Follow Sahayak to learn more.', 'Share this with a parent who needs it.'],
  education: ['Save this for your next study session.', 'Share it with a friend preparing for boards.'],
  engagement: ['Tell us in the comments: which topic feels hardest?', 'Reply with your answer.'],
  lead: ['Message us to ask how Sahayak can help.', 'Ask us a question; we will reply.'],
  trial: ['Take the baseline check and see where you start.', 'Try Sahayak. Sahayak\'s Free Core is currently available at no charge. Usage limits may apply.'],
  paid: ['See the plans on our website. Terms & Conditions Apply.'],
  referral: ['Know a family preparing for boards? Share Sahayak with them.'],
  default: ['Visit Sahayak to take the baseline check.', 'Learn more on our website.'],
};
const objKey = (o: string) => (o === 'trial' || o === 'baseline_edu' ? (o === 'trial' ? 'trial' : 'trial') : o === 'lead' || o === 'centre_growth' || o === 'tutor_edu' ? 'lead' : o === 'parent_edu' || o === 'exam_prep' || o === 'learning_science' || o === 'ai_edu' ? 'education' : o);
export const ctaFor = (objective: string, seed = 0) => pick(CTAS[objKey(objective)] ?? CTAS.default, seed, 'cta');

function audienceGroup(a: string) {
  if (['parent', 'cbse_parent', 'nri'].includes(a)) return 'parent';
  if (['student', 'cbse_student', 'board_learner', 'competitive'].includes(a)) return 'student';
  if (['tutor', 'teacher'].includes(a)) return 'tutor';
  if (['centre'].includes(a)) return 'centre';
  if (['school', 'gov_school'].includes(a)) return 'school';
  if (a === 'founder_investor') return 'founder_investor';
  return 'default';
}
const SCOPE_TAG: Record<string, string> = { india: 'in India', cbse: 'for CBSE', exam: 'for the exam', international: 'for families abroad', general: '' };

export function imageSpecFor(i: DraftInput, topic: string, headline: string, cta: string): ImageSpec {
  const ratio = i.platform === 'instagram' ? (i.contentType === 'reel' ? '9:16' : i.contentType === 'carousel' ? '4:5 (each slide)' : '4:5') : i.platform === 'linkedin' ? '1.91:1' : '1.91:1 or 1:1';
  const visual = 'Clean, calm, student-friendly layout. Plenty of white space, one bold headline, warm accent colour, Sahayak name small in a corner. No photos of real children. No fake charts or numbers.';
  const support = `For ${AUDIENCES[i.audience] ?? 'learners'} - ${i.pillar}`;
  return {
    concept: `A simple visual that shows the idea: ${topic}.`, visual, headline: headline.replace(/[.:]$/, '').slice(0, 70), support, cta, ratio,
    prompt: `Flat, minimal illustration for a social media post about "${topic}". Style: friendly, modern, soft colours, large readable headline "${headline.replace(/[.:]$/, '').slice(0, 70)}", plenty of empty space, no real people's faces, no logos other than a small "Sahayak" wordmark, no charts or statistics. Aspect ratio ${ratio}.`,
  };
}

export function makeDraft(i: DraftInput): Draft {
  const seed = i.seed ?? 0;
  const pillar = DEFAULT_PILLARS.includes(i.pillar) || BANK[i.pillar] ? i.pillar : 'Learning Gaps';
  const bank = BANK[pillar] ?? BANK['Learning Gaps'];
  const topic = (i.topic && i.topic.trim()) || pick(bank.topics, seed, 'topic');
  const group = audienceGroup(i.audience);
  const hook = pick(HOOKS[group] ?? HOOKS.default, seed, 'hook');
  const p1 = pick(bank.points, seed, 'p1'); const p2 = bank.points.find((p) => p !== p1) ?? p1;
  const cta = (i.cta && i.cta.trim()) || ctaFor(i.objective, seed);
  const scope = SCOPE_TAG[i.scope] ? ` ${SCOPE_TAG[i.scope]}` : '';
  const start = 'Sahayak first finds where a learner actually starts, then decides what to practise next.';
  let body: string;
  const t = i.contentType;
  const p = i.platform as Format;
  if (t === 'poll' || t === 'question') {
    body = `${hook}\n\n${topic}${scope}.\n\n${t === 'poll' ? 'Vote below: A) Yes, often  B) Sometimes  C) Not really' : 'What has been your experience? Tell us in the comments.'}\n\n${p1}`;
  } else if (t === 'myth') {
    body = `Myth: more hours of study always means better results.\nFact: ${p1}\n\n${start}`;
  } else if (t === 'faq') {
    body = `${topic}\n\n${p1} ${p2}`;
  } else if (t === 'countdown') {
    body = `${hook}\n\n${p1}\n${p2}\n\n${start}`;
  } else if (t === 'daily_challenge') {
    body = `Today's five-minute challenge: pick one topic you find hard and write down the first step you would take.\n\n${p1}`;
  } else if (t === 'testimonial') {
    body = `[Paste a REAL message from a family who agreed to share it, in their own words.]\n\nWe are grateful for honest feedback as we build Sahayak. ${p1}`;
  } else if (t === 'founder_story') {
    body = `${topic}.\n\nI am building Sahayak because a mark alone does not tell a student what to do next. ${p1}\n\nWe are doing it one step at a time, starting with CBSE Class 10.`;
  } else {
    body = `${hook}\n\n${topic}${scope}.\n\n${p1} ${p2}\n\n${start}`;
  }
  let slides = '';
  if (t === 'carousel') slides = `\n\nCarousel plan (one idea per slide):\n1. Hook: ${hook}\n2. The problem: ${p1}\n3. What changes when you know the starting point\n4. ${p2}\n5. ${cta}`;
  if (t === 'reel') slides = `\n\nReel script (about 20-30 seconds):\n0-3s: On screen "${hook}"\n3-15s: Say it simply: ${p1}\n15-25s: ${start}\nEnd card: ${cta}`;
  let text = body + slides;
  if (p === 'instagram') text = text.replace(/\n\n/g, '\n\n').replace(/^(.+)$/m, (m) => m) + (t === 'carousel' || t === 'reel' ? '' : '\n\nSave this for later.');
  if (p === 'linkedin') {
    const angle = group === 'founder_investor' ? '\n\nWhat I am taking from this: build slowly, measure honestly, and say clearly what is not ready yet.' : '\n\nThe takeaway: understand the starting point, then choose the next step.';
    text = text + angle;
  }
  if (p === 'facebook') text = text + '\n\nWhat do you think?';
  if (p === 'whatsapp') text = `${hook}\n${p1}\n${cta}`;
  if (p === 'email') text = `Subject: ${topic}\n\nHello,\n\n${p1} ${p2}\n\n${start}\n\n${cta}\n\nSahayak`;
  if (p === 'blog') text = `Title: ${topic}\n\nOutline:\n1. The problem: ${p1}\n2. Why it happens\n3. ${p2}\n4. How Sahayak approaches it: ${start}\n5. What to do this week\n6. ${cta}`;
  const image = imageSpecFor(i, topic, hook, cta);
  return { hook, body: text.trim(), cta, hashtags: [], image, topic };
}
