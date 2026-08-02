export interface Competitor {
  name: string;
  website: string;
}

export interface ResearchResult {
  companyName: string;
  website: string;
  phone: string | null;
  address: string | null;
  productsServices: string[];
  painPoints: string[];
  competitors: Competitor[];
}

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

export interface StepStatus {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error' | 'skipped';
  detail?: string;
}

export interface ResearchWarning {
  step: string;
  message: string;
}

export interface ResearchResponse {
  result: ResearchResult;
  warnings: ResearchWarning[];
  crawledPages: number;
  resolvedFrom: 'url' | 'company_name';
}

export interface DiscordConfig {
  botToken: string;
  channelId: string;
  applicantName: string;
  applicantEmail: string;
}

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (recommended)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (fast/cheap)' },
  { id: 'google/gemini-pro-1.5', label: 'Gemini 1.5 Pro' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B Instruct' }
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]['id'];
