import type { AIProvider, AICompletionParams, AICompletionResult } from './ai-provider.interface';

// Deliberately deferred past the 7-day MVP (docs/architecture.md, "What to build next").
// Exists now so a future provider switch is a config change, not a new interface.
export class ClaudeProvider implements AIProvider {
  constructor(private apiKey: string = process.env.ANTHROPIC_API_KEY!) {}

  async complete(_params: AICompletionParams): Promise<AICompletionResult> {
    throw new Error('not_implemented: ClaudeProvider is a post-MVP stub');
  }
}
