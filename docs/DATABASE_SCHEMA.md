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
