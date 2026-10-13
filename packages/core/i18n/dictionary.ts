// Sahayak's English/Hindi UI dictionary.
//
// Deliberately a flat key -> {en, hi} map rather than nested JSON or routed
// locale pages (`/en/...`, `/hi/...`) — this covers every surface the MVP
// brief requires (nav, dashboard, diagnostic, messages, legal pages, footer)
// without restructuring routes, matching the brief's "use the existing
// architecture and lightweight translation resources."
//
// This file does NOT translate the question bank — that's explicitly out of
// scope for the 10-day MVP. See LanguageBadge / EN_ONLY_CONTENT_LABEL below,
// used anywhere question content is shown so a student never thinks a
// question itself is available in Hindi when it isn't.

export type Lang = 'en' | 'hi';

export const SUPPORTED_LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
];

type Dict = Record<string, { en: string; hi: string }>;

export const DICTIONARY: Dict = {
  // ---- Site-wide nav ----
  'nav.dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'nav.progress': { en: 'Progress', hi: 'प्रगति' },
  'nav.learn': { en: 'Learn', hi: 'सीखें' },
  'nav.pastPapers': { en: 'Past Papers', hi: 'पुराने प्रश्नपत्र' },
  'nav.report': { en: 'Report', hi: 'रिपोर्ट' },
  'nav.profile': { en: 'Profile', hi: 'प्रोफ़ाइल' },
  'nav.takeTest': { en: 'Take a test', hi: 'टेस्ट दें' },
  'nav.signOut': { en: 'Sign out', hi: 'साइन आउट करें' },
  'nav.hi': { en: 'Hi, {name}', hi: 'नमस्ते, {name}' },
  'nav.pilotOffer': { en: 'Join the pilot', hi: 'पायलट में शामिल हों' },

  // ---- Sign in / Sign up ----
  'auth.signUp': { en: 'Sign up', hi: 'साइन अप करें' },
  'auth.signIn': { en: 'Sign in', hi: 'साइन इन करें' },
  'auth.email': { en: 'Email', hi: 'ईमेल' },
  'auth.password': { en: 'Password', hi: 'पासवर्ड' },
  'auth.forgotPassword': { en: 'Forgot password?', hi: 'पासवर्ड भूल गए?' },
  'auth.backToSignIn': { en: 'Back to sign in', hi: 'साइन इन पर वापस जाएँ' },
  'auth.sendResetLink': { en: 'Send reset link', hi: 'रीसेट लिंक भेजें' },
  'auth.createAccount': { en: 'Create account', hi: 'खाता बनाएँ' },
  'auth.checkingSession': { en: 'Checking your session…', hi: 'सत्र जांचा जा रहा है…' },
  'auth.pleaseWait': { en: 'Please wait…', hi: 'कृपया प्रतीक्षा करें…' },
  'auth.checkEmailConfirm': {
    en: 'Check your email for a confirmation link, then come back and sign in.',
    hi: 'अपने ईमेल में पुष्टिकरण लिंक देखें, फिर वापस आकर साइन इन करें।',
  },
  'auth.checkEmailReset': { en: 'Check your email for a password reset link.', hi: 'अपने ईमेल में पासवर्ड रीसेट लिंक देखें।' },

  // ---- Onboarding ----
  'onboarding.oneLastStep': { en: 'One last step — what should we call you, and which subject?', hi: 'आखिरी कदम — हम आपको क्या कहकर बुलाएँ, और कौन सा विषय?' },
  'onboarding.yourName': { en: 'What should we call you?', hi: 'हम आपको क्या कहकर बुलाएँ?' },
  'onboarding.whichSubject': { en: 'Which subject?', hi: 'कौन सा विषय?' },
  'onboarding.startDiagnostic': { en: 'Start the diagnostic', hi: 'डायग्नोस्टिक शुरू करें' },
  'onboarding.starting': { en: 'Starting…', hi: 'शुरू हो रहा है…' },

  // ---- Common actions / status ----
  'common.save': { en: 'Save', hi: 'सहेजें' },
  'common.saving': { en: 'Saving…', hi: 'सहेजा जा रहा है…' },
  'common.saved': { en: 'Saved', hi: 'सहेजा गया' },
  'common.cancel': { en: 'Cancel', hi: 'रद्द करें' },
  'common.continue': { en: 'Continue', hi: 'जारी रखें' },
  'common.submit': { en: 'Submit', hi: 'सबमिट करें' },
  'common.loading': { en: 'Loading…', hi: 'लोड हो रहा है…' },
  'common.error.generic': { en: 'Something went wrong. Please try again.', hi: 'कुछ गड़बड़ हो गई। कृपया फिर से प्रयास करें।' },
  'common.success.generic': { en: 'Done.', hi: 'हो गया।' },
  'common.questionEnglishOnly': {
    en: 'This question is shown in English for now.',
    hi: 'यह प्रश्न अभी केवल अंग्रेज़ी में दिखाया जा रहा है।',
  },

  // ---- Diagnostic ----
  'diagnostic.chooseSubject': { en: 'Choose a subject to begin', hi: 'शुरू करने के लिए एक विषय चुनें' },
  'diagnostic.inProgress': { en: 'Diagnostic in progress', hi: 'डायग्नोस्टिक जारी है' },
  'diagnostic.submitAnswer': { en: 'Submit answer', hi: 'उत्तर सबमिट करें' },
  'diagnostic.correct': { en: 'Correct', hi: 'सही' },
  'diagnostic.incorrect': { en: 'Incorrect', hi: 'गलत' },
  'diagnostic.completed': { en: 'Diagnostic completed', hi: 'डायग्नोस्टिक पूरा हुआ' },
  'diagnostic.savingProgress': { en: 'Saving your progress…', hi: 'आपकी प्रगति सहेजी जा रही है…' },
  'diagnostic.resuming': {
    en: "Picking up your unfinished diagnostic — your earlier answers are safe.",
    hi: 'आपका पिछला अधूरा डायग्नोस्टिक फिर से शुरू किया जा रहा है — आपके पहले के उत्तर सुरक्षित हैं।',
  },
  'diagnostic.saveFailed': {
    en: 'We could not save that answer. Please check your connection and try again — your earlier answers are safe.',
    hi: 'वह उत्तर सहेजा नहीं जा सका। कृपया अपना कनेक्शन जांचें और फिर से प्रयास करें — आपके पिछले उत्तर सुरक्षित हैं।',
  },

  // ---- Learning session ----
  'learn.endSession': { en: 'End session', hi: 'सत्र समाप्त करें' },
  'learn.continueLearning': { en: 'Continue learning', hi: 'सीखना जारी रखें' },
  'learn.sessionLoading': { en: 'Setting up your session…', hi: 'आपका सत्र तैयार किया जा रहा है…' },
  'learn.skipQuiz': { en: 'Skip quiz', hi: 'क्विज़ छोड़ें' },

  // ---- Progress / Dashboard ----
  'progress.title': { en: 'Progress', hi: 'प्रगति' },
  'progress.skillBySkill': { en: 'Skill by skill', hi: 'कौशल दर कौशल' },
  'progress.notStarted': { en: 'Not started yet', hi: 'अभी शुरू नहीं हुआ' },
  'progress.recentSessions': { en: 'Recent sessions', hi: 'हाल के सत्र' },
  'progress.noSessionsYet': { en: 'No sessions yet — start one above.', hi: 'अभी तक कोई सत्र नहीं — ऊपर से एक शुरू करें।' },
  'dashboard.welcomeBack': { en: 'Welcome back, {name}', hi: 'वापसी पर स्वागत है, {name}' },
  'dashboard.welcomeBackPlain': { en: 'Welcome back', hi: 'वापसी पर स्वागत है' },
  'dashboard.overallMastery': { en: 'Overall mastery', hi: 'कुल दक्षता' },
  'dashboard.sessionsCompleted': { en: 'Sessions completed', hi: 'पूरे किए गए सत्र' },
  'dashboard.skillsInProgress': { en: 'Skills in progress', hi: 'प्रगति में कौशल' },

  // ---- Parent-facing summary / report ----
  'report.title': { en: "Your child's progress report", hi: 'आपके बच्चे की प्रगति रिपोर्ट' },
  'report.topicsStudied': { en: 'Topics studied', hi: 'अध्ययन किए गए विषय' },
  'report.needsPractice': { en: 'Areas that need more practice', hi: 'जिन क्षेत्रों में अधिक अभ्यास चाहिए' },
  'report.nextStep': { en: 'Suggested next step', hi: 'अगला सुझाया गया कदम' },
  'report.activityOverTime': { en: 'Learning activity over time', hi: 'समय के साथ सीखने की गतिविधि' },
  'report.baselineNote': {
    en: 'Not enough data yet for a reliable comparison — showing a starting point and the next recommended step instead.',
    hi: 'विश्वसनीय तुलना के लिए अभी पर्याप्त डेटा नहीं है — इसके बजाय एक शुरुआती बिंदु और अगला सुझाया गया कदम दिखाया जा रहा है।',
  },
  'report.shareOnWhatsApp': { en: 'Share on WhatsApp', hi: 'व्हाट्सऐप पर साझा करें' },
  'report.noGuarantee': {
    en: 'This is a learning summary, not a guarantee of exam results.',
    hi: 'यह एक अध्ययन सारांश है, परीक्षा परिणाम की गारंटी नहीं।',
  },

  // ---- Pilot offer / pricing ----
  'pilot.title': { en: 'Founding-family early access', hi: 'संस्थापक-परिवार प्रारंभिक पहुँच' },
  'pilot.price': { en: '₹{amount} for {days} days', hi: '{days} दिनों के लिए ₹{amount}' },
  'pilot.noAutoRenew': { en: 'No automatic renewal.', hi: 'कोई स्वचालित नवीनीकरण नहीं।' },
  'pilot.noGuarantee': { en: 'No guaranteed examination results.', hi: 'परीक्षा परिणाम की कोई गारंटी नहीं।' },
  'pilot.contactForPayment': {
    en: 'To join, contact us directly for payment details — we will share our UPI/QR with you personally.',
    hi: 'शामिल होने के लिए, भुगतान विवरण हेतु सीधे हमसे संपर्क करें — हम आपको व्यक्तिगत रूप से अपना UPI/QR भेजेंगे।',
  },
  'pilot.contactPhone': { en: 'Call or WhatsApp: {phone}', hi: 'कॉल या व्हाट्सऐप करें: {phone}' },
  'pilot.iHavePaid': { en: "I've made the payment", hi: 'मैंने भुगतान कर दिया है' },

  // ---- Payment confirmation flow ----
  'payment.formTitle': { en: 'Confirm your payment', hi: 'अपना भुगतान सुनिश्चित करें' },
  'payment.referenceLabel': { en: 'UPI transaction reference (optional)', hi: 'UPI लेनदेन संदर्भ (वैकल्पिक)' },
  'payment.amountPaid': { en: 'Amount paid (₹)', hi: 'भुगतान की गई राशि (₹)' },
  'payment.dateOfPayment': { en: 'Date of payment', hi: 'भुगतान की तारीख' },
  'payment.submit': { en: 'Submit for verification', hi: 'सत्यापन के लिए सबमिट करें' },
  'payment.pendingNotice': {
    en: 'Payment pending verification. We will manually confirm it and activate your access shortly.',
    hi: 'भुगतान सत्यापन लंबित है। हम इसे मैन्युअल रूप से सत्यापित कर जल्द ही आपकी पहुँच सक्रिय करेंगे।',
  },
  'payment.confirmedNotice': { en: 'Payment confirmed. Your access is active.', hi: 'भुगतान सत्यापित हो गया। आपकी पहुँच सक्रिय है।' },
  'payment.accessStart': { en: 'Access starts', hi: 'पहुँच शुरू' },
  'payment.accessEnd': { en: 'Access ends', hi: 'पहुँच समाप्त' },
  'payment.supportContact': { en: 'For any question, contact {phone}.', hi: 'किसी भी प्रश्न के लिए, {phone} पर संपर्क करें।' },

  // ---- Help / contact ----
  'help.title': { en: 'Help & Contact', hi: 'सहायता और संपर्क' },
  'help.reachUs': { en: 'Reach us', hi: 'हमसे संपर्क करें' },

  // ---- Legal / footer links ----
  'legal.terms': { en: 'Terms and Conditions', hi: 'नियम और शर्तें' },
  'legal.privacy': { en: 'Privacy Policy', hi: 'गोपनीयता नीति' },
  'legal.pilotLimitations': { en: 'Early Access / Pilot Limitations', hi: 'प्रारंभिक पहुँच / पायलट सीमाएँ' },
  'legal.paymentPolicy': { en: 'Payment, Refund & Cancellation Policy', hi: 'भुगतान, धनवापसी और रद्दीकरण नीति' },
  'legal.contact': { en: 'Contact / Support', hi: 'संपर्क / सहायता' },

  // ---- Footer ----
  'footer.about': {
    en: 'Sahayak is an adaptive 1-to-1 tutor for CBSE Class 10 Maths and Science, currently in early access.',
    hi: 'सहायक CBSE कक्षा 10 गणित और विज्ञान के लिए एक अनुकूली 1-से-1 ट्यूटर है, जो फिलहाल प्रारंभिक पहुँच में है।',
  },
};

export function t(key: keyof typeof DICTIONARY, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = DICTIONARY[key];
  if (!entry) return key; // visibly wrong rather than silently blank, if a key is ever mistyped
  let text = entry[lang] ?? entry.en;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function languageLabel(lang: Lang): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.label ?? lang;
}
