import type { LegalContent } from '@/components/LegalPageLayout';
import { FOUNDER } from '@adaptive-tutor/core';

// Public, plain-English pages (About, Trust, Refund). English only for now.
// Nothing here claims a credential, a result or a rating that has not been confirmed.

export const ABOUT: LegalContent = {
  title: 'About Sahayak',
  lastUpdated: 'Draft for founder approval.',
  intro: 'Sahayak is an adaptive tutor for CBSE Class 10 students preparing for the board exams. It finds exactly where understanding starts to wobble in each subject, teaches from there, and shows parents the evidence.',
  sections: [
    {
      heading: 'What it does',
      body: [
        'A short diagnostic in each subject finds where a student really stands. A tutor then teaches from that point with explanations, worked examples and guided practice, giving hints before solutions.',
        'Every skill is tracked on its own, so progress is visible chapter by chapter. Parents get a report built from what the student actually did: what has improved, what needs attention and what to do next.',
        'Timed practice papers (chapter checks, subject checks, full mocks and a board-style paper) help with speed and exam habit.',
      ],
    },
    {
      heading: 'Who built it',
      body: [`Sahayak is built by ${FOUNDER.name}, ${FOUNDER.title}. During this early-access phase every question is handled directly by the founder (see the Help & Contact page).`],
    },
    {
      heading: 'What it is not',
      body: [
        'Sahayak does not promise marks, a rank or a predicted board score. When there is too little evidence, it says so instead of guessing.',
        'It is an independent learning tool and is not affiliated with or endorsed by CBSE. Always check the official CBSE site for the exact syllabus, datesheet and marking scheme.',
      ],
    },
  ],
};

export const TRUST: LegalContent = {
  title: 'How we keep this trustworthy',
  lastUpdated: 'Draft for founder approval.',
  intro: 'Parents hand us their child’s study time, so here is plainly how Sahayak behaves.',
  sections: [
    {
      heading: 'Honest about what is ready',
      body: [
        'Each subject is labelled Ready or Pilot. A Pilot subject works end to end, but its questions have not yet been fully checked by a subject teacher, and it is marked as Pilot everywhere you see it.',
        'A subject is moved to Ready only after ten written quality checks are signed off, including a teacher’s review of its questions and answer keys.',
      ],
    },
    {
      heading: 'Teachers check the questions',
      body: ['Approved teachers review questions, answer keys and explanations. Their feedback is only advice: nothing changes what students see until the founder applies it.'],
    },
    {
      heading: 'No labels, no predictions',
      body: [
        'Sahayak never calls a child lazy, weak or careless, and never diagnoses. How a child felt before a session can make the session gentler, but it is never mixed into the learning score.',
        'Readiness is described in plain bands (for example Building, Developing, On track) from evidence we hold, and it says “not enough evidence yet” when that is the truth.',
      ],
    },
    {
      heading: 'Your data',
      body: [
        'Access is by invitation, and each family sees only its own child’s data. The parent link is read-only.',
        'We never ask for a UPI PIN or a banking password. Payments are checked by hand by the founder, and a payment can never be confirmed by the student or parent.',
        'Usage logs for the AI tutor keep counts and timing only, not what your child typed or what the tutor answered.',
      ],
    },
    {
      heading: 'When something is wrong',
      body: ['If a question or an answer key looks wrong, tell us from the Help & Contact page. A wrong question can be taken out of use straight away.'],
    },
  ],
};

export const REFUND: LegalContent = {
  title: 'Refund and Cancellation Policy',
  lastUpdated: 'Draft: pending founder approval before it is final.',
  intro: 'This page repeats, in one place, what the Payment Policy says about refunds and cancellation. Specific refund periods and amounts are not yet fixed and will be added here once the founder confirms them.',
  sections: [
    {
      heading: 'Refunds',
      body: [
        'Until the final terms are published, every refund request is handled individually and in good faith. Contact us directly about any payment issue, or if Sahayak is not what you expected.',
        'If a payment is refunded, access ends and the status on your account changes to “refunded”.',
      ],
    },
    {
      heading: 'Cancellation',
      body: ['Plans do not renew by themselves, so there is nothing to cancel. Access simply ends on the expiry date on your account unless you choose to continue.'],
    },
    {
      heading: 'How to ask',
      body: [`Contact ${FOUNDER.name} using the details on the Help & Contact page. Please do not send UPI PINs, passwords or screenshots of your banking app.`],
    },
  ],
};
