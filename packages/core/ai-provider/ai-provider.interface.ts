// TutorService and every other consumer depend ONLY on this interface —
// never on @google/genai or @anthropic-ai/sdk directly. That's what keeps
// switching providers a config change instead of a rewrite.

export interface AICompletionParams {
  systemPrompt: string;
  userMessage: string;
  responseFormat?: 'text' | 'json';
  /** What this call is for ('tutor', 'evaluation', ...). Only used for the usage/cost log. */
  feature?: AIFeature;
  /** Photos for the model to read (handwritten answers). Only providers with supportsImages receive such a call. */
  images?: AIImage[];
}

export interface AIImage {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Plain base64, no data: prefix. */
  base64: string;
}

export type AIFeature = 'tutor' | 'evaluation' | 'summary' | 'explanation' | 'question_generation' | 'misconception' | 'handwriting' | 'other';

export interface AICompletionResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface AIProvider {
  /** True when complete() can read params.images. */
  readonly supportsImages?: boolean;
  complete(params: AICompletionParams): Promise<AICompletionResult>;
}
