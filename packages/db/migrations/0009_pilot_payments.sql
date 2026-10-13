-- Offline UPI/QR pilot payment tracking (brief Section 3).
--
-- The app never displays or generates a real UPI ID/QR code — the founder
-- shares that directly with each parent himself (see docs/DECISIONS.md). This
-- table only stores what's needed to track a manual payment claim through to
-- founder verification: never a UPI PIN, banking password, OTP, or full bank
-- credentials, and never a full screenshot — just a minimal reference.
--
-- A payment can NEVER be self-confirmed by the student/parent: insert is
-- allowed (submitting the claim), but update is intentionally NOT granted to
-- `authenticated` at all — only the service-role key (used exclusively from
-- the admin page, itself gated on ADMIN_EMAILS) can change `status`.

create table if not exists pilot_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  offer_label text not null default '30-day founding-family pilot',
  amount numeric(10, 2) not null,
  payment_date date not null,
  transaction_reference text, -- minimal, optional — never a full screenshot or bank credential
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  pilot_start_date date,
  pilot_end_date date,
  admin_notes text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists idx_pilot_payments_student on pilot_payments(student_id);
create index if not exists idx_pilot_payments_status on pilot_payments(status);

alter table pilot_payments enable row level security;

-- A student can see their own payment claims (to show "pending"/"confirmed"
-- status and access dates back to them) and can insert a new claim for
-- themselves — but cannot select anyone else's, and cannot update/delete at
-- all (no update/delete policy for `authenticated` is defined on purpose).
drop policy if exists pilot_payments_select_own on pilot_payments;
create policy pilot_payments_select_own on pilot_payments
  for select
  to authenticated
  using (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

drop policy if exists pilot_payments_insert_own on pilot_payments;
create policy pilot_payments_insert_own on pilot_payments
  for insert
  to authenticated
  with check (
    student_id in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

-- No update/delete policy for `authenticated` — confirming or rejecting a
-- payment is done only via the service-role key from /admin/payments
-- (see apps/web/app/admin/payments/page.tsx and its server action), which
-- bypasses RLS and is itself gated on the ADMIN_EMAILS environment variable.
-- This is the "never let a student mark their own payment as confirmed"
-- requirement enforced at the database level, not just in the UI.
