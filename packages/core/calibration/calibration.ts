// v85: metacognition. Before checking an answer the student says how sure they are (1 guessing, 2 think so, 3 sure).
// This pure module turns those records into a gentle, honest summary. It never produces a mark, rank or label for the student,
// never changes mastery or revision dates, and says "not enough yet" until there is real evidence.
export type SureLevel = 1 | 2 | 3;
export const CONFIDENCE_LEVELS: { value: SureLevel; en: string; hi: string }[] = [
  { value: 1, en: 'Just guessing', hi: 'बस अंदाज़ा' },
  { value: 2, en: 'I think so', hi: 'लगता है सही है' },
  { value: 3, en: 'I am sure', hi: 'पक्का पता है' },
];
export const MIN_CALIBRATION_EVENTS = 8;       // below this we say "not enough yet"
export const MIN_PER_LEVEL = 3;                 // a level needs this many answers before we talk about it
export interface CalibrationEvent { confidence: number; correct: boolean }
export interface LevelStat { level: SureLevel; total: number; right: number; rate: number | null }
export interface CalibrationSummary {
  total: number; enough: boolean; levels: LevelStat[];
  sureButWrong: number; guessButRight: number;
  pattern: 'not_enough' | 'well_calibrated' | 'overconfident' | 'underconfident' | 'mixed';
}
export const isSureLevel = (v: unknown): v is SureLevel => v === 1 || v === 2 || v === 3;

export function summariseCalibration(events: CalibrationEvent[]): CalibrationSummary {
  const ev = events.filter((e) => isSureLevel(e.confidence) && typeof e.correct === 'boolean');
  const levels: LevelStat[] = ([1, 2, 3] as SureLevel[]).map((level) => {
    const l = ev.filter((e) => e.confidence === level); const right = l.filter((e) => e.correct).length;
    return { level, total: l.length, right, rate: l.length ? right / l.length : null };
  });
  const sureButWrong = ev.filter((e) => e.confidence === 3 && !e.correct).length;
  const guessButRight = ev.filter((e) => e.confidence === 1 && e.correct).length;
  const enough = ev.length >= MIN_CALIBRATION_EVENTS;
  if (!enough) return { total: ev.length, enough, levels, sureButWrong, guessButRight, pattern: 'not_enough' };
  const sure = levels[2], guess = levels[0];
  // overconfident: "sure" answers are right clearly less than 70% of the time (needs enough "sure" answers to say so)
  const over = sure.total >= MIN_PER_LEVEL && (sure.rate as number) < 0.7;
  // underconfident: "guessing" answers are right clearly more than 60% of the time
  const under = guess.total >= MIN_PER_LEVEL && (guess.rate as number) > 0.6;
  const pattern = over && under ? 'mixed' : over ? 'overconfident' : under ? 'underconfident' : 'well_calibrated';
  return { total: ev.length, enough, levels, sureButWrong, guessButRight, pattern };
}

/** Supportive wording for the student. Never blames, never a score. */
export function calibrationMessage(s: CalibrationSummary, hi = false): string {
  const T = (en: string, h: string) => (hi ? h : en);
  const sure = s.levels[2], guess = s.levels[0];
  switch (s.pattern) {
    case 'not_enough': return T(`Say how sure you are before you check an answer. After ${MIN_CALIBRATION_EVENTS} answers Sahayak can show how well you know what you know.`, `उत्तर जाँचने से पहले बताइए कि आप कितने आश्वस्त हैं। ${MIN_CALIBRATION_EVENTS} उत्तरों के बाद Sahayak दिखा सकेगा कि आप अपनी समझ को कितना सही पहचानते हैं।`);
    case 'well_calibrated': return T('Your sureness matches your answers well. That is a strong study habit: you know what to revise.', 'आपका आत्मविश्वास आपके उत्तरों से अच्छी तरह मेल खाता है। यह अच्छी आदत है: आप जानते हैं कि क्या दोहराना है।');
    case 'overconfident': return T(`When you said "I am sure", you were right ${sure.right} of ${sure.total} times. Some "sure" answers were wrong, so it is worth checking those topics once more before the exam.`, `जब आपने "पक्का पता है" कहा, तब ${sure.total} में से ${sure.right} बार आप सही थे। कुछ "पक्के" उत्तर गलत थे, इसलिए परीक्षा से पहले उन विषयों को एक बार फिर देखना अच्छा रहेगा।`);
    case 'underconfident': return T(`When you said "just guessing", you were right ${guess.right} of ${guess.total} times. You know more than you think. Trust your first thinking a little more.`, `जब आपने "बस अंदाज़ा" कहा, तब ${guess.total} में से ${guess.right} बार आप सही थे। आप जितना सोचते हैं उससे ज़्यादा जानते हैं।`);
    default: return T('Some of your "sure" answers were wrong and some of your guesses were right. Slow down on the ones you feel sure about, and trust yourself more on the ones you doubt.', 'आपके कुछ "पक्के" उत्तर गलत थे और कुछ अंदाज़े सही। जिन पर पक्का भरोसा है उन्हें धीरे से जाँचें, और जिन पर शक है उन पर खुद पर थोड़ा और भरोसा करें।');
  }
}

/** One short line right after an answer. Only for the two surprising cases; otherwise nothing (no noise). */
export function immediateNote(confidence: number | null | undefined, correct: boolean, hi = false): string | null {
  const T = (en: string, h: string) => (hi ? h : en);
  if (confidence === 3 && !correct) return T('You were sure, but this one was wrong. That is useful to know: look at the answer once more.', 'आप पक्के थे, पर यह उत्तर गलत रहा। यह जानना उपयोगी है: उत्तर एक बार फिर देखिए।');
  if (confidence === 1 && correct) return T('You were just guessing, but it was right. You may know this better than you think.', 'आपने अंदाज़ा लगाया था, पर उत्तर सही था। आप इसे शायद अपनी सोच से बेहतर जानते हैं।');
  return null;
}
