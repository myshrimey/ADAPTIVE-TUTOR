import type { Lang } from '../i18n/dictionary';
import { PLANS } from '../plans/plans';
import { FOUNDER } from '../branding/founder';

// Landing-page / offer-page FAQ. Every answer is deliberately plain and
// non-promotional: no guaranteed marks, no "fully supported" claim for pilot
// subjects, no invented policy. Price, duration and the phone number come from
// the same single sources the rest of the app uses (PLANS, FOUNDER),
// so this text cannot drift from the offer page.

export interface FaqItem {
  q: string;
  a: string;
}

export function getFaq(lang: Lang): FaqItem[] {
  const p1 = PLANS.per_subject_monthly.priceInr;
  const p2 = PLANS.five_monthly.priceInr;
  const p3 = PLANS.five_till_march.priceInr;
  const phone = FOUNDER.contactPhone;

  if (lang === 'hi') {
    return [
      { q: 'सहायक क्या है?', a: 'सहायक CBSE कक्षा 10 के लिए एक अनुकूली AI ट्यूटर है। यह हर विषय में एक छोटा डायग्नोस्टिक करता है, देखता है कि समझ कहाँ कमज़ोर पड़ती है, वहीं से सिखाता है, और माता-पिता को प्रमाण के साथ दिखाता है कि क्या सुधरा और क्या ध्यान माँगता है।' },
      { q: 'इसकी कीमत और अवधि क्या है?', a: `एक निःशुल्क प्लान है (1 विषय, निःशुल्क-स्तर का AI और छोटी दैनिक सीमा, मॉक परीक्षा नहीं) और तीन पेड प्लान हैं: ₹${p1} प्रति विषय प्रति माह; ₹${p2} प्रति माह 5 विषयों तक (फ़रवरी 2027 तक); और ₹${p3} एक बार 5 विषयों तक (मार्च 2027 तक)। कोई स्वचालित नवीनीकरण नहीं है। ये पहले परिवार-समूह के लिए परिचयात्मक मूल्य हैं और बाद में बदल सकते हैं।` },
      { q: 'मैं कैसे जुड़ूँ?', a: 'शुरुआती पहुँच आमंत्रण पर है। हमसे संपर्क करें; हम आपका खाता बनाएँगे और आपका प्लान सक्रिय करेंगे। पहली बार साइन इन करने पर आप अपनी प्रोफ़ाइल पूरी करेंगे और फिर विषय चुनेंगे।' },
      { q: 'कौन-से विषय उपलब्ध हैं?', a: 'गणित (स्टैंडर्ड और बेसिक) और विज्ञान "तैयार" हैं। सामाजिक विज्ञान, अंग्रेज़ी, हिंदी (कोर्स A), कंप्यूटर एप्लिकेशन और गणित (बेसिक) "पायलट" में हैं — इनके प्रश्नों की समीक्षा अभी जारी है, इसलिए इन्हें पूरी तरह समर्थित न समझें। हर विषय पर उसकी स्थिति दिखाई जाती है।' },
      { q: 'गणित स्टैंडर्ड और बेसिक में क्या अंतर है?', a: 'दोनों में अध्याय एक जैसे हैं। बेसिक में प्रश्न आसान और सीधे होते हैं; स्टैंडर्ड में पूरे कठिनाई स्तर के प्रश्न आते हैं। आप स्कूल में जो स्तर चुन रहे हैं, वही चुनें।' },
      { q: 'क्या सहायक अंकों या रैंक की गारंटी देता है?', a: 'नहीं। हम बोर्ड अंकों की भविष्यवाणी या वादा नहीं करते। हम दिखाते हैं कि अब तक के प्रमाण क्या कहते हैं — और जब प्रमाण कम होता है तो साफ़ कहते हैं "अभी पर्याप्त प्रमाण नहीं"।' },
      { q: 'मॉक परीक्षा क्या है?', a: 'विषय के अध्यायों में फैले वस्तुनिष्ठ-शैली प्रश्नों (बहुविकल्पीय, संख्यात्मक, लघु उत्तर) का समयबद्ध अभ्यास पत्र। यह CBSE बोर्ड पेपर की नकल नहीं है और इसका परिणाम आपकी सीखने की प्रगति नहीं बदलता।' },
      { q: 'क्या यह स्कूल या शिक्षक की जगह लेता है?', a: 'नहीं। यह स्कूल और कोचिंग के साथ अभ्यास और समझ में मदद के लिए है, उनके विकल्प के रूप में नहीं।' },
      { q: 'बच्चे का डेटा कितना सुरक्षित है?', a: 'हम केवल वही जानकारी लेते हैं जो सीखने के लिए ज़रूरी है, और हर विद्यार्थी का डेटा दूसरे से अलग रहता है। विवरण गोपनीयता नीति में है।' },
      { q: 'भुगतान कैसे करें और धनवापसी का क्या?', a: `भुगतान विवरण के लिए सीधे हमसे संपर्क करें (${phone}); हम UPI/QR व्यक्तिगत रूप से साझा करेंगे। भुगतान जमा करने के बाद हम उसे जाँचकर पुष्टि करते हैं। धनवापसी व्यक्तिगत रूप से संभाली जाती है — भुगतान नीति देखें।` },
      { q: 'कौन-सी भाषाएँ समर्थित हैं?', a: 'ऐप अंग्रेज़ी और हिंदी में उपलब्ध है। प्रश्न अभी ज़्यादातर अंग्रेज़ी में दिखाए जाते हैं।' },
      { q: 'मदद या सवाल के लिए किससे संपर्क करें?', a: `${FOUNDER.name} से ${phone} पर संपर्क करें।` },
    ];
  }

  return [
    { q: 'What is Sahayak?', a: 'Sahayak is an adaptive AI tutor for CBSE Class 10. It runs a short diagnostic in each subject, finds where understanding starts to wobble, teaches from there, and shows parents the evidence — what has improved and what needs attention.' },
    { q: 'What does it cost and how long does it last?', a: `There is a Free plan (1 subject, free-tier AI with a small daily limit, no mock exams) and three paid plans: ₹${p1} per subject per month; ₹${p2} per month for up to 5 subjects (till February 2027); or ₹${p3} one time for up to 5 subjects (till March 2027). There is no automatic renewal. These are introductory prices for the first group of families and may change later.` },
    { q: 'How do I join?', a: 'Early access is by invitation. Contact us and we will create your account and activate your plan. On your first sign-in you complete your profile and then choose your subjects.' },
    { q: 'Which subjects are available?', a: 'Mathematics (Standard) and Science are "Ready". Social Science, English, Hindi (Course A), Computer Applications and Mathematics (Basic) are in "Pilot" — their questions are still being reviewed, so please do not treat them as fully supported yet. Every subject shows its status.' },
    { q: 'What is the difference between Maths Standard and Basic?', a: 'Both cover the same chapters. Basic uses easier, more direct questions; Standard uses the full range of difficulty. Choose the level your school has you taking.' },
    { q: 'Does Sahayak guarantee marks or a rank?', a: 'No. We do not predict or promise board marks. We show what the evidence so far says — and when there is little evidence we say "not enough evidence yet" instead of guessing.' },
    { q: 'What is a mock exam here?', a: 'A timed practice paper of objective-style questions (multiple-choice, numeric, short answer) spread across the chapters. It is not a copy of the CBSE board paper, and its result does not change your learning progress.' },
    { q: 'Does it replace school or a teacher?', a: 'No. It is for practice and understanding alongside school and tuition, not instead of them.' },
    { q: "How is my child's data handled?", a: "We collect only what is needed for learning, and each student's data is kept separate from every other student's. Details are in the privacy policy." },
    { q: 'How do I pay, and what about refunds?', a: `Contact us directly for payment details (${phone}); we will share our UPI/QR with you personally. After you submit your payment, we check it and confirm. Refunds are handled individually — see the payment policy.` },
    { q: 'Which languages are supported?', a: 'The app works in English and Hindi. Questions are mostly shown in English for now.' },
    { q: 'Who do I contact for help or questions?', a: `Contact ${FOUNDER.name} on ${phone}.` },
  ];
}
