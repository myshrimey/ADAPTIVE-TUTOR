"use client";

import { useCallback, useEffect, useState } from 'react';

type Item = {
  id: string; platform: string; content_type: string; topic: string; body: string;
  hashtags?: string[]; image_prompt?: string; status: string; scheduled_for?: string | null;
  destination_url?: string; publish_error?: string | null;
};

export function SocialGrowthBoard() {
  const [items, setItems] = useState<Item[]>([]);
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('facebook');
  const [pillar, setPillar] = useState('product_demo');
  const [audience, setAudience] = useState('parents');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/social-growth', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load the content queue.');
      setItems(data.items ?? []);
    } catch (e: any) {
      setMessage(e.message || 'Could not load the content queue.');
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function act(payload: Record<string, unknown>) {
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/admin/social-growth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed.');
      if (data.created) setMessage(`Created ${data.created} draft posts. Review each one before posting.`);
      else setMessage('Saved.');
      if (payload.action === 'generate') setTopic('');
      await load();
    } catch (e: any) {
      setMessage(e.message || 'Action failed.');
    } finally { setBusy(false); }
  }

  const visible = filter === 'all' ? items : items.filter(x => x.status === filter);

  return <div>
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Create content</h2>
      <p style={{ color: 'var(--slate)' }}>Drafts are generated from templates and do not use an AI API. Review factual claims and tone before posting.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '.75rem' }}>
        <label>Platform<select className="input" value={platform} onChange={e => setPlatform(e.target.value)}>
          <option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option>
        </select></label>
        <label>Content theme<select className="input" value={pillar} onChange={e => setPillar(e.target.value)}>
          <option value="product_demo">Product demonstration</option><option value="cbse_2027">CBSE 2027</option>
          <option value="diagnostic">Learning gaps / diagnostic</option><option value="parent_value">Parent value</option>
          <option value="learning_science">Learning science</option><option value="tutor_centre">Tutors and coaching centres</option>
          <option value="founder_build">Founder / build in public</option><option value="adaptive_learning">Adaptive learning</option>
        </select></label>
        <label>Audience<select className="input" value={audience} onChange={e => setAudience(e.target.value)}>
          <option value="parents">Parents</option><option value="students">Students</option><option value="tutors">Tutors</option>
          <option value="coaching_centres">Coaching centres</option><option value="partners">Partners / investors</option>
        </select></label>
      </div>
      <label style={{ display: 'block', marginTop: '.75rem' }}>Topic<input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. why finding learning gaps matters" /></label>
      <div className="hero__actions" style={{ marginTop: '.75rem' }}>
        <button className="btn btn--accent" disabled={busy || !topic.trim()} onClick={() => void act({ action: 'generate', platform, topic, pillar, audience, objective: 'awareness' })}>Generate draft</button>
        <button className="btn btn--ghost" disabled={busy} onClick={() => void act({ action: 'seed_month' })}>Create 30-day calendar (90 drafts)</button>
      </div>
    </section>

    {message && <p className="alert" role="status">{message}</p>}

    <section className="card" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Content queue ({visible.length})</h2>
        <label>Show<select className="input" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All statuses</option><option value="draft">Draft</option><option value="review">Needs review</option>
          <option value="approved">Approved</option><option value="scheduled">Scheduled plan</option><option value="published">Marked published</option><option value="rejected">Rejected</option>
        </select></label>
      </div>
      {visible.length === 0 ? <p style={{ color: 'var(--slate)' }}>{busy ? 'Loading…' : 'No items here yet. Generate a draft or create the 30-day calendar.'}</p> :
        <div style={{ display: 'grid', gap: '.9rem', marginTop: '1rem' }}>{visible.map(item =>
          <article key={item.id} className="chapter-row" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
              <strong>{item.platform} · {item.content_type}</strong><span>{item.status}</span>
            </div>
            <h3 style={{ margin: '.5rem 0' }}>{item.topic}</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{item.body}</p>
            <p style={{ color: 'var(--slate)', fontSize: '.88rem' }}>{(item.hashtags ?? []).join(' ')}</p>
            {item.image_prompt && <details><summary>Image brief</summary><p>{item.image_prompt}</p></details>}
            {item.scheduled_for && <p style={{ fontSize: '.85rem' }}>Planned time: {new Date(item.scheduled_for).toLocaleString()}</p>}
            {item.publish_error && <p className="alert">{item.publish_error}</p>}
            <div className="hero__actions">
              {item.status === 'draft' && <button className="btn btn--small btn--ghost" disabled={busy} onClick={() => void act({ action: 'status', id: item.id, status: 'review' })}>Send to review</button>}
              {['draft','review'].includes(item.status) && <button className="btn btn--small btn--accent" disabled={busy} onClick={() => void act({ action: 'status', id: item.id, status: 'approved' })}>Approve draft</button>}
              {['draft','review','approved'].includes(item.status) && <button className="btn btn--small btn--ghost" disabled={busy} onClick={() => void act({ action: 'status', id: item.id, status: 'rejected' })}>Reject</button>}
              {item.status === 'approved' && <button className="btn btn--small btn--ghost" disabled={busy} onClick={() => void act({ action: 'status', id: item.id, status: 'scheduled' })}>Add to planned schedule</button>}
              {['approved','scheduled'].includes(item.status) && <button className="btn btn--small btn--ghost" disabled={busy} onClick={() => {
                if (window.confirm('Only confirm this after you have actually posted it on the social platform.')) void act({ action: 'status', id: item.id, status: 'published' });
              }}>Mark published after posting</button>}
              {item.status === 'rejected' && <button className="btn btn--small btn--ghost" disabled={busy} onClick={() => void act({ action: 'status', id: item.id, status: 'draft' })}>Restore to draft</button>}
            </div>
          </article>
        )}</div>}
    </section>
    <p style={{ color: 'var(--slate)', fontSize: '.85rem', marginTop: '1rem' }}>Important: scheduling here records your planned date/status only. It does not automatically publish to Facebook, Instagram or LinkedIn. Automatic posting requires a separately configured, authorised publishing integration.</p>
  </div>;
}
