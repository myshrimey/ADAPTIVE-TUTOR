import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { makeSocialPost, makeMonthTopics, type SocialPlatform } from '@adaptive-tutor/core';

async function getAdmin() {
  await requireAdmin();
  return createServiceClient();
}

export async function GET() {
  try {
    const service = await getAdmin();
    const [{ data: campaigns, error: ce }, { data: items, error: ie }, { data: accounts, error: ae }] = await Promise.all([
      service.from('social_campaigns').select('*').order('created_at', { ascending: false }).limit(50),
      service.from('social_content_items').select('*').order('scheduled_for', { ascending: true, nullsFirst: false }).limit(200),
      service.from('social_accounts').select('*').order('platform'),
    ]);
    const error = ce ?? ie ?? ae;
    if (error) throw error;
    return NextResponse.json({ campaigns: campaigns ?? [], items: items ?? [], accounts: accounts ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}

export async function POST(req: Request) {
  try {
    const service = await getAdmin();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    if (action === 'seed_month') {
      const { data: campaign, error: campaignError } = await service.from('social_campaigns').insert({
        name: 'Sahayak 30-Day Social Growth Calendar',
        objective: 'awareness',
        audience: 'parents',
        status: 'draft',
        notes: 'Draft-only calendar. Founder must review every post; nothing is auto-published.',
      }).select('*').single();
      if (campaignError || !campaign) throw campaignError ?? new Error('Could not create campaign.');
      const topics = makeMonthTopics();
      const platforms: SocialPlatform[] = ['facebook', 'instagram', 'linkedin'];
      const rows = topics.flatMap((topic, i) => platforms.map((platform, p) => {
        const scheduled = new Date();
        scheduled.setDate(scheduled.getDate() + i);
        scheduled.setHours(10 + p, 0, 0, 0);
        const pillar = i % 5 === 0 ? 'cbse_2027' : i % 5 === 1 ? 'diagnostic' : i % 5 === 2 ? 'learning_science' : i % 5 === 3 ? 'parent_value' : 'product_demo';
        return {
          campaign_id: campaign.id,
          scheduled_for: scheduled.toISOString(),
          ...makeSocialPost({ platform, topic, pillar, audience: platform === 'linkedin' ? 'partners' : 'parents', objective: i > 25 ? 'lead' : 'awareness' }),
          status: 'draft',
          publisher: 'manual',
          created_by: 'founder',
        };
      }));
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await service.from('social_content_items').insert(rows.slice(i, i + 100));
        if (error) throw error;
      }
      return NextResponse.json({ ok: true, campaign, created: rows.length });
    }

    if (action === 'generate') {
      const platform = body.platform as SocialPlatform;
      if (!['facebook', 'instagram', 'linkedin'].includes(platform)) return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
      const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 240) : '';
      if (!topic) return NextResponse.json({ error: 'Please enter a topic.' }, { status: 400 });
      const x = makeSocialPost({
        platform, topic,
        pillar: typeof body.pillar === 'string' ? body.pillar.slice(0, 60) : 'product_demo',
        audience: typeof body.audience === 'string' ? body.audience.slice(0, 60) : 'parents',
        objective: typeof body.objective === 'string' ? body.objective.slice(0, 60) : 'awareness',
      });
      const { data, error } = await service.from('social_content_items').insert({ ...x, created_by: 'founder', status: 'draft', publisher: 'manual' }).select('*').single();
      if (error) throw error;
      return NextResponse.json({ ok: true, item: data });
    }

    if (action === 'status') {
      const id = typeof body.id === 'string' ? body.id : '';
      const allowed = ['draft','review','approved','scheduled','published','rejected'];
      const status = typeof body.status === 'string' ? body.status : '';
      if (!/^[0-9a-f-]{36}$/i.test(id) || !allowed.includes(status)) return NextResponse.json({ error: 'Invalid item or status.' }, { status: 400 });
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === 'published') patch.published_at = new Date().toISOString();
      if (status !== 'published') patch.published_at = null;
      const { data, error } = await service.from('social_content_items').update(patch).eq('id', id).select('*').single();
      if (error) throw error;
      return NextResponse.json({ ok: true, item: data });
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
