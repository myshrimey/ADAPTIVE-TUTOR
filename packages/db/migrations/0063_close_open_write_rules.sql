-- v122: closes two write rules that were too open. Additive-safe and re-runnable.
-- 1) 0008 let ANY signed-in account update ANY column of ANY row in `questions` and `diagnostic_questions`
--    (policy using true / with check true). That meant a student could change an answer key, a prompt or the
--    review status for everyone by calling the database directly with the public key. The website no longer needs
--    these rules: saving a generated explanation now goes through the server's own key (v122 code), so both rules go.
--    Reading questions is unchanged (questions_read_all / diagnostic_questions_read_all stay).
-- 2) 0009 let a student insert a payment row with ANY values. A family could therefore insert a row already marked
--    'confirmed' with access dates, which would distort the founder's revenue figures. The insert rule now only
--    accepts what the payment form itself sends: a pending claim for the student's own record, with every
--    admin-only field empty. Confirming stays admin-only through the server key (no update rule exists).
drop policy if exists diagnostic_questions_update_explanation on diagnostic_questions;
drop policy if exists questions_update_explanation on questions;

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
    and status = 'pending'
    and confirmed_at is null
    and pilot_start_date is null
    and pilot_end_date is null
    and admin_notes is null
    and activated_at is null
    and activated_by is null
    and product_code is null
    and list_amount is null
    and offer_code is null
    and subject_slugs is null
    and paid_by_user_id is null
    and quantity = 1
    and discount_amount = 0
  );

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-09', 'v122', 'Signed-in accounts can no longer edit questions directly, and a payment claim can only be created as pending', 'Security: two write rules from 0008 and 0009 were too open', '0063 close_open_write_rules (two rules removed, one tightened; no tables or columns changed)', 'none', 'Deploy the v122 website first, then run 0063. Reading questions is unchanged.'
where not exists (select 1 from system_changelog where version = 'v122' and change like 'Signed-in accounts can no longer edit questions%');
