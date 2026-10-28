# Database schema (generated 2026-10-17, after migration 0019)

Generated from a scratch Postgres 16 database with every migration applied. Source of truth is `packages/db/schema.sql` plus `packages/db/migrations/*.sql`. Regenerate this file after each migration so it never drifts. Storage-bucket policies for previous papers live in the `storage` schema and are not listed here.

**RLS** says whether row-level security is on. A table with RLS on and **no policies** can only be read or written by the server with the service key (deliberate for `ai_usage` and `subject_gate_signoffs`). Tables such as `student_access`, `teacher_profiles` and `content_reviews` may have read policies but are written only by the server with the service key.

## ai_usage
RLS: on · policies: none

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| created_at | timestamp with time zone | no | now() |
| student_id | uuid | yes |  |
| tier | text | no |  |
| provider | text | no |  |
| feature | text | no |  |
| ok | boolean | no |  |
| input_tokens | integer | no | 0 |
| output_tokens | integer | no | 0 |
| latency_ms | integer | no | 0 |
| error | text | yes |  |

## chapters
RLS: on · policies: chapters_read_all (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| subject_id | uuid | no |  |
| name | text | no |  |
| slug | text | no |  |
| sequence | integer | no |  |

## content_reviews
RLS: on · policies: content_reviews_owner_read (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| teacher_user_id | uuid | no |  |
| item_table | text | no |  |
| item_id | uuid | no |  |
| verdict | text | no |  |
| comment | text | yes |  |
| suggested_answer | text | yes |  |
| suggested_explanation | text | yes |  |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| suggested_marks | smallint | yes |  |
| suggested_cognitive_level | text | yes |  |

## curricula
RLS: on · policies: curricula_read_all (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| board | text | no |  |
| class | text | no |  |
| version | text | no | 'v1'::text |
| created_at | timestamp with time zone | no | now() |
| academic_year | smallint | no | 2027 |

## diagnostic_answers
RLS: on · policies: diagnostic_answers_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| diagnostic_attempt_id | uuid | no |  |
| diagnostic_question_id | uuid | no |  |
| answer | jsonb | no |  |
| is_correct | boolean | no |  |
| responded_at | timestamp with time zone | no | now() |

## diagnostic_attempts
RLS: on · policies: diagnostic_attempts_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| diagnostic_test_id | uuid | no |  |
| status | text | no | 'in_progress'::text |
| started_at | timestamp with time zone | no | now() |
| completed_at | timestamp with time zone | yes |  |
| result | jsonb | yes |  |
| chapter_id | uuid | yes |  |

## diagnostic_questions
RLS: on · policies: diagnostic_questions_read_all (SELECT), diagnostic_questions_update_explanation (UPDATE)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| diagnostic_test_id | uuid | no |  |
| skill_id | uuid | no |  |
| difficulty | smallint | no |  |
| question_type | text | no |  |
| prompt | text | no |  |
| options | jsonb | yes |  |
| expected_answer | jsonb | no |  |
| misconception_tags | ARRAY | yes | '{}'::text[] |
| created_at | timestamp with time zone | no | now() |
| explanation | text | yes |  |
| figure_url | text | yes |  |
| figure_caption | text | yes |  |
| source | text | no | 'bank'::text |
| validated | boolean | no | true |
| content_status | text | no | 'verified'::text |
| marks | smallint | yes |  |
| expected_time_seconds | smallint | yes |  |
| cognitive_level | text | yes |  |
| language | text | no | 'en'::text |

## diagnostic_tests
RLS: on · policies: diagnostic_tests_read_all (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| subject_id | uuid | no |  |
| name | text | no |  |
| is_active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |

## feedback
RLS: on · policies: feedback_insert_anyone (INSERT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | yes |  |
| contact_email | text | yes |  |
| page | text | yes |  |
| rating | smallint | yes |  |
| message | text | no |  |
| created_at | timestamp with time zone | no | now() |

## learning_events
RLS: on · policies: learning_events_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | yes |  |
| session_id | uuid | yes |  |
| event_type | text | no |  |
| payload | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |

## learning_goals
RLS: on · policies: learning_goals_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| curriculum_id | uuid | no |  |
| subject_id | uuid | yes |  |
| target_date | date | yes |  |
| status | text | no | 'active'::text |
| created_at | timestamp with time zone | no | now() |
| activated_at | timestamp with time zone | no | now() |

## learning_profiles
RLS: on · policies: learning_profiles_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| student_id | uuid | no |  |
| preferred_pace | text | yes |  |
| preference_evidence | jsonb | no | '{}'::jsonb |
| onboarding_completed | boolean | no | false |
| updated_at | timestamp with time zone | no | now() |
| exam_year | smallint | no | 2027 |
| preferred_language | text | yes |  |
| daily_study_minutes | smallint | yes |  |

## learning_sessions
RLS: on · policies: learning_sessions_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| skill_id | uuid | no |  |
| status | text | no | 'active'::text |
| starting_mastery | numeric | yes |  |
| ending_mastery | numeric | yes |  |
| summary | jsonb | yes |  |
| started_at | timestamp with time zone | no | now() |
| completed_at | timestamp with time zone | yes |  |
| active_question_id | uuid | yes |  |
| hint_count_for_active_question | integer | no | 0 |
| active_question_posed_at | timestamp with time zone | yes |  |

## mastery_states
RLS: on · policies: mastery_states_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| skill_id | uuid | no |  |
| score | numeric | no | 0 |
| band | text | no | 'needs_foundation'::text |
| component_scores | jsonb | no | '{}'::jsonb |
| updated_at | timestamp with time zone | no | now() |

## messages
RLS: on · policies: messages_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| session_id | uuid | no |  |
| role | text | no |  |
| content | text | no |  |
| strategy | text | yes |  |
| created_at | timestamp with time zone | no | now() |

## misconceptions
RLS: on · policies: misconceptions_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| skill_id | uuid | yes |  |
| tag | text | no |  |
| confidence | numeric | no |  |
| first_detected_at | timestamp with time zone | no | now() |
| last_seen_at | timestamp with time zone | no | now() |
| resolved | boolean | no | false |

## mock_exams
RLS: on · policies: mock_exams_owner_read (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| subject_id | uuid | no |  |
| status | text | no | 'in_progress'::text |
| duration_minutes | smallint | no |  |
| question_ids | jsonb | no | '[]'::jsonb |
| answers | jsonb | no | '{}'::jsonb |
| started_at | timestamp with time zone | no | now() |
| deadline_at | timestamp with time zone | no |  |
| submitted_at | timestamp with time zone | yes |  |
| auto_submitted | boolean | no | false |
| score | smallint | yes |  |
| total | smallint | yes |  |
| result | jsonb | yes |  |
| kind | text | no | 'full_mock'::text |
| chapter_id | uuid | yes |  |

## pilot_payments
RLS: on · policies: pilot_payments_insert_own (INSERT), pilot_payments_select_own (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| offer_label | text | no | '30-day founding-family pilot'::text |
| amount | numeric | no |  |
| payment_date | date | no |  |
| transaction_reference | text | yes |  |
| status | text | no | 'pending'::text |
| pilot_start_date | date | yes |  |
| pilot_end_date | date | yes |  |
| admin_notes | text | yes |  |
| created_at | timestamp with time zone | no | now() |
| confirmed_at | timestamp with time zone | yes |  |

## prerequisites
RLS: on · policies: prerequisites_read_all (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| skill_id | uuid | no |  |
| requires_skill_id | uuid | no |  |
| strength | text | no | 'hard'::text |

## previous_papers
RLS: on · policies: previous_papers_delete_owner (DELETE), previous_papers_insert_authenticated (INSERT), previous_papers_select_anyone (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| subject_id | uuid | no |  |
| uploaded_by | uuid | yes |  |
| title | text | no |  |
| year | smallint | yes |  |
| file_path | text | no |  |
| solution_file_path | text | yes |  |
| notes | text | yes |  |
| created_at | timestamp with time zone | no | now() |

## question_attempts
RLS: on · policies: question_attempts_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| question_id | uuid | no |  |
| session_id | uuid | yes |  |
| answer | jsonb | no |  |
| is_correct | boolean | no |  |
| hints_used | integer | no | 0 |
| time_taken_seconds | integer | yes |  |
| detected_misconception_id | uuid | yes |  |
| created_at | timestamp with time zone | no | now() |

## questions
RLS: on · policies: questions_read_all (SELECT), questions_update_explanation (UPDATE)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| skill_id | uuid | no |  |
| source | text | no | 'generated'::text |
| difficulty | smallint | no |  |
| question_type | text | no |  |
| prompt | text | no |  |
| options | jsonb | yes |  |
| expected_answer | jsonb | no |  |
| misconception_tags | ARRAY | yes | '{}'::text[] |
| validated | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| figure_url | text | yes |  |
| figure_caption | text | yes |  |
| explanation | text | yes |  |
| content_status | text | no | 'verified'::text |
| marks | smallint | yes |  |
| expected_time_seconds | smallint | yes |  |
| cognitive_level | text | yes |  |
| language | text | no | 'en'::text |

## recovery_events
RLS: on · policies: recovery_events_owner_insert (INSERT), recovery_events_owner_read (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| session_id | uuid | yes |  |
| trigger | text | no |  |
| details | jsonb | no | '{}'::jsonb |
| created_at | timestamp with time zone | no | now() |

## session_checkins
RLS: on · policies: session_checkins_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| session_id | uuid | yes |  |
| skill_id | uuid | yes |  |
| mood | text | yes |  |
| focus | text | yes |  |
| confidence_before | smallint | yes |  |
| confidence_after | smallint | yes |  |
| available_minutes | smallint | yes |  |
| session_goal | text | yes |  |
| recovery_mode | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| completed_at | timestamp with time zone | yes |  |

## skills
RLS: on · policies: skills_read_all (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| topic_id | uuid | no |  |
| name | text | no |  |
| slug | text | no |  |

## student_academic_history
RLS: on · policies: student_academic_history_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| class_level | smallint | no |  |
| overall_percentage | numeric | yes |  |
| board | text | yes |  |
| remarks | text | yes |  |
| updated_at | timestamp with time zone | no | now() |

## student_access
RLS: on · policies: student_access_owner_read (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| student_id | uuid | no |  |
| plan_code | text | no |  |
| subject_limit | smallint | no |  |
| access_until | date | yes |  |
| notes | text | yes |  |
| granted_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

## student_profile_details
RLS: on · policies: student_profile_details_owner (ALL)

| Column | Type | Null | Default |
|---|---|---|---|
| student_id | uuid | no |  |
| school_name | text | yes |  |
| school_board | text | yes |  |
| school_city | text | yes |  |
| school_state | text | yes |  |
| parent_name | text | yes |  |
| parent_relation | text | yes |  |
| parent_occupation | text | yes |  |
| parent_email | text | yes |  |
| parent_phone | text | yes |  |
| siblings_count | smallint | yes |  |
| address | text | yes |  |
| how_heard_about_us | text | yes |  |
| updated_at | timestamp with time zone | no | now() |

## students
RLS: on · policies: students_select_own (SELECT), students_update_own (UPDATE)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| display_name | text | no |  |
| grade | text | yes |  |
| date_of_birth | date | yes |  |
| created_at | timestamp with time zone | no | now() |
| parent_token | uuid | no | gen_random_uuid() |
| must_complete_profile | boolean | no | false |

## subject_gate_signoffs
RLS: on · policies: none

| Column | Type | Null | Default |
|---|---|---|---|
| subject_id | uuid | no |  |
| gate | smallint | no |  |
| passed | boolean | no | false |
| note | text | yes |  |
| signed_by | text | yes |  |
| updated_at | timestamp with time zone | no | now() |

## subjects
RLS: on · policies: subjects_read_all (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| curriculum_id | uuid | no |  |
| name | text | no |  |
| slug | text | no |  |
| status | text | no | 'ready'::text |
| description | text | yes |  |

## teacher_profiles
RLS: on · policies: teacher_profiles_owner_read (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| user_id | uuid | no |  |
| display_name | text | no |  |
| qualification | text | yes |  |
| school | text | yes |  |
| subjects | text | yes |  |
| status | text | no | 'pending'::text |
| approved_at | timestamp with time zone | yes |  |
| created_at | timestamp with time zone | no | now() |

## topics
RLS: on · policies: topics_read_all (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| chapter_id | uuid | no |  |
| name | text | no |  |
| slug | text | no |  |
| sequence | integer | no |  |

## users
RLS: on · policies: users_select_own (SELECT), users_update_own (UPDATE)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| auth_user_id | uuid | no |  |
| email | text | no |  |
| role | text | no | 'student'::text |
| created_at | timestamp with time zone | no | now() |
## written_attempts
RLS: on · policies: written_attempts_owner_read (SELECT)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| student_id | uuid | no |  |
| question_id | uuid | no |  |
| answer | text | no |  |
| score | smallint | no |  |
| max_score | smallint | no |  |
| key_points | jsonb | no | '[]'::jsonb |
| feedback | text | yes |  |
| created_at | timestamp with time zone | no | now() |


## data_requests
RLS: on · policies: data_requests_select_own (SELECT). Inserts are server-only.

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| auth_user_id | uuid | no |  |
| student_id | uuid | yes |  |
| student_label | text | yes |  |
| kind | text | no | 'delete' |
| status | text | no | 'requested' |
| requested_at | timestamp with time zone | no | now() |
| completed_at | timestamp with time zone | yes |  |

## signup_log
RLS: on, no policy (server only). Columns: id uuid, ip_hash text, created_at timestamptz.

## users (v45 additions)
username text (unique, lower-case), contact_email text, consent_at timestamptz, consent_version text.

## answer_sheets (v46)
RLS: on · answer_sheets_owner_read (SELECT). Columns: id, student_id, mock_exam_id, page_no, storage_path, content_type, bytes, quality jsonb, status, created_at. Files live in private storage bucket `answer-sheets`.

## handwritten_evaluations (v46)
RLS: on · handwritten_evaluations_owner_read (SELECT). Columns: id, student_id, mock_exam_id, question_id, question_no, extracted_text, ai_score, max_score, confidence, ai_feedback, status (ai_marked/needs_teacher/teacher_done/unreadable), teacher_score, teacher_note, teacher_user_id, reviewed_at, created_at.

## answer_bank (v46)
RLS: on, no policy (server only). De-identified: subject_id, question_id, extracted_text, score, max_score, photo_path. Filled only if ANSWER_BANK_ENABLED and the family consented.

## students / mock_exams (v46 additions)
students: handwriting_consent_at, handwriting_consent_version, answer_bank_consent. mock_exams: delivery, challenge, blueprint_id, paper_layout, validation; kind 'blueprint'.

## users (v50 change)
role now allows: student, parent, admin, teacher, tutor, centre.

## adult_profiles (v50)
RLS: on · adult_profiles_owner_read (SELECT). Columns: user_id (pk), role (parent/tutor/centre), display_name, contact_name, city, qualification, subjects, status (pending/active/suspended), approved_at, created_at. Writes: server only.

## link_codes (v50)
RLS: on · link_codes_owner_read (the student's own). Columns: id, student_id, for_role, code_hash (fingerprint only), expires_at, used_at, created_at. Writes: server only.

## student_links (v50)
RLS: on · student_links_student_read, student_links_adult_read (SELECT only). Columns: id, student_id, adult_user_id, link_type, status (active/revoked), created_at, revoked_at, revoked_by. Unique (student_id, adult_user_id). Adults read a student's data only through server code that checks an ACTIVE row here.

## link_attempts (v50)
RLS: on, no policy (server only). adult_user_id, created_at; limits wrong-code guessing to 10 per hour.

## test_reports (v49)
RLS: on · test_reports_student_read (SELECT, only audience='student' and the student's own). Columns: id, student_id, kind (diagnostic/skill_quiz/mock), audience (student/adult), source_id, subject_id, title, taken_at, score, total, in_marks, data jsonb, created_at. Unique (student_id, kind, source_id, audience). Writes: server only. The 'adult' rows have NO policy: students cannot read them; linked adults read them through server code after the student_links check.

## question_translations (v51)
RLS: on, no policy (server only; holds answer text). Columns: question_id, lang ('hi'), prompt, options (same order/length as English), answer_text (short answer), explanation, status (ai_translated/teacher_checked/rejected), created_at. PK (question_id, lang).

## mock_exams (v51 addition)
language text ('en'/'hi', default 'en').

## question_bank_growth (0028)
subject_id (pk), pending, produced_total, rejected_total, locked_until, last_run_at, last_run_made, updated_at. RLS on, no policies (server only).

## Commerce (0029)
commerce_products(code pk, name, kind, price_inr, subject_count, credits, credits_per_month, student_limit, validity_until, active, recommended, sort...); commerce_offers(code pk, kind, percent/amount, applies_to, starts/ends, active); commerce_settings(key pk, value jsonb); mock_credit_ledger(student_id, ref, delta, reason; unique(student_id, ref)); commerce_events; commerce_interest; wtp_responses. pilot_payments + product_code, list_amount, discount_amount, offer_code, quantity, subject_slugs, activated_at/by, payment_method. student_access + product_code, starts_on. mock_exams + max_pages, eval_runs. RLS on; server-only except owner reads where noted in the migration.

## v54b (0030)
org_plans(user_id pk, product_code, student_limit, credits_per_month, access_until, status, activated_by); org_credit_ledger(user_id, delta, reason, ref; unique(user_id, ref)); feature_usage(student_id, feature, day, used); pilot_payments.paid_by_user_id; handwritten_evaluations.review_status; mock_exams.review_status, eval_stages. Settings: entitlements, seats, boards.

## v55 (0031) — all server-only (RLS on, no policies)
crm_records, crm_activities, funding_records, funding_documents, expenses, revenue_entries, founder_tasks, system_changelog, founder_memory; users.source, users.utm.

## v55b AI Gateway (0032) — all server-only (RLS on, no policies)
ai_providers(id pk slug, adapter, provider_name, region, model, model_version, endpoint, auth_method, key_env [NAME of a server env var, never a key], priority, status candidate/testing/active/paused/retired, classification A-F, free_tier_available, free_quota_note, rpm/rpd/tpm/tpd, input/output/image/audio/tts prices, context_window, languages, vision, structured_output, tool_calling, commercial_use, data_policy, policy_status, verification_required, free_tier_expiry, quota_reset, last_verified, source_url, verification jsonb (9 checks), legacy, notes).
ai_usage additions: model, task, task_tier, images, cost_est_inr (list price), cost_inr (billed), free_quota_used, ref, status_code. Still no prompt/answer text.
ai_benchmark_cases(key unique, class_level, subject, language, kind, prompt, expected, active); ai_benchmark_runs(provider_id, model, model_version, run_at, cases, auto_total, auto_correct, failures, latency_ms_avg, cost_inr, scores jsonb, quality_score); ai_benchmark_results(run_id, case_id, output, ok, auto_correct, latency_ms, manual_score, error).
commerce_settings key `ai_gateway` (controls and per-task routes).

## v56 Boards and languages (0033)
supported_languages(code pk, label, native_label, script, enabled, sort) readable by all signed-in users. learning_profiles + app_language, question_language, learning_language, report_language (null = follow default). mock_exams.language and question_translations.lang reference supported_languages(code). question_translations + validation jsonb, checked_by, checked_at, reviewer_note. handwritten_evaluations + answer_language, feedback_language. subject_requests(user_id, board, class_level, subject_text, language, note, created_at) server-only. commerce_settings `boards` + programme_name, board1_enabled, board2_enabled, board1_subjects, board2_subjects.

## v57 Engagement (0034)
student_engagement(student_id pk, xp_total, current_streak, longest_streak, last_active_day, nickname [unique lower-case], leaderboard_opt_in, sync_cursor); xp_transactions(student_id, amount, kind, ref, note) unique (student_id, ref); engagement_events; daily_missions(student_id, day unique) + mission_items; achievements(code pk, category, metric, threshold, xp, active; 22 seeded) + student_achievements(student_id, code unique); personal_bests(student_id, kind, scope_id unique, value, previous_value); mistake_book(student_id, question_table, question_id unique, error_category, repetitions, status open/practising/corrected, last_ref); challenge_attempts(student_id, mode, plan, answers, cursor, ref unique per student); org_challenges; leaderboards + leaderboard_entries; friend_challenges (off); engagement_flags (internal review). Students read only their own rows (`*_own_read`); org_challenges, leaderboards, friend_challenges, engagement_flags are server-only (RLS on, no policy). commerce_settings key `engagement`.

## v58 Social (0035)
challenge_attempts.mode now also allows 'friend'. friend_challenges + subject_id. referral_codes(student_id pk, code unique) own-read policy; referrals(code, referrer_student, referred_student unique, reward_status none/under_review/approved/declined, reward_note, reviewed_at) server-only.

## ai_usage (v59 additions, migration 0036)
request_id uuid, attempt_no int default 1, user_id uuid, organisation_id uuid, model_version text, retry_count int, fallback_count int, fallback_reason text, audio_seconds numeric, quota_type text (free_quota/promo_credit/paid/unknown), list_cost_inr, free_quota_value_inr, promo_credit_inr, actual_cost_inr (null unless known), economic_cost_inr, pricing_snapshot jsonb (rates + exchange rate used), quality_result text (passed/failed/not_checked), route_explanation jsonb (ADMIN ONLY). Still no prompt or answer text. RLS on, no policy.

## ai_providers (v59 additions)
quota_type (default unknown), quota_region, promo_credit_balance_inr, promo_credit_expiry, promo_credit_as_of, capabilities jsonb (missing key = unknown), production_status (unknown/test_only/pilot/production), price_last_verified. The five older providers: production, quota_type from their free flag.

## ai_reconciliations (v59)
RLS on, no policy. id, provider_id (fk ai_providers), period 'YYYY-MM', actual_inr, note, created_at. Unique (provider_id, period). Typed in by the founder from the provider's invoice.

## ai_evaluation_costs (v59)
RLS on, no policy. exam_id (pk), student_id, exam_label, questions, images, ai_calls, provider, model, input_tokens, output_tokens, ai_list_cost_inr, ai_billed_cost_inr, ai_economic_cost_inr, storage_cost_inr, processing_cost_inr, human_review_cost_inr, total_variable_cost_inr, selling_price_inr, price_basis (target), contribution_inr, margin_pct, margin_at_risk, incomplete (which cost inputs are missing), computed_at.

## ai_benchmark_runs (v59 additions)
subject, class_level, language, task, breakdown jsonb (accuracy by subject/class/language/task), cost_per_case_inr.

## commerce_settings key ai_economics (v59)
fx_usd_inr, cap_basis (billed/economic), route_objective (configured_order/lowest_cost_meeting_quality), spend_warn_pct 80, spend_critical_pct 90, handwritten_target_price_inr 499, handwritten_min_margin_pct 85, handwritten_min_contribution_inr, storage_cost_per_image_inr, processing_cost_per_eval_inr, quality_min / max_cost_per_call_inr / max_latency_ms per task.

## user_referral_codes (v60)
RLS on; a person reads only their own row. user_id (pk, fk users), code (unique, 8 characters), created_at.

## referral_events (v60)
RLS on, no policy (server only). id, code, referrer_user, referred_user (unique: one invite per person), referred_role, ip_hash, status (signed_up / qualified / rewarded / held / blocked), note, created_at, qualified_at.

## bonus_days_ledger (v60)
RLS on; a student reads their own rows. id, student_id, days (1-365), reason, ref (unique, makes a grant happen once), applied_at (null = held until a paid plan), created_at.

## commerce_settings key referral (v60)
links_on, rewards_on (default false), days_referrer, days_referred, max_rewarded_per_referrer, max_per_ip, min_answers.

## users (v61 additions)
country, timezone, currency (all optional, set by the person on /profile).

## exam_sessions (v61)
RLS on, server only. board, academic_year, class_level, exam_type, session_label, start_date, end_date (both optional), subjects text[], rules jsonb, status draft/published/closed.

## curriculum_versions (v61)
RLS on, server only. board, academic_year, class_level, subject_id or subject_label, language, version, source_reference, status draft/needs_review/approved/published/retired, approved_by, approved_at, notes.

## country_prices (v61)
RLS on, server only. Unique (country, product_code). currency, price, tax_pct, payment_method, tier, promotion, active (default false), note.

## audit_logs (v61)
RLS on, server only. at, actor_email, action, entity, entity_id, detail jsonb (no secrets).

## commerce_settings key financial_simulator (v61)
Founder's simulator inputs (average revenue, AI cost, payment fee, fixed costs, tax reserve, handwritten costs, target net profit).

## v62 tables (all RLS on, server only)
competencies (code unique, class_level, domain, importance, skill_id), competency_prerequisites, target_competency_requirements (created, not used yet), baseline_items (code-written questions for earlier classes), baseline_sessions (engine state, resume), student_competency_evidence, student_competency_mastery (unique per student+competency), adaptive_decisions (why each question), student_baselines (versioned), learning_paths, learning_path_nodes, question_requests (who asked for questions). Added to questions, diagnostic_questions, baseline_items: origin, contributed_by, contributed_role, contributor_org, reviewed_by, reviewed_at, review_note, request_id, competency_id. Setting `baseline_engine` in commerce_settings.

## v63 (migration 0040)
questions: + tier ('core' default | 'stretch'), exam_style (olympiad|ntse|ioqm|jee_foundation|neet_foundation|general_challenge, nullable), stretch_level (1-3, nullable). Partial index idx_questions_tier on stretch rows.
stretch_attempts: id, student_id, question_id, skill_id, subject_id, exam_style, stretch_level, correct, seconds, answered_at. Unique (student_id, question_id). RLS on; student own-read policy; writes server only.
achievements: 9 new rows (codes stretch_*; xp 0). commerce_settings key `stretch` (enabled, allowUnreviewed, unlockScore, levelUpAfter, levelDownAfter, dailyLimit).

## v64 (migration 0041)
page_views: id, at, visitor (daily-rotating hash), path, channel, source, campaign, device, browser, os, country, region, signed_in. RLS on, no policies (server only). No IP, cookie or name.

## v67 (migration 0043)
feedback: + category, feature_area, severity (low|medium|high), cluster_id, duplicate_of, analysed_at.
feedback_clusters: id, title, category, feature_area, keywords[], severity, risk, status (new|analysed|proposed|under_review|approved|rejected|modified|deferred|implemented|verified|rolled_back), report_count, duplicate_count, affected_pages[], likely_cause, proposed_action, reviewer_note, decided_by, decided_at, tested, created_at, updated_at. RLS on, no policies (server only).
feedback_cluster_events: id, cluster_id -> feedback_clusters (cascade), at, actor, from_status, to_status, note. RLS on, no policies.

## v68 (migration 0044)
review_schedule: id, student_id, competency_id (unique together), rung, interval_days, reps, lapses, due_on, last_day, last_result (first|pass|fail|early), last_evidence_at, updated_at. RLS on; student own-read policy; writes server only.

## v69 (migration 0045)
batches: id, owner_user_id -> users, name, subject_id (nullable), archived, created_at.
batch_students: (batch_id, student_id) primary key, added_at.
interventions: id, owner_user_id, student_id, skill_id (nullable), problem, evidence, action, status (planned|done|dropped), baseline_score, followup_score, result (improved|no_change|lower|not_enough_data), created_at, done_at, measured_at.
All three: RLS on, no policies (server only; access is checked against active student_links).

## 0046 Social Media Growth Engine (v72)
All server-only (RLS on, no policies): social_campaigns, social_experiments, social_content, social_publications, social_metrics (unique content_id+metric_date), social_audit_log, social_pillars (20 defaults), social_hashtags (defaults), social_observations. Settings: commerce_settings key `social_growth`.

## 0047 Feedback extras (v73)
feedback: kind, impact, role, source (default in_app), person, received_on, context jsonb, positive. feedback_clusters: moat, priority_override, priority_reason, ai_analysis jsonb, task jsonb, deployment_version, validation_status, validation_note, validated_by, validated_at, defer_until.
