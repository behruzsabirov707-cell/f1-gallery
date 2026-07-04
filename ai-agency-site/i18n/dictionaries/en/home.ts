const home = {
  hero: {
    eyebrow: "NEW GEN AI AUTOMATION PARTNER",
    titleLine1: "Automate Your Business",
    titleAccent: "smarter",
    titleLine2: "and grow faster",
    description:
      "Aivora automates your business's repetitive tasks with AI — from customer conversations to internal processes. We save time, reduce errors, and speed up growth.",
    ctaPrimary: "Book a Free Consultation",
    pipeline: [
      "Message",
      "AI analysis",
      "Automated action",
      "Result",
    ] as const,
  },
  servicesOverview: {
    eyebrow: "OUR SERVICES",
    title: "An AI solution for every process",
    description:
      "From small businesses to large companies — we find the right AI solution for you.",
    items: [
      {
        id: "telegram-whatsapp-bots",
        title: "Telegram & WhatsApp Bots",
        description:
          "A bot that talks to customers 24/7, takes orders, and answers questions.",
      },
      {
        id: "websites",
        title: "Websites",
        description:
          "A fast, modern site that ranks well in search — a digital storefront that builds trust.",
      },
      {
        id: "ai-agents",
        title: "Personal & Business AI Agents",
        description:
          "An AI assistant that works from your own data and completes tasks on its own.",
      },
      {
        id: "chatbots",
        title: "Customer Service Chatbots",
        description:
          "A smart chatbot that instantly and accurately answers customer questions on your site or app.",
      },
      {
        id: "automation",
        title: "Business Process Automation",
        description: "We automate repetitive manual work with AI and integrations.",
      },
    ],
    ctaCard: {
      title: "Not sure which solution fits?",
      description:
        "In a free consultation, we'll find the right AI solution together.",
    },
  },
  trustSignals: {
    projectsLabel: "projects delivered",
    industriesLabel: "industries served",
    supportLabel: "technical support",
  },
  whyUs: {
    eyebrow: "WHY US",
    title: "What sets us apart from other agencies",
    points: [
      {
        title: "AI expertise plus real development experience",
        description:
          "We don't just work with AI — we combine it with full-stack development and integration experience, so our solutions actually work.",
      },
      {
        title: "We understand the local market and language",
        description:
          "We know Uzbekistan's business environment and what your customers expect — no generic template, a solution built for you.",
      },
      {
        title: "From consultation to ongoing support",
        description:
          "We stay with you after delivery — answering questions and continuing to improve the solution when needed.",
      },
    ],
  },
  process: {
    eyebrow: "HOW WE WORK",
    title: "Five steps to results",
    steps: [
      {
        id: "discovery",
        title: "Consultation",
        description: "We listen to your business and needs to find the right solution.",
      },
      {
        id: "proposal",
        title: "Proposal & Plan",
        description:
          "We prepare a clear proposal with defined steps, timeline, and deliverables.",
      },
      {
        id: "development",
        title: "Development",
        description:
          "We build the solution step by step, keeping you informed along the way.",
      },
      {
        id: "launch",
        title: "Launch",
        description: "We test the finished solution and roll it into your live workflow.",
      },
      {
        id: "support",
        title: "Support",
        description:
          "We stay with you after launch — for questions and ongoing improvements.",
      },
    ],
  },
  portfolio: {
    eyebrow: "PORTFOLIO",
    title: "Projects we've delivered",
    description: "Real work delivered for clients across different industries.",
    flagship: {
      title: "Jarvis — Personal AI Agent",
      description:
        "A custom AI agent built for multiple business owners — it handles daily tasks independently and automates business processes.",
    },
    metrics: [
      {
        value: "10+",
        label: "business owners regularly use our finance bot",
      },
      {
        value: "20+",
        label: "websites built for companies across industries, including Mascan Travel",
      },
      {
        value: "50+",
        label: "people delivered AI chatbots and automated reply systems",
      },
    ],
  },
  faqSection: {
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    items: [
      {
        id: "how-long",
        question: "How long does a project take?",
        answer:
          "A simple bot or website takes 1-2 weeks; more complex AI agents or integrations take 3-6 weeks. We confirm the exact timeline during the consultation.",
      },
      {
        id: "pricing",
        question: "How much does it cost?",
        answer:
          "Pricing depends on each project's requirements, so we discuss the exact cost during the consultation. Reach out for a free consultation.",
      },
      {
        id: "no-tech-team",
        question: "We don't have a technical team — can you still work with us?",
        answer:
          "Absolutely. Most of our clients are non-technical business owners — we explain everything in plain language and handle the technical side entirely.",
      },
      {
        id: "which-service",
        question: "How do I know which service is right for me?",
        answer:
          "In a free consultation we listen to your business and goals and recommend the best-fit solution — no obligation.",
      },
      {
        id: "data-security",
        question: "Is our data secure?",
        answer:
          "Yes, we follow security best practices across all integrations and data handling, and your data is never shared with third parties.",
      },
      {
        id: "support-after",
        question: "Is there support after the project is done?",
        answer:
          "Yes, we provide technical support and ongoing improvements after launch.",
      },
    ],
  },
  contact: {
    eyebrow: "CONTACT",
    title: "Let's discuss your project",
    description:
      "Fill out the form or message us directly on Telegram/phone — we reply within 24 hours.",
    directContact: "or message us directly",
    form: {
      nameLabel: "Your name",
      namePlaceholder: "Enter your name",
      contactLabel: "Contact (Telegram, phone, or email)",
      contactPlaceholder: "@username or +998 ...",
      serviceLabel: "Which service are you interested in?",
      servicePlaceholder: "Select a service",
      messageLabel: "Briefly about your project",
      messagePlaceholder: "Tell us about your business and needs...",
      submitLabel: "Send",
      requiredError: "This field is required",
      successTitle: "Thank you!",
      successDescription:
        "Telegram has opened — press \"Send\" to deliver your message.",
    },
  },
} as const;

export default home;
