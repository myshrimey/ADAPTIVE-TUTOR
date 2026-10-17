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
  'nav.practice': { en: 'Practice', hi: 'अभ्यास' },
  'nav.written': { en: 'Written answers', hi: 'लिखित उत्तर' },
  'nav.menu': { en: 'Menu', hi: 'मेन्यू' },
  'nav.plan': { en: 'Study plan', hi: 'अध्ययन योजना' },
  'nav.account': { en: 'Your account', hi: 'आपका खाता' },
  'nav.descTest': { en: 'Find where you stand today', hi: 'जानें आप आज कहाँ हैं' },
  'nav.descMock': { en: 'Timed, board-style practice papers', hi: 'समयबद्ध, बोर्ड-शैली के अभ्यास पत्र' },
  'nav.descWritten': { en: 'Write answers and get suggested marks', hi: 'उत्तर लिखें, सुझाए गए अंक पाएँ' },
  'nav.descPapers': { en: 'Questions from earlier years', hi: 'पिछले वर्षों के प्रश्न' },

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
    en: 'These are introductory prices for this first group of families and may change later. Access does not renew automatically.',
    hi: 'ये पहले परिवार-समूह के लिए परिचयात्मक मूल्य हैं और बाद में बदल सकते हैं। पहुँच अपने-आप नवीनीकृत नहीं होती।',
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
  'nav.mock': {
    en: "Mock exam",
    hi: "मॉक परीक्षा",
  },
  'mock.title': {
    en: "Timed mock exam",
    hi: "समयबद्ध मॉक परीक्षा",
  },
  'mock.intro': {
    en: "A timed practice paper of objective-style questions (multiple-choice, numeric and short answer) spread across the chapters. It is practice for speed and exam habit — not a copy of the CBSE board paper, and not a prediction of your board marks. Your mock result does not change your learning progress.",
    hi: "अध्याय-वार फैले वस्तुनिष्ठ प्रश्नों (बहुविकल्पीय, संख्यात्मक और लघु उत्तर) का समयबद्ध अभ्यास पत्र। यह गति और परीक्षा की आदत के लिए अभ्यास है — CBSE बोर्ड पेपर की नकल नहीं, और आपके बोर्ड अंकों की भविष्यवाणी भी नहीं। मॉक का परिणाम आपकी सीखने की प्रगति नहीं बदलता।",
  },
  'mock.pickSubject': {
    en: "Choose a subject",
    hi: "विषय चुनें",
  },
  'mock.noSubjects': {
    en: "Register a subject first, then come back for a mock.",
    hi: "पहले कोई विषय पंजीकृत करें, फिर मॉक के लिए लौटें।",
  },
  'mock.start': {
    en: "Start mock exam",
    hi: "मॉक परीक्षा शुरू करें",
  },
  'mock.resume': {
    en: "Resume mock in progress",
    hi: "चल रही मॉक परीक्षा जारी रखें",
  },
  'mock.starting': {
    en: "Preparing your paper…",
    hi: "आपका पेपर तैयार हो रहा है…",
  },
  'mock.timeLeft': {
    en: "Time left",
    hi: "बचा समय",
  },
  'mock.answered': {
    en: "{n} of {total} answered",
    hi: "{total} में से {n} के उत्तर दिए",
  },
  'mock.saved': {
    en: "Answers saved",
    hi: "उत्तर सहेजे गए",
  },
  'mock.saveFailed': {
    en: "Could not save just now — your answers are kept on this screen and will retry.",
    hi: "अभी सहेज नहीं पाए — आपके उत्तर इस स्क्रीन पर हैं, फिर कोशिश होगी।",
  },
  'mock.submit': {
    en: "Submit exam",
    hi: "परीक्षा जमा करें",
  },
  'mock.submitConfirm': {
    en: "Submit now? {n} question(s) are still unanswered.",
    hi: "अभी जमा करें? {n} प्रश्न अभी भी अनुत्तरित हैं।",
  },
  'mock.timeUp': {
    en: "Time is up — your paper was submitted automatically.",
    hi: "समय समाप्त — आपका पेपर अपने-आप जमा हो गया।",
  },
  'mock.question': {
    en: "Question {n}",
    hi: "प्रश्न {n}",
  },
  'mock.typeAnswer': {
    en: "Type your answer",
    hi: "अपना उत्तर लिखें",
  },
  'mock.resultTitle': {
    en: "Mock exam result",
    hi: "मॉक परीक्षा परिणाम",
  },
  'mock.score': {
    en: "{score} out of {total} correct ({percent}%)",
    hi: "{total} में से {score} सही ({percent}%)",
  },
  'mock.unanswered': {
    en: "Unanswered: {n}",
    hi: "अनुत्तरित: {n}",
  },
  'mock.timeUsed': {
    en: "Time used: {m} min",
    hi: "लगा समय: {m} मिनट",
  },
  'mock.byChapter': {
    en: "By chapter",
    hi: "अध्याय-वार",
  },
  'mock.review': {
    en: "Review your answers",
    hi: "अपने उत्तर देखें",
  },
  'mock.yourAnswer': {
    en: "Your answer",
    hi: "आपका उत्तर",
  },
  'mock.correctAnswer': {
    en: "Correct answer",
    hi: "सही उत्तर",
  },
  'mock.notAnswered': {
    en: "Not answered",
    hi: "उत्तर नहीं दिया",
  },
  'mock.again': {
    en: "Take another mock",
    hi: "एक और मॉक दें",
  },
  'mock.note': {
    en: "One mock is a small sample. Several mocks over time say more than any single one.",
    hi: "एक मॉक एक छोटा नमूना है। समय के साथ कई मॉक किसी एक से ज़्यादा बताते हैं।",
  },
  'mock.pilotNote': {
    en: "This subject is in pilot: its questions are still being reviewed.",
    hi: "यह विषय पायलट में है: इसके प्रश्नों की समीक्षा अभी जारी है।",
  },
  'mock.notEnough': {
    en: "This subject does not have enough questions for a mock yet.",
    hi: "इस विषय में अभी मॉक के लिए पर्याप्त प्रश्न नहीं हैं।",
  },
  'mock.correct': {
    en: "Correct",
    hi: "सही",
  },
  'mock.incorrect': {
    en: "Not correct",
    hi: "सही नहीं",
  },
  'readiness.title': {
    en: "Preparation level",
    hi: "तैयारी का स्तर",
  },
  'readiness.intro': {
    en: "This describes how well the evidence so far supports readiness for each subject. It is not a predicted board mark and not a promise, and it can change as more practice is done.",
    hi: "यह बताता है कि अब तक के प्रमाण हर विषय की तैयारी को कितना समर्थन देते हैं। यह बोर्ड अंकों की भविष्यवाणी या वादा नहीं है, और अधिक अभ्यास के साथ बदल सकता है।",
  },
  'readiness.summary': {
    en: "{n} of {assessed} assessed subjects are at 'On track' or above ({total} registered).",
    hi: "आकलन किए गए {assessed} विषयों में से {n} 'सही राह पर' या उससे ऊपर हैं ({total} पंजीकृत)।",
  },
  'readiness.summaryNone': {
    en: "No subject has enough evidence for a preparation level yet.",
    hi: "अभी किसी विषय के लिए तैयारी का स्तर बताने लायक पर्याप्त प्रमाण नहीं है।",
  },
  'readiness.band.insufficient_evidence': {
    en: "Not enough evidence yet",
    hi: "अभी पर्याप्त प्रमाण नहीं",
  },
  'readiness.band.building': {
    en: "Building foundations",
    hi: "नींव बन रही है",
  },
  'readiness.band.developing': {
    en: "Developing",
    hi: "विकसित हो रही है",
  },
  'readiness.band.on_track': {
    en: "On track",
    hi: "सही राह पर",
  },
  'readiness.band.well_prepared': {
    en: "Well prepared",
    hi: "अच्छी तैयारी",
  },
  'readiness.reason.too_little_assessed': {
    en: "Only {assessed} of {total} skills have been assessed so far — too little to say anything firm.",
    hi: "अब तक {total} में से केवल {assessed} कौशल आँके गए हैं — कुछ पक्का कहने के लिए बहुत कम।",
  },
  'readiness.reason.mastery_summary': {
    en: "Average mastery across assessed skills: about {percent}%.",
    hi: "आँके गए कौशलों में औसत महारत: लगभग {percent}%।",
  },
  'readiness.reason.mocks_summary': {
    en: "Latest {n} timed mock(s) averaged {percent}%.",
    hi: "पिछली {n} समयबद्ध मॉक का औसत {percent}% रहा।",
  },
  'readiness.reason.no_mock': {
    en: "No timed mock has been taken yet, so the highest level is not shown.",
    hi: "अभी कोई समयबद्ध मॉक नहीं दी गई, इसलिए सबसे ऊँचा स्तर नहीं दिखाया जा रहा।",
  },
  'readiness.reason.mock_gap': {
    en: "Timed mocks ({mock}%) are lower than practice mastery ({mastery}%), so speed and exam-style practice need attention.",
    hi: "समयबद्ध मॉक ({mock}%) अभ्यास की महारत ({mastery}%) से कम हैं, इसलिए गति और परीक्षा-शैली के अभ्यास पर ध्यान चाहिए।",
  },
  'readiness.reason.coverage_cap': {
    en: "Only about {percent}% of the syllabus has been assessed, which limits how high the level can go.",
    hi: "पाठ्यक्रम का केवल लगभग {percent}% आँका गया है, जिससे स्तर की ऊपरी सीमा तय होती है।",
  },
  'readiness.reason.pilot_cap': {
    en: "This is a pilot subject whose questions are still being reviewed, so the top level is not shown.",
    hi: "यह पायलट विषय है जिसके प्रश्नों की समीक्षा जारी है, इसलिए सबसे ऊँचा स्तर नहीं दिखाया जा रहा।",
  },
  'readiness.next.finish_diagnostic': {
    en: "Next step: take the diagnostic test for this subject.",
    hi: "अगला कदम: इस विषय का डायग्नोस्टिक टेस्ट दें।",
  },
  'readiness.next.more_sessions': {
    en: "Next step: complete a few more learning sessions so more skills are assessed.",
    hi: "अगला कदम: कुछ और लर्निंग सेशन पूरे करें ताकि अधिक कौशल आँके जा सकें।",
  },
  'readiness.next.practise_weak': {
    en: "Next step: practise the skills listed under 'Needs more practice'.",
    hi: "अगला कदम: 'और अभ्यास चाहिए' में दिए कौशलों का अभ्यास करें।",
  },
  'readiness.next.take_mock': {
    en: "Next step: take a timed mock exam to check speed and exam habit.",
    hi: "अगला कदम: गति और परीक्षा की आदत जाँचने के लिए समयबद्ध मॉक दें।",
  },
  'readiness.next.keep_going': {
    en: "Next step: keep revising and take a mock every week or two.",
    hi: "अगला कदम: दोहराते रहें और हर एक-दो हफ़्ते में एक मॉक दें।",
  },
  'report.mockLine': {
    en: "Timed mocks: {n}, latest {percent}%",
    hi: "समयबद्ध मॉक: {n}, नवीनतम {percent}%",
  },
  'faq.title': {
    en: "Frequently asked questions",
    hi: "अक्सर पूछे जाने वाले प्रश्न",
  },
  'anim.replay': {
    en: "Replay",
    hi: "फिर से देखें",
  },
  'anim.guidedHint': {
    en: "Take your time — look at each label one by one.",
    hi: "आराम से देखें — हर लेबल को एक-एक करके पढ़ें।",
  },
  'anim.ok.guided': {
    en: "Yes — that's it! Well done.",
    hi: "हाँ — बिल्कुल सही! शाबाश।",
  },
  'anim.ok.standard': {
    en: "Correct.",
    hi: "सही।",
  },
  'anim.ok.brisk': {
    en: "Correct ✓",
    hi: "सही ✓",
  },
  'anim.retry.guided': {
    en: "Not quite — that's okay. Let's look at it together.",
    hi: "बिल्कुल नहीं — कोई बात नहीं। आइए साथ में देखें।",
  },
  'anim.retry.standard': {
    en: "Not quite — have another look.",
    hi: "ठीक नहीं — एक बार फिर देखें।",
  },
  'anim.retry.brisk': {
    en: "Not quite.",
    hi: "ठीक नहीं।",
  },
  'anim.band.needs_foundation': {
    en: "Building foundation",
    hi: "नींव बन रही है",
  },
  'anim.band.emerging': {
    en: "Emerging",
    hi: "उभर रहा है",
  },
  'anim.band.developing': {
    en: "Developing",
    hi: "विकसित हो रहा है",
  },
  'anim.band.strong': {
    en: "Strong",
    hi: "मज़बूत",
  },
  'anim.band.mastered': {
    en: "Mastered",
    hi: "पूर्ण महारत",
  },
  'anim.levelUp': {
    en: "Level up! This skill moved from {from} to {to}.",
    hi: "लेवल अप! यह कौशल {from} से {to} पर पहुँचा।",
  },
  'anim.progressUp': {
    en: "This skill moved from {from}% to {to}% this session.",
    hi: "इस सेशन में यह कौशल {from}% से {to}% पर पहुँचा।",
  },
  'anim.progressSteady': {
    en: "Progress on a skill builds over several sessions — each one counts.",
    hi: "किसी कौशल में प्रगति कई सेशन में बनती है — हर सेशन मायने रखता है।",
  },
  'auth.invitationOnly': {
    en: "Sahayak is invitation-only during early access. Please ask for an account.",
    hi: "सहायक अभी शुरुआती पहुँच में केवल आमंत्रण पर है। कृपया खाता माँगें।",
  },
  'auth.invitationNote': {
    en: "Early access is by invitation: your account is created for you. Sign in with the email and password you were given.",
    hi: "शुरुआती पहुँच आमंत्रण पर है: आपका खाता आपके लिए बनाया जाता है। दिए गए ईमेल और पासवर्ड से साइन इन करें।",
  },
  'auth.teacherRegister': {
    en: "Are you a teacher? Register here.",
    hi: "क्या आप शिक्षक हैं? यहाँ पंजीकरण करें।",
  },
  'profile.welcomeTitle': {
    en: "Welcome! Let's complete your profile first.",
    hi: "स्वागत है! पहले अपनी प्रोफ़ाइल पूरी करें।",
  },
  'profile.welcomeIntro': {
    en: "A few details help us understand you better. Everything is optional except your name. After saving you will choose your subjects.",
    hi: "कुछ जानकारी हमें आपको बेहतर समझने में मदद करती है। नाम के अलावा सब कुछ वैकल्पिक है। सहेजने के बाद आप अपने विषय चुनेंगे।",
  },
  'profile.saveContinue': {
    en: "Save and continue",
    hi: "सहेजें और आगे बढ़ें",
  },
  'profile.changePasswordTitle': {
    en: "Set your own password (recommended)",
    hi: "अपना पासवर्ड बदलें (अनुशंसित)",
  },
  'profile.newPassword': {
    en: "New password (at least 8 characters)",
    hi: "नया पासवर्ड (कम से कम 8 अक्षर)",
  },
  'profile.changePassword': {
    en: "Change password",
    hi: "पासवर्ड बदलें",
  },
  'profile.passwordChanged': {
    en: "Password changed.",
    hi: "पासवर्ड बदल गया।",
  },
  'access.required': {
    en: "Your account does not have an active plan yet. Please contact the Sahayak team to activate it.",
    hi: "आपके खाते में अभी कोई सक्रिय प्लान नहीं है। कृपया सक्रिय करने के लिए सहायक टीम से संपर्क करें।",
  },
  'access.expired': {
    en: "Your plan has ended. Your reports and progress are still here; contact the Sahayak team to renew.",
    hi: "आपका प्लान समाप्त हो गया है। आपकी रिपोर्ट और प्रगति यहीं हैं; नवीनीकरण के लिए सहायक टीम से संपर्क करें।",
  },
  'access.subjectLimit': {
    en: "Your plan allows a limited number of subjects and you have reached it. Contact the Sahayak team to add more.",
    hi: "आपके प्लान में विषयों की सीमा है और आप उस तक पहुँच गए हैं। और जोड़ने के लिए सहायक टीम से संपर्क करें।",
  },
  'payment.planLabel': {
    en: "Plan you paid for",
    hi: "आपने किस प्लान का भुगतान किया",
  },
  'payment.accessSetByTeam': {
    en: "Payment confirmed. The Sahayak team sets your subjects and access dates; they are shown on your account.",
    hi: "भुगतान सत्यापित। आपके विषय और पहुँच की तारीखें सहायक टीम तय करती है; वे आपके खाते पर दिखती हैं।",
  },
  'plans.title': {
    en: "Plans",
    hi: "प्लान",
  },
  'plans.lede': {
    en: "Choose the plan that fits. Access is activated by the Sahayak team after payment is confirmed.",
    hi: "अपने अनुकूल प्लान चुनें। भुगतान सत्यापित होने के बाद सहायक टीम पहुँच सक्रिय करती है।",
  },
  'plans.perSubject.name': {
    en: "Per subject",
    hi: "प्रति विषय",
  },
  'plans.perSubject.desc': {
    en: "Pay month by month for just the subjects you need.",
    hi: "जितने विषय चाहिए, उतने के लिए माह-दर-माह भुगतान करें।",
  },
  'plans.fiveMonthly.name': {
    en: "Five subjects, monthly",
    hi: "पाँच विषय, मासिक",
  },
  'plans.fiveMonthly.desc': {
    en: "Up to 5 subjects, billed monthly, available till February 2027.",
    hi: "5 विषयों तक, मासिक भुगतान, फ़रवरी 2027 तक उपलब्ध।",
  },
  'plans.fiveMarch.name': {
    en: "Five subjects, till March 2027",
    hi: "पाँच विषय, मार्च 2027 तक",
  },
  'plans.fiveMarch.desc': {
    en: "Up to 5 subjects, one payment, access till 31 March 2027.",
    hi: "5 विषयों तक, एक भुगतान, 31 मार्च 2027 तक पहुँच।",
  },
  'plans.founding.name': {
    en: "Founding Family Programme",
    hi: "फ़ाउंडिंग फ़ैमिली प्रोग्राम",
  },
  'plans.founding.desc': {
    en: "Up to 5 subjects, one payment, access till 31 March 2027. A limited first cohort of families who help shape Sahayak.",
    hi: "5 विषयों तक, एक भुगतान, 31 मार्च 2027 तक पहुँच। परिवारों का सीमित पहला समूह जो Sahayak को आकार देने में मदद करता है।",
  },
  'plans.f.foundingCohort': {
    en: "Limited first cohort. Your feedback shapes the product.",
    hi: "सीमित पहला समूह। आपकी राय से उत्पाद बेहतर बनता है।",
  },
  'plans.badge.founding': { en: "Limited first cohort", hi: "सीमित पहला समूह" },
  'plans.maths': {
    en: "Mathematics (Standard and Basic) counts as one subject.",
    hi: "गणित (स्टैंडर्ड और बेसिक) एक विषय गिना जाता है।",
  },
  'plans.invite': {
    en: "Early access is by invitation. To join, contact us — we will create your account and activate your plan.",
    hi: "शुरुआती पहुँच आमंत्रण पर है। जुड़ने के लिए हमसे संपर्क करें — हम आपका खाता बनाएँगे और प्लान सक्रिय करेंगे।",
  },
  'plans.free.name': {
    en: "Free",
    hi: "निःशुल्क",
  },
  'plans.free.desc': {
    en: "Try Sahayak at no cost, using free-tier AI.",
    hi: "निःशुल्क-स्तर के AI के साथ सहायक को बिना शुल्क आज़माएँ।",
  },
  'plans.unit.free': {
    en: "free",
    hi: "निःशुल्क",
  },
  'plans.unit.perSubjectMonth': {
    en: "per subject per month",
    hi: "प्रति विषय प्रति माह",
  },
  'plans.unit.perMonth': {
    en: "per month",
    hi: "प्रति माह",
  },
  'plans.unit.oneTime': {
    en: "one time",
    hi: "एक बार",
  },
  'plans.f.oneSubject': {
    en: "1 subject of your choice",
    hi: "आपकी पसंद का 1 विषय",
  },
  'plans.f.diagnostic': {
    en: "Diagnostic test to find your starting point",
    hi: "शुरुआती स्तर जानने के लिए डायग्नोस्टिक टेस्ट",
  },
  'plans.f.quizzes': {
    en: "Practice quizzes with explanations",
    hi: "व्याख्या सहित अभ्यास क्विज़",
  },
  'plans.f.aiLimited': {
    en: "AI tutor: up to {n} replies a day, on free-tier AI (can be slower at busy times)",
    hi: "AI ट्यूटर: प्रतिदिन {n} उत्तर तक, निःशुल्क-स्तर के AI पर (व्यस्त समय में धीमा हो सकता है)",
  },
  'plans.f.report': {
    en: "Parent progress report you can share",
    hi: "साझा करने योग्य अभिभावक प्रगति रिपोर्ट",
  },
  'plans.f.papers': {
    en: "Previous-year papers library",
    hi: "पिछले वर्षों के प्रश्नपत्रों का संग्रह",
  },
  'plans.f.chooseSubjects': {
    en: "Pick the subjects you need; add or drop each month",
    hi: "ज़रूरी विषय चुनें; हर माह जोड़ें या हटाएँ",
  },
  'plans.f.aiFull': {
    en: "AI tutor with a generous daily limit ({n} replies) and backup AI so lessons keep going",
    hi: "उदार दैनिक सीमा ({n} उत्तर) वाला AI ट्यूटर, और बैकअप AI ताकि पाठ चलते रहें",
  },
  'plans.f.adaptive': {
    en: "Learning path that adapts to you, chapter by chapter",
    hi: "आपके अनुसार ढलने वाला, अध्याय-दर-अध्याय सीखने का मार्ग",
  },
  'plans.f.mocks': {
    en: "Timed mock exams with feedback",
    hi: "फ़ीडबैक सहित समयबद्ध मॉक परीक्षाएँ",
  },
  'plans.f.readiness': {
    en: "Board-readiness bands per subject (guidance, not a prediction of marks)",
    hi: "हर विषय के लिए बोर्ड-तैयारी स्तर (मार्गदर्शन, अंकों की भविष्यवाणी नहीं)",
  },
  'plans.f.checkins': {
    en: "Mood, focus and confidence check-ins that shape how a session starts",
    hi: "मूड, ध्यान और आत्मविश्वास के चेक-इन, जो सत्र की शुरुआत तय करते हैं",
  },
  'plans.f.fiveSubjects': {
    en: "Up to 5 subjects (Maths Standard and Basic count as one)",
    hi: "5 विषयों तक (गणित स्टैंडर्ड और बेसिक एक गिने जाते हैं)",
  },
  'plans.f.everythingPaid': {
    en: "Everything in the per-subject plan",
    hi: "प्रति विषय प्लान की सभी सुविधाएँ",
  },
  'plans.f.monthToMonth': {
    en: "Pay month to month, stop any time",
    hi: "माह-दर-माह भुगतान, कभी भी रोकें",
  },
  'plans.f.tillFeb': {
    en: "Available till February 2027",
    hi: "फ़रवरी 2027 तक उपलब्ध",
  },
  'plans.f.onePayment': {
    en: "One payment, nothing to renew each month",
    hi: "एक भुगतान, हर माह नवीनीकरण की ज़रूरत नहीं",
  },
  'plans.f.tillMarch': {
    en: "Access till 31 March 2027, through board exam season",
    hi: "31 मार्च 2027 तक पहुँच, बोर्ड परीक्षा के समय तक",
  },
  'plans.cta.free': {
    en: "Ask for a free account",
    hi: "निःशुल्क खाता माँगें",
  },
  'plans.cta.paid': {
    en: "Ask to join",
    hi: "जुड़ने के लिए पूछें",
  },
  'plans.badge.start': {
    en: "Start here",
    hi: "यहाँ से शुरू करें",
  },
  'plans.badge.best': {
    en: "Best value",
    hi: "सबसे किफ़ायती",
  },
  'plans.home.title': {
    en: "Plans and what you get",
    hi: "प्लान और आपको क्या मिलता है",
  },
  'plans.home.note': {
    en: "Sign-up is by invitation during early access. Ask us for an account and we will set it up and send you a login.",
    hi: "शुरुआती पहुँच के दौरान साइन-अप केवल आमंत्रण पर है। हमसे खाता माँगें; हम उसे बनाकर आपको लॉगिन भेज देंगे।",
  },
  'plans.fairUse': {
    en: "Daily AI limits are a fair-use guard. Free-tier AI can be slower when many students are online. Sahayak does not promise marks or ranks.",
    hi: "दैनिक AI सीमाएँ उचित उपयोग की सुरक्षा हैं। कई विद्यार्थियों के ऑनलाइन होने पर निःशुल्क-स्तर का AI धीमा हो सकता है। सहायक अंकों या रैंक का वादा नहीं करता।",
  },
  'access.dailyAiLimit': {
    en: "You have used today's AI tutor replies. They reset tomorrow morning. Practice quizzes still work, or ask us about a paid plan for more.",
    hi: "आज के AI ट्यूटर उत्तर पूरे हो गए। वे कल सुबह फिर मिलेंगे। अभ्यास क्विज़ अभी भी चलते हैं, या अधिक के लिए हमसे पेड प्लान के बारे में पूछें।",
  },
  'access.upgradeRequired': {
    en: "This is part of the paid plans. Please ask the Sahayak team about upgrading.",
    hi: "यह पेड प्लान का हिस्सा है। कृपया सहायक टीम से अपग्रेड के बारे में पूछें।",
  },
  'onboarding.boardClass': {
    en: "Board and class",
    hi: "बोर्ड और कक्षा",
  },
  'onboarding.examYear': {
    en: "Board exam year",
    hi: "बोर्ड परीक्षा का वर्ष",
  },
  'onboarding.language': {
    en: "Preferred language",
    hi: "पसंदीदा भाषा",
  },
  'onboarding.studyTime': {
    en: "Study time on a normal day",
    hi: "एक सामान्य दिन में पढ़ाई का समय",
  },
  'onboarding.minutes': {
    en: "minutes",
    hi: "मिनट",
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
