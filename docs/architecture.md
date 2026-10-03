# Adaptive AI 1-to-1 Tutor — MVP Architecture & Build Plan

**Scope:** CBSE Class 10 Maths (Real Numbers, Polynomials, Pair of Linear Equations, Quadratic Equations)
**Timeline:** 7 days to a commercially testable, end-to-end loop.
**Non-goal:** the full Education Intelligence Platform. Everything below is sized to the MVP, with explicit extension points so it doesn't need a rewrite later.

---

## 1. Architecture Diagram

```
                        ┌─────────────────────┐
                        │        User          │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  Input Processing     │  (parse message / answer / command)
                        └──────────┬───────────┘
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        │                          │                            │
┌───────▼────────┐        ┌────────▼─────────┐         ┌────────▼─────────┐
│  Learner Model   │◄──────►  Curriculum Model │◄───────►  Current Learning │
│  (state store)   │        │  (static graph)   │         │    Objective      │
└───────┬────────┘        └───────────────────┘         └────────┬─────────┘
        │                                                          │
        └──────────────────────────┬───────────────────────────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   Pedagogy Engine      │  (rules: which strategy, which difficulty)
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   AI Provider          │  (Gemini now, Claude later — interface-bound)
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   Tutor Response       │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   Assessment           │  (structured answer evaluation)
                        └──────────┬───────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
        ┌────────▼───────┐ ┌───────▼────────┐ ┌───────▼────────┐
        │ Misconception   │ │ Mastery Update  │ │ Learning Event  │
        │ Detection       │ │                 │ │ Log             │
        └────────┬───────┘ └───────┬────────┘ └───────┬────────┘
                 └─────────────────┼─────────────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  Learner Model Update  │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   Next Learning Action │ (loop back to Pedagogy Engine)
                        └───────────────────────┘
```

The **Tutor Orchestrator** (Section 8) is the code that walks this loop on every turn. Everything else is a service it calls.

---

## 2. Repository Structure

Assuming Next.js frontend + Next.js API routes (simplest for a 7-day MVP; swap the `api/` folder for a FastAPI service later without touching anything else, since all backend logic sits behind service classes, not route handlers).

```
adaptive-tutor/
├── apps/
│   └── web/                          # Next.js app (Bolt frontend can slot in here)
│       ├── app/
│       │   ├── (auth)/
│       │   ├── onboarding/
│       │   ├── diagnostic/
│       │   ├── learn/                # main tutoring session UI
│       │   ├── dashboard/
│       │   └── api/                  # thin route handlers → call services
│       │       ├── auth/
│       │       ├── student/
│       │       ├── curriculum/
│       │       ├── diagnostic/
│       │       ├── mastery/
│       │       ├── session/
│       │       └── sessions/
│       └── lib/
│           └── supabase-client.ts
│
├── packages/
│   ├── core/                         # framework-agnostic domain logic (importable by web/ or a future FastAPI)
│   │   ├── learner-model/
│   │   │   ├── types.ts
│   │   │   ├── learner-state.service.ts
│   │   │   └── preferences.service.ts
│   │   ├── curriculum/
│   │   │   ├── types.ts
│   │   │   └── curriculum.service.ts
│   │   ├── diagnostic/
│   │   │   ├── engine.ts
│   │   │   └── question-bank.ts
│   │   ├── mastery/
│   │   │   ├── mastery.service.ts     # THE mastery formula lives here, nowhere else
│   │   │   └── types.ts
│   │   ├── misconceptions/
│   │   │   ├── taxonomy.ts
│   │   │   └── detector.ts
│   │   ├── pedagogy/
│   │   │   ├── strategies.ts
│   │   │   └── pedagogy.engine.ts
│   │   ├── question-engine/
│   │   │   ├── selector.ts
│   │   │   └── validator.ts
│   │   ├── orchestrator/
│   │   │   └── tutor.orchestrator.ts
│   │   ├── ai-provider/
│   │   │   ├── ai-provider.interface.ts
│   │   │   ├── gemini.provider.ts
│   │   │   └── claude.provider.ts     # stub for later
│   │   ├── prompts/
│   │   │   ├── tutor.prompt.ts
│   │   │   └── evaluation.prompt.ts
│   │   └── analytics/
│   │       └── events.ts
│   └── db/
│       ├── schema.sql
│       ├── migrations/
│       └── seed/
│           └── cbse-class10-maths.json   # curriculum + question seed data
│
├── eval/
│   ├── eval-set.json                  # representative test cases (Section 12)
│   └── run-eval.ts
│
└── docs/
    └── architecture.md                # this document
```

Rule that keeps Day 4–7 sane: **API route handlers never contain logic.** They parse the request, call one `core` service, return JSON. This is what lets you later replace Next API routes with FastAPI, or swap Gemini for Claude, without touching the domain layer.

---

## 3. Database Schema (Supabase Postgres)

Minimum viable, not over-normalized. UUID PKs, `timestamptz` throughout, RLS notes inline.

```sql
-- ===================== USERS & STUDENTS =====================

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'student' check (role in ('student','parent','admin')),
  created_at timestamptz not null default now()
);
-- RLS: users can select/update only where auth_user_id = auth.uid()

create table students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  display_name text not null,
  grade text,                       -- e.g. 'CBSE-10'
  date_of_birth date,               -- optional, keep minimal per SAFETY
  created_at timestamptz not null default now()
);
create index idx_students_user on students(user_id);
-- RLS: student can select/update own row via join to users.auth_user_id

create table learning_profiles (
  student_id uuid primary key references students(id) on delete cascade,
  preferred_pace text,              -- inferred label, evidence-backed (see learner model)
  preference_evidence jsonb not null default '{}',  -- {trait: {value, confidence, n_observations}}
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table learning_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  curriculum_id uuid not null references curricula(id),
  target_date date,
  status text not null default 'active' check (status in ('active','paused','completed')),
  created_at timestamptz not null default now()
);

-- ===================== CURRICULUM =====================

create table curricula (
  id uuid primary key default gen_random_uuid(),
  board text not null,              -- 'CBSE'
  class text not null,              -- '10'
  version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique(board, class, version)
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  name text not null,               -- 'Mathematics'
  slug text not null,
  unique(curriculum_id, slug)
);

create table chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,               -- 'Quadratic Equations'
  slug text not null,
  sequence int not null,
  unique(subject_id, slug)
);
create index idx_chapters_subject on chapters(subject_id);

create table topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  name text not null,               -- 'Solving by Factorisation'
  slug text not null,
  sequence int not null,
  unique(chapter_id, slug)
);
create index idx_topics_chapter on topics(chapter_id);

create table skills (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  name text not null,               -- 'Factorise a quadratic trinomial'
  slug text not null,
  unique(topic_id, slug)
);
create index idx_skills_topic on skills(topic_id);

create table prerequisites (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references skills(id) on delete cascade,
  requires_skill_id uuid not null references skills(id) on delete cascade,
  strength text not null default 'hard' check (strength in ('hard','soft')),
  unique(skill_id, requires_skill_id),
  check (skill_id <> requires_skill_id)
);
create index idx_prereq_skill on prerequisites(skill_id);

-- ===================== DIAGNOSTIC =====================

create table diagnostic_tests (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table diagnostic_questions (
  id uuid primary key default gen_random_uuid(),
  diagnostic_test_id uuid not null references diagnostic_tests(id) on delete cascade,
  skill_id uuid not null references skills(id),
  difficulty smallint not null check (difficulty between 1 and 5),
  question_type text not null check (question_type in ('mcq','short_answer','numeric')),
  prompt text not null,
  options jsonb,                    -- for mcq
  expected_answer jsonb not null,
  misconception_tags text[] default '{}',
  created_at timestamptz not null default now()
);
create index idx_diag_q_skill on diagnostic_questions(skill_id);

create table diagnostic_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  diagnostic_test_id uuid not null references diagnostic_tests(id),
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result jsonb                      -- {strengths, weak_skills, gaps, misconceptions, starting_point}
);
create index idx_diag_attempt_student on diagnostic_attempts(student_id);

create table diagnostic_answers (
  id uuid primary key default gen_random_uuid(),
  diagnostic_attempt_id uuid not null references diagnostic_attempts(id) on delete cascade,
  diagnostic_question_id uuid not null references diagnostic_questions(id),
  answer jsonb not null,
  is_correct boolean not null,
  responded_at timestamptz not null default now()
);
create index idx_diag_answers_attempt on diagnostic_answers(diagnostic_attempt_id);

-- ===================== MASTERY =====================

create table mastery_states (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  skill_id uuid not null references skills(id),
  score numeric(5,2) not null default 0 check (score between 0 and 100),
  band text not null default 'needs_foundation'
    check (band in ('needs_foundation','emerging','developing','strong','mastered')),
  component_scores jsonb not null default '{}',   -- {recent_accuracy, application, consistency, independence, retention}
  updated_at timestamptz not null default now(),
  unique(student_id, skill_id)
);
create index idx_mastery_student on mastery_states(student_id);

-- ===================== QUESTIONS (session-time, generated or bank) =====================

create table questions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references skills(id),
  source text not null default 'generated' check (source in ('generated','bank')),
  difficulty smallint not null check (difficulty between 1 and 5),
  question_type text not null check (question_type in ('mcq','short_answer','numeric','step')),
  prompt text not null,
  options jsonb,
  expected_answer jsonb not null,
  misconception_tags text[] default '{}',
  validated boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_questions_skill on questions(skill_id);

create table question_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  question_id uuid not null references questions(id),
  session_id uuid references learning_sessions(id) on delete set null,
  answer jsonb not null,
  is_correct boolean not null,
  hints_used int not null default 0,
  time_taken_seconds int,
  detected_misconception_id uuid references misconceptions(id),
  created_at timestamptz not null default now()
);
create index idx_qattempt_student on question_attempts(student_id);
create index idx_qattempt_session on question_attempts(session_id);

-- ===================== MISCONCEPTIONS =====================

create table misconceptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  skill_id uuid references skills(id),
  tag text not null,                -- from fixed taxonomy, see Section 9
  confidence numeric(3,2) not null check (confidence between 0 and 1),
  first_detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved boolean not null default false
);
create index idx_misconceptions_student on misconceptions(student_id);

-- ===================== SESSIONS =====================

create table learning_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  skill_id uuid not null references skills(id),      -- primary objective for the session
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  starting_mastery numeric(5,2),
  ending_mastery numeric(5,2),
  summary jsonb,                    -- {learned, can_now_do, needs_practice, next_recommendation}
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index idx_sessions_student on learning_sessions(student_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references learning_sessions(id) on delete cascade,
  role text not null check (role in ('tutor','student','system')),
  content text not null,
  strategy text,                    -- pedagogy strategy used, if role='tutor'
  created_at timestamptz not null default now()
);
create index idx_messages_session on messages(session_id);

-- ===================== EVENTS (analytics) =====================

create table learning_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  session_id uuid references learning_sessions(id) on delete set null,
  event_type text not null,         -- signup, diagnostic_started, question_answered, etc.
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_events_student on learning_events(student_id);
create index idx_events_type on learning_events(event_type);
```

**RLS approach (Supabase):** every student-owned table gets a policy of the shape
`using (student_id in (select id from students where user_id in (select id from users where auth_user_id = auth.uid())))`.
Curriculum tables (`curricula`…`prerequisites`, `questions`, `diagnostic_*` definitions) are read-only public/authenticated — no RLS needed beyond `select` for `authenticated`. Service-role key is used server-side for writes to mastery/events.

---

## 4. API Specification

All routes return `{ data, error }`. Auth via Supabase session cookie/JWT; server derives `student_id` from it — never trust a client-supplied student id.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/*` | Supabase Auth handles this directly (magic link / OAuth) |
| GET | `/student/profile` | Learner profile + preferences summary |
| POST | `/student/onboarding` | Save grade, goal, initial preferences |
| GET | `/curriculum?board=CBSE&class=10&subject=maths` | Full curriculum tree |
| GET | `/curriculum/topics/:topicId` | Topic detail incl. skills + prerequisites |
| POST | `/diagnostic/start` | Create `diagnostic_attempts` row, return first question |
| POST | `/diagnostic/answer` | `{attemptId, questionId, answer}` → next question or completion |
| GET | `/diagnostic/result/:attemptId` | Strengths/gaps/misconceptions/starting point |
| GET | `/mastery?studentId=` | All skill mastery states + bands |
| GET | `/learning-path?studentId=` | Ordered recommended skill sequence |
| POST | `/session/start` | `{skillId}` → orchestrator picks objective, opens session |
| POST | `/session/message` | Free-text student message → tutor response |
| POST | `/session/answer` | Structured answer to an active question → evaluation + next action |
| POST | `/session/hint` | Request a hint for current question |
| POST | `/session/complete` | Close session, generate summary |
| GET | `/sessions?studentId=` | Session history list |

Each handler: validate input → call one `core` service → log a `learning_events` row → respond. No handler talks to the AI provider directly except `session/*`, and even those go through the Orchestrator.

---

## 5. Learner Model

```ts
interface LearnerState {
  studentId: string;
  profile: {
    displayName: string;
    grade: string;
  };
  goal: {
    curriculumId: string;
    targetDate?: string;
  };
  curriculum: {
    board: string;
    class: string;
    subjectId: string;
  };
  currentObjective: {
    skillId: string;
    topicId: string;
    reason: 'diagnostic' | 'sequence' | 'remediation' | 'student_choice';
  };
  masteryBySkill: Record<string /* skillId */, {
    score: number;               // 0-100
    band: MasteryBand;
    components: MasteryComponents;
  }>;
  gaps: Array<{ skillId: string; type: 'prerequisite' | 'weak' }>;
  misconceptions: Array<{
    tag: MisconceptionTag;
    skillId: string;
    confidence: number;
    resolved: boolean;
  }>;
  recentPerformance: {
    last10Attempts: Array<{ correct: boolean; skillId: string; difficulty: number }>;
    rollingAccuracy: number;
  };
  hintUsage: { last5Sessions: number[] };       // hints per session, recent trend
  difficultyResponse: {
    lastDifficultyOffered: number;
    trend: 'struggling' | 'comfortable' | 'ready_for_challenge';
  };
  preferences: {
    // evidence-based, NOT fixed labels — see below
    pace: { value: 'slow' | 'medium' | 'fast'; confidence: number };
    exampleAffinity: { value: number; confidence: number }; // likelihood examples help vs. explanations
    hintReliance: { value: number; confidence: number };
  };
  sessionHistory: Array<{ sessionId: string; skillId: string; date: string; masteryDelta: number }>;
}
```

**Preferences as evidence, not diagnosis:** every preference field is `{value, confidence, n_observations}`, updated incrementally (e.g. simple Bayesian-ish update or exponential moving average) from observable signals only — time-to-answer, hint requests, correction after examples vs. after explanations, retry behavior. Never inferred from tone, sentiment, or anything resembling a mental-health signal. The system does not label, store, or reason about anxiety, ADHD, depression, or personality type, full stop — this is enforced by keeping the schema to the fields above and nothing else.

---

## 6. Curriculum Schema (conceptual)

```
Board (CBSE)
 └─ Class (10)
     └─ Subject (Mathematics)
         └─ Chapter (Quadratic Equations)
             └─ Topic (Solving by Factorisation)
                 └─ Skill (Factorise a quadratic trinomial)
                     └─ Learning Objective (implicit: "student can factorise
                         ax²+bx+c with integer roots unaided")
```

Prerequisites are edges between **skills**, not chapters — this is what lets the system say "you're weak in Quadratic Equations because you're weak in Factorisation, not because you haven't 'read the chapter'." Example seed for Quadratic Equations:

```
skill: solve_quadratic_by_factorisation
  requires: factorise_trinomial (hard)
  requires: algebraic_manipulation (hard)
  requires: solve_linear_equation (soft)

skill: factorise_trinomial
  requires: multiply_binomials (hard)
  requires: integer_arithmetic (hard)
```

This graph is authored once as seed JSON (`packages/db/seed/cbse-class10-maths.json`) and loaded via a migration script — not hand-typed into SQL.

---

## 7. Mastery Algorithm

```
mastery_score =
    0.40 * recent_accuracy        // correctness on last N attempts for this skill, weighted toward most recent
  + 0.20 * application_performance // performance on applied/word problems vs. rote
  + 0.15 * consistency             // low variance across recent attempts (stddev-based)
  + 0.15 * independent_performance // performance with hints_used == 0
  + 0.10 * retention                // performance on this skill after a gap (spaced re-test)

clamp(mastery_score, 0, 100)

bands:
  0–39   → needs_foundation
  40–59  → emerging
  60–74  → developing
  75–89  → strong
  90–100 → mastered
```

Implementation rule: `packages/core/mastery/mastery.service.ts` is the **only** place this formula is evaluated. Every component score (`recent_accuracy`, `application_performance`, …) is stored separately in `mastery_states.component_scores` so the weights or the formula can change later without a data migration — you recompute from stored components, or from raw `question_attempts`, without losing history.

MVP simplification worth stating explicitly: with only ~4 chapters and a 7-day timeline, "retention" (10%) may have too few data points in week 1 (no spaced gap has occurred yet) — default it to a neutral 70 until there are ≥2 attempts separated by ≥3 days, and document that in code, not silently zero it.

---

## 8. Tutor Orchestrator — Flow

`packages/core/orchestrator/tutor.orchestrator.ts`, called by `/session/message` and `/session/answer`:

```
1.  loadLearnerState(studentId)
2.  loadCurriculumState(learnerState.currentObjective)
3.  objective = resolveCurrentObjective(learnerState)         // may repoint if prereq gap found
4.  prereqCheck = checkPrerequisites(objective, learnerState.masteryBySkill)
    if prereqCheck.hasGap → objective = prereqCheck.repairSkill
5.  recentMistakes = getRecentMistakes(studentId, objective.skillId, limit=5)
6.  strategy = pedagogyEngine.selectStrategy({ objective, mastery, recentMistakes, studentInput })
7.  difficulty = pedagogyEngine.selectDifficulty({ mastery, difficultyResponse })
8.  context = buildModelContext({ learnerState, objective, strategy, difficulty, recentMistakes, lastNMessages })
9.  response = aiProvider.complete(tutorPrompt(context))
10. persist tutor message; return response to client
--- on next student answer ---
11. evaluation = assessmentService.evaluate(question, studentAnswer)   // deterministic where possible
12. misconception = misconceptionDetector.detect(question, studentAnswer, evaluation)
13. masteryService.update(studentId, skillId, evaluation)
14. logEvent('question_answered', {...})
15. nextAction = pedagogyEngine.selectStrategy(updatedState)          // loop back to step 6
```

Context sent to the model on step 8 is deliberately small: current objective, strategy, difficulty, last 2–3 messages, and a compact mastery/misconception summary — **not** full history (Cost Control, Section 11).

---

## 9. Misconception Taxonomy (fixed set for MVP)

```
SIGN_ERROR
ALGEBRAIC_MANIPULATION
FORMULA_MISUSE
CONCEPT_CONFUSION
PROCEDURAL_ERROR
ARITHMETIC_ERROR
PREREQUISITE_GAP
INCOMPLETE_REASONING
```

Detection is a two-stage check: (1) deterministic pattern match against `expected_answer` structure where possible (e.g. sign flipped, wrong factor pair — this catches most algebra errors cheaply, no LLM call needed); (2) LLM-assisted classification only when the deterministic check can't tag it, constrained to return one of the eight tags plus a confidence — never free-text psychological interpretation. Stored with `confidence`; surfaced to the student only as "let's double check your sign here," never as a label.

---

## 10. Pedagogy Engine — Strategies

```
EXPLAIN, EXAMPLE, GUIDED_PRACTICE, SOCRATIC, HINT, SIMPLIFY,
PREREQUISITE_REPAIR, REMEDIATION, CHALLENGE, REVIEW, INDEPENDENT_TEST
```

Selection is rule-based (a decision table, not an LLM call — the LLM executes the chosen strategy, it doesn't choose it):

| Signal | Strategy |
|---|---|
| Prerequisite gap detected | `PREREQUISITE_REPAIR` |
| 2+ consecutive misses, same misconception | `REMEDIATION` |
| First exposure to skill | `EXPLAIN` → `EXAMPLE` |
| Post-explanation, mastery < 60 | `GUIDED_PRACTICE` |
| Mastery 60–89, no recent struggle | `SOCRATIC` |
| Student says "I don't understand" | `SIMPLIFY` |
| Student says "give me a hint" | `HINT` |
| Student says "give me an example" | `EXAMPLE` |
| Student says "make it easier" | `SIMPLIFY` + lower difficulty |
| Student says "challenge me" | `CHALLENGE` + raise difficulty |
| Mastery ≥ 90, spaced since last practice | `REVIEW` |
| End of session objective reached | `INDEPENDENT_TEST` |

---

## 11. Prompt Architecture

Two prompts, both templated, both short by design.

**Tutor prompt** (`tutor.prompt.ts`) — system message fixed, user turn injects only the compact context from orchestrator step 8:

```
SYSTEM (fixed):
You are a patient, structured maths tutor for a CBSE Class 10 student.
- Teach, don't just answer. Ask questions. Keep replies concise.
- Use the selected strategy for this turn; don't switch strategies yourself.
- Give hints before full solutions unless the student has asked for the answer directly.
- Never confirm understanding the student hasn't demonstrated.
- Stay strictly within the current topic/skill; don't introduce unrelated content.
- Use age-appropriate, encouraging language. Never sound like you are role-playing
  a human or forming a personal relationship with the student.
- Never speculate about the student's emotional or mental state.

TURN CONTEXT (injected):
  Objective: {skillName} — {learningObjective}
  Strategy: {strategy}
  Difficulty: {difficulty}/5
  Student mastery on this skill: {band} ({score})
  Recent misconception (if any): {tag, plain-language, no jargon}
  Last exchange: {last 2-3 messages}
  Student's current message: {input}
```

**Evaluation prompt** (`evaluation.prompt.ts`) — used only when deterministic checking can't score the answer (free-text reasoning, "explain why" questions); returns strict JSON: `{ correct: bool, misconception_tag: string|null, confidence: number, feedback: string }`. For anything with a symbolic/numeric expected answer (most of Class 10 algebra), evaluation is deterministic (parse + compare), not an LLM call — this is both cheaper and more reliable than trusting the model to grade math.

---

## 12. Evaluation Set (for internal testing, not students)

`eval/eval-set.json` — representative cases per chapter, each tagged with what it tests:

```json
[
  {
    "id": "quad-001",
    "skill": "solve_quadratic_by_factorisation",
    "input_sequence": ["x^2 + 5x + 6 = 0, solve"],
    "checks": ["correctness", "curriculum_alignment"]
  },
  {
    "id": "quad-002",
    "skill": "solve_quadratic_by_factorisation",
    "student_mastery": "needs_foundation",
    "checks": ["adaptation", "difficulty_selection"]
  },
  {
    "id": "quad-003",
    "student_answer": "x^2 - 4x - 5 = 0 → x = 1, -5 (sign error path)",
    "checks": ["misconception_detection"]
  },
  {
    "id": "poly-001",
    "input": "why do I need to learn this",
    "checks": ["pedagogical_quality", "hallucination"]
  }
]
```

`run-eval.ts` runs each case through the orchestrator (mocked or live), scores against the 9 dimensions from the spec (correctness, curriculum alignment, adaptation, difficulty selection, misconception detection, hallucination, pedagogical quality, cost per session, latency), and prints a report. This is what you run before Day 7 deployment, not a one-off.

---

## 13. Cost Control (concrete, not aspirational)

- Context window per tutor call: objective + strategy + difficulty + last 2–3 messages + compact mastery summary. Never the full session transcript.
- Deterministic evaluation for anything with a symbolic/numeric answer — no LLM call to grade `x=2` against `x=2`.
- Session summaries (Section 14) are generated once, at session end, from stored events — not recomputed by re-sending history each turn.
- Misconception detection: deterministic pattern match first; LLM fallback only on ambiguous free-text answers.
- Cache: curriculum tree, prerequisite graph, and prompt templates are static — load once per process, not per request.

---

## 14. Session Engine

`learning_sessions` + `messages` (Section 3) hold the raw data. On `/session/complete`, generate:

```
{
  what_you_learned: string[];      // skill names touched this session
  what_you_can_now_do: string[];   // skills that crossed a mastery band up
  needs_practice: string[];        // skills still < 'developing'
  next_recommendation: { skillId, reason };
}
```

Built from `question_attempts` + before/after `mastery_states` for the session — one short LLM call to phrase it in plain language, given the structured facts (not asked to invent them).

---

## 15. AI Provider Abstraction

```ts
interface AIProvider {
  complete(params: {
    systemPrompt: string;
    userMessage: string;
    responseFormat?: 'text' | 'json';
  }): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }>;
}
```

`GeminiProvider implements AIProvider` (Gemini Flash for MVP). `ClaudeProvider implements AIProvider` is a stub from Day 4 (throws `not_implemented` or proxies to the same interface) so switching later is a config change, not a rewrite. `TutorService` and `SessionEngine` depend only on `AIProvider`, never on a specific SDK — enforced by not importing `@google/genai` or `@anthropic-ai/sdk` outside the two provider files.

---

## 16. Safety Guardrails (MVP-level, enforced in code, not just prompt)

- System prompt explicitly forbids emotional/personal-relationship language and psychological speculation (Section 11).
- No field in the learner model schema exists for mental-health, personality, or diagnostic labels (Section 5) — this is a structural guarantee, not a policy note.
- Personal data collected at onboarding: display name, grade, goal only. DOB optional and unused in MVP logic.
- Escalation to a parent/trusted adult is out of scope for MVP (no child accounts yet) but the `users.role` enum already includes `'parent'` so it's not a schema change later.

---

## 17. 7-Day Sequence (restated as a checklist)

- **Day 1** — Supabase project, schema migration (Section 3), Supabase Auth wired, repo scaffold (Section 2), seed script for CBSE Class 10 Maths curriculum (4 chapters).
- **Day 2** — Curriculum service + API, learner model types + `learner-state.service.ts`, onboarding flow.
- **Day 3** — Diagnostic engine (8–15 adaptive questions across the 4 chapters), mastery service with the formula above wired to `question_attempts`.
- **Day 4** — Tutor orchestrator (Section 8), `AIProvider` interface + `GeminiProvider`, tutor prompt (Section 11), `/session/*` endpoints.
- **Day 5** — Deterministic assessment/evaluation, misconception detector (Section 9), pedagogy engine difficulty adaptation.
- **Day 6** — Dashboard (mastery view, session history), analytics events wired (Section on Analytics), integrate with Bolt frontend if reusing it.
- **Day 7** — Run `eval/run-eval.ts`, fix what it surfaces, deploy.

**Definition of done**, restated: a real student signs up → does the diagnostic → gets a starting point and path → has an adaptive session on one skill → answers questions, gets hints/feedback appropriate to their mastery → sees mastery move → gets a session summary. That loop, working, is the MVP — not visual polish, not every chapter, not every strategy.

---

### What to build next (deliberately deferred, don't build in week 1)
pgvector-based semantic question retrieval, ClaudeProvider actually wired in, spaced-repetition scheduling beyond the retention component, parent/child accounts and escalation flows, multi-subject/multi-board content beyond the seed pack, full evaluation dashboard UI (the eval script's console output is enough for MVP).
