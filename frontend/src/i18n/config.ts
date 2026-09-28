import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
        "layout": {
                "quick_search": "Quick search...",
                "skip_content": "Skip to main content",
                "footer": "ID-SHIELD Prototype · Assisted Multi-Modal Identity Forensics · Smart India Hackathon 2026",
                "cases": {
                        "title": "Case Dossier",
                        "subtitle": "Forensic evidence and multi-modal analysis workspace",
                        "pipeline_title": "Document Pipeline",
                        "pipeline_subtitle": "Live 11-stage forensic screening progress"
                }
        }
,
        "voice": {
                "title": "Voice Assistant",
                "badge": "Smart AI",
                "subtitle": "Accessible spoken guidance & conversational Q&A",
                "speed_relaxed": "Relaxed (0.86x)",
                "speed_normal": "Standard",
                "speaking": "Speaking answer aloud...",
                "last_spoken": "Last Spoken Answer",
                "stop": "Stop",
                "analyzing": "Analyzing case evidence and finding answer...",
                "listening": "Listening...",
                "recognized": "Recognized Input",
                "stop_mic": "Stop Mic",
                "tap_speak": "Tap to Speak",
                "speak_case": "Speak Case",
                "read_page": "Read Page",
                "placeholder": "Ask anything (e.g. 'Is this fake?', 'What is the risk score?')",
                "summary": "Verification Summary",
                "evaluating": "Evaluating",
                "risk": "Risk",
                "suggestions_title": "Ask or tap any question:"
        },
        "users": {
                "title": "User Management",
                "subtitle": "Verifier accounts and security roles",
                "add_user": "Add User",
                "active_verifiers": "Active Verifiers",
                "officers": "Officers",
                "role_policies": "Role Policies",
                "rbac_strict": "RBAC Strict",
                "audit_logging": "Audit Logging",
                "immutable_ledger": "Immutable Ledger",
                "directory": "Authorized Personnel Directory",
                "accounts_registered": "Accounts Registered",
                "th_officer": "Officer",
                "th_role": "Assigned Role",
                "th_dossiers": "Dossiers Handled",
                "th_security": "Security State",
                "th_last_active": "Last Activity",
                "cases": "cases"
        },
        "history": {
                "title": "Screening History",
                "subtitle": "Previously processed verification cases and final verdicts",
                "search": "Search by Case ID or Name...",
                "filter_all": "All outcomes",
                "filter_high": "High Risk",
                "filter_valid": "Valid",
                "filter_newest": "Newest first",
                "no_matching": "No matching screenings",
                "screen_set": "Screen a set of documents to create your first case.",
                "new_case": "New Case"
        },
        "new_case": {
                "identifier": "CASE IDENTIFIER / NAME",
                "identifier_ph": "e.g. Onboarding verification — Rahul Sharma",
                "contact": "APPLICANT CONTACT & ALERT ROUTING (OPTIONAL)",
                "contact_desc": "Direct SMS, WhatsApp, or Email discrepancy notifications if tampering or mismatch is detected.",
                "configure_contact": "Configure contact",
                "upload": "UPLOAD DOCUMENTS",
                "drag_drop": "Drag & drop document scans, ou click to browse",
                "supported": "JPG • JPEG • PNG • PDF (Up to 10 MB per file)",
                "multi_doc": "Multi-document cross-checks supported",
                "start": "Start Forensic Screening"
        }
,
      sidebar: {
        core_operations: "Core Operations",
        platform_diagnostics: "Platform & Diagnostics",
        dashboard: "Dashboard",
        screen_documents: "Screen Documents",
        screening_history: "Screening History",
        reports: "Reports",
        analytics: "Analytics",
        user_management: "User Management",
        settings: "Settings",
        forensics_intelligence: "Forensics Intelligence"
      },
      dashboard: {
        live_active: "Live Verification Engine Active",
        title: "Identity Forensics Operations Hub",
        subtitle: "11-stage automated screening evaluating ICAO MRZ integrity, visual tampering ELA, facial biometrics, and multi-document consistency.",
        screen_new: "Screen New Document",
        total_screened: "Total Screened",
        valid_passed: "Valid / Passed",
        under_review: "Under Review",
        high_risk: "High Risk",
        avg_risk: "Avg Risk Score",
        recent_cases: "Recent Verification Cases",
        view_history: "View full history",
        risk_distribution: "Risk Distribution Breakdown",
        case_id: "Case ID",
        document_type: "Document Type",
        name: "Name",
        risk: "Risk",
        status: "Status",
        time: "Time",
        no_screenings: "No screenings yet",
        create_first: "Create your first case to begin screening identity documents."
      },
      analytics: {
        title: "Analytics & Intelligence",
        subtitle: "Evidence verification trends, discrepancy rankings, and risk intelligence telemetry",
        export: "Export CSV",
        print: "Print Report",
        volume_trends: "Screening Volume & Verdict Trends",
        risk_distribution: "Risk Score Distribution",
        discrepancy: "Cross-Document Discrepancy Vectors"
      },
      cases: {
        new_title: "Screen New Document",
        new_subtitle: "Create a new verification case and upload identity evidence",
        detail_title: "Case Dossier",
        detail_subtitle: "Forensic evidence and multi-modal analysis workspace",
        processing_title: "Processing Document",
        processing_subtitle: "Live 11-stage forensic screening in progress...",
        upload_front: "Upload ID Front",
        upload_back: "Upload ID Back",
        upload_selfie: "Upload Selfie",
        start_screening: "Start Forensic Screening",
        voice_summary: "Voice Summary"
      },
      
      reports: {
        title: "Compliance Reports",
        subtitle: "Downloadable audit logs and verification dossiers",
        generate: "Generate New Report"
      },
      settings: {
        title: "Platform Diagnostics & Settings",
        subtitle: "Configure pipeline calibration and forensic thresholds"
      },
      
      landing: {
        hero_title: "Next-Gen Identity Forensics",
        hero_subtitle: "AI-powered document screening, tampering detection, and biometric verification.",
        get_started: "Get Started",
        learn_more: "Learn More"
      }
    }
  },
  hi: {
    translation: {
        "layout": {
                "quick_search": "त्वरित खोज...",
                "skip_content": "मुख्य सामग्री पर जाएं",
                "footer": "आईडी-शील्ड प्रोटोटाइप · सहायता प्राप्त मल्टी-मोडल आइडेंटिटी फोरेंसिक्स · स्मार्ट इंडिया हैकथॉन 2026",
                "cases": {
                        "title": "मामला डॉसियर",
                        "subtitle": "फोरेंसिक साक्ष्य और मल्टी-मोडल विश्लेषण कार्यक्षेत्र",
                        "pipeline_title": "दस्तावेज़ पाइपलाइन",
                        "pipeline_subtitle": "लाइव 11-स्टेज फोरेंसिक स्क्रीनिंग प्रगति"
                }
        }
,
        "voice": {
                "title": "वॉयस असिस्टेंट",
                "badge": "स्मार्ट एआई",
                "subtitle": "सुलभ मौखिक मार्गदर्शन और संवादात्मक प्रश्नोत्तर",
                "speed_relaxed": "आराम से (0.86x)",
                "speed_normal": "सामान्य",
                "speaking": "उत्तर बोल रहा है...",
                "last_spoken": "अंतिम बोला गया उत्तर",
                "stop": "रोकें",
                "analyzing": "साक्ष्य का विश्लेषण और उत्तर खोजना...",
                "listening": "सुन रहा है...",
                "recognized": "पहचाना गया इनपुट",
                "stop_mic": "माइक रोकें",
                "tap_speak": "बोलने के लिए टैप करें",
                "speak_case": "केस बोलें",
                "read_page": "पेज पढ़ें",
                "placeholder": "कुछ भी पूछें (जैसे 'क्या यह नकली है?', 'जोखिम स्कोर क्या है?')",
                "summary": "सत्यापन सारांश",
                "evaluating": "मूल्यांकन कर रहा है",
                "risk": "जोखिम",
                "suggestions_title": "कोई भी प्रश्न पूछें या टैप करें:"
        },
        "users": {
                "title": "उपयोगकर्ता प्रबंधन",
                "subtitle": "सत्यापनकर्ता खाते और सुरक्षा भूमिकाएँ",
                "add_user": "उपयोगकर्ता जोड़ें",
                "active_verifiers": "सक्रिय सत्यापनकर्ता",
                "officers": "अधिकारी",
                "role_policies": "भूमिका नीतियां",
                "rbac_strict": "आरबीएसी सख्त",
                "audit_logging": "ऑडिट लॉगिंग",
                "immutable_ledger": "अपरिवर्तनीय लेजर",
                "directory": "अधिकृत कार्मिक निर्देशिका",
                "accounts_registered": "खाते पंजीकृत",
                "th_officer": "अधिकारी",
                "th_role": "सौंपी गई भूमिका",
                "th_dossiers": "संभाले गए डॉसियर",
                "th_security": "सुरक्षा स्थिति",
                "th_last_active": "अंतिम गतिविधि",
                "cases": "मामले"
        },
        "history": {
                "title": "स्क्रीनिंग इतिहास",
                "subtitle": "पहले संसाधित किए गए मामले और अंतिम निर्णय",
                "search": "केस आईडी या नाम से खोजें...",
                "filter_all": "सभी परिणाम",
                "filter_high": "उच्च जोखिम",
                "filter_valid": "वैध",
                "filter_newest": "सबसे नया पहले",
                "no_matching": "कोई मेल खाने वाली स्क्रीनिंग नहीं",
                "screen_set": "अपना पहला केस बनाने के लिए दस्तावेज़ों का एक सेट स्कैन करें।",
                "new_case": "नया केस"
        },
        "new_case": {
                "identifier": "केस पहचानकर्ता / नाम",
                "identifier_ph": "उदा. ऑनबोर्डिंग सत्यापन — राहुल शर्मा",
                "contact": "आवेदक संपर्क और अलर्ट रूटिंग (वैकल्पिक)",
                "contact_desc": "छेड़छाड़ का पता चलने पर सीधा एसएमएस, व्हाट्सएप या ईमेल सूचनाएं।",
                "configure_contact": "संपर्क कॉन्फ़िगर करें",
                "upload": "दस्तावेज़ अपलोड करें",
                "drag_drop": "दस्तावेज़ स्कैन खींचें और छोड़ें, या ब्राउज़ करने के लिए क्लिक करें",
                "supported": "JPG • JPEG • PNG • PDF (10 MB प्रति फ़ाइल तक)",
                "multi_doc": "मल्टी-दस्तावेज़ क्रॉस-चेक समर्थित",
                "start": "फोरेंसिक स्क्रीनिंग शुरू करें"
        }
,
      sidebar: {
        core_operations: "मुख्य कार्य",
        platform_diagnostics: "मंच और निदान",
        dashboard: "डैशबोर्ड",
        screen_documents: "दस्तावेज़ स्कैन करें",
        screening_history: "स्क्रीनिंग इतिहास",
        reports: "रिपोर्ट",
        analytics: "विश्लेषण",
        user_management: "उपयोगकर्ता प्रबंधन",
        settings: "सेटिंग्स",
        forensics_intelligence: "फोरेंसिक इंटेलिजेंस"
      },
      dashboard: {
        live_active: "लाइव सत्यापन इंजन सक्रिय",
        title: "पहचान फोरेंसिक संचालन केंद्र",
        subtitle: "आईसीएओ एमआरजेड अखंडता, दृश्य छेड़छाड़ ईएलए, चेहरे के बायोमेट्रिक्स का मूल्यांकन करने वाली 11-चरणीय स्वचालित स्क्रीनिंग।",
        screen_new: "नया दस्तावेज़ स्कैन करें",
        total_screened: "कुल स्कैन",
        valid_passed: "वैध / उत्तीर्ण",
        under_review: "समीक्षाधीन",
        high_risk: "उच्च जोखिम",
        avg_risk: "औसत जोखिम स्कोर",
        recent_cases: "हाल के मामले",
        view_history: "पूरा इतिहास देखें",
        risk_distribution: "जोखिम वितरण",
        case_id: "मामला आईडी",
        document_type: "दस्तावेज़ प्रकार",
        name: "नाम",
        risk: "जोखिम",
        status: "स्थिति",
        time: "समय",
        no_screenings: "कोई स्क्रीनिंग नहीं",
        create_first: "स्क्रीनिंग शुरू करने के लिए पहला केस बनाएं।"
      },
      analytics: {
        title: "विश्लेषण और इंटेलिजेंस",
        subtitle: "साक्ष्य सत्यापन रुझान और जोखिम इंटेलिजेंस टेलीमेट्री",
        export: "सीएसवी निर्यात करें",
        print: "रिपोर्ट प्रिंट करें",
        volume_trends: "स्क्रीनिंग मात्रा और रुझान",
        risk_distribution: "जोखिम स्कोर वितरण",
        discrepancy: "क्रॉस-दस्तावेज़ विसंगति वैक्टर"
      },
      cases: {
        new_title: "नया दस्तावेज़ स्कैन करें",
        new_subtitle: "एक नया सत्यापन मामला बनाएं और साक्ष्य अपलोड करें",
        detail_title: "मामला डॉसियर",
        detail_subtitle: "फोरेंसिक साक्ष्य और मल्टी-मोडल विश्लेषण कार्यक्षेत्र",
        processing_title: "दस्तावेज़ संसाधित हो रहा है",
        processing_subtitle: "लाइव 11-स्टेज फोरेंसिक स्क्रीनिंग प्रगति पर...",
        upload_front: "आईडी का अग्र भाग अपलोड करें",
        upload_back: "आईडी का पिछला भाग अपलोड करें",
        upload_selfie: "सेल्फी अपलोड करें",
        start_screening: "फोरेंसिक स्क्रीनिंग शुरू करें",
        voice_summary: "वॉयस सारांश"
      },
      
      reports: {
        title: "अनुपालन रिपोर्ट",
        subtitle: "डाउनलोड करने योग्य ऑडिट लॉग",
        generate: "नई रिपोर्ट बनाएं"
      },
      settings: {
        title: "प्लेटफ़ॉर्म सेटिंग्स",
        subtitle: "फोरेंसिक थ्रेसहोल्ड कॉन्फ़िगर करें"
      },
      
      landing: {
        hero_title: "नेक्स्ट-जेन आइडेंटिटी फोरेंसिक्स",
        hero_subtitle: "एआई-पावर्ड दस्तावेज़ स्क्रीनिंग और बायोमेट्रिक सत्यापन।",
        get_started: "शुरू करें",
        learn_more: "अधिक जानें"
      }
    }
  },
  ar: {
    translation: {
        "layout": {
                "quick_search": "بحث سريع...",
                "skip_content": "تخطي إلى المحتوى الرئيسي",
                "footer": "نموذج ID-SHIELD · الأدلة الجنائية متعددة الوسائط للهوية · هاكاثون الهند الذكية 2026",
                "cases": {
                        "title": "ملف الحالة",
                        "subtitle": "أدلة جنائية ومساحة عمل للتحليل متعدد الوسائط",
                        "pipeline_title": "مسار المستندات",
                        "pipeline_subtitle": "تقدم الفحص الجنائي المباشر المكون من 11 مرحلة"
                }
        }
,
        "voice": {
                "title": "المساعد الصوتي",
                "badge": "ذكاء اصطناعي",
                "subtitle": "توجيه صوتي وسؤال وجواب",
                "speed_relaxed": "مريح (0.86x)",
                "speed_normal": "قياسي",
                "speaking": "تحدث الإجابة...",
                "last_spoken": "آخر إجابة منطوقة",
                "stop": "إيقاف",
                "analyzing": "تحليل الأدلة وإيجاد الإجابة...",
                "listening": "استماع...",
                "recognized": "المدخلات المعترف بها",
                "stop_mic": "إيقاف الميكروفون",
                "tap_speak": "انقر للتحدث",
                "speak_case": "تحدث الحالة",
                "read_page": "قراءة الصفحة",
                "placeholder": "اسأل أي شيء (مثل 'هل هذا مزيف؟', 'ما هي درجة الخطر؟')",
                "summary": "ملخص التحقق",
                "evaluating": "تقييم",
                "risk": "خطر",
                "suggestions_title": "اسأل أو انقر فوق أي سؤال:"
        },
        "users": {
                "title": "إدارة المستخدمين",
                "subtitle": "حسابات المدققين وأدوار الأمان",
                "add_user": "إضافة مستخدم",
                "active_verifiers": "المدققون النشطون",
                "officers": "ضباط",
                "role_policies": "سياسات الدور",
                "rbac_strict": "RBAC صارم",
                "audit_logging": "تسجيل التدقيق",
                "immutable_ledger": "دفتر الأستاذ غير القابل للتغيير",
                "directory": "دليل الموظفين المصرح لهم",
                "accounts_registered": "حسابات مسجلة",
                "th_officer": "ضابط",
                "th_role": "الدور المعين",
                "th_dossiers": "الملفات التي تم التعامل معها",
                "th_security": "حالة الأمان",
                "th_last_active": "آخر نشاط",
                "cases": "حالات"
        },
        "history": {
                "title": "سجل الفحص",
                "subtitle": "حالات التحقق التي تمت معالجتها سابقًا",
                "search": "البحث برقم الحالة أو الاسم...",
                "filter_all": "جميع النتائج",
                "filter_high": "مخاطر عالية",
                "filter_valid": "صالح",
                "filter_newest": "الأحدث أولاً",
                "no_matching": "لا توجد فحوصات مطابقة",
                "screen_set": "قم بفحص مجموعة من المستندات لإنشاء حالتك الأولى.",
                "new_case": "حالة جديدة"
        },
        "new_case": {
                "identifier": "معرف الحالة / الاسم",
                "identifier_ph": "مثال: التحقق من الانضمام - راهول شارما",
                "contact": "الاتصال بمقدم الطلب وتوجيه التنبيهات (اختياري)",
                "contact_desc": "تنبيهات مباشرة عبر رسائل SMS أو WhatsApp أو البريد الإلكتروني إذا تم اكتشاف تلاعب.",
                "configure_contact": "تكوين الاتصال",
                "upload": "تحميل المستندات",
                "drag_drop": "سحب وإفلات المستندات، أو انقر للتصفح",
                "supported": "JPG • JPEG • PNG • PDF (حتى 10 ميغابايت لكل ملف)",
                "multi_doc": "دعم عمليات التحقق عبر مستندات متعددة",
                "start": "بدء الفحص الجنائي"
        }
,
      sidebar: {
        core_operations: "العمليات الأساسية",
        platform_diagnostics: "المنصة والتشخيص",
        dashboard: "لوحة القيادة",
        screen_documents: "مسح المستندات",
        screening_history: "سجل الفحص",
        reports: "التقارير",
        analytics: "التحليلات",
        user_management: "إدارة المستخدمين",
        settings: "الإعدادات",
        forensics_intelligence: "الاستخبارات الجنائية"
      },
      dashboard: {
        live_active: "محرك التحقق المباشر نشط",
        title: "مركز عمليات الأدلة الجنائية للهوية",
        subtitle: "فحص آلي من 11 مرحلة لتقييم سلامة المستندات.",
        screen_new: "فحص مستند جديد",
        total_screened: "إجمالي المفحوصات",
        valid_passed: "صالح / ناجح",
        under_review: "قيد المراجعة",
        high_risk: "مخاطر عالية",
        avg_risk: "متوسط الخطر",
        recent_cases: "حالات التحقق الأخيرة",
        view_history: "عرض السجل الكامل",
        risk_distribution: "تحليل توزيع المخاطر",
        case_id: "رقم الحالة",
        document_type: "نوع المستند",
        name: "الاسم",
        risk: "مخاطرة",
        status: "الحالة",
        time: "وقت",
        no_screenings: "لا توجد فحوصات بعد",
        create_first: "قم بإنشاء حالتك الأولى للبدء."
      },
      analytics: {
        title: "التحليلات والاستخبارات",
        subtitle: "اتجاهات التحقق من الأدلة وتحليل المخاطر",
        export: "تصدير CSV",
        print: "طباعة التقرير",
        volume_trends: "اتجاهات حجم الفحص والنتائج",
        risk_distribution: "توزيع درجات المخاطر",
        discrepancy: "ناقلات التناقض بين المستندات"
      },
      cases: {
        new_title: "فحص مستند جديد",
        new_subtitle: "إنشاء حالة تحقق جديدة وتحميل الأدلة",
        detail_title: "ملف الحالة",
        detail_subtitle: "أدلة جنائية ومساحة عمل للتحليل متعدد الوسائط",
        processing_title: "معالجة المستند",
        processing_subtitle: "الفحص الجنائي المباشر قيد التقدم...",
        upload_front: "الواجهة الأمامية للهوية",
        upload_back: "الخلفية للهوية",
        upload_selfie: "صورة شخصية",
        start_screening: "بدء الفحص الجنائي",
        voice_summary: "الملخص الصوتي"
      },
      
      reports: {
        title: "تقارير الامتثال",
        subtitle: "سجلات التدقيق القابلة للتنزيل",
        generate: "إنشاء تقرير جديد"
      },
      settings: {
        title: "إعدادات المنصة",
        subtitle: "تكوين إعدادات الفحص والمعايرة"
      },
      
      landing: {
        hero_title: "الجيل القادم من الأدلة الجنائية للهوية",
        hero_subtitle: "فحص المستندات المدعوم بالذكاء الاصطناعي واكتشاف التلاعب.",
        get_started: "البدء",
        learn_more: "اعرف المزيد"
      }
    }
  },
  fr: {
    translation: {
        "layout": {
                "quick_search": "Recherche rapide...",
                "skip_content": "Passer au contenu principal",
                "footer": "Prototype ID-SHIELD · Forensique d'identité multimodale assistée · Smart India Hackathon 2026",
                "cases": {
                        "title": "Dossier de Cas",
                        "subtitle": "Preuves médico-légales et analyse multimodale",
                        "pipeline_title": "Pipeline de documents",
                        "pipeline_subtitle": "Progression du dépistage médico-légal en direct"
                }
        }
,
        "voice": {
                "title": "Assistant Vocal",
                "badge": "IA Intelligente",
                "subtitle": "Guidage vocal et questions/réponses",
                "speed_relaxed": "Détendu (0.86x)",
                "speed_normal": "Standard",
                "speaking": "Lecture de la réponse...",
                "last_spoken": "Dernière réponse parlée",
                "stop": "Arrêter",
                "analyzing": "Analyse des preuves et recherche de la réponse...",
                "listening": "Écoute...",
                "recognized": "Entrée Reconnue",
                "stop_mic": "Arrêter le micro",
                "tap_speak": "Appuyez pour parler",
                "speak_case": "Parler du cas",
                "read_page": "Lire la page",
                "placeholder": "Demandez n'importe quoi (ex. 'Est-ce faux ?')",
                "summary": "Résumé de Vérification",
                "evaluating": "Évaluation",
                "risk": "Risque",
                "suggestions_title": "Posez ou appuyez sur une question :"
        },
        "users": {
                "title": "Gestion des Utilisateurs",
                "subtitle": "Comptes de vérificateurs et rôles de sécurité",
                "add_user": "Ajouter un Utilisateur",
                "active_verifiers": "Vérificateurs Actifs",
                "officers": "Officiers",
                "role_policies": "Politiques de Rôle",
                "rbac_strict": "RBAC Strict",
                "audit_logging": "Journal d'Audit",
                "immutable_ledger": "Registre Immuable",
                "directory": "Annuaire du Personnel",
                "accounts_registered": "Comptes Enregistrés",
                "th_officer": "Officier",
                "th_role": "Rôle",
                "th_dossiers": "Dossiers",
                "th_security": "Sécurité",
                "th_last_active": "Dernière Activité",
                "cases": "cas"
        },
        "history": {
                "title": "Historique",
                "subtitle": "Cas traités précédemment et verdicts",
                "search": "Rechercher par ID ou nom...",
                "filter_all": "Tous les résultats",
                "filter_high": "Haut Risque",
                "filter_valid": "Valide",
                "filter_newest": "Le plus récent",
                "no_matching": "Aucune vérification correspondante",
                "screen_set": "Numérisez des documents pour créer votre premier cas.",
                "new_case": "Nouveau Cas"
        },
        "new_case": {
                "identifier": "IDENTIFIANT DE CAS / NOM",
                "identifier_ph": "ex. Vérification d'intégration — Rahul Sharma",
                "contact": "CONTACT DU DEMANDEUR (OPTIONNEL)",
                "contact_desc": "Notifications directes par SMS, WhatsApp ou e-mail en cas de falsification.",
                "configure_contact": "Configurer le contact",
                "upload": "TÉLÉCHARGER DES DOCUMENTS",
                "drag_drop": "Glissez-déposez des documents, ou cliquez pour parcourir",
                "supported": "JPG • JPEG • PNG • PDF (Jusqu'à 10 Mo)",
                "multi_doc": "Vérifications croisées multi-documents prises en charge",
                "start": "Démarrer la Vérification"
        }
,
      sidebar: {
        core_operations: "Opérations de base",
        platform_diagnostics: "Plateforme et Diagnostics",
        dashboard: "Tableau de bord",
        screen_documents: "Numériser les documents",
        screening_history: "Historique",
        reports: "Rapports",
        analytics: "Analytique",
        user_management: "Gestion des utilisateurs",
        settings: "Paramètres",
        forensics_intelligence: "Renseignements légaux"
      },
      dashboard: {
        live_active: "Moteur de vérification actif",
        title: "Centre d'opérations d'identité",
        subtitle: "Sélection automatisée en 11 étapes évaluant l'intégrité.",
        screen_new: "Numériser un document",
        total_screened: "Total vérifié",
        valid_passed: "Valide / Réussi",
        under_review: "En cours de révision",
        high_risk: "Haut risque",
        avg_risk: "Risque moyen",
        recent_cases: "Cas récents",
        view_history: "Voir l'historique complet",
        risk_distribution: "Répartition des risques",
        case_id: "ID de cas",
        document_type: "Document",
        name: "Nom",
        risk: "Risque",
        status: "Statut",
        time: "Temps",
        no_screenings: "Aucune vérification",
        create_first: "Créez votre premier cas pour commencer."
      },
      analytics: {
        title: "Analytique et Intelligence",
        subtitle: "Tendances de vérification des preuves et télémétrie des risques",
        export: "Exporter CSV",
        print: "Imprimer",
        volume_trends: "Tendances du volume de dépistage",
        risk_distribution: "Répartition des scores de risque",
        discrepancy: "Vecteurs de divergence"
      },
      cases: {
        new_title: "Nouveau Document",
        new_subtitle: "Créer un nouveau cas de vérification",
        detail_title: "Dossier de Cas",
        detail_subtitle: "Preuves médico-légales et analyse multimodale",
        processing_title: "Traitement en cours",
        processing_subtitle: "Vérification médico-légale en direct...",
        upload_front: "Recto de la pièce",
        upload_back: "Verso de la pièce",
        upload_selfie: "Selfie",
        start_screening: "Démarrer la vérification",
        voice_summary: "Résumé vocal"
      },
      
      reports: {
        title: "Rapports de Conformité",
        subtitle: "Journaux d'audit téléchargeables",
        generate: "Générer un Rapport"
      },
      settings: {
        title: "Paramètres de la Plateforme",
        subtitle: "Configurer les seuils médico-légaux"
      },
      
      landing: {
        hero_title: "Vérification d'Identité Nouvelle Génération",
        hero_subtitle: "Vérification de documents par IA et détection d'altération.",
        get_started: "Commencer",
        learn_more: "En savoir plus"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
