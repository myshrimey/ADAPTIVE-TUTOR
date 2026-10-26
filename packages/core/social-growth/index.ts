export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'linkedin'] as const;
export type SocialPlatform = typeof SOCIAL_PLATFORMS[number];

export const CONTENT_PILLARS = [
  'learning_problem', 'adaptive_learning', 'diagnostic', 'parent_value',
  'student_engagement', 'voice_visual', 'handwritten', 'tutor_centre',
  'learning_science', 'founder_build', 'cbse_2027', 'product_demo',
] as const;

const HASHTAGS: Record<string, string[]> = {
  learning_problem: ['#Sahayak', '#CBSE', '#LearningGaps', '#Education', '#Class10'],
  adaptive_learning: ['#Sahayak', '#AdaptiveLearning', '#PersonalizedLearning', '#EdTech', '#CBSE'],
  diagnostic: ['#Sahayak', '#StudentAssessment', '#LearningGaps', '#CBSE2027', '#EdTechIndia'],
  parent_value: ['#Sahayak', '#CBSEParents', '#Parenting', '#LearningSupport', '#Education'],
  student_engagement: ['#Sahayak', '#StudentEngagement', '#StudySmart', '#LearningJourney', '#CBSE'],
  voice_visual: ['#Sahayak', '#AITutor', '#VoiceAI', '#EdTech', '#FutureOfLearning'],
  handwritten: ['#Sahayak', '#CBSE', '#MockExam', '#AnswerWriting', '#EdTechIndia'],
  tutor_centre: ['#Sahayak', '#Tutors', '#CoachingCentre', '#Teaching', '#EdTechIndia'],
  learning_science: ['#Sahayak', '#RetrievalPractice', '#LearningScience', '#StudySkills', '#Education'],
  founder_build: ['#Sahayak', '#BuildInPublic', '#EdTech', '#AI', '#EducationTechnology'],
  cbse_2027: ['#Sahayak', '#CBSE2027', '#CBSE', '#BoardExams', '#Class10'],
  product_demo: ['#Sahayak', '#AITutor', '#CBSE', '#LearningTechnology', '#EdTechIndia'],
};

const HOOKS: Record<SocialPlatform, string> = {
  facebook: 'Is your child studying the syllabus but still struggling with the basics behind it?',
  instagram: 'What if learning started from the student’s actual baseline—not just their class?',
  linkedin: 'The next generation of EdTech should identify learning gaps, not simply deliver more content.',
};

export function makeSocialPost(input: {
  platform: SocialPlatform; topic: string; pillar?: string; audience?: string;
  objective?: string; cta?: string; destinationUrl?: string;
}) {
  const topic = input.topic.trim() || 'Start by understanding what the learner already knows';
  const pillar = input.pillar ?? 'product_demo';
  const audience = input.audience ?? 'parents';
  const cta = input.cta?.trim() || 'Explore Sahayak and learn how an evidence-led learning journey can begin.';
  const audienceLine = audience === 'students'
    ? 'For students preparing for their next academic milestone.'
    : audience === 'tutors'
      ? 'For tutors who want a clearer picture of what each learner needs next.'
      : audience === 'coaching_centres'
        ? 'For coaching centres supporting learners with different starting points.'
        : audience === 'partners'
          ? 'We are building and validating a more personalised learning journey for Indian students.'
          : 'For parents who want a clearer picture of their child’s learning journey.';
  const body = platformBody(input.platform, topic, audienceLine, cta);
  const hashtags = HASHTAGS[pillar] ?? HASHTAGS.product_demo;
  return {
    platform: input.platform,
    content_type: 'post',
    pillar,
    audience,
    objective: input.objective ?? 'awareness',
    topic,
    hook: HOOKS[input.platform],
    body,
    cta,
    hashtags,
    image_prompt: makeImagePrompt(input.platform, topic),
    destination_url: input.destinationUrl || 'https://cbse-tutor.vercel.app/',
    utm_source: input.platform,
    utm_campaign: 'sahayak_social_growth',
  };
}

function platformBody(platform: SocialPlatform, topic: string, audienceLine: string, cta: string) {
  if (platform === 'linkedin') {
    return `${HOOKS.linkedin}\n\n${audienceLine}\n\nSahayak is being built around a practical principle: understand the learner’s starting point, then decide what to practise next.\n\nToday’s focus: ${topic}.\n\nWe are validating the product with real learners and families. The aim is useful learning evidence—not promises of guaranteed marks.\n\n${cta}`;
  }
  if (platform === 'instagram') {
    return `${HOOKS.instagram}\n\n${topic}\n\nSmall steps. Clearer gaps. A learning path that responds to the learner.\n\n${cta}`;
  }
  return `${HOOKS.facebook}\n\n${audienceLine}\n\n${topic}\n\nSahayak aims to help families understand a learner’s starting point and what to work on next. Every student is different; progress takes practice and support.\n\n${cta}`;
}

function makeImagePrompt(platform: SocialPlatform, topic: string) {
  const format = platform === 'instagram' ? '4:5 portrait social post' : '1:1 square social post';
  return `Create a ${format} for Sahayak, an Indian CBSE learning-support product. Topic: ${topic}. Show an authentic Indian parent and school-age learner studying together in a calm, encouraging home environment. Clean modern educational design, accessible contrast, space for a short headline, no fake marks or guaranteed-result claims, no logos other than a simple Sahayak wordmark, no tiny text.`;
}

export function makeMonthTopics() {
  return [
    'Why knowing the starting point matters more than rushing through chapters',
    'Three signs a learner may need prerequisite practice before a new topic',
    'How short retrieval-practice sessions can support long-term learning',
    'A parent-friendly way to discuss learning gaps without blame',
    'What an adaptive learning path means in everyday language',
    'Why mistakes can help identify the next useful practice step',
    'A simple weekly learning review families can try at home',
    'How tutors can adapt practice for students at different levels',
    'What students can learn from reviewing an incorrect answer',
    'How to make revision more active than rereading notes',
    'The difference between finishing a chapter and understanding it',
    'Why a baseline check should guide the next learning step',
    'A practical approach to planning CBSE Class 10 preparation',
    'How to build a study routine that leaves room for rest',
    'What parents should ask when reviewing learning progress',
    'How examples and diagrams can make abstract ideas clearer',
    'Why one-size-fits-all practice can miss individual needs',
    'How to use a mock test as feedback, not a judgement',
    'A tutor’s checklist for finding prerequisite gaps',
    'How students can turn feedback into a small next action',
    'What thoughtful AI support should—and should not—promise',
    'How a learning plan can respond when a student gets stuck',
    'A simple way to review progress across a week',
    'Why confidence grows through practice and clear feedback',
    'How coaching centres can spot recurring learning bottlenecks',
    'What parents should know about responsible AI tutoring',
    'How to prepare for a board exam without panic messaging',
    'A behind-the-scenes look at building Sahayak carefully',
    'How to ask for useful feedback from early users',
    'Our principle: understand first, teach next, measure progress',
  ];
}