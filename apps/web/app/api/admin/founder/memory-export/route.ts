import { csvResponse, fileResponse } from '@/lib/export';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { loadSettings, loadProducts } from '@adaptive-tutor/core';

// One Markdown file: your written memory + live facts (prices, switches, change log). No secrets and nothing about any child.
export async function GET() {
  try {
    await requireAdmin();
    const s = createServiceClient();
    const [{ data: mem }, { data: log }, settings, products, { data: tasks }] = await Promise.all([
      s.from('founder_memory').select('title, body').order('sort'), s.from('system_changelog').select('changed_on, version, change, reason').order('changed_on', { ascending: false }).limit(60),
      loadSettings(s), loadProducts(s), s.from('founder_tasks').select('title, priority, due').eq('status', 'open').order('priority'),
    ]);
    const md: string[] = ['# Sahayak project memory', `Exported ${new Date().toISOString().slice(0, 10)}. Read SAHAYAK_PROJECT_MEMORY.md and CLAUDE.md in the repository too.`, ''];
    for (const m of mem ?? []) md.push(`## ${m.title}`, m.body?.trim() || '(not written yet)', '');
    md.push('## Live products and prices (from the database)');
    for (const p of products) md.push(`- ${p.name} (${p.code}): ₹${p.priceInr}${p.billing === 'monthly' ? '/month' : ''}${p.onSale ? '' : ' [not on sale]'}`);
    md.push('', '## Live switches and limits', '```json', JSON.stringify({ founding_access: settings.founding_access, free_limits: settings.free_limits, handwritten: settings.handwritten, entitlements: settings.entitlements, seats: settings.seats, boards: settings.boards, feature_flags: settings.feature_flags }, null, 1), '```', '');
    md.push('## Open founder tasks'); for (const t of tasks ?? []) md.push(`- [${t.priority}] ${t.title}${t.due ? ` (due ${t.due})` : ''}`);
    md.push('', '## Recent change log'); for (const l of log ?? []) md.push(`- ${l.changed_on} ${l.version ?? ''}: ${l.change}${l.reason ? ` (why: ${l.reason})` : ''}`);
    return fileResponse(md.join('\n'), { kind: 'project-memory', ext: 'md', contentType: 'text/markdown; charset=utf-8', title: 'Sahayak project memory', classification: 'internal', filename: 'sahayak-project-memory.md' });
  } catch { return NextResponse.json({ error: 'not_authorized' }, { status: 403 }); }
}
