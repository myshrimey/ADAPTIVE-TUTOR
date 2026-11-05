# Rollback notes for the database changes not yet applied live (0055 to 0059)

Written in v101 (2 Nov 2026). **How to read this:** every database change in Sahayak only ADDS things and is safe to run again. If you ever need to go back, these are the undo steps, newest first. They were tested on a scratch copy of the database: apply 0055-0059, run every undo block below, check the objects are gone, then apply 0055-0059 again with no error (t101).

**Rules before you undo anything**
1. Take a backup first (Supabase dashboard -> Database -> Backups, or a download). Undoing a table deletes what was saved in it.
2. Do it in the Supabase SQL editor while signed in as the project owner. Never run these from the website.
3. Undo only the newest changes you need to. Undo in the order below (newest first).
4. After an undo, the matching version of the website must also be redeployed, otherwise a page may look for a table that is gone. `/admin/deploy-check` shows which side is behind.
5. These notes undo structure only. They never touch students, answers, payments or accounts.
6. This is a plan written by Claude and tested on a copy. It is not a promise about your live database. Nothing here has been run on it.

## 0059 qa_results (v100) - recorded test results
What you lose: the test results you recorded at /admin/control/testing. The checklists themselves stay.
```sql
drop table if exists public.qa_results;
```

## 0058 login_throttle (v96) - sign-in limit
What you lose: only the short-lived list of recent wrong-password tries (it forgets itself after 24 hours anyway). Sign-in keeps working; the limit simply switches itself off (it fails open when the table is missing).
```sql
drop table if exists public.login_attempts;
```

## 0057 audit_trail (v91) - tamper-resistant audit log
What you lose: the five new columns' content (account id, reason, outcome, request id, role) on past audit lines. The audit lines themselves, with who/what/when, stay. After the undo the audit log can be edited and deleted again, so only do this if you must.
The new columns may be left in place (harmless); drop them only if you truly want them gone.
```sql
drop trigger if exists trg_audit_logs_no_update_delete on public.audit_logs;
drop trigger if exists trg_audit_logs_no_truncate on public.audit_logs;
drop function if exists public.audit_logs_guard();
drop function if exists public.audit_logs_guard_truncate();
drop index if exists public.idx_audit_logs_target;
drop index if exists public.idx_audit_logs_action;
-- optional, loses the extra facts on past lines:
-- alter table public.audit_logs drop column if exists target_account, drop column if exists reason, drop column if exists outcome, drop column if exists request_id, drop column if exists actor_role;
```

## 0056 control_centre (v90) - development control centre tables
What you lose: your choices saved on the Control Centre screens (priority, "next task", acceptance) and the database copy of the registry. The documents in `docs/sahayak-control-centre/` are the source of truth and are not affected; "Load from documents" rebuilds the registry but NOT your choices, so write them down first.
```sql
drop table if exists public.control_executions;
drop table if exists public.control_decisions;
drop table if exists public.control_tasks;
drop table if exists public.control_requirements;
drop table if exists public.control_objectives;
drop table if exists public.control_prompts;
```

## 0055 guard_user_role search path (v90)
What you lose: nothing. It only pinned a safety setting on one function (the Supabase advisor warning). Undoing brings the warning back.
```sql
alter function public.guard_user_role() reset search_path;
```

## The version note
Each change also added one line to `system_changelog` (a history table). Leave those lines; they are only a record. After an undo, `/admin/deploy-check` will show the database "behind" the website until you redeploy the older website version or re-apply the changes.
