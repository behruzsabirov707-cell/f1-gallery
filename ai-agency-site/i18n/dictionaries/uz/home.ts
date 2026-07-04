const home = {
  hero: {
    eyebrow: "YANGI AVLOD AI AVTOMATLASHTIRISH HAMKORI",
    titleLine1: "Biznesingizni",
    titleAccent: "aqlli",
    titleLine2: "tarzda avtomatlashtiring",
    description:
      "Aivora — mijozlar bilan muloqotdan tortib ichki jarayonlarni boshqarishgacha, biznesingizning takrorlanuvchi vazifalarini AI yordamida avtomatlashtiradi. Vaqtingizni tejaymiz, xatolarni kamaytiramiz, o'sishni tezlashtiramiz.",
    ctaPrimary: "Bepul konsultatsiya olish",
    pipeline: [
      "Xabar",
      "AI tahlili",
      "Avtomatlashtirilgan harakat",
      "Natija",
    ] as const,
  },
  servicesOverview: {
    eyebrow: "XIZMATLARIMIZ",
    title: "Har bir jarayon uchun AI yechim",
    description:
      "Kichik biznesdan yirik kompaniyagacha — sizga mos AI yechimini topamiz.",
    items: [
      {
        id: "telegram-whatsapp-bots",
        title: "Telegram va WhatsApp botlar",
        description:
          "Mijozlar bilan 24/7 muloqot qiluvchi, buyurtma qabul qiluvchi va savollarga javob beruvchi bot yarating.",
      },
      {
        id: "websites",
        title: "Veb-saytlar",
        description:
          "Tez, zamonaviy va qidiruv tizimlarida yaxshi ko'rinadigan sayt — mijozlaringizga ishonch uyg'otadigan raqamli vitrina.",
      },
      {
        id: "ai-agents",
        title: "Shaxsiy va biznes AI agentlar",
        description:
          "Sizning ma'lumotlaringiz asosida ishlaydigan, vazifalarni mustaqil bajaradigan AI yordamchi.",
      },
      {
        id: "chatbots",
        title: "Mijozlarga xizmat ko'rsatish chatbotlari",
        description:
          "Saytingiz yoki ilovangizda mijozlarning savollariga darhol, aniq javob beruvchi aqlli chatbot.",
      },
      {
        id: "automation",
        title: "Biznes jarayonlarini avtomatlashtirish",
        description:
          "Qo'lda bajariladigan takrorlanuvchi ishlarni AI va integratsiyalar orqali avtomatlashtiramiz.",
      },
    ],
    ctaCard: {
      title: "Sizga mos yechim kerakmi?",
      description:
        "Bepul konsultatsiyada eng mos AI yechimini birga tanlaymiz.",
    },
  },
  trustSignals: {
    projectsLabel: "bajarilgan loyiha",
    industriesLabel: "sohada tajriba",
    supportLabel: "texnik qo'llab-quvvatlash",
  },
  whyUs: {
    eyebrow: "NIMA UCHUN BIZ",
    title: "Boshqa agentliklardan farqimiz",
    points: [
      {
        title: "AI va real dasturlash tajribasi birga",
        description:
          "Faqat sun'iy intellekt bilan emas — to'liq dasturlash va integratsiya tajribasi bilan ishlaymiz, shuning uchun yechimlarimiz haqiqatda ishlaydi.",
      },
      {
        title: "Mahalliy bozor va tilni tushunamiz",
        description:
          "O'zbekiston biznes muhitini, mijozlaringizning kutganlarini va tilini yaxshi bilamiz — universal shablon emas, sizga mos yechim quramiz.",
      },
      {
        title: "Konsultatsiyadan qo'llab-quvvatlashgacha",
        description:
          "Loyiha topshirilgandan keyin ham yoningizdamiz — savollaringizga javob beramiz, kerak bo'lsa yaxshilashda davom etamiz.",
      },
    ],
  },
  process: {
    eyebrow: "QANDAY ISHLAYMIZ",
    title: "Besh bosqichda aniq natijaga",
    steps: [
      {
        id: "discovery",
        title: "Konsultatsiya",
        description:
          "Biznesingiz va ehtiyojlaringizni tinglaymiz, eng mos yechimni aniqlaymiz.",
      },
      {
        id: "proposal",
        title: "Taklif va reja",
        description:
          "Aniq bosqichlar, muddat va nima olishingiz haqida tushunarli taklif tayyorlaymiz.",
      },
      {
        id: "development",
        title: "Ishlab chiqish",
        description:
          "Yechimni qadam-baqadam quramiz, jarayon davomida sizni xabardor qilib boramiz.",
      },
      {
        id: "launch",
        title: "Ishga tushirish",
        description:
          "Tayyor yechimni sinovdan o'tkazib, ishlab turgan tizimga joriy qilamiz.",
      },
      {
        id: "support",
        title: "Qo'llab-quvvatlash",
        description:
          "Ishga tushgandan keyin ham yoningizdamiz — savollar, yaxshilashlar uchun aloqada bo'lamiz.",
      },
    ],
  },
  portfolio: {
    eyebrow: "PORTFOLIO",
    title: "Bajarilgan loyihalar",
    description:
      "Turli sohadagi mijozlar uchun amalga oshirilgan ishlarimizdan namunalar.",
    flagship: {
      title: "Jarvis — shaxsiy AI agent",
      description:
        "Bir nechta biznes egasi uchun maxsus ishlab chiqilgan AI agent — kundalik vazifalarni mustaqil bajaradi va biznes jarayonlarini avtomatlashtiradi.",
    },
    metrics: [
      {
        value: "10+",
        label: "biznes egasi moliya botimizdan muntazam foydalanmoqda",
      },
      {
        value: "20+",
        label:
          "veb-sayt turli kompaniyalar uchun ishlab chiqildi, jumladan Mascan Travel",
      },
      {
        value: "50+",
        label:
          "kishi uchun AI chatbot va avtomatik javob beruvchi tizimlar yaratildi",
      },
    ],
  },
  faqSection: {
    eyebrow: "SAVOL-JAVOB",
    title: "Ko'p so'raladigan savollar",
    items: [
      {
        id: "how-long",
        question: "Loyiha qancha vaqt oladi?",
        answer:
          "Oddiy bot yoki sayt 1-2 hafta, murakkabroq AI agent yoki integratsiya loyihalari 3-6 hafta davom etishi mumkin. Aniq muddatni konsultatsiyada belgilaymiz.",
      },
      {
        id: "pricing",
        question: "Xizmat narxi qancha?",
        answer:
          "Har bir loyiha talablariga qarab narx belgilanadi, shuning uchun aniq summani konsultatsiyada muhokama qilamiz. Bepul konsultatsiya orqali murojaat qiling.",
      },
      {
        id: "no-tech-team",
        question: "Bizda texnik jamoa yo'q, baribir ishlay olamizmi?",
        answer:
          "Ha, albatta. Aksariyat mijozlarimiz texnik bo'lmagan biznes egalari — biz hammasini tushunarli tilda tushuntiramiz va texnik tomonini to'liq o'z zimmamizga olamiz.",
      },
      {
        id: "which-service",
        question: "Qaysi xizmat menga mos ekanini qanday bilaman?",
        answer:
          "Bepul konsultatsiyada biznesingiz va maqsadlaringizni tinglab, eng mos yechimni tavsiya qilamiz — hech qanday majburiyatsiz.",
      },
      {
        id: "data-security",
        question: "Ma'lumotlarimiz xavfsizmi?",
        answer:
          "Ha, barcha integratsiya va ma'lumotlar bilan ishlashda xavfsizlik standartlariga rioya qilamiz, ma'lumotlaringiz uchinchi shaxslarga berilmaydi.",
      },
      {
        id: "support-after",
        question: "Loyiha tugagach qo'llab-quvvatlash bormi?",
        answer:
          "Ha, ishga tushirilgandan keyin ham texnik yordam va yaxshilash xizmatlarini taqdim etamiz.",
      },
    ],
  },
  contact: {
    eyebrow: "BOG'LANISH",
    title: "Loyihangizni muhokama qilaylik",
    description:
      "Formani to'ldiring yoki to'g'ridan-to'g'ri Telegram/telefon orqali yozing — 24 soat ichida javob beramiz.",
    directContact: "yoki to'g'ridan-to'g'ri yozing",
    form: {
      nameLabel: "Ismingiz",
      namePlaceholder: "Ismingizni kiriting",
      contactLabel: "Aloqa (Telegram, telefon yoki email)",
      contactPlaceholder: "@username yoki +998 ...",
      serviceLabel: "Qaysi xizmat sizni qiziqtiradi?",
      servicePlaceholder: "Xizmatni tanlang",
      messageLabel: "Loyihangiz haqida qisqacha",
      messagePlaceholder: "Biznesingiz va ehtiyojingiz haqida yozing...",
      submitLabel: "Yuborish",
      requiredError: "Bu maydonni to'ldirish shart",
      successTitle: "Rahmat!",
      successDescription:
        "Telegram ochildi — xabaringizni yuborish uchun \"Send\" tugmasini bosing.",
    },
  },
} as const;

export default home;
