// frontend/src/services/speakerService.js

let lastSpeakTime = 0;
const COOLDOWN = 5000; // 5 seconds

const templates = {
    en: (dist) => `Please keep this area clean. There is littering in this area. The nearest dustbin is ${dist} meters away. Please pick up the litter and dispose of it in the dustbin. Thank you for helping to keep your area clean.`,
    hi: (dist) => `कृपया ध्यान दें। इस क्षेत्र में कूड़ा खुले में फेंका गया है। नजदीकी डस्टबिन ${dist} मीटर दूर है। कृपया कूड़ा उठाकर डस्टबिन में डालें और अपने क्षेत्र को स्वच्छ रखने में सहयोग करें। धन्यवाद।`,
    pa: (dist) => `ਕਿਰਪਾ ਕਰਕੇ ਇਸ ਖੇਤਰ ਨੂੰ ਸਾਫ ਰੱਖਣ ਵਿੱਚ ਸਹਾਇਤਾ ਕਰੋ। ਨੇੜਲੇ ਡਸਟਬਿਨ ${dist} ਮੀਟਰ ਦੂਰ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਕੂੜਾ ਚੁੱਕੋ ਅਤੇ ਡਸਟਬਿਨ ਵਿੱਚ ਸੁੱਟੋ। ਤੁਹਾਡਾ ਧੰਨਵਾਦ।`,
    ta: (dist) => `இந்த பகுதியில் குப்பை எரிக்கப்பட்டுள்ளது. அருகிலுள்ள குப்பை தொட்டி ${dist} மீட்டர் தொலைவில் உள்ளது. தயவுசெய்து குப்பையை எடுத்து குப்பை தொட்டியில் வைக்கவும். உங்கள் பகுதியை சுத்தமாக வைத்துக்கொள்ள உதவியமைக்கு நன்றி.`,
    te: (dist) => `దయచేసి ఈ ప్రాంతాన్ని శుభ్రంగా ఉంచడానికి సహాయం చేయండి. సమీప డస్ట్‌బిన్ ${dist} మీటర్ల దూరంలో ఉంది. దయచేసి చెత్తను తీసుకుని డస్ట్‌బిన్‌లో వేయండి. మీ ప్రాంతాన్ని శుభ్రంగా ఉంచడంలో సహాయపడినందుకు ధన్యవాదాలు.`,
    kn: (dist) => `ದಯವಿಟ್ಟು ಈ ಪ್ರದೇಶವನ್ನು ಸ್ವಚ್ಛವಾಗಿಡಲು ಸಹಾಯ ಮಾಡಿ. ಸಮೀಪದ ಡಸ್ಟ್‌ಬಿನ್ ${dist} ಮೀಟರ್ ದೂರದಲ್ಲಿದೆ. ದಯವಿಟ್ಟು ಕಸದನ್ನು ತೆಗೆದು ಡಸ್ಟ್‌ಬಿನ್‌ನಲ್ಲಿ ಹಾಕಿ. ನಿಮ್ಮ ಪ್ರದೇಶವನ್ನು ಸ್ವಚ್ಛವಾಗಿಡಲು ಸಹಾಯ ಮಾಡಿದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು.`,
    ml: (dist) => `ദയവായി ഈ പ്രദേശം ശുചിത്വം പാലിക്കാൻ സഹായിക്കുക. അടുത്തുള്ള ഡസ്റ്റ്ബിൻ ${dist} മീറ്റർ ദൂരത്തിലാണ്. ദയവായി മാലിന്യം എടുത്ത് ഡസ്റ്റ്‌ബിനിൽ ഇടുക. നിങ്ങളുടെ പ്രദേശം ശുചിത്വം പാലിക്കാൻ സഹായിച്ചതിന് നന്ദി.`,
    mr: (dist) => `कृपया या भागात स्वच्छता राखण्यासाठी मदत करा. जवळचा डस्टबिन ${dist} मीटर दूर आहे. कृपया कचरा उचला आणि डस्टबिनमध्ये टाका. आपल्या भागात स्वच्छता राखण्यासाठी मदत केल्याबद्दल धन्यवाद.`,
    gu: (dist) => `કૃપા કરીને આ વિસ્તારમાં સફાઈ જાળવવામાં મદદ કરો. નજીકનો ડસ્ટબિન ${dist} મીટર દૂર છે. કૃપા કરીને કચરો ઉઠાવો અને ડસ્ટબિનમાં નાખો. તમારા વિસ્તારમાં સફાઈ જાળવવામાં મદદ કરવા બદલ આભાર.`,
    bn: (dist) => `দয়া করে এই এলাকাটি পরিষ্কার রাখতে সাহায্য করুন। নিকটবর্তী ডাস্টবিন ${dist} মিটার দূরে রয়েছে। দয়া করে আবর্জনা তুলুন এবং ডাস্টবিনে ফেলুন। আপনার এলাকাটি পরিষ্কার রাখতে সাহায্য করার জন্য ধন্যবাদ।`,
    ur: (dist) => `براہ کرم اس علاقے کو صاف رکھنے میں مدد کریں۔ قریبی ڈسٹ بن ${dist} میٹر دور ہے۔ براہ کرم کچرا اٹھائیں اور ڈسٹ بن میں ڈالیں۔ اپنے علاقے کو صاف رکھنے میں مدد کرنے کے لیے آپ کا شکریہ۔`,        
};  

let voiceList = [];
let voicesLoaded = false;

const loadVoices = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    voiceList = window.speechSynthesis.getVoices();
    if (voiceList.length > 0) {
        voicesLoaded = true;
        console.log(`✅ Voices loaded: ${voiceList.length} voices`);
    } else {
        window.speechSynthesis.onvoiceschanged = () => {
            voiceList = window.speechSynthesis.getVoices();
            voicesLoaded = true;
            console.log(`✅ Voices loaded: ${voiceList.length} voices`);
        };
    }
};
if (typeof window !== 'undefined') loadVoices();

const getVoice = (lang) => {
    const langMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        pa: 'pa-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
        mr: 'mr-IN',
        gu: 'gu-IN',
        bn: 'bn-IN',
        ur: 'ur-IN',
    };
    const target = langMap[lang] || 'en-IN';
    if (!voicesLoaded) {
        voiceList = window.speechSynthesis.getVoices();
        if (voiceList.length > 0) voicesLoaded = true;
    }
    let voice = voiceList.find((v) => v.lang === target);
    if (!voice) {
        const code = lang.split('-')[0];
        voice = voiceList.find((v) => v.lang.startsWith(code));
    }
    return voice || voiceList[0] || null;
};

export const getAnnouncementText = (distance, lang = 'hi') => {
    return templates[lang] ? templates[lang](distance) : templates.en(distance);
};

// ─── Speak a single language ──────────────────────────────────────
export const speakAnnouncement = (distance, lang = 'hi') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        return;
    }
    const now = Date.now();
    if (now - lastSpeakTime < COOLDOWN) {
        console.log(`⏳ Cooldown (${Math.round((COOLDOWN - (now - lastSpeakTime)) / 1000)}s), skipping`);
        return;
    }
    const text = getAnnouncementText(distance, lang);
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getVoice(lang);
    if (voice) utterance.voice = voice;
    const langMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        pa: 'pa-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
        mr: 'mr-IN',
        gu: 'gu-IN',
        bn: 'bn-IN',
        ur: 'ur-IN',
    };
    utterance.lang = langMap[lang] || 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    lastSpeakTime = now;
    console.log(`🔊 Speaking (${lang}): ${text}`);
};

// ─── Speak multiple languages in sequence ────────────────────────
export const speakMultipleLanguages = (distance, languages = ['en', 'hi', 'pa']) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        return;
    }
    const now = Date.now();
    if (now - lastSpeakTime < COOLDOWN) {
        console.log(`⏳ Cooldown active, skipping`);
        return;
    }

    if (!Array.isArray(languages) || languages.length === 0) {
        languages = ['en'];
    }

    // Filter only supported (the templates object keys)
    const supported = Object.keys(templates);
    let langs = languages.filter((l) => supported.includes(l.toLowerCase()));

    if (langs.length === 0) langs = ['en'];

    let index = 0;
    const speakNext = () => {
        if (index >= langs.length) return;
        const lang = langs[index];
        const text = getAnnouncementText(distance, lang);
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getVoice(lang);
        if (voice) utterance.voice = voice;
        const langMap = {
            en: 'en-IN',
            hi: 'hi-IN',
            pa: 'pa-IN',
            ta: 'ta-IN',
            te: 'te-IN',
            kn: 'kn-IN',
            ml: 'ml-IN',
            mr: 'mr-IN',
            gu: 'gu-IN',
            bn: 'bn-IN',
            ur: 'ur-IN',
        };
        utterance.lang = langMap[lang] || 'en-IN';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onend = () => {
            index++;
            setTimeout(speakNext, 500);
        };
        utterance.onerror = () => {
            index++;
            setTimeout(speakNext, 500);
        };
        window.speechSynthesis.speak(utterance);
        console.log(`🔊 Speaking (${lang}): ${text}`);
    };
    window.speechSynthesis.cancel();
    lastSpeakTime = now;
    speakNext();
};

export const speakTest = (lang = 'hi', text = "Hello, this is a test.") => {
    speakAnnouncement(25, lang);
};

export const listVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log('All voices:');
    voices.forEach((v) => console.log(`  ${v.name} (${v.lang})`));
    return voices;
};

if (typeof window !== 'undefined') {
    window.listVoices = listVoices;
}