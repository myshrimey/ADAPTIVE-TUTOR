// The ONLY wording the product may use about free AI. Never claim unlimited, forever-free or "powered by free AI".
export const FREE_CORE_NOTICE = {
  line: "Sahayak's Free Core is currently available at no charge. Usage limits may apply.",
  terms: 'Terms and conditions apply. Features, usage limits and pricing may be revised based on infrastructure, AI-provider, software and operational costs.',
} as const;
export const FORBIDDEN_FREE_CLAIMS = [/unlimited\s+(free\s+)?ai/i, /free\s+ai\s+forever/i, /powered\s+by\s+free\s+ai/i, /unlimited\s+ai\s+because/i, /free\s+forever/i, /unlimited\s+free/i];
