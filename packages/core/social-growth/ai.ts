import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { AUDIENCES, CONTENT_TYPES, OBJECTIVES, SCOPES, LANGUAGES, type Draft, type DraftInput, type ImageSpec } from './constants';
import { imageSpecFor } from './templates';
// AI writing goes ONLY through the existing AI gateway (the caller passes a provider built by createAIProvider with recordAIAttempt),
// so provider choice, spend caps and the usage/cost log are the application's, not a second system here.
export const PROMPT_VERSION = 'social-v1';
export const REFINE_ACTIONS: Record<string, string> = {
  shorten: 'Make it clearly shorter. Keep the meaning and the call to action.', expand: 'Make it a little longer with one more useful, true point.', simplify: 'Use simpler words and shorter sentences.',
  professional: 'Make the tone more professional.', emotional: 'Make the tone warmer and more emotional, without pressure or fear.', educational: 'Make it more educational: teach one clear idea.',
  conversational: 'Make it more conversational, like talking to one person.', translate_hi: 'Translate everything into clear, natural Hindi (Devanagari). Keep hashtags in English.', translate_en: 'Translate everything into clear English.',
};
const RULES = `You write social media posts for Sahayak, an adaptive learning platform that first finds where a learner actually starts and then decides what to practise next. Starting with CBSE Class 10.
Mention only things Sahayak really does: a baseline check, practice that adapts to answers, spaced revision, progress that parents/tutors/centres can see, English and Hindi support, an AI tutor that guides with hints.
NEVER: promise marks, rank, admission or success; say "best", "number one" or "#1"; invent statistics, percentages, student results, testimonials, endorsements or partnerships; put in phone numbers, emails or names of real children; use fear, shame or pressure on children or parents; say AI replaces teachers or tutors.
Do not state prices. If you mention the free plan say exactly: "Sahayak's Free Core is currently available at no charge. Usage limits may apply."
Return ONLY JSON: {"hook": string, "body": string, "cta": string, "hashtags": string[], "image": {"concept": string, "visual": string, "headline": string, "support": string, "ratio": string, "prompt": string}}.`;
export interface AiResult { draft: Draft; requestId?: string; inputTokens: number; outputTokens: number }
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function parseAiDraft(text: string, input: DraftInput, topic: string): Draft {
  const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error('The AI did not return a usable post. Please try again.');
  let j: any; try { j = JSON.parse(m[0]); } catch { throw new Error('The AI reply could not be read. Please try again.'); }
  const body = str(j.body, 4000); if (!body) throw new Error('The AI returned an empty post. Please try again.');
  const hook = str(j.hook, 200), cta = str(j.cta, 160);
  const tags = Array.isArray(j.hashtags) ? j.hashtags.map((t: unknown) => str(t, 40)).filter((t: string) => /^#[\p{L}\p{N}_]+$/u.test(t)).slice(0, 12) : [];
  const base = imageSpecFor(input, topic, hook || topic, cta);
  const im = j.image && typeof j.image === 'object' ? j.image : {};
  const image: ImageSpec = { concept: str(im.concept, 300) || base.concept, visual: str(im.visual, 400) || base.visual, headline: str(im.headline, 90) || base.headline, support: str(im.support, 160) || base.support, cta: cta || base.cta, ratio: str(im.ratio, 30) || base.ratio, prompt: str(im.prompt, 700) || base.prompt };
  return { hook, body, cta, hashtags: tags, image, topic };
}
const brief = (i: DraftInput) => `Platform: ${i.platform}. Audience: ${AUDIENCES[i.audience] ?? i.audience}. Objective: ${OBJECTIVES[i.objective] ?? i.objective}. Type: ${CONTENT_TYPES[i.contentType] ?? i.contentType}. Scope: ${SCOPES[i.scope] ?? i.scope}. Pillar: ${i.pillar}. Language: ${LANGUAGES[i.language ?? 'en'] ?? 'English'}.${i.topic ? ` Topic: ${i.topic}.` : ''}${i.cta ? ` Call to action to use: ${i.cta}` : ''}`;

export async function aiGenerate(ai: AIProvider, input: DraftInput, ref?: string): Promise<AiResult> {
  const r = await ai.complete({ systemPrompt: RULES, userMessage: `Write one ${input.platform} post. ${brief(input)}\nStyle for the platform: ${input.platform === 'linkedin' ? 'professional, short paragraphs, founder/business angle, 3-5 hashtags' : input.platform === 'instagram' ? 'strong first line, short lines, a carousel/reel outline when the type asks, 6-10 hashtags' : 'conversational, 2-3 short paragraphs, ends with a question, 2-3 hashtags'}.`, responseFormat: 'json', feature: 'social_content', ref });
  return { draft: parseAiDraft(r.text, input, input.topic || input.pillar), requestId: r.requestId, inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens };
}
export async function aiRefine(ai: AIProvider, action: string, input: DraftInput, current: { hook: string; body: string; cta: string; hashtags: string[] }, ref?: string): Promise<AiResult> {
  const instr = REFINE_ACTIONS[action]; if (!instr) throw new Error('Unknown change requested.');
  const r = await ai.complete({ systemPrompt: RULES, userMessage: `Rewrite this post. Instruction: ${instr}\n${brief(input)}\nCurrent post JSON: ${JSON.stringify(current)}`, responseFormat: 'json', feature: 'social_content', ref });
  return { draft: parseAiDraft(r.text, input, input.topic || input.pillar), requestId: r.requestId, inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens };
}
