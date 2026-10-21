'use client';
import { track } from './TrackView';

/** A link that records a commercial event when clicked (contextual upgrade prompts, plan selection). */
export function CtaLink({ href, event, productCode, source, className, children }: { href: string; event: string; productCode?: string; source?: string; className?: string; children: React.ReactNode }) {
  return <a href={href} className={className} onClick={() => track(event, { productCode, source })}>{children}</a>;
}
