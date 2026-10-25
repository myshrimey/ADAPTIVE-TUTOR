import { visibleSocials } from '@/lib/social';

// Follow-us links. Renders nothing at all when no social page is switched on (see lib/social.ts).
export function SocialLinks({ heading = true }: { heading?: boolean }) {
  const list = visibleSocials();
  if (list.length === 0) return null;
  return (
    <div className="social-links">
      {heading && <span className="social-links__label">Follow Sahayak</span>}
      {list.map((s) => (
        <a key={s.id} href={s.url.trim()} target="_blank" rel="noopener noreferrer me" className="social-links__pill" aria-label={`Sahayak on ${s.label} (opens in a new tab)`}>{s.label}</a>
      ))}
    </div>
  );
}
