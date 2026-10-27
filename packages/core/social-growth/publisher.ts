// Pluggable publishing and image abstractions. NOTHING here talks to Facebook, Instagram, LinkedIn or an image service:
// no platform API is connected, so every adapter reports `connected: false` and the only way a post becomes PUBLISHED is the founder saying so.
import type { ImageSpec, SocialContent } from './constants';
export interface PublishResult { ok: boolean; externalUrl?: string; message: string }
export interface SocialPublisher {
  readonly platform: string;
  readonly connected: boolean;
  /** Plain-words reason shown on screen while not connected. */
  readonly note: string;
  publish(content: SocialContent): Promise<PublishResult>;
}
const manual = (platform: string, steps: string[]): SocialPublisher => ({
  platform, connected: false, note: `Manual workflow. ${platform} is not connected: copy the text, post it yourself, then press "Mark as published" and paste the post address.`,
  async publish() { return { ok: false, message: `${platform} publishing is not connected. Post it manually, then mark it as published.` }; },
});
export const PUBLISHERS: Record<string, SocialPublisher> = { facebook: manual('Facebook', []), instagram: manual('Instagram', []), linkedin: manual('LinkedIn', []) };
export const getPublisher = (platform: string): SocialPublisher | null => PUBLISHERS[platform] ?? null;
/** To connect a real API later: replace one entry of PUBLISHERS with an adapter whose `connected` is true and whose publish() really posts. The rest of the engine does not change. */
export const publisherStatus = () => Object.values(PUBLISHERS).map((p) => ({ platform: p.platform, connected: p.connected, note: p.note }));

export interface ImageGenerator { readonly id: string; readonly configured: boolean; generate(spec: ImageSpec): Promise<{ ok: boolean; url?: string; message: string }> }
export const IMAGE_GENERATORS: ImageGenerator[] = [];
export const imageGeneratorStatus = () => (IMAGE_GENERATORS.some((g) => g.configured) ? 'configured' : 'Not connected: the image prompt and design brief are provided; make the picture in any design tool.');

export const CHECKLIST: Record<string, string[]> = {
  facebook: ['Open your Facebook page and choose "Create post".', 'Paste the text. Add the picture (use the image brief).', 'Put the tracked link (UTM) in the post or first comment.', 'Post it, copy the post address, then press "Mark as published".'],
  instagram: ['Make the picture or carousel from the image brief (Canva or any tool).', 'Open Instagram, create the post or reel, paste the caption.', 'Instagram does not make links in captions clickable: put the tracked link in your bio or a story link.', 'Post it, copy the post address, then press "Mark as published".'],
  linkedin: ['Open LinkedIn and choose "Start a post".', 'Paste the text. Keep hashtags at the end.', 'Put the tracked link in the post or first comment.', 'Post it, copy the post address, then press "Mark as published".'],
  whatsapp: ['Copy the message and send it to a group or list you have permission to message.', 'Do not send to people who have not agreed to hear from you.'],
  email: ['Copy the subject and text into your email tool.', 'Send only to people who have agreed to receive email.'],
  blog: ['Use the outline as the headings of your article.'],
};
