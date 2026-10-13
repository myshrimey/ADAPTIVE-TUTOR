import type { LegalContent } from '@/components/LegalPageLayout';

export const PAYMENT_POLICY_EN: LegalContent = {
  title: 'Payment, Refund, Cancellation and Expiry Policy',
  lastUpdated: 'Draft — last updated 12 October 2026. Pending founder review before publication.',
  intro: 'Payments for the Sahayak pilot are handled manually, by design, during this early-access phase.',
  sections: [
    {
      heading: 'How payment works',
      body: [
        '1. You see the pilot offer, its duration, price, and limitations.',
        '2. You contact us directly and we share our verified UPI ID or QR code with you personally — Sahayak does not display or generate this automatically.',
        '3. You pay using your own UPI app.',
        '4. You submit a simple payment confirmation form in the app (amount, date, and an optional transaction reference — never a screenshot, UPI PIN, or banking password).',
        '5. Your account shows "Payment pending verification."',
        '6. We manually verify receipt of the payment in our own bank/payment app.',
        '7. Once verified, we confirm it through a secure, founder-only process. A payment can never be confirmed by a student or parent themselves.',
        '8. Access is activated only after this verification, and your account will show the access start date and expiry date.',
      ],
    },
    {
      heading: 'Refunds',
      body: [
        'Refund terms are still being finalized for this early-access pilot. Until a formal policy is published, please contact us directly about any payment issue and we will handle it individually and in good faith.',
      ],
    },
    {
      heading: 'Cancellation',
      body: ['The pilot does not auto-renew, so there is nothing to actively cancel — access simply ends on the stated expiry date unless you choose to continue.'],
    },
    {
      heading: 'Expiry',
      body: ['Pilot access lasts for the number of days stated in the offer (currently 30 days) from the date payment is confirmed, shown on your account.'],
    },
    {
      heading: 'Support',
      body: ['For any payment question, contact us using the details on the Help & Contact page.'],
    },
  ],
};

export const PAYMENT_POLICY_HI: LegalContent = {
  title: 'भुगतान, धनवापसी, रद्दीकरण और समाप्ति नीति',
  lastUpdated: 'मसौदा — अंतिम अपडेट 12 अक्टूबर 2026। प्रकाशन से पहले संस्थापक की समीक्षा लंबित है।',
  intro: 'इस प्रारंभिक-पहुँच चरण के दौरान सहायक पायलट के भुगतान जानबूझकर मैन्युअल रूप से संभाले जाते हैं।',
  sections: [
    {
      heading: 'भुगतान कैसे काम करता है',
      body: [
        '1. आप पायलट ऑफ़र, उसकी अवधि, मूल्य और सीमाएँ देखते हैं।',
        '2. आप सीधे हमसे संपर्क करते हैं और हम अपना सत्यापित UPI ID या QR कोड व्यक्तिगत रूप से आपके साथ साझा करते हैं — सहायक इसे स्वचालित रूप से प्रदर्शित या जनरेट नहीं करता।',
        '3. आप अपने UPI ऐप का उपयोग करके भुगतान करते हैं।',
        '4. आप ऐप में एक सरल भुगतान पुष्टिकरण फ़ॉर्म सबमिट करते हैं (राशि, तारीख, और एक वैकल्पिक लेनदेन संदर्भ — कभी भी स्क्रीनशॉट, UPI पिन, या बैंकिंग पासवर्ड नहीं)।',
        '5. आपका खाता "भुगतान सत्यापन लंबित" दिखाता है।',
        '6. हम अपने बैंक/भुगतान ऐप में भुगतान की प्राप्ति को मैन्युअल रूप से सत्यापित करते हैं।',
        '7. सत्यापित होने के बाद, हम इसे एक सुरक्षित, केवल-संस्थापक प्रक्रिया के माध्यम से पुष्टि करते हैं। कोई भुगतान छात्र या अभिभावक द्वारा स्वयं पुष्ट नहीं किया जा सकता।',
        '8. एक्सेस केवल इस सत्यापन के बाद सक्रिय होता है, और आपका खाता एक्सेस शुरू होने की तारीख और समाप्ति तारीख दिखाएगा।',
      ],
    },
    {
      heading: 'धनवापसी',
      body: ['इस प्रारंभिक-पहुँच पायलट के लिए धनवापसी की शर्तें अभी अंतिम रूप दी जा रही हैं। औपचारिक नीति प्रकाशित होने तक, कृपया किसी भी भुगतान समस्या के बारे में सीधे हमसे संपर्क करें और हम इसे व्यक्तिगत रूप से और सद्भावना से संभालेंगे।'],
    },
    {
      heading: 'रद्दीकरण',
      body: ['पायलट स्वचालित रूप से नवीनीकृत नहीं होता, इसलिए सक्रिय रूप से रद्द करने के लिए कुछ नहीं है — एक्सेस बताई गई समाप्ति तारीख पर बस समाप्त हो जाता है जब तक आप जारी रखना न चुनें।'],
    },
    {
      heading: 'समाप्ति',
      body: ['पायलट एक्सेस ऑफ़र में बताए गए दिनों (फिलहाल 30 दिन) तक चलता है, भुगतान सत्यापित होने की तारीख से, जो आपके खाते पर दिखाया जाता है।'],
    },
    {
      heading: 'सहायता',
      body: ['किसी भी भुगतान प्रश्न के लिए, सहायता और संपर्क पृष्ठ पर दिए गए विवरण का उपयोग करके हमसे संपर्क करें।'],
    },
  ],
};
