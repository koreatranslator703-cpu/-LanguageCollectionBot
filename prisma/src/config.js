require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => BigInt(s));
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is missing. Set it in your .env file or Railway variables.');
  process.exit(1);
}

// Core fields asked for EVERY project, in this exact order.
// key = internal field name, labelKey = i18n key used to render the question.
const CORE_FIELDS = [
  { key: 'fullName', labelKey: 'ask_fullName', type: 'text' },
  { key: 'country', labelKey: 'ask_country', type: 'text' },
  { key: 'nativeLanguage', labelKey: 'ask_nativeLanguage', type: 'text' },
  { key: 'otherLanguages', labelKey: 'ask_otherLanguages', type: 'text' },
  { key: 'email', labelKey: 'ask_email', type: 'text' },
  { key: 'telegramUsername', labelKey: 'ask_telegramUsername', type: 'text' },
  {
    key: 'companyOrFreelancer',
    labelKey: 'ask_companyOrFreelancer',
    type: 'choice',
    options: ['Company', 'Freelancer'],
  },
  { key: 'availableHours', labelKey: 'ask_availableHours', type: 'text' },
  { key: 'experience', labelKey: 'ask_experience', type: 'text' },
  { key: 'expectedRate', labelKey: 'ask_expectedRate', type: 'text' },
  { key: 'deliveryTime', labelKey: 'ask_deliveryTime', type: 'text' },
];

const STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEED_MORE_INFO'];

// Accepted upload types, mapped from Telegram message shape -> our fileType label
const FILE_TYPE_MAP = {
  audio: 'audio',
  voice: 'audio',
  video: 'video',
  video_note: 'video',
  photo: 'image',
  document: 'document', // refined further by mime/extension in upload handler
};

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
];

module.exports = {
  BOT_TOKEN,
  ADMIN_IDS,
  PORT,
  CORE_FIELDS,
  STATUSES,
  FILE_TYPE_MAP,
  SUPPORTED_LANGUAGES,
};
