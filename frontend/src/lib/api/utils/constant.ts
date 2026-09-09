export const LANGUAGES = [
  "English",
  "Khmer",
  "Japanese",
  "Chinese",
  "Korean",
  "Vietnamese",
  "French",
  "Spanish",
  "German",
  "Portuguese",
  "Russian",
  "Arabic",
  "Hindi",
  "Indonesian",
];

// BCP-47 codes for the Web Speech API's SpeechRecognition.lang — this is
// what's speaking into the mic, so it only needs to cover source languages,
// but we keep it complete for every entry in LANGUAGES since either side
// can be picked as the "speaking" language via the swap button.
export const LANGUAGE_SPEECH_CODES: Record<string, string> = {
  English: "en-US",
  Khmer: "km-KH",
  Japanese: "ja-JP",
  Chinese: "zh-CN",
  Korean: "ko-KR",
  Vietnamese: "vi-VN",
  French: "fr-FR",
  Spanish: "es-ES",
  German: "de-DE",
  Portuguese: "pt-BR",
  Russian: "ru-RU",
  Arabic: "ar-SA",
  Hindi: "hi-IN",
  Indonesian: "id-ID",
};

// Colors assigned to participants in Live Translate's speaker identification,
// cycled by join order — chosen to read clearly against the app's warm
// background/card tones while staying visually distinct from the terracotta
// --accent used for translated text.
export const SPEAKER_COLORS = ["#C85A3A", "#3A7CA8", "#6B8E4E", "#A65B8C", "#C9A227", "#5B6B8A"];

// Languages whose speech is routed through Gemini-based audio transcription
// (record + VAD-segment + POST /transcribe) instead of the Web Speech API —
// currently just Khmer, whose recognition quality in Chrome's built-in
// engine is too poor to use (it frequently drifts into Vietnamese/Thai
// script or gibberish). Extend this set if other languages turn out to need
// the same treatment.
export const GEMINI_TRANSCRIPTION_LANGUAGES = new Set<string>(["Khmer"]);

// Demo phrases and translations for the mock demo mode
export const DEMO_PHRASES = [
  "Hello, how are you?",
  "Good morning!",
  "What's your name?",
  "Nice to meet you!",
  "Thank you very much",
  "You're welcome",
  "See you later",
  "Have a great day!"
];

export const DEMO_TRANSLATIONS: Record<string, string[]> = {
  English: DEMO_PHRASES,
  Khmer: [
    "សួស្ដី តើអ្នកសប្បាយរីករាយដែរឬទេ?",
    "សួស្ដីព្រឹក!",
    "តើឈ្មោះអ្នកគឺលេច?",
    "រីករាយក្នុងការស្គាល់អ្នក!",
    "សូមស្វាគមន៍",
    "មិនដូច្នេះទេ",
    "ឃើញ​ថ្ងៃក្រោយ",
    "មានថ្ងៃដ៍ល្អប្រសើរ!"
  ],
  Japanese: [
    "こんにちは、お元気ですか？",
    "おはようございます！",
    "お名前は何ですか？",
    "お会いして嬉しいです！",
    "ありがとうございます",
    "どういたしまして",
    "また後で",
    "良い一日を過ごしてください！"
  ],
  Chinese: [
    "你好，你好吗？",
    "早上好！",
    "你的名字是什么？",
    "很高兴认识你！",
    "非常感谢",
    "不客气",
    "再见",
    "祝你有美好的一天！"
  ],
  Korean: [
    "안녕하세요, 어떻게 지내세요?",
    "좋은 아침입니다!",
    "성함이 뭐세요?",
    "만나서 반갑습니다!",
    "감사합니다",
    "천만에요",
    "나중에 봐요",
    "좋은 하루 되세요!"
  ],
  Vietnamese: [
    "Xin chào, bạn khỏe không?",
    "Chào buổi sáng!",
    "Tên bạn là gì?",
    "Rất vui được gặp bạn!",
    "Cảm ơn bạn rất nhiều",
    "Không có gì",
    "Tạm biệt",
    "Có một ngày tuyệt vời!"
  ],
  French: [
    "Bonjour, comment allez-vous?",
    "Bonjour!",
    "Quel est votre nom?",
    "Enchanté de vous rencontrer!",
    "Merci beaucoup",
    "De rien",
    "À bientôt",
    "Bonne journée!"
  ],
  Spanish: [
    "Hola, ¿cómo estás?",
    "¡Buenos días!",
    "¿Cuál es tu nombre?",
    "¡Encantado de conocerte!",
    "Muchas gracias",
    "De nada",
    "Hasta luego",
    "¡Que tengas un gran día!"
  ],
  German: [
    "Hallo, wie geht es dir?",
    "Guten Morgen!",
    "Wie heißt du?",
    "Schön, dich kennenzulernen!",
    "Vielen Dank",
    "Gerne geschehen",
    "Bis später",
    "Hab einen schönen Tag!"
  ],
  Portuguese: [
    "Olá, como você está?",
    "Bom dia!",
    "Qual é o seu nome?",
    "Prazer em conhecê-lo!",
    "Muito obrigado",
    "De nada",
    "Até mais tarde",
    "Tenha um ótimo dia!"
  ],
  Russian: [
    "Привет, как дела?",
    "Доброе утро!",
    "Как вас зовут?",
    "Рад познакомиться!",
    "Спасибо большое",
    "Пожалуйста",
    "До свидания",
    "Хорошего дня!"
  ],
  Arabic: [
    "مرحبا، كيف حالك؟",
    "صباح الخير!",
    "ما اسمك؟",
    "يسعدني التعرف عليك!",
    "شكرا جزيلا",
    "عفوا",
    "إلى اللقاء",
    "يوم سعيد!"
  ],
  Hindi: [
    "नमस्ते, आप कैसे हैं?",
    "शुभ प्रभात!",
    "आपका नाम क्या है?",
    "आपको जानकर खुशी हुई!",
    "धन्यवाद",
    "आपका स्वागत है",
    "फिर मिलेंगे",
    "आपका दिन शुभ हो!"
  ],
  Indonesian: [
    "Halo, apa kabar Anda?",
    "Selamat pagi!",
    "Siapa nama Anda?",
    "Senang berkenalan dengan Anda!",
    "Terima kasih banyak",
    "Sama-sama",
    "Sampai jumpa",
    "Semoga hari Anda menyenangkan!"
  ]
};


export const BAR_HEIGHTS = [14, 28, 20, 36, 16, 40, 22, 32, 18, 38, 24, 30, 12, 34, 26, 40, 18, 28, 36, 20, 32, 16, 38, 24, 14, 30, 22, 34];
export const BAR_DURATIONS = [0.55, 0.7, 0.62, 0.8, 0.58, 0.9, 0.65, 0.75, 0.6, 0.85, 0.68, 0.72, 0.52, 0.78, 0.64, 0.88, 0.6, 0.7, 0.82, 0.63, 0.74, 0.57, 0.87, 0.66, 0.53, 0.76, 0.61, 0.8];
export const BAR_DELAYS = [0, 0.08, 0.04, 0.12, 0.02, 0.16, 0.06, 0.1, 0.03, 0.14, 0.07, 0.11, 0.01, 0.13, 0.05, 0.17, 0.09, 0.15, 0.12, 0.04, 0.1, 0.06, 0.18, 0.08, 0.02, 0.14, 0.05, 0.16];