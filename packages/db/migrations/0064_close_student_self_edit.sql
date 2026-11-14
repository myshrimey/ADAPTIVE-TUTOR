-- v128: a signed-in account can no longer edit its own `students` row directly. Additive-safe (removes one rule) and re-runnable.
-- 0002 let a student update ANY column of their own students row through the public key (students_update_own).
-- That included parent_token (the parent-report link), must_complete_profile, display_name and grade. Every
-- write to `students` in the website already goes through the server's own key (v128 scan, t128), so the rule is not used.
-- Reading your own row (students_select_own) is unchanged. With no update rule left, a direct update from the browser changes 0 rows.
drop policy if exists students_update_own on students;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-14', 'v128', 'A signed-in account can no longer edit its own student record directly', 'Security: students_update_own let a student change fields such as the parent link code; the website never used it', '0064 close_student_self_edit (one rule removed; no tables or columns changed)', 'none', 'Deploy the v128 website, then run 0064. Reading your own student record is unchanged.'
where not exists (select 1 from system_changelog where version = 'v128' and change like 'A signed-in account can no longer edit its own student record%');
