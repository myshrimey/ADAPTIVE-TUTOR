// Handwritten-answer settings (v46). Founder-controlled switches live HERE and nowhere else.

/** Version label of the consent wording shown to parents. Change it whenever the wording changes; consent is stored with it. */
export const HANDWRITING_CONSENT_VERSION = 'draft-1';

/**
 * Keep a de-identified question/answer bank (extracted answer text + marks) after a family deletes their account.
 * OFF until the founder has had the consent wording checked by a lawyer and switches it on. When OFF, deleting
 * an account deletes the written answers too, whatever the family ticked.
 */
export const ANSWER_BANK_ENABLED = false;
/** Also keep the photos (in a folder with no link to the family). Only has an effect when ANSWER_BANK_ENABLED is true. */
export const ANSWER_BANK_KEEP_PHOTOS = false;

export const MAX_SHEET_PAGES = 8;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
/** Share of high-confidence AI marks that a teacher also checks, so AI-vs-teacher agreement keeps being measured. */
export const TEACHER_SAMPLE_RATE = 0.1;
