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
  'nav.pilotOffer': {
    en: 'Complete Board Prep',
    hi: 'संपूर्ण बोर्ड तैयारी',
  },

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
  'onboarding.oneLastStep': {
    en: 'One last step — what should we call you, and which subjects are you registered for?',
    hi: 'आखिरी कदम — हम आपको क्या कहकर बुलाएँ, और आपने कौन से विषय लिए हैं?',
  },
  'onboarding.yourName': { en: 'What should we call you?', hi: 'हम आपको क्या कहकर बुलाएँ?' },
  'onboarding.whichSubject': {
    en: 'Which subjects are you registered for in school? (choose all that apply)',
    hi: 'स्कूल में आपने कौन से विषय लिए हैं? (जो लागू हों सभी चुनें)',
  },
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
  'pilot.title': {
    en: 'Sahayak Complete Board Preparation',
    hi: 'सहायक संपूर्ण बोर्ड तैयारी',
  },
  'pilot.price': {
    en: '₹{amount} per child · {days} days of access',
    hi: 'प्रति बच्चा ₹{amount} · {days} दिनों की पहुँच',
  },
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
  'legal.pilotLimitations': { en: 'Scope and Limitations', hi: 'दायरा और सीमाएँ' },
  'legal.paymentPolicy': { en: 'Payment, Refund & Cancellation Policy', hi: 'भुगतान, धनवापसी और रद्दीकरण नीति' },
  'legal.contact': { en: 'Contact / Support', hi: 'संपर्क / सहायता' },

  // ---- Footer ----
  'footer.about': {
    en: 'Sahayak helps CBSE Class 10 students see where they stand, find their learning gaps, practise with a personalised plan, and track progress toward the 2027 board exams.',
    hi: 'सहायक CBSE कक्षा 10 के विद्यार्थियों को यह देखने में मदद करता है कि वे कहाँ हैं, उनकी सीखने की कमियाँ क्या हैं, व्यक्तिगत योजना से अभ्यास करना, और 2027 बोर्ड परीक्षा की ओर प्रगति को ट्रैक करना।',
  },

  // ---- v34: board-prep offer, subject status, check-in ----
  'pilot.lede': {
    en: 'How prepared is your child for the 2027 board exams, what is holding them back, and what should they do next? Sahayak finds the gaps, teaches from there, and shows you the evidence.',
    hi: 'आपका बच्चा 2027 बोर्ड परीक्षा के लिए कितना तैयार है, उसे क्या रोक रहा है, और आगे क्या करना चाहिए? सहायक कमियाँ ढूँढता है, वहीं से सिखाता है, और आपको प्रमाण दिखाता है।',
  },
  'pilot.includesTitle': {
    en: "What's included",
    hi: 'इसमें क्या शामिल है',
  },
  'pilot.inc1': {
    en: 'An adaptive diagnostic in each subject you register for',
    hi: 'आपके चुने हर विषय में एक अनुकूली डायग्नोस्टिक',
  },
  'pilot.inc2': {
    en: 'AI-guided learning sessions with hints before answers, practice questions and a short quiz after each session',
    hi: 'संकेत पहले-उत्तर बाद वाले AI-निर्देशित अध्ययन सत्र, अभ्यास प्रश्न और हर सत्र के बाद एक छोटी क्विज़',
  },
  'pilot.inc3': {
    en: 'A short check-in before each session so the session fits how the student feels and the time they have',
    hi: 'हर सत्र से पहले एक छोटा चेक-इन ताकि सत्र विद्यार्थी की स्थिति और उपलब्ध समय के अनुसार हो',
  },
  'pilot.inc4': {
    en: 'A parent report built only from real evidence: progress, syllabus covered, and confidence trend',
    hi: 'केवल वास्तविक प्रमाण से बनी अभिभावक रिपोर्ट: प्रगति, पूरा किया पाठ्यक्रम और आत्मविश्वास की प्रवृत्ति',
  },
  'pilot.notIncludedTitle': {
    en: 'What is not included',
    hi: 'इसमें क्या शामिल नहीं है',
  },
  'pilot.not1': {
    en: 'No guaranteed marks, rank or score improvement, and no predicted board score.',
    hi: 'अंकों, रैंक या स्कोर सुधार की कोई गारंटी नहीं, और बोर्ड स्कोर की कोई भविष्यवाणी नहीं।',
  },
  'pilot.not2': {
    en: 'Subjects marked Pilot are still being reviewed; subjects marked Coming soon are not available yet.',
    hi: "'पायलट' वाले विषयों की समीक्षा अभी जारी है; 'जल्द आ रहा है' वाले विषय अभी उपलब्ध नहीं हैं।",
  },
  'pilot.not3': {
    en: 'Questions and explanations are in English for now. The interface can be shown in Hindi.',
    hi: 'प्रश्न और स्पष्टीकरण अभी अंग्रेज़ी में हैं। इंटरफ़ेस हिंदी में दिखाया जा सकता है।',
  },
  'pilot.not4': {
    en: 'No live teacher. Support comes directly from the founder.',
    hi: 'कोई लाइव शिक्षक नहीं। सहायता सीधे संस्थापक से मिलती है।',
  },
  'pilot.subjectsTitle': {
    en: 'Subjects and their status',
    hi: 'विषय और उनकी स्थिति',
  },
  'pilot.priceNote': {
    en: '₹999 is an introductory price for this first group of families and may change later. Access does not renew automatically.',
    hi: '₹999 पहले परिवार-समूह के लिए परिचयात्मक मूल्य है और बाद में बदल सकता है। पहुँच अपने-आप नवीनीकृत नहीं होती।',
  },
  'pilot.refundNote': {
    en: 'Refunds are handled individually — see the payment policy.',
    hi: 'धनवापसी व्यक्तिगत रूप से संभाली जाती है — भुगतान नीति देखें।',
  },
  'subject.status.ready': {
    en: 'Ready',
    hi: 'तैयार',
  },
  'subject.status.pilot': {
    en: 'Pilot',
    hi: 'पायलट',
  },
  'subject.status.in_development': {
    en: 'In development',
    hi: 'विकास में',
  },
  'subject.status.coming_soon': {
    en: 'Coming soon',
    hi: 'जल्द आ रहा है',
  },
  'subject.manageTitle': {
    en: 'Your subjects',
    hi: 'आपके विषय',
  },
  'subject.manageIntro': {
    en: 'Choose the subjects you are registered for in school. Pilot subjects work, but their questions are still being reviewed.',
    hi: 'स्कूल में आपके लिए पंजीकृत विषय चुनें। पायलट विषय काम करते हैं, लेकिन उनके प्रश्नों की समीक्षा अभी जारी है।',
  },
  'subject.add': {
    en: 'Add',
    hi: 'जोड़ें',
  },
  'subject.registered': {
    en: 'Registered',
    hi: 'पंजीकृत',
  },
  'subject.manageLink': {
    en: 'Manage subjects',
    hi: 'विषय प्रबंधित करें',
  },
  'checkin.title': {
    en: 'Quick check-in',
    hi: 'त्वरित चेक-इन',
  },
  'checkin.intro': {
    en: "Takes about 30 seconds. It helps shape today's session. There are no right or wrong answers.",
    hi: 'लगभग 30 सेकंड लगते हैं। इससे आज का सत्र आपके अनुसार बनता है। कोई उत्तर सही या गलत नहीं है।',
  },
  'checkin.mood': {
    en: 'How are you feeling right now?',
    hi: 'आप अभी कैसा महसूस कर रहे हैं?',
  },
  'checkin.focus': {
    en: 'How focused do you feel?',
    hi: 'आप कितना ध्यान केंद्रित महसूस कर रहे हैं?',
  },
  'checkin.confidence': {
    en: "How confident do you feel about today's topic? (0 = not at all, 10 = very)",
    hi: 'आज के विषय को लेकर आप कितने आश्वस्त हैं? (0 = बिल्कुल नहीं, 10 = बहुत)',
  },
  'checkin.time': {
    en: 'How much time do you have?',
    hi: 'आपके पास कितना समय है?',
  },
  'checkin.goal': {
    en: 'What do you want to do?',
    hi: 'आप क्या करना चाहते हैं?',
  },
  'checkin.start': {
    en: 'Start session',
    hi: 'सत्र शुरू करें',
  },
  'checkin.skip': {
    en: 'Skip for now',
    hi: 'अभी छोड़ें',
  },
  'checkin.afterTitle': {
    en: 'How confident do you feel about this topic now? (0–10)',
    hi: 'अब इस विषय को लेकर आप कितने आश्वस्त हैं? (0–10)',
  },
  'checkin.afterSave': {
    en: 'Save',
    hi: 'सहेजें',
  },
  'checkin.recoveryNote': {
    en: "Let's start gently today — a shorter, easier warm-up first.",
    hi: 'आज धीरे से शुरू करते हैं — पहले एक छोटा, आसान वार्म-अप।',
  },
  'report.confidenceTitle': {
    en: 'Student confidence (self-reported)',
    hi: 'विद्यार्थी का आत्मविश्वास (स्वयं बताया गया)',
  },
  'report.confidenceIntro': {
    en: 'Asked before each session on a 0–10 scale. Confidence is shown separately from marks — they measure different things.',
    hi: 'हर सत्र से पहले 0–10 के पैमाने पर पूछा जाता है। आत्मविश्वास अंकों से अलग दिखाया जाता है — दोनों अलग चीज़ें मापते हैं।',
  },
  'report.confLatest': {
    en: 'Latest',
    hi: 'नवीनतम',
  },
  'report.confLast': {
    en: 'Previous session',
    hi: 'पिछला सत्र',
  },
  'report.conf7': {
    en: '7-day average',
    hi: '7-दिन औसत',
  },
  'report.conf30': {
    en: '30-day average',
    hi: '30-दिन औसत',
  },
  'report.confTrend': {
    en: 'Trend',
    hi: 'प्रवृत्ति',
  },
  'report.trend.improving': {
    en: 'Improving ↑',
    hi: 'सुधर रहा है ↑',
  },
  'report.trend.steady': {
    en: 'Steady →',
    hi: 'स्थिर →',
  },
  'report.trend.declining': {
    en: 'Lower recently ↓',
    hi: 'हाल में कम ↓',
  },
  'report.trend.not_enough_data': {
    en: 'Not enough check-ins yet',
    hi: 'अभी पर्याप्त चेक-इन नहीं',
  },
  'report.confChange': {
    en: 'Average change during a session',
    hi: 'सत्र के दौरान औसत बदलाव',
  },
  'report.confNone': {
    en: 'No check-ins yet. Confidence appears here once the student has done a few sessions.',
    hi: 'अभी कोई चेक-इन नहीं। कुछ सत्रों के बाद आत्मविश्वास यहाँ दिखेगा।',
  },
  'report.coverage': {
    en: 'Syllabus assessed',
    hi: 'पाठ्यक्रम का आकलन',
  },
  'report.evidence': {
    en: 'Evidence',
    hi: 'प्रमाण',
  },
  'report.evidence.insufficient': {
    en: 'Insufficient so far — numbers here are not yet reliable',
    hi: 'अभी अपर्याप्त — यहाँ की संख्याएँ अभी भरोसेमंद नहीं',
  },
  'report.evidence.limited': {
    en: 'Limited — a fair indication, not yet a full picture',
    hi: 'सीमित — एक उचित संकेत, अभी पूरी तस्वीर नहीं',
  },
  'report.evidence.good': {
    en: 'Good — based on a broad part of the syllabus',
    hi: 'अच्छा — पाठ्यक्रम के बड़े हिस्से पर आधारित',
  },
  'report.evidenceNote': {
    en: '"Evidence" describes how much data Sahayak has, not a judgement about the child.',
    hi: '"प्रमाण" बताता है कि सहायक के पास कितना डेटा है, बच्चे के बारे में कोई निर्णय नहीं।',
  },
  'report.pilotSubjectNote': {
    en: 'Pilot subject: questions are still being reviewed.',
    hi: 'पायलट विषय: प्रश्नों की समीक्षा अभी जारी है।',
  },
  'report.diagnosticNeeded': {
    en: 'Diagnostic needed — no evidence yet.',
    hi: 'डायग्नोस्टिक ज़रूरी — अभी कोई प्रमाण नहीं।',
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
