'use client';

import { useState } from 'react';

// A read-only progress link a parent can open without a login of their own.
// The token itself is just a stable random id (packages/db/migrations/0004_parent_token.sql);
// this component only builds the URL and copies it — no new data fetched here.
export function ParentLinkButton({ parentToken }: { parentToken: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/parent/${parentToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unavailable — fall back to a prompt
      // so the link is still obtainable rather than silently failing.
      window.prompt('Copy this link to share with a parent:', url);
    }
  }

  return (
    <button type="button" className="btn btn--ghost btn--small" onClick={copyLink}>
      {copied ? 'Link copied!' : "Copy parent's view link"}
    </button>
  );
}
