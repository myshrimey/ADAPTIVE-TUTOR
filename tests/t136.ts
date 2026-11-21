// t136: Contact book (v136): cleaning, Super-Admin-only route/page, audit without values, safe email change, WhatsApp on Profile, migration 0067.
import { readFileSync } from 'fs';
import { cleanPhone, cleanEmail, cleanContactPatch, matchesQuery, updateContact } from '../packages/core/contacts';
import { cleanProfileInput } from '../packages/core/profile/profile-input';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
(async () => {
  ok(JSON.stringify(cleanPhone(' +91 98765-43210 ')) === '{"ok":true,"value":"+919876543210"}', 'phone is tidied to digits with +');
  ok(cleanPhone('').ok && (cleanPhone('') as any).value === null, 'empty clears');
  ok(!cleanPhone('12345').ok && !cleanPhone('abc1234567').ok && !cleanPhone('1'.repeat(16)).ok, 'bad phones refused');
  ok(!cleanEmail('nope').ok && (cleanEmail(' A@B.com ') as any).value === 'a@b.com', 'email checked and lower-cased');
  ok(!cleanContactPatch({ phone: 'x' }).ok && !cleanContactPatch({ note: 'a'.repeat(301) }).ok, 'patch refuses bad values');
  ok(Object.keys((cleanContactPatch({ whatsapp: '9876543210' }) as any).patch).join() === 'whatsapp', 'only fields present are changed');
  const row: any = { userId: 'u1', role: 'parent', email: 'Mom@x.com', username: null, name: 'Asha', phone: null, whatsapp: '+9198', note: null, parentName: null, parentPhone: null, parentEmail: null, parentWhatsapp: null, createdAt: null };
  ok(matchesQuery(row, 'mom@') && matchesQuery(row, '9198') && !matchesQuery(row, 'zzz'), 'search by email, number');
  // fake server-key client: email change order and revert
  const calls: string[] = [];
  const mk = (failUsers: boolean, clash: boolean) => ({
    from: (t: string) => { const q: any = { select: () => q, eq: () => q, neq: () => q, ilike: () => q, limit: () => Promise.resolve({ data: clash ? [{ id: 'x' }] : [] }), maybeSingle: () => Promise.resolve({ data: { id: 'u1', email: 'old@x.com', auth_user_id: 'a1' } }), update: () => ({ eq: () => { calls.push('users.update'); return Promise.resolve({ error: failUsers ? { message: 'x' } : null }); } }), upsert: () => { calls.push(t + '.upsert'); return Promise.resolve({ error: null }); } }; return q; },
    auth: { admin: { updateUserById: (_i: string, a: any) => { calls.push('auth:' + a.email); return Promise.resolve({ error: null }); } } },
  }) as any;
  let r: any = await updateContact(mk(false, false), 'u1', { email: 'new@x.com', whatsapp: '9876543210' }, 'me');
  ok(r.ok && r.changed.join() === 'email,whatsapp' && calls.join() === 'auth:new@x.com,users.update,user_contacts.upsert', 'email changes in Auth first, then users, then contacts');
  calls.length = 0; r = await updateContact(mk(true, false), 'u1', { email: 'new@x.com' }, 'me');
  ok(!r.ok && r.code === 'contact_save_failed' && calls.join() === 'auth:new@x.com,users.update,auth:old@x.com', 'failed users update reverts Auth');
  calls.length = 0; r = await updateContact(mk(false, true), 'u1', { email: 'new@x.com' }, 'me');
  ok(!r.ok && r.code === 'contact_email_in_use' && calls.length === 0, 'email already in use is refused before any change');
  // route + page
  const route = R('apps/web/app/api/admin/contacts/route.ts');
  ok(/requireAdmin\(\)/.test(route) && !/requireAdmin\(['"]/.test(route), 'route is Super Admin only (no permission name)');
  ok(/action: 'contact\.edit'/.test(route) && /fields:/.test(route) && !/detail:[^}]*(phone|whatsapp|email)[^}]*\}/.test(route.replace(/fields: r\.ok[^}]*/, '')), 'edit audit names fields, not values');
  const page = R('apps/web/app/admin/contacts/page.tsx');
  ok(/adminPageGate\(\)/.test(page) && /action: 'contact\.view'/.test(page), 'page is Super Admin only and logs each opening');
  ok(/\/admin\/contacts/.test(R('apps/web/lib/admin-menu.ts')), 'menu entry exists');
  // profile whatsapp
  const ok1: any = cleanProfileInput({ parentWhatsapp: '+91 98765 43210' }, []);
  ok(ok1.ok && ok1.details.parentWhatsapp === '+91 98765 43210', 'profile keeps a valid WhatsApp number');
  const bad: any = cleanProfileInput({ parentWhatsapp: 'abc' }, []);
  ok(!bad.ok && bad.code === 'profile_parent_phone_invalid', 'profile refuses a bad WhatsApp number with the existing code');
  const svc = R('packages/core/profile/student-profile.service.ts');
  ok(/parent_whatsapp/.test(svc) && /delete row\.parent_whatsapp/.test(svc), 'profile saves even before 0067 (retry without the column)');
  ok(/parentWhatsapp/.test(R('apps/web/app/profile/page.tsx')), 'profile page has the WhatsApp field');
  // migration
  const m = R('packages/db/migrations/0067_contact_book.sql');
  ok(/add column if not exists parent_whatsapp/.test(m) && /create table if not exists user_contacts/.test(m) && /enable row level security/.test(m) && !/create policy/.test(m), 'migration adds column and server-only table');
  ok(/where not exists \(select 1 from system_changelog where version = 'v136'/.test(m), 'changelog row guarded');
  console.log(`t136: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
