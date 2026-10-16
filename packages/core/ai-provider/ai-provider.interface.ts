// TutorService and every other consumer depend ONLY on this interface —
// never on @google/genai or @anthropic-ai/sdk directly. That's what keeps
// switching providers a config change instead of a rewrite.

export interface AICompletionParams {
  systemPrompt: string;
  userMessage: string;
  responseFormat?: 'text' | 'json';
  /** What this call is for ('tutor', 'evaluation', ...). Only used for the usage/cost log. */
  feature?: AIFeature;
}

export type AIFeature = 'tutor' | 'evaluation' | 'summary' | 'explanation' | 'question_generation' | 'misconception' | 'other';

export interface AICompletionResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface AIProvider {
  complete(params: AICompletionParams): Promise<AICompletionResult>;
}
