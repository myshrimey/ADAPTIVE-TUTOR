# Rollback notes for the database changes 0002 to 0061

Written in v101 (2 Nov 2026); 0002 to 0054 added in v113 and v115 (8 Nov 2026), worked out by comparing a scratch database before and after each change (scripts/db-test). **How to read this:** every database change in Sahayak only ADDS things and is safe to run again. If you ever need to go back, these are the undo steps, newest first. They were tested on a scratch copy of the database: apply 0055-0059, run every undo block below, check the objects are gone, then apply 0055-0059 again with no error (t101).

**Rules before you undo anything**
1. Take a backup first (Supabase dashboard -> Database -> Backups, or a download). Undoing a table deletes what was saved in it.
2. Do it in the Supabase SQL editor while signed in as the project owner. Never run these from the website.
3. Undo only the newest changes you need to. Undo in the order below (newest first).
4. After an undo, the matching version of the website must also be redeployed, otherwise a page may look for a table that is gone. `/admin/deploy-check` shows which side is behind.
5. These notes undo structure only: they never delete rows from students, answers, payments or accounts, and never drop those core tables. They DO drop columns and new tables that a change added, and what was saved in them is lost (each section says which).
6. This is a plan written by Claude and tested on a copy. It is not a promise about your live database. Nothing here has been run on it.

**Special care for the oldest changes (0002 to 0040).** Many of them added columns that sign-in, parent links and plans now depend on (for example usernames from 0023, the parent link code from 0004, profile fields from 0007). Undoing one of those deletes those values for every family. In practice only undo the NEWEST changes, one at a time, newest first, after a backup and after a version of the website that does not use them is deployed. Four core tables (users, students, student_access, audit_logs, system_changelog) are never dropped by any undo, and rules (policies) added to tables that already existed are never removed.

## 0061 feedback_attachments (v106) - pictures attached to feedback
What you lose: the list saying which picture belongs to which feedback message. Feedback text is untouched and keeps working; the website simply stops showing pictures (the page and upload route fail safe when the table is missing). The picture FILES stay in the private bucket `feedback-screenshots`: delete them from Supabase -> Storage yourself if you want them gone (they may show children's screens, so do not leave them forgotten).
```sql
drop table if exists public.feedback_attachments;
```

## 0060 public_check_limit (v103) - request limit on the free check
What you lose: only the short-lived list of recent requests to the free readiness check (it forgets itself after an hour anyway). The check keeps working; the limit simply switches itself off (it fails open when the table is missing).
```sql
drop table if exists public.public_check_log;
```

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

## 0054 free_provider_notes (v88) - facts read from the providers' own pages on 2026-10-31, written as NOTES on the candidate rows to sa
What you lose: nothing saved: this change only refreshed settings or added setting rows. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
-- nothing structural to undo
```

## 0053 calibration (v85) - "how sure are you?" records for metacognition
What you lose: everything saved in the new table calibration_events. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.calibration_events;
```

## 0052 curriculum_stamps (v82) - remember which published curriculum version each adaptive check and each baseline used
What you lose: the values in the columns this change added to existing tables (baseline_sessions: curriculum_version_id; student_baselines: curriculum_version_id); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.baseline_sessions drop constraint if exists baseline_sessions_curriculum_version_id_fkey;
alter table public.student_baselines drop constraint if exists student_baselines_curriculum_version_id_fkey;
drop index if exists public.idx_baseline_sessions_cv;
drop index if exists public.idx_student_baselines_cv;
alter table public.baseline_sessions drop column if exists curriculum_version_id;
alter table public.student_baselines drop column if exists curriculum_version_id;
```

## 0051 curriculum_management (v81) - syllabus upload, structured curriculum, review/approve/publish with versions and rollback
What you lose: everything saved in the new tables curriculum_documents, curriculum_events, curriculum_nodes; the values in the columns this change added to existing tables (curriculum_versions: published_at, published_by, status_note); the rows themselves stay. The storage bucket `curriculum-docs` is NOT removed by this undo (it may hold uploaded files): empty and delete it in Supabase -> Storage yourself if you want it gone. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.curriculum_versions drop column if exists published_at;
alter table public.curriculum_versions drop column if exists published_by;
alter table public.curriculum_versions drop column if exists status_note;
drop table if exists public.curriculum_documents;
drop table if exists public.curriculum_events;
drop table if exists public.curriculum_nodes;
```

## 0050 teacher_assignments (v80) - a teacher is assigned to a student by the founder/academic team
What you lose: everything saved in the new table teacher_assignments. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.teacher_assignments;
```

## 0049 invitations_team (v79) - shareable invitations, admin team, centre membership, role-change log
What you lose: everything saved in the new tables admin_team, invitation_events, invitations, org_members, role_changes; the database guard users.trg_guard_user_role, guard_user_role(). WARNING: this guard stops a signed-in person changing their own role. Undoing it removes that protection; undo it only together with redeploying a version that does not need it, and re-apply it (run the migration again) as soon as possible. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop trigger if exists trg_guard_user_role on public.users;
drop table if exists public.admin_team;
drop table if exists public.invitation_events;
drop table if exists public.org_members;
drop table if exists public.role_changes;
drop table if exists public.invitations;
drop function if exists public.guard_user_role();
```

## 0048 acquisition (v76) - Acquisition & Referral Intelligence Engine
What you lose: everything saved in the new tables acq_experiments, acq_partners, acq_sale_links, acquisition_attribution, acquisition_touches; the values in the columns this change added to existing tables (expenses: acq_campaign, acq_source; page_views: content; social_campaigns: owner, platforms); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.expenses drop column if exists acq_campaign;
alter table public.expenses drop column if exists acq_source;
alter table public.page_views drop column if exists content;
alter table public.social_campaigns drop column if exists owner;
alter table public.social_campaigns drop column if exists platforms;
drop table if exists public.acq_experiments;
drop table if exists public.acq_partners;
drop table if exists public.acq_sale_links;
drop table if exists public.acquisition_attribution;
drop table if exists public.acquisition_touches;
```

## 0047 feedback_extras (v73) - Feedback Intelligence extras (additive; re-runnable)
What you lose: the values in the columns this change added to existing tables (feedback: context, impact, kind, person, positive, received_on, role, source; feedback_clusters: ai_analysis, defer_until, deployment_version, moat, priority_override, priority_reason, task, validated_at, validated_by, validation_note, validation_status); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop index if exists public.idx_feedback_created;
drop index if exists public.idx_feedback_role;
drop index if exists public.idx_feedback_source;
drop index if exists public.idx_fb_clusters_area;
alter table public.feedback drop column if exists context;
alter table public.feedback drop column if exists impact;
alter table public.feedback drop column if exists kind;
alter table public.feedback drop column if exists person;
alter table public.feedback drop column if exists positive;
alter table public.feedback drop column if exists received_on;
alter table public.feedback drop column if exists role;
alter table public.feedback drop column if exists source;
alter table public.feedback_clusters drop column if exists ai_analysis;
alter table public.feedback_clusters drop column if exists defer_until;
alter table public.feedback_clusters drop column if exists deployment_version;
alter table public.feedback_clusters drop column if exists moat;
alter table public.feedback_clusters drop column if exists priority_override;
alter table public.feedback_clusters drop column if exists priority_reason;
alter table public.feedback_clusters drop column if exists task;
alter table public.feedback_clusters drop column if exists validated_at;
alter table public.feedback_clusters drop column if exists validated_by;
alter table public.feedback_clusters drop column if exists validation_note;
alter table public.feedback_clusters drop column if exists validation_status;
```

## 0046 social_growth (v72) - Social Media Growth Engine
What you lose: everything saved in the new tables social_audit_log, social_campaigns, social_content, social_experiments, social_hashtags, social_metrics, social_observations, social_pillars, social_publications. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.social_audit_log;
drop table if exists public.social_hashtags;
drop table if exists public.social_metrics;
drop table if exists public.social_observations;
drop table if exists public.social_pillars;
drop table if exists public.social_publications;
drop table if exists public.social_content;
drop table if exists public.social_experiments;
drop table if exists public.social_campaigns;
```

## 0045 batches_interventions (v69) - tutor / centre batches and intervention tracking
What you lose: everything saved in the new tables batch_students, batches, interventions. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.batch_students;
drop table if exists public.batches;
drop table if exists public.interventions;
```

## 0044 review_schedule (v68) - spaced revision
What you lose: everything saved in the new table review_schedule. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.review_schedule;
```

## 0043 feedback_intelligence (v67) - Feedback Intelligence
What you lose: everything saved in the new tables feedback_cluster_events, feedback_clusters; the values in the columns this change added to existing tables (feedback: analysed_at, category, cluster_id, duplicate_of, feature_area, severity); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop index if exists public.idx_feedback_cluster;
drop index if exists public.idx_feedback_unanalysed;
alter table public.feedback drop column if exists analysed_at;
alter table public.feedback drop column if exists category;
alter table public.feedback drop column if exists cluster_id;
alter table public.feedback drop column if exists duplicate_of;
alter table public.feedback drop column if exists feature_area;
alter table public.feedback drop column if exists severity;
drop table if exists public.feedback_cluster_events;
drop table if exists public.feedback_clusters;
```

## 0042 reload_schema_cache (v66) - ask the Supabase API layer (PostgREST) to reload its table list, so tables added by 0040 and 0041 ar
What you lose: nothing saved: this change only refreshed settings or added setting rows. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
-- nothing structural to undo
```

## 0041 page_views (v64) - first-party website traffic analytics
What you lose: everything saved in the new table page_views. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.page_views;
```

## 0040 challenge_tier (v63) - Challenge tier
What you lose: everything saved in the new table stretch_attempts; the values in the columns this change added to existing tables (questions: exam_style, stretch_level, tier); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.questions drop constraint if exists questions_exam_style_check;
alter table public.questions drop constraint if exists questions_stretch_level_check;
alter table public.questions drop constraint if exists questions_tier_check;
drop index if exists public.idx_questions_tier;
alter table public.questions drop column if exists exam_style;
alter table public.questions drop column if exists stretch_level;
alter table public.questions drop column if exists tier;
drop table if exists public.stretch_attempts;
```

## 0039 adaptive_baseline_provenance (v62) - Adaptive diagnostic and baseline engine (competency graph across classes, evidence, baselines, learn
What you lose: everything saved in the new tables adaptive_decisions, baseline_items, baseline_sessions, competencies, competency_prerequisites, learning_path_nodes, learning_paths, question_requests, student_baselines, student_competency_evidence, student_competency_mastery, target_competency_requirements; the values in the columns this change added to existing tables (diagnostic_questions: competency_id, contributed_by, contributed_role, contributor_org, origin, request_id, review_note, reviewed_at, reviewed_by; questions: competency_id, contributed_by, contributed_role, contributor_org, origin, request_id, review_note, reviewed_at, reviewed_by); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_competency_id_fkey;
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_contributed_by_fkey;
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_contributor_org_fkey;
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_origin_check;
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_request_id_fkey;
alter table public.questions drop constraint if exists questions_competency_id_fkey;
alter table public.questions drop constraint if exists questions_contributed_by_fkey;
alter table public.questions drop constraint if exists questions_contributor_org_fkey;
alter table public.questions drop constraint if exists questions_origin_check;
alter table public.questions drop constraint if exists questions_request_id_fkey;
drop index if exists public.idx_dq_origin;
drop index if exists public.idx_questions_origin;
alter table public.diagnostic_questions drop column if exists competency_id;
alter table public.diagnostic_questions drop column if exists contributed_by;
alter table public.diagnostic_questions drop column if exists contributed_role;
alter table public.diagnostic_questions drop column if exists contributor_org;
alter table public.diagnostic_questions drop column if exists origin;
alter table public.diagnostic_questions drop column if exists request_id;
alter table public.diagnostic_questions drop column if exists review_note;
alter table public.diagnostic_questions drop column if exists reviewed_at;
alter table public.diagnostic_questions drop column if exists reviewed_by;
alter table public.questions drop column if exists competency_id;
alter table public.questions drop column if exists contributed_by;
alter table public.questions drop column if exists contributed_role;
alter table public.questions drop column if exists contributor_org;
alter table public.questions drop column if exists origin;
alter table public.questions drop column if exists request_id;
alter table public.questions drop column if exists review_note;
alter table public.questions drop column if exists reviewed_at;
alter table public.questions drop column if exists reviewed_by;
drop table if exists public.adaptive_decisions;
drop table if exists public.baseline_items;
drop table if exists public.baseline_sessions;
drop table if exists public.competency_prerequisites;
drop table if exists public.learning_path_nodes;
drop table if exists public.learning_paths;
drop table if exists public.question_requests;
drop table if exists public.student_baselines;
drop table if exists public.student_competency_evidence;
drop table if exists public.student_competency_mastery;
drop table if exists public.target_competency_requirements;
drop table if exists public.competencies;
```

## 0038 config_engine_country_audit (v61) - exam sessions, curriculum version register, country pricing, audit log, student country/timezone/cur
What you lose: everything saved in the new tables country_prices, curriculum_versions, exam_sessions; nothing from audit_logs (that table holds accounts, plans or the audit trail, so an undo never drops it; it stays in place); the values in the columns this change added to existing tables (users: country, currency, timezone); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.users drop column if exists country;
alter table public.users drop column if exists currency;
alter table public.users drop column if exists timezone;
drop table if exists public.country_prices;
drop table if exists public.curriculum_versions;
drop table if exists public.exam_sessions;
```

## 0037 referrals_all_roles (v60) - referral links for every role (student, parent, teacher, tutor, centre) and automatic bonus access d
What you lose: everything saved in the new tables bonus_days_ledger, referral_events, user_referral_codes. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.bonus_days_ledger;
drop table if exists public.referral_events;
drop table if exists public.user_referral_codes;
```

## 0036 ai_ledger_economics (v59) - AI request ledger, cost layers, registry extension, evaluation economics, benchmark breakdown
What you lose: everything saved in the new tables ai_evaluation_costs, ai_reconciliations; the values in the columns this change added to existing tables (ai_benchmark_runs: breakdown, class_level, cost_per_case_inr, language, subject, task; ai_providers: capabilities, price_last_verified, production_status, promo_credit_as_of, promo_credit_balance_inr, promo_credit_expiry, quota_region, quota_type; ai_usage: actual_cost_inr, attempt_no, audio_seconds, economic_cost_inr, fallback_count, fallback_reason, free_quota_value_inr, list_cost_inr, model_version, organisation_id, pricing_snapshot, promo_credit_inr, quality_result, quota_type, request_id, retry_count, route_explanation, user_id); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.ai_providers drop constraint if exists ai_providers_production_status_check;
alter table public.ai_providers drop constraint if exists ai_providers_quota_type_check;
drop index if exists public.idx_ai_usage_request;
drop index if exists public.idx_ai_usage_user;
alter table public.ai_benchmark_runs drop column if exists breakdown;
alter table public.ai_benchmark_runs drop column if exists class_level;
alter table public.ai_benchmark_runs drop column if exists cost_per_case_inr;
alter table public.ai_benchmark_runs drop column if exists language;
alter table public.ai_benchmark_runs drop column if exists subject;
alter table public.ai_benchmark_runs drop column if exists task;
alter table public.ai_providers drop column if exists capabilities;
alter table public.ai_providers drop column if exists price_last_verified;
alter table public.ai_providers drop column if exists production_status;
alter table public.ai_providers drop column if exists promo_credit_as_of;
alter table public.ai_providers drop column if exists promo_credit_balance_inr;
alter table public.ai_providers drop column if exists promo_credit_expiry;
alter table public.ai_providers drop column if exists quota_region;
alter table public.ai_providers drop column if exists quota_type;
alter table public.ai_usage drop column if exists actual_cost_inr;
alter table public.ai_usage drop column if exists attempt_no;
alter table public.ai_usage drop column if exists audio_seconds;
alter table public.ai_usage drop column if exists economic_cost_inr;
alter table public.ai_usage drop column if exists fallback_count;
alter table public.ai_usage drop column if exists fallback_reason;
alter table public.ai_usage drop column if exists free_quota_value_inr;
alter table public.ai_usage drop column if exists list_cost_inr;
alter table public.ai_usage drop column if exists model_version;
alter table public.ai_usage drop column if exists organisation_id;
alter table public.ai_usage drop column if exists pricing_snapshot;
alter table public.ai_usage drop column if exists promo_credit_inr;
alter table public.ai_usage drop column if exists quality_result;
alter table public.ai_usage drop column if exists quota_type;
alter table public.ai_usage drop column if exists request_id;
alter table public.ai_usage drop column if exists retry_count;
alter table public.ai_usage drop column if exists route_explanation;
alter table public.ai_usage drop column if exists user_id;
drop table if exists public.ai_evaluation_costs;
drop table if exists public.ai_reconciliations;
```

## 0035 engagement_social (v58) - friend challenge, referral loop
What you lose: everything saved in the new tables referral_codes, referrals; the values in the columns this change added to existing tables (friend_challenges: subject_id); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.friend_challenges drop constraint if exists friend_challenges_subject_id_fkey;
drop index if exists public.idx_friend_creator;
drop index if exists public.idx_friend_joiner;
alter table public.friend_challenges drop column if exists subject_id;
drop table if exists public.referrals;
drop table if exists public.referral_codes;
```

## 0034 engagement (v57) - Student Engagement & Retention Engine
What you lose: everything saved in the new tables achievements, challenge_attempts, daily_missions, engagement_events, engagement_flags, friend_challenges, leaderboard_entries, leaderboards, mission_items, mistake_book, org_challenges, personal_bests, student_achievements, student_engagement, xp_transactions. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.engagement_events;
drop table if exists public.engagement_flags;
drop table if exists public.friend_challenges;
drop table if exists public.challenge_attempts;
drop table if exists public.leaderboard_entries;
drop table if exists public.leaderboards;
drop table if exists public.mission_items;
drop table if exists public.daily_missions;
drop table if exists public.mistake_book;
drop table if exists public.org_challenges;
drop table if exists public.personal_bests;
drop table if exists public.student_achievements;
drop table if exists public.achievements;
drop table if exists public.student_engagement;
drop table if exists public.xp_transactions;
```

## 0033 boards_languages (v56) - Two-board architecture (settings only, no dates), independent languages, validated translation versi
What you lose: everything saved in the new tables subject_requests, supported_languages; the values in the columns this change added to existing tables (handwritten_evaluations: answer_language, feedback_language; learning_profiles: app_language, learning_language, question_language, report_language; question_translations: checked_at, checked_by, reviewer_note, validation); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.mock_exams drop constraint if exists mock_exams_language_fk;
alter table public.question_translations drop constraint if exists question_translations_lang_fk;
alter table public.handwritten_evaluations drop column if exists answer_language;
alter table public.handwritten_evaluations drop column if exists feedback_language;
alter table public.learning_profiles drop column if exists app_language;
alter table public.learning_profiles drop column if exists learning_language;
alter table public.learning_profiles drop column if exists question_language;
alter table public.learning_profiles drop column if exists report_language;
alter table public.question_translations drop column if exists checked_at;
alter table public.question_translations drop column if exists checked_by;
alter table public.question_translations drop column if exists reviewer_note;
alter table public.question_translations drop column if exists validation;
drop table if exists public.subject_requests;
drop table if exists public.supported_languages;
```

## 0032 ai_gateway (v55b) - AI Gateway
What you lose: everything saved in the new tables ai_benchmark_cases, ai_benchmark_results, ai_benchmark_runs, ai_providers; the values in the columns this change added to existing tables (ai_usage: cost_est_inr, cost_inr, free_quota_used, images, model, ref, status_code, task, task_tier); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop index if exists public.idx_ai_usage_billed;
drop index if exists public.idx_ai_usage_provider_day;
drop index if exists public.idx_ai_usage_ref;
alter table public.ai_usage drop column if exists cost_est_inr;
alter table public.ai_usage drop column if exists cost_inr;
alter table public.ai_usage drop column if exists free_quota_used;
alter table public.ai_usage drop column if exists images;
alter table public.ai_usage drop column if exists model;
alter table public.ai_usage drop column if exists ref;
alter table public.ai_usage drop column if exists status_code;
alter table public.ai_usage drop column if exists task;
alter table public.ai_usage drop column if exists task_tier;
drop table if exists public.ai_benchmark_results;
drop table if exists public.ai_benchmark_cases;
drop table if exists public.ai_benchmark_runs;
drop table if exists public.ai_providers;
```

## 0031 founder_command_centre (v55) - Founder Command Centre (admin-only)
What you lose: everything saved in the new tables crm_activities, crm_records, expenses, founder_memory, founder_tasks, funding_documents, funding_records, revenue_entries; nothing from system_changelog (that table holds accounts, plans or the audit trail, so an undo never drops it; it stays in place); the values in the columns this change added to existing tables (users: source, utm); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.users drop column if exists source;
alter table public.users drop column if exists utm;
drop table if exists public.crm_activities;
drop table if exists public.crm_records;
drop table if exists public.expenses;
drop table if exists public.founder_memory;
drop table if exists public.founder_tasks;
drop table if exists public.funding_documents;
drop table if exists public.funding_records;
drop table if exists public.revenue_entries;
```

## 0030 seats_entitlements_review (v54b) - Tutor/Centre seats and shared credit pool, entitlement settings, board dates, review statuses, featu
What you lose: everything saved in the new tables feature_usage, org_credit_ledger, org_plans; the values in the columns this change added to existing tables (handwritten_evaluations: review_status; mock_exams: eval_stages, review_status; pilot_payments: paid_by_user_id); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.handwritten_evaluations drop constraint if exists handwritten_evaluations_review_status_check;
alter table public.mock_exams drop constraint if exists mock_exams_review_status_check;
alter table public.handwritten_evaluations drop column if exists review_status;
alter table public.mock_exams drop column if exists eval_stages;
alter table public.mock_exams drop column if exists review_status;
alter table public.pilot_payments drop column if exists paid_by_user_id;
drop table if exists public.feature_usage;
drop table if exists public.org_credit_ledger;
drop table if exists public.org_plans;
```

## 0029 commerce (v54) - commercial layer
What you lose: everything saved in the new tables commerce_events, commerce_interest, commerce_offers, commerce_products, commerce_settings, mock_credit_ledger, wtp_responses; the values in the columns this change added to existing tables (mock_exams: eval_runs, max_pages; pilot_payments: activated_at, activated_by, discount_amount, list_amount, offer_code, payment_method, product_code, quantity, subject_slugs; student_access: product_code, starts_on); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop index if exists public.uq_pilot_payments_ref;
alter table public.mock_exams drop column if exists eval_runs;
alter table public.mock_exams drop column if exists max_pages;
alter table public.pilot_payments drop column if exists activated_at;
alter table public.pilot_payments drop column if exists activated_by;
alter table public.pilot_payments drop column if exists discount_amount;
alter table public.pilot_payments drop column if exists list_amount;
alter table public.pilot_payments drop column if exists offer_code;
alter table public.pilot_payments drop column if exists payment_method;
alter table public.pilot_payments drop column if exists product_code;
alter table public.pilot_payments drop column if exists quantity;
alter table public.pilot_payments drop column if exists subject_slugs;
alter table public.student_access drop column if exists product_code;
alter table public.student_access drop column if exists starts_on;
drop table if exists public.commerce_events;
drop table if exists public.commerce_interest;
drop table if exists public.commerce_offers;
drop table if exists public.commerce_products;
drop table if exists public.commerce_settings;
drop table if exists public.mock_credit_ledger;
drop table if exists public.wtp_responses;
```

## 0028 question_bank_growth (v53) - automatic question-bank growth
What you lose: everything saved in the new table question_bank_growth. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.question_bank_growth;
```

## 0027 hindi_medium (v51) - Hindi-medium mock tests
What you lose: everything saved in the new table question_translations; the values in the columns this change added to existing tables (mock_exams: language); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.mock_exams drop constraint if exists mock_exams_language_check;
alter table public.mock_exams drop column if exists language;
drop table if exists public.question_translations;
```

## 0026 test_reports (v49) - every diagnostic, quick quiz and mock/paper is saved as a dated report
What you lose: everything saved in the new table test_reports. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.test_reports;
```

## 0025 role_portals (v50) - separate portals for parents, tutors and coaching centres (teachers already exist)
What you lose: everything saved in the new tables adult_profiles, link_attempts, link_codes, student_links. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.adult_profiles;
drop table if exists public.link_attempts;
drop table if exists public.link_codes;
drop table if exists public.student_links;
```

## 0024 figures_for_all_mapped_skills (v48) - every skill that has a labelled teaching diagram also shows it on questions that point at a figure
What you lose: nothing saved: this change only refreshed settings or added setting rows. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
-- nothing structural to undo
```

## 0023 blueprint_handwritten+self_signup (v45) - blueprint papers (print and write on paper), photos of handwritten answers, AI + teacher marking
What you lose: everything saved in the new tables answer_bank, answer_sheets, handwritten_evaluations, signup_log; the values in the columns this change added to existing tables (mock_exams: blueprint_id, challenge, delivery, paper_layout, validation; students: answer_bank_consent, handwriting_consent_at, handwriting_consent_version; users: consent_at, consent_version, contact_email, username); the rows themselves stay. The storage bucket `answer-sheets` is NOT removed by this undo (it may hold uploaded files): empty and delete it in Supabase -> Storage yourself if you want it gone. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.mock_exams drop constraint if exists mock_exams_delivery_check;
drop index if exists public.idx_users_username_unique;
alter table public.mock_exams drop column if exists blueprint_id;
alter table public.mock_exams drop column if exists challenge;
alter table public.mock_exams drop column if exists delivery;
alter table public.mock_exams drop column if exists paper_layout;
alter table public.mock_exams drop column if exists validation;
alter table public.students drop column if exists answer_bank_consent;
alter table public.students drop column if exists handwriting_consent_at;
alter table public.students drop column if exists handwriting_consent_version;
alter table public.users drop column if exists consent_at;
alter table public.users drop column if exists consent_version;
alter table public.users drop column if exists contact_email;
alter table public.users drop column if exists username;
drop table if exists public.answer_bank;
drop table if exists public.answer_sheets;
drop table if exists public.handwritten_evaluations;
drop table if exists public.signup_log;
```

## 0022 data_requests (v44) - a family's request to delete a student's data
What you lose: everything saved in the new table data_requests. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.data_requests;
```

## 0021 devices_retired_skills (v43) - (1) which devices each family login has used, for the 2-device limit;
What you lose: everything saved in the new table account_devices; the values in the columns this change added to existing tables (skills: retired); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.skills drop column if exists retired;
drop table if exists public.account_devices;
```

## 0020 founding_family (v42) - Founding Family Programme plan code
What you lose: nothing saved: this change only refreshed settings or added setting rows. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
-- nothing structural to undo
```

## 0019 written_attempts (v40) - written-answer practice
What you lose: everything saved in the new table written_attempts. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.written_attempts;
```

## 0018 staged_assessment_signals (v38) - finishing the "partly built" items of the master prompt
What you lose: everything saved in the new tables recovery_events, subject_gate_signoffs; the values in the columns this change added to existing tables (content_reviews: suggested_cognitive_level, suggested_marks; curricula: academic_year; diagnostic_attempts: chapter_id; diagnostic_questions: cognitive_level, expected_time_seconds, language, marks; learning_profiles: daily_study_minutes, exam_year, preferred_language; learning_sessions: active_question_posed_at; mock_exams: chapter_id, kind; questions: cognitive_level, expected_time_seconds, language, marks); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.content_reviews drop constraint if exists content_reviews_suggested_cognitive_check;
alter table public.content_reviews drop constraint if exists content_reviews_suggested_marks_check;
alter table public.diagnostic_attempts drop constraint if exists diagnostic_attempts_chapter_id_fkey;
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_cognitive_check;
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_exptime_check;
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_language_check;
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_marks_check;
alter table public.learning_profiles drop constraint if exists learning_profiles_daily_study_minutes_check;
alter table public.learning_profiles drop constraint if exists learning_profiles_preferred_language_check;
alter table public.mock_exams drop constraint if exists mock_exams_chapter_id_fkey;
alter table public.mock_exams drop constraint if exists mock_exams_kind_check;
alter table public.questions drop constraint if exists questions_cognitive_check;
alter table public.questions drop constraint if exists questions_exptime_check;
alter table public.questions drop constraint if exists questions_language_check;
alter table public.questions drop constraint if exists questions_marks_check;
alter table public.content_reviews drop column if exists suggested_cognitive_level;
alter table public.content_reviews drop column if exists suggested_marks;
alter table public.curricula drop column if exists academic_year;
alter table public.diagnostic_attempts drop column if exists chapter_id;
alter table public.diagnostic_questions drop column if exists cognitive_level;
alter table public.diagnostic_questions drop column if exists expected_time_seconds;
alter table public.diagnostic_questions drop column if exists language;
alter table public.diagnostic_questions drop column if exists marks;
alter table public.learning_profiles drop column if exists daily_study_minutes;
alter table public.learning_profiles drop column if exists exam_year;
alter table public.learning_profiles drop column if exists preferred_language;
alter table public.learning_sessions drop column if exists active_question_posed_at;
alter table public.mock_exams drop column if exists chapter_id;
alter table public.mock_exams drop column if exists kind;
alter table public.questions drop column if exists cognitive_level;
alter table public.questions drop column if exists expected_time_seconds;
alter table public.questions drop column if exists language;
alter table public.questions drop column if exists marks;
drop table if exists public.recovery_events;
drop table if exists public.subject_gate_signoffs;
```

## 0017 ai_usage_free_plan (v37) - AI usage / cost log, and the 'free' plan code
What you lose: everything saved in the new table ai_usage. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.ai_usage;
```

## 0016 plans_teachers (v36) - paid plans (access + subject limit), invitation-only students, teachers
What you lose: everything saved in the new tables content_reviews, teacher_profiles; nothing from student_access (that table holds accounts, plans or the audit trail, so an undo never drops it; it stays in place); the values in the columns this change added to existing tables (students: must_complete_profile); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.students drop column if exists must_complete_profile;
drop table if exists public.content_reviews;
drop table if exists public.teacher_profiles;
```

## 0015 mock_exams (v35) - timed mock exams (objective-style practice papers)
What you lose: everything saved in the new table mock_exams. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.mock_exams;
```

## 0014 maths_standard_basic (v35) - split Mathematics into "Standard" and "Basic" (CBSE offers both courses
What you lose: nothing saved: this change only refreshed settings or added setting rows. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
-- nothing structural to undo
```

## 0013 board_prep_foundations (v34) - foundations for the "Sahayak Complete Board Preparation" offer
What you lose: everything saved in the new table session_checkins; the values in the columns this change added to existing tables (diagnostic_questions: content_status; learning_goals: activated_at; questions: content_status; subjects: description, status); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_content_status_check;
alter table public.questions drop constraint if exists questions_content_status_check;
alter table public.subjects drop constraint if exists subjects_status_check;
alter table public.diagnostic_questions drop column if exists content_status;
alter table public.learning_goals drop column if exists activated_at;
alter table public.questions drop column if exists content_status;
alter table public.subjects drop column if exists description;
alter table public.subjects drop column if exists status;
drop table if exists public.session_checkins;
```

## 0012 generated_question_support (early) - Supports generating fresh questions (with a worked solution) via AI,
What you lose: the values in the columns this change added to existing tables (diagnostic_questions: source, validated; questions: explanation); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.diagnostic_questions drop constraint if exists diagnostic_questions_source_check;
alter table public.diagnostic_questions drop column if exists source;
alter table public.diagnostic_questions drop column if exists validated;
alter table public.questions drop column if exists explanation;
```

## 0011 question_figures_backfill (early) - Backfills figure_url/figure_caption (added in migration 0010) onto the
What you lose: nothing saved: this change only refreshed settings or added setting rows. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
-- nothing structural to undo
```

## 0010 question_figures (early) - Adds optional figure/image support to question banks so a question that
What you lose: the values in the columns this change added to existing tables (diagnostic_questions: figure_caption, figure_url; questions: figure_caption, figure_url); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.diagnostic_questions drop column if exists figure_caption;
alter table public.diagnostic_questions drop column if exists figure_url;
alter table public.questions drop column if exists figure_caption;
alter table public.questions drop column if exists figure_url;
```

## 0009 pilot_payments (early) - Offline UPI/QR pilot payment tracking (brief Section 3)
What you lose: everything saved in the new table pilot_payments. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.pilot_payments;
```

## 0008 explanation_update_policy (early) - Fixes a real, confirmed bug found during the Day 1 repo audit (Oct 2026):
What you lose: nothing saved: this change only refreshed settings or added setting rows. Rules (policies) this change added to tables that already existed are NOT removed: taking away a protection is never part of an undo, and a table with row security on and no rule would lock every family out. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
-- nothing structural to undo
```

## 0007 student_profile (early) - A richer student/parent profile — school details, family/contact details,
What you lose: everything saved in the new tables student_academic_history, student_profile_details. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.student_academic_history;
drop table if exists public.student_profile_details;
```

## 0006 previous_papers (early) - A shared library of previous-year CBSE question papers (and, optionally, a
What you lose: everything saved in the new table previous_papers. Rules (policies) this change added to tables that already existed are NOT removed: taking away a protection is never part of an undo, and a table with row security on and no rule would lock every family out. The storage bucket `papers` is NOT removed by this undo (it may hold uploaded files): empty and delete it in Supabase -> Storage yourself if you want it gone. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.previous_papers;
```

## 0005 diagnostic_explanation (early) - Adds an optional per-question explanation, shown on the diagnostic review
What you lose: the values in the columns this change added to existing tables (diagnostic_questions: explanation); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
alter table public.diagnostic_questions drop column if exists explanation;
```

## 0004 parent_token (early) - A stable, unguessable token per student so a parent can view read-only
What you lose: the values in the columns this change added to existing tables (students: parent_token); the rows themselves stay. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop index if exists public.idx_students_parent_token;
alter table public.students drop column if exists parent_token;
```

## 0003 feedback (early) - In-app feedback mechanism, so real students/parents trying the deployed app
What you lose: everything saved in the new table feedback. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
drop table if exists public.feedback;
```

## 0002 rls_policies (early) - RLS policies
What you lose: nothing saved: this change only refreshed settings or added setting rows. Rules (policies) this change added to tables that already existed are NOT removed: taking away a protection is never part of an undo, and a table with row security on and no rule would lock every family out. Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.
```sql
-- nothing structural to undo
```

## The version note
Each change also added one line to `system_changelog` (a history table). Leave those lines; they are only a record. After an undo, `/admin/deploy-check` will show the database "behind" the website until you redeploy the older website version or re-apply the changes.
