import type { LanguageCode } from '../shared/constants.ts';

export type TranslationKeys = {
  brandName: string;
  navHome: string;
  navAbout: string;
  navEmergency: string;
  navLanguage: string;
  navLogin: string;
  navGetStarted: string;
  navDashboard: string;
  navProfile: string;
  navHealthRecords: string;
  navAddRecord: string;
  navUploadDocument: string;
  navOcrResults: string;
  navAiSummaries: string;
  navConsents: string;
  navEmergencyQr: string;
  navWorkerSearch: string;
  navAccessRequests: string;
  navAuthorizedRecords: string;
  navUserManagement: string;
  navAuditLogs: string;
  navNotifications: string;
  navSettings: string;
  navSignOut: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  workerRoleTitle: string;
  providerRoleTitle: string;
  adminRoleTitle: string;
  loginTitle: string;
  loginSubtitle: string;
  continueWithGoogle: string;
  emailLabel: string;
  passwordLabel: string;
  signInBtn: string;
  forgotPasswordLink: string;
  registerWorkerLink: string;
  registerProviderLink: string;
  saveChanges: string;
  cancel: string;
  deleteBtn: string;
  editBtn: string;
  viewBtn: string;
  searchPlaceholder: string;
  allCategories: string;
  newestFirst: string;
  oldestFirst: string;
  loadingText: string;
  noDataYet: string;
  grantConsentBtn: string;
  revokeConsentBtn: string;
  approveBtn: string;
  rejectBtn: string;
  generateQrBtn: string;
  downloadQrBtn: string;
  revokeQrBtn: string;
  runOcrBtn: string;
  generateSummaryBtn: string;
  regenerateSummaryBtn: string;
  markAllRead: string;
  aiDisclaimer: string;
  emergencyCardTitle: string;
  emergencyRestrictedNotice: string;
  bloodGroupLabel: string;
  allergiesLabel: string;
  chronicConditionsLabel: string;
  emergencyContactLabel: string;
  emergencyIdLabel: string;
  languageSavedToast: string;
  genericError: string;
};

const en: TranslationKeys = {
  brandName: 'CareBridge',
  navHome: 'Home',
  navAbout: 'About',
  navEmergency: 'Emergency Card',
  navLanguage: 'Language',
  navLogin: 'Sign In',
  navGetStarted: 'Get Started',
  navDashboard: 'Dashboard',
  navProfile: 'My Profile',
  navHealthRecords: 'Health Records',
  navAddRecord: 'Add Record',
  navUploadDocument: 'Upload Document',
  navOcrResults: 'OCR & Documents',
  navAiSummaries: 'AI Summaries',
  navConsents: 'Consent Control',
  navEmergencyQr: 'Emergency QR',
  navWorkerSearch: 'Worker Search',
  navAccessRequests: 'Access Requests',
  navAuthorizedRecords: 'Authorized Records',
  navUserManagement: 'User Management',
  navAuditLogs: 'Audit Logs',
  navNotifications: 'Notifications',
  navSettings: 'Settings',
  navSignOut: 'Sign Out',
  heroTitle: 'Portable medical records built for migrant workers across Kerala',
  heroSubtitle:
    'Keep prescriptions, lab reports, allergies, and discharge summaries in one private multilingual health vault. Share only selected records with doctors through explicit time-bound consent.',
  heroPrimaryCta: 'Register as Worker',
  heroSecondaryCta: 'Provider Portal',
  workerRoleTitle: 'Migrant Worker',
  providerRoleTitle: 'Healthcare Provider',
  adminRoleTitle: 'System Administrator',
  loginTitle: 'Sign in to CareBridge',
  loginSubtitle: 'Access your portable health vault, provider portal, or system workspace.',
  continueWithGoogle: 'Continue with Google',
  emailLabel: 'Email address',
  passwordLabel: 'Password',
  signInBtn: 'Sign In',
  forgotPasswordLink: 'Forgot password?',
  registerWorkerLink: 'Register as Worker',
  registerProviderLink: 'Register as Provider',
  saveChanges: 'Save Changes',
  cancel: 'Cancel',
  deleteBtn: 'Delete',
  editBtn: 'Edit',
  viewBtn: 'View Details',
  searchPlaceholder: 'Search records, diagnosis, doctor, or hospital...',
  allCategories: 'All Categories',
  newestFirst: 'Newest first',
  oldestFirst: 'Oldest first',
  loadingText: 'Loading data...',
  noDataYet: 'No records found yet.',
  grantConsentBtn: 'Grant Consent',
  revokeConsentBtn: 'Revoke Access',
  approveBtn: 'Approve',
  rejectBtn: 'Decline',
  generateQrBtn: 'Regenerate QR',
  downloadQrBtn: 'Download QR PNG',
  revokeQrBtn: 'Revoke QR',
  runOcrBtn: 'Extract Text (OCR)',
  generateSummaryBtn: 'Generate AI Summary',
  regenerateSummaryBtn: 'Regenerate Summary',
  markAllRead: 'Mark all read',
  aiDisclaimer:
    'AI-generated summaries are for informational support only and must be reviewed by a qualified healthcare professional.',
  emergencyCardTitle: 'Emergency Medical Information',
  emergencyRestrictedNotice:
    'Restricted emergency view. Complete medical history, prescriptions, and private documents are never exposed via QR codes.',
  bloodGroupLabel: 'Blood Group',
  allergiesLabel: 'Known Allergies',
  chronicConditionsLabel: 'Chronic Conditions',
  emergencyContactLabel: 'Emergency Contact',
  emergencyIdLabel: 'Emergency Identifier',
  languageSavedToast: 'Interface language updated.',
  genericError: 'Something went wrong. Please try again.',
};

const ml: TranslationKeys = {
  brandName: 'CareBridge',
  navHome: 'ഹോം',
  navAbout: 'പദ്ധതിയെക്കുറിച്ച്',
  navEmergency: 'അടിയന്തര കാർഡ്',
  navLanguage: 'ഭാഷ',
  navLogin: 'ലോഗിൻ',
  navGetStarted: 'ആരംഭിക്കുക',
  navDashboard: 'ഡാഷ്‌ബോർഡ്',
  navProfile: 'എന്റെ പ്രൊഫൈൽ',
  navHealthRecords: 'ആരോഗ്യ രേഖകൾ',
  navAddRecord: 'രേഖ ചേർക്കുക',
  navUploadDocument: 'രേഖ അപ്‌ലോഡ് ചെയ്യുക',
  navOcrResults: 'OCR രേഖകൾ',
  navAiSummaries: 'AI സംഗ്രഹങ്ങൾ',
  navConsents: 'സമ്മത നിയന്ത്രണം',
  navEmergencyQr: 'അടിയന്തര QR',
  navWorkerSearch: 'തൊഴിലാളി തിരയൽ',
  navAccessRequests: 'അനുമതി അഭ്യർത്ഥനകൾ',
  navAuthorizedRecords: 'അനുമതിയുള്ള രേഖകൾ',
  navUserManagement: 'ഉപയോക്തൃ നിയന്ത്രണം',
  navAuditLogs: 'ഓഡിറ്റ് ലോഗുകൾ',
  navNotifications: 'അറിയിപ്പുകൾ',
  navSettings: 'ക്രമീകരണങ്ങൾ',
  navSignOut: 'ലോഗ് ഔട്ട്',
  heroTitle: 'കേരളത്തിലെ അതിഥി തൊഴിലാളികൾക്കുള്ള സുരക്ഷിത ഡിജിറ്റൽ ആരോഗ്യ രേഖകൾ',
  heroSubtitle:
    'മരുന്നുകൾ, ലാബ് റിപ്പോർട്ടുകൾ, അലർജികൾ, ആശുപത്രി രേഖകൾ എന്നിവ ഒരിടത്ത് സുരക്ഷിതമായി സൂക്ഷിക്കുക. നിങ്ങളുടെ വ്യക്തമായ സമ്മതത്തോടെ മാത്രം ഡോക്ടർമാരുമായി പങ്കിടുക.',
  heroPrimaryCta: 'തൊഴിലാളിയായി രജിസ്റ്റർ ചെയ്യുക',
  heroSecondaryCta: 'ആരോഗ്യ പ്രവർത്തക പോർട്ടൽ',
  workerRoleTitle: 'അതിഥി തൊഴിലാളി',
  providerRoleTitle: 'ആരോഗ്യ പ്രവർത്തകൻ',
  adminRoleTitle: 'സിസ്റ്റം അഡ്മിൻ',
  loginTitle: 'CareBridge-ൽ ലോഗിൻ ചെയ്യുക',
  loginSubtitle: 'നിങ്ങളുടെ ആരോഗ്യ രേഖകളിലേക്കോ പ്രൊവൈഡർ പോർട്ടലിലേക്കോ പ്രവേശിക്കുക.',
  continueWithGoogle: 'Google വഴി തുടരുക',
  emailLabel: 'ഇമെയിൽ വിലാസം',
  passwordLabel: 'പാസ്‌വേഡ്',
  signInBtn: 'ലോഗിൻ ചെയ്യുക',
  forgotPasswordLink: 'പാസ്‌വേഡ് മറന്നോ?',
  registerWorkerLink: 'തൊഴിലാളി രജിസ്ട്രേഷൻ',
  registerProviderLink: 'ഡോക്ടർ / ആശുപത്രി രജിസ്ട്രേഷൻ',
  saveChanges: 'മാറ്റങ്ങൾ സേവ് ചെയ്യുക',
  cancel: 'റദ്ദാക്കുക',
  deleteBtn: 'നീക്കം ചെയ്യുക',
  editBtn: 'തിരുത്തുക',
  viewBtn: 'വിശദാംശങ്ങൾ കാണുക',
  searchPlaceholder: 'രേഖകൾ, രോഗനിർണയം, ഡോക്ടർ അല്ലെങ്കിൽ ആശുപത്രി തിരയുക...',
  allCategories: 'എല്ലാ വിഭാഗങ്ങളും',
  newestFirst: 'പുതിയത് ആദ്യം',
  oldestFirst: 'പഴയത് ആദ്യം',
  loadingText: 'വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു...',
  noDataYet: 'ഇതുവരെ രേഖകളൊന്നും ചേർത്തിട്ടില്ല.',
  grantConsentBtn: 'സമ്മതം നൽകുക',
  revokeConsentBtn: 'അനുമതി പിൻവലിക്കുക',
  approveBtn: 'അംഗീകരിക്കുക',
  rejectBtn: 'നിരസിക്കുക',
  generateQrBtn: 'പുതിയ QR നിർമ്മിക്കുക',
  downloadQrBtn: 'QR ഡൗൺലോഡ് ചെയ്യുക',
  revokeQrBtn: 'QR റദ്ദാക്കുക',
  runOcrBtn: 'ടെക്സ്റ്റ് വേർതിരിക്കുക (OCR)',
  generateSummaryBtn: 'AI സംഗ്രഹം തയ്യാറാക്കുക',
  regenerateSummaryBtn: 'സംഗ്രഹം വീണ്ടും തയ്യാറാക്കുക',
  markAllRead: 'എല്ലാം വായിച്ചതായി അടയാളപ്പെടുത്തുക',
  aiDisclaimer:
    'AI-generated summaries are for informational support only and must be reviewed by a qualified healthcare professional.',
  emergencyCardTitle: 'അടിയന്തര വൈദ്യ വിവരങ്ങൾ',
  emergencyRestrictedNotice:
    'നിയന്ത്രിത അടിയന്തര വിവരങ്ങൾ മാത്രം. പൂർണ്ണ ആരോഗ്യ രേഖകൾ QR കോഡ് വഴി ലഭ്യമല്ല.',
  bloodGroupLabel: 'രക്തഗ്രൂപ്പ്',
  allergiesLabel: 'അലർജികൾ',
  chronicConditionsLabel: 'ദീർഘകാല രോഗങ്ങൾ',
  emergencyContactLabel: 'അടിയന്തര ബന്ധപ്പെടൽ',
  emergencyIdLabel: 'അടിയന്തര തിരിച്ചറിയൽ നമ്പർ',
  languageSavedToast: 'ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി.',
  genericError: 'ഒരു പിശക് സംഭവിച്ചു. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
};

const hi: TranslationKeys = {
  brandName: 'CareBridge',
  navHome: 'होम',
  navAbout: 'परियोजना के बारे में',
  navEmergency: 'आपातकालीन कार्ड',
  navLanguage: 'भाषा',
  navLogin: 'लॉग इन',
  navGetStarted: 'शुरू करें',
  navDashboard: 'डैशबोर्ड',
  navProfile: 'मेरी प्रोफ़ाइल',
  navHealthRecords: 'स्वास्थ्य रिकॉर्ड',
  navAddRecord: 'रिकॉर्ड जोड़ें',
  navUploadDocument: 'दस्तावेज़ अपलोड करें',
  navOcrResults: 'OCR और दस्तावेज़',
  navAiSummaries: 'AI सारांश',
  navConsents: 'सहमति प्रबंधन',
  navEmergencyQr: 'आपातकालीन QR',
  navWorkerSearch: 'श्रमिक खोजें',
  navAccessRequests: 'एक्सेस अनुरोध',
  navAuthorizedRecords: 'अनुमतित रिकॉर्ड',
  navUserManagement: 'उपयोगकर्ता प्रबंधन',
  navAuditLogs: 'ऑडिट लॉग',
  navNotifications: 'सूचनाएं',
  navSettings: 'सेटिंग्स',
  navSignOut: 'लॉग आउट',
  heroTitle: 'केरल में प्रवासी श्रमिकों के लिए सुरक्षित डिजिटल स्वास्थ्य रिकॉर्ड',
  heroSubtitle:
    'दवाओं के पर्चे, लैब रिपोर्ट, एलर्जी और अस्पताल के कागजात एक सुरक्षित बहुभाषी वॉल्ट में रखें। केवल अपनी स्पष्ट और समय-सीमित सहमति से डॉक्टरों के साथ साझा करें।',
  heroPrimaryCta: 'श्रमिक के रूप में पंजीकरण करें',
  heroSecondaryCta: 'चिकित्सक पोर्टल',
  workerRoleTitle: 'प्रवासी श्रमिक',
  providerRoleTitle: 'स्वास्थ्य सेवा प्रदाता',
  adminRoleTitle: 'सिस्टम प्रशासक',
  loginTitle: 'CareBridge में लॉग इन करें',
  loginSubtitle: 'अपने स्वास्थ्य वॉल्ट, चिकित्सक पोर्टल या एडमिन पैनल तक पहुंचें।',
  continueWithGoogle: 'Google के साथ जारी रखें',
  emailLabel: 'ईमेल पता',
  passwordLabel: 'पासवर्ड',
  signInBtn: 'लॉग इन करें',
  forgotPasswordLink: 'पासवर्ड भूल गए?',
  registerWorkerLink: 'श्रमिक पंजीकरण',
  registerProviderLink: 'चिकित्सक पंजीकरण',
  saveChanges: 'परिवर्तन सहेजें',
  cancel: 'रद्द करें',
  deleteBtn: 'हटाएं',
  editBtn: 'संपादित करें',
  viewBtn: 'विवरण देखें',
  searchPlaceholder: 'रिकॉर्ड, निदान, डॉक्टर या अस्पताल खोजें...',
  allCategories: 'सभी श्रेणियां',
  newestFirst: 'नवीनतम पहले',
  oldestFirst: 'सबसे पुराना पहले',
  loadingText: 'डेटा लोड हो रहा है...',
  noDataYet: 'अभी तक कोई रिकॉर्ड नहीं मिला।',
  grantConsentBtn: 'सहमति दें',
  revokeConsentBtn: 'एक्सेस रद्द करें',
  approveBtn: 'स्वीकृत करें',
  rejectBtn: 'अस्वीकार करें',
  generateQrBtn: 'नया QR बनाएं',
  downloadQrBtn: 'QR PNG डाउनलोड करें',
  revokeQrBtn: 'QR रद्द करें',
  runOcrBtn: 'टेक्स्ट निकालें (OCR)',
  generateSummaryBtn: 'AI सारांश बनाएं',
  regenerateSummaryBtn: 'सारांश फिर से बनाएं',
  markAllRead: 'सभी को पढ़ा हुआ चिह्नित करें',
  aiDisclaimer:
    'AI-generated summaries are for informational support only and must be reviewed by a qualified healthcare professional.',
  emergencyCardTitle: 'आपातकालीन चिकित्सा जानकारी',
  emergencyRestrictedNotice:
    'सीमित आपातकालीन दृश्य। पूर्ण चिकित्सा इतिहास और निजी दस्तावेज़ कभी भी QR कोड के माध्यम से उजागर नहीं होते।',
  bloodGroupLabel: 'रक्त समूह',
  allergiesLabel: 'ज्ञात एलर्जी',
  chronicConditionsLabel: 'दीर्घकालिक बीमारियां',
  emergencyContactLabel: 'आपातकालीन संपर्क',
  emergencyIdLabel: 'आपातकालीन पहचान संख्या',
  languageSavedToast: 'इंटरफ़ेस भाषा हिन्दी में अपडेट की गई।',
  genericError: 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
};

const bn: TranslationKeys = {
  brandName: 'CareBridge',
  navHome: 'হোম',
  navAbout: 'প্রকল্প সম্পর্কে',
  navEmergency: 'জরুরি কার্ড',
  navLanguage: 'ভাষা',
  navLogin: 'লগইন',
  navGetStarted: 'শুরু করুন',
  navDashboard: 'ড্যাশবোর্ড',
  navProfile: 'আমার প্রোফাইল',
  navHealthRecords: 'স্বাস্থ্য রেকর্ড',
  navAddRecord: 'রেকর্ড যোগ করুন',
  navUploadDocument: 'নথি আপলোড করুন',
  navOcrResults: 'OCR এবং নথি',
  navAiSummaries: 'AI সারাংশ',
  navConsents: 'সম্মতি নিয়ন্ত্রণ',
  navEmergencyQr: 'জরুরি QR',
  navWorkerSearch: 'কর্মী অনুসন্ধান',
  navAccessRequests: 'অনুমতির অনুরোধ',
  navAuthorizedRecords: 'অনুমোদিত রেকর্ড',
  navUserManagement: 'ব্যবহারকারী পরিচালনা',
  navAuditLogs: 'অডিট লগ',
  navNotifications: 'বিজ্ঞপ্তি',
  navSettings: 'সেটিংস',
  navSignOut: 'লগ আউট',
  heroTitle: 'কেরালায় অভিবাসী কর্মীদের জন্য নিরাপদ ডিজিটাল স্বাস্থ্য রেকর্ড',
  heroSubtitle:
    'প্রেসক্রিপশন, ল্যাব রিপোর্ট, অ্যালার্জি এবং হাসপাতালের নথি এক জায়গায় নিরাপদে সংরক্ষণ করুন। শুধুমাত্র আপনার নির্দিষ্ট ও সময়সীমাবদ্ধ সম্মতিতে চিকিৎসকদের সাথে শেয়ার করুন।',
  heroPrimaryCta: 'কর্মী হিসেবে নিবন্ধন করুন',
  heroSecondaryCta: 'চিকিৎসক পোর্টাল',
  workerRoleTitle: 'অভিবাসী কর্মী',
  providerRoleTitle: 'স্বাস্থ্যসেবা প্রদানকারী',
  adminRoleTitle: 'সিস্টেম অ্যাডমিন',
  loginTitle: 'CareBridge-এ লগইন করুন',
  loginSubtitle: 'আপনার স্বাস্থ্য ভল্ট, চিকিৎসক পোর্টাল বা অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করুন।',
  continueWithGoogle: 'Google দিয়ে চালিয়ে যান',
  emailLabel: 'ইমেল ঠিকানা',
  passwordLabel: 'পাসওয়ার্ড',
  signInBtn: 'লগইন করুন',
  forgotPasswordLink: 'পাসওয়ার্ড ভুলে গেছেন?',
  registerWorkerLink: 'কর্মী নিবন্ধন',
  registerProviderLink: 'চিকিৎসক নিবন্ধন',
  saveChanges: 'পরিবর্তন সংরক্ষণ করুন',
  cancel: 'বাতিল করুন',
  deleteBtn: 'মুছে ফেলুন',
  editBtn: 'সম্পাদনা',
  viewBtn: 'বিস্তারিত দেখুন',
  searchPlaceholder: 'রেকর্ড, রোগ নির্ণয়, ডাক্তার বা হাসপাতাল খুঁজুন...',
  allCategories: 'সব বিভাগ',
  newestFirst: 'নতুন আগে',
  oldestFirst: 'পুরোনো আগে',
  loadingText: 'তথ্য লোড হচ্ছে...',
  noDataYet: 'এখনো কোনো রেকর্ড পাওয়া যায়নি।',
  grantConsentBtn: 'সম্মতি দিন',
  revokeConsentBtn: 'অনুমতি বাতিল করুন',
  approveBtn: 'অনুমোদন করুন',
  rejectBtn: 'প্রত্যাখ্যান করুন',
  generateQrBtn: 'নতুন QR তৈরি করুন',
  downloadQrBtn: 'QR PNG ডাউনলোড করুন',
  revokeQrBtn: 'QR বাতিল করুন',
  runOcrBtn: 'টেক্সট বের করুন (OCR)',
  generateSummaryBtn: 'AI সারাংশ তৈরি করুন',
  regenerateSummaryBtn: 'পুনরায় সারাংশ তৈরি করুন',
  markAllRead: 'সব পঠিত হিসেবে চিহ্নিত করুন',
  aiDisclaimer:
    'AI-generated summaries are for informational support only and must be reviewed by a qualified healthcare professional.',
  emergencyCardTitle: 'জরুরি চিকিৎসা তথ্য',
  emergencyRestrictedNotice:
    'সীমিত জরুরি তথ্য। সম্পূর্ণ স্বাস্থ্য রেকর্ড এবং ব্যক্তিগত নথি কখনোই QR কোডের মাধ্যমে প্রকাশ করা হয় না।',
  bloodGroupLabel: 'রক্তের গ্রুপ',
  allergiesLabel: 'পরিচিত অ্যালার্জি',
  chronicConditionsLabel: 'দীর্ঘমেয়াদী রোগ',
  emergencyContactLabel: 'জরুরি যোগাযোগ',
  emergencyIdLabel: 'জরুরি শনাক্তকরণ নম্বর',
  languageSavedToast: 'ইন্টারফেসের ভাষা বাংলায় পরিবর্তন করা হয়েছে।',
  genericError: 'একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
};

export const TRANSLATIONS: Record<LanguageCode, TranslationKeys> = {
  en,
  ml,
  hi,
  bn,
};
