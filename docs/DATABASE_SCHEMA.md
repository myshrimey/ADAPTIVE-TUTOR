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

