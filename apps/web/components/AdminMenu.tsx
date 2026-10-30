'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ADMIN_MENU, locate, searchMenu, type AdminGroup } from '@/lib/admin-menu';

// The admin top bar: one button per category, each opening a short list. A search box finds any page by name.
// Works with the keyboard (Esc closes), and folds into a simple accordion on a phone.
export function AdminMenu({ groups }: { groups?: AdminGroup[] }) {
  const MENU = groups ?? ADMIN_MENU;
  const pathname = usePathname() ?? '';
  const here = locate(pathname);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [mobile, setMobile] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const hits = searchMenu(q).filter((h) => MENU.some((g) => g.id === h.group.id && g.items.some((i) => i.href === h.item.href)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setQ(''); } };
    const onClick = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(null); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);
  useEffect(() => { setOpen(null); setQ(''); setMobile(false); }, [pathname]);

  return (
    <nav className="admin-menu" ref={box} aria-label="Admin menu">
      <div className="admin-menu__bar">
        <a href="/admin/command-centre" className="admin-menu__home">Command Centre</a>
        <button type="button" className="admin-menu__burger" aria-expanded={mobile} onClick={() => setMobile((v) => !v)}>Menu ▾</button>
        <div className={`admin-menu__groups${mobile ? ' is-open' : ''}`}>
          {MENU.map((g) => (
            <div key={g.id} className="admin-menu__group">
              <button
                type="button"
                className={`admin-menu__btn${here.group?.id === g.id ? ' is-here' : ''}${open === g.id ? ' is-open' : ''}`}
                aria-expanded={open === g.id}
                onClick={() => setOpen(open === g.id ? null : g.id)}
              >{g.label} <span aria-hidden>▾</span></button>
              {open === g.id && (
                <div className="admin-menu__panel" role="menu">
                  <p className="admin-menu__blurb">{g.blurb}</p>
                  {g.items.map((it) => {
                    const current = here.item?.href === it.href;
                    return (
                      <a key={it.href} href={it.href} role="menuitem" className={`admin-menu__item${current ? ' is-current' : ''}`} aria-current={current ? 'page' : undefined}>
                        <strong>{it.label}</strong><span>{it.note}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <input
          type="search" className="admin-menu__search" placeholder="Find a page…" aria-label="Find an admin page"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {q.trim() && (
        <div className="admin-menu__results">
          {hits.length === 0 ? <p>No page matches “{q}”.</p> : hits.map(({ group, item }) => (
            <a key={item.href} href={item.href} className="admin-menu__item"><strong>{item.label}</strong><span>{group.label} · {item.note}</span></a>
          ))}
        </div>
      )}
      {here.group && here.item && <p className="admin-menu__crumb">{here.group.label} › <strong>{here.item.label}</strong></p>}
    </nav>
  );
}
