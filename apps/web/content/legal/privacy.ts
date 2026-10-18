import type { LegalContent } from '@/components/LegalPageLayout';

export const PRIVACY_EN: LegalContent = {
  title: 'Privacy Policy',
  lastUpdated: 'Draft — last updated 12 October 2026. Pending founder review before publication.',
  intro: 'This explains, in plain language, what information Sahayak collects and why.',
  sections: [
    {
      heading: '1. What we collect',
      body: [
        'Account details: a username, a securely hashed password (via Supabase Authentication — we never see or store your plain password), and an email address only if you choose to give one. At sign-up we also record that a parent or guardian agreed, and when. To limit abuse we keep a one-way scrambled form of the internet address used to sign up for up to 2 days, and for each login we keep the browser description, internet address and dates of the (at most 2) devices used.',
        'Learning data: diagnostic answers, learning-session activity, quiz results, and the resulting mastery scores per skill — this is what lets Sahayak adapt to a student.',
        'Optional profile details: school, family/contact information, and academic history for classes 6–9, provided voluntarily on the Profile page. This is used only to help us understand our users and to improve and describe the product — it is never used to decide what a student is taught.',
        'Payment records: for a paid pilot, we record the amount, date, an optional minimal transaction reference, and status (pending/confirmed) — never a UPI PIN, password, OTP, or full bank/card details.',
      ],
    },
    {
      heading: '2. How learning records are used',
      body: [
        'Diagnostic and session data is used to calculate mastery scores and choose what a student practices next. Question text and student answers may be sent to an AI provider (Google Gemini, with Groq as a backup) to generate explanations and tutoring responses.',
      ],
    },
    {
      heading: '3. How a parent can contact us about a child\'s account',
      body: ['A parent can reach us using the details on the Help & Contact page to ask about, correct, or request deletion of a child\'s account and data.'],
    },
    {
      heading: '4. Data access and deletion',
      body: [
        'We collect the minimum information needed to run the product. From the "My data" page a family can download a copy of the student\'s data and ask for it to be deleted; the founder carries out deletion by hand and confirms. Some records (for example payment records) may have to be kept longer for accounting reasons; this section will say so once that is decided.',
      ],
    },
    {
      heading: '5. Security',
      body: [
        'Student data is protected by database-level access rules (Row Level Security) so that one student\'s records cannot be read by another. We do not claim compliance with any specific certification at this stage.',
      ],
    },
    {
      heading: '6. Changes',
      body: ['This policy may be updated as the product develops; material changes will be reflected here with an updated date.'],
    },
  ],
};

export const PRIVACY_HI: LegalContent = {
  title: 'गोपनीयता नीति',
  lastUpdated: 'मसौदा — अंतिम अपडेट 12 अक्टूबर 2026। प्रकाशन से पहले संस्थापक की समीक्षा लंबित है।',
  intro: 'यह सरल भाषा में बताता है कि सहायक क्या जानकारी एकत्र करता है और क्यों।',
  sections: [
    {
      heading: '1. हम क्या एकत्र करते हैं',
      body: [
        'खाता विवरण: ईमेल पता और सुरक्षित रूप से हैश किया गया पासवर्ड (Supabase Authentication के माध्यम से — हम कभी भी आपका सादा पासवर्ड नहीं देखते या संग्रहीत नहीं करते)।',
        'अध्ययन डेटा: डायग्नोस्टिक उत्तर, लर्निंग-सत्र गतिविधि, क्विज़ परिणाम, और प्रत्येक कौशल के लिए परिणामी दक्षता स्कोर — यही सहायक को छात्र के अनुसार अनुकूलित करने देता है।',
        'वैकल्पिक प्रोफ़ाइल विवरण: स्कूल, परिवार/संपर्क जानकारी, और कक्षा 6-9 की शैक्षणिक जानकारी, जो प्रोफ़ाइल पृष्ठ पर स्वेच्छा से दी जाती है। इसका उपयोग केवल हमारे उपयोगकर्ताओं को समझने और उत्पाद सुधारने के लिए होता है — यह कभी भी यह तय करने के लिए उपयोग नहीं किया जाता कि छात्र को क्या सिखाया जाए।',
        'भुगतान रिकॉर्ड: सशुल्क पायलट के लिए, हम राशि, तारीख, एक वैकल्पिक न्यूनतम लेनदेन संदर्भ, और स्थिति (लंबित/सत्यापित) रिकॉर्ड करते हैं — कभी भी UPI पिन, पासवर्ड, OTP, या पूर्ण बैंक/कार्ड विवरण नहीं।',
      ],
    },
    {
      heading: '2. अध्ययन रिकॉर्ड का उपयोग कैसे होता है',
      body: ['डायग्नोस्टिक और सत्र डेटा का उपयोग दक्षता स्कोर की गणना करने और यह चुनने के लिए किया जाता है कि छात्र आगे क्या अभ्यास करे। प्रश्न पाठ और छात्र के उत्तर स्पष्टीकरण और ट्यूटरिंग प्रतिक्रियाएँ बनाने के लिए एक AI प्रदाता (Google Gemini, बैकअप के रूप में Groq) को भेजे जा सकते हैं।'],
    },
    {
      heading: '3. माता-पिता बच्चे के खाते के बारे में हमसे कैसे संपर्क कर सकते हैं',
      body: ['एक माता-पिता सहायता और संपर्क पृष्ठ पर दिए गए विवरण का उपयोग करके बच्चे के खाते और डेटा के बारे में पूछताछ, सुधार, या हटाने का अनुरोध करने के लिए हमसे संपर्क कर सकते हैं।'],
    },
    {
      heading: '4. डेटा एक्सेस और हटाना',
      body: ['हम उत्पाद चलाने के लिए आवश्यक न्यूनतम जानकारी एकत्र करते हैं। खाता हटाने और डेटा-निर्यात अनुरोध, जहाँ समर्थित हों, सहायता और संपर्क पृष्ठ के माध्यम से किए जा सकते हैं; हम इस प्रारंभिक-पहुँच चरण के दौरान मैन्युअल रूप से पुष्टि करेंगे कि हम क्या कर सकते हैं।'],
    },
    {
      heading: '5. सुरक्षा',
      body: ['छात्र डेटा डेटाबेस-स्तरीय एक्सेस नियमों (Row Level Security) द्वारा सुरक्षित है ताकि एक छात्र के रिकॉर्ड दूसरे द्वारा न पढ़े जा सकें। हम इस चरण में किसी विशिष्ट प्रमाणन के अनुपालन का दावा नहीं करते।'],
    },
    {
      heading: '6. बदलाव',
      body: ['उत्पाद के विकसित होने के साथ यह नीति अपडेट की जा सकती है; महत्वपूर्ण बदलाव यहाँ अपडेटेड तारीख के साथ दिखाए जाएँगे।'],
    },
  ],
};
