export const templateConfig = {
  brand: {
    companyName: "AgentOS",
    productName: "Analytics Dashboard for Voice AI",
    dashboardTitle: "Analytics Dashboard for Voice AI",
    description: "Track call volume, summarize and visualize operational performance.",
    logoSrc: "/agentOS_logo.png",
    iconSrc: "/favicon.png",
  },
  navigation: [
    { label: "Dashboard", href: "/" },
    { label: "Performance Report", href: "/reports" },
    { label: "Data Canvas", href: "/canvas" },
  ],
  integrations: {
    primaryLabel: "InsForge Backend",
  },
  auth: {
    signInTitle: "Sign in to your workspace",
    signInSubtitle: "Use your email and password to access the dashboard.",
    verificationTitle: "Verify your email",
    verificationSubtitle:
      "Enter the 6-digit code from your email to finish creating the account.",
    heroTitle: "Analytics Dashboard for Voice AI",
    heroDescription:
      "Track call volume, summarize and visualize operational performance.",
    featureBadges: ["InsForge Backend", "Reusable Components"],
  },
  dashboard: {
    title: "Analytics Dashboard for Voice AI",
    subtitle:
      "Track call volume, summarize and visualize operational performance.",
    volumeSubtitle:
      "Track how frequently callers are reaching your voice agent and how many conversations were resolved automatically.",
    fallbackNotice:
      "Showing starter metrics. Connect InsForge data and import call events to load live analytics.",
  },
  reports: {
    title: "Performance Report",
    subtitle:
      "Weekly voice agent performance analysis and reusable operational insights.",
    selectorLabel: "Report Period",
  },
  assistant: {
    title: "Data Assistant",
    badgeLabel: "Gemini 3 Pro Preview",
    placeholder: "Ask questions or create charts",
    helperText:
      'Try: "chart calls by day" or "draft a weekly summary"',
    emptyStateLabel: "Ask questions or create charts and drafts",
    quickPrompts: [
      "Chart calls by day",
      "Draft a weekly summary",
      "What were the top categories?",
    ],
  },
  canvas: {
    title: "Data Canvas",
    subtitle: "Visualizations and drafts generated from your data assistant.",
    emptyStateTitle: "Your canvas is empty",
    emptyStateDescription:
      "Use the assistant to generate visualizations and drafts for your team.",
    emptyStateExamples: [
      "Show me a chart of calls by day",
      "Draft a weekly summary",
      "Visualize call categories",
      "Create a report on after-hours calls",
    ],
  },
  ai: {
    model: "gemini-3-pro-preview",
  },
} as const;

export type TemplateConfig = typeof templateConfig;
