# SAH-PROMPT-0009 - original text (verbatim)

Received: 2026-10-31 10:59 IST, from the founder, as an attached file. Stored unchanged below the line. Do not edit.

---

MASTER PROMPT: SAHAYAK FOUNDER COMMAND & DEVELOPMENT CONTROL SYSTEM

Persistent Master Prompt Registry + Execution Tracker + Admin Account Observatory + Account Activity Intelligence

You are working on my existing SAHAYAK application.

Your responsibility is to design and implement a permanent development management and administrative observability system within the existing SAHAYAK architecture.

This is an existing, working application. Do not treat this as a fresh project.

Website: https://cbse-tutor.vercel.app/

GitHub repository: https://github.com/myshrimey/ADAPTIVE-TUTOR

Technology currently includes:

- Next.js
- Supabase
- Vercel
- GitHub
- AI/LLM integrations

First inspect the actual repository and identify the current architecture. Do not assume that the above list describes every library or implementation detail.

I am a non-programmer founder. Explain technical matters in simple English. Prefer practical, low-cost and maintainable implementations.

---

PART 1 — PRIMARY OBJECTIVE

Build a system that ensures SAHAYAK never loses track of:

1. Every master prompt I have given Claude.
2. Every objective and requirement contained in those prompts.
3. Every individual task required to fulfil each objective.
4. What has been completed.
5. What is partially completed.
6. What has not been started.
7. What is blocked and why.
8. What needs testing or verification.
9. What has been changed since the previous execution.
10. What I have selected as the next priority.

I may give Claude multiple master prompts while another master prompt is still being executed.

Claude must never automatically mix unrelated objectives, silently abandon previous requirements, or assume that the latest prompt replaces earlier prompts.

The founder must retain control over priorities.

The system must function across Claude conversations, context resets and future development sessions.

Do not rely exclusively on Claude's conversational memory.

Use persistent files and, where appropriate, database-backed records in the SAHAYAK repository/application.

---

PART 2 — PERSISTENT MASTER PROMPT REGISTRY

Create a permanent Master Prompt Registry.

Suggested repository structure:

/docs/sahayak-control-centre/
README.md
MASTER_PROMPT_REGISTRY.md
MASTER_PROMPT_ARCHIVE/
MASTER_OBJECTIVE_TRACKER.md
TASK_BACKLOG.md
EXECUTION_LOG.md
DECISION_REGISTER.md
DEPENDENCY_REGISTER.md
RELEASE_HISTORY.md
CURRENT_PRIORITY.md
SESSION_RESUME.md
CHANGELOG.md

You may improve this structure if the existing repository has a better convention.

2.1 Register every master prompt

Whenever I provide a new master prompt, Claude must:

1. Assign it a unique Prompt ID.
2. Store the complete original prompt without losing any requirement.
3. Record its date of receipt.
4. Record its objective.
5. Identify all individual requirements.
6. Break requirements into executable tasks.
7. Identify dependencies.
8. Identify potential conflicts with existing prompts.
9. Assign an initial priority proposal.
10. Record its current status.

Suggested ID format:

SAH-PROMPT-0001
SAH-PROMPT-0002
SAH-PROMPT-0003

Each prompt must have a separate record.

Do not overwrite old prompts.

If I provide a revised prompt, preserve the original and register the revised version with a relationship to the previous prompt.

2.2 Prompt status

Use these statuses:

- RECEIVED
- REGISTERED
- ANALYSED
- NOT STARTED
- IN PROGRESS
- PARTIALLY COMPLETED
- BLOCKED
- READY FOR TESTING
- TESTING
- COMPLETED
- ACCEPTED BY FOUNDER
- DEFERRED
- CANCELLED

Do not mark something COMPLETED merely because code has been written.

Completion requires the relevant implementation and verification evidence.

Founder acceptance must be separate from technical completion.

2.3 Requirement-level tracking

A master prompt may contain 50 or more individual requirements.

Do not track only the master prompt as a single task.

Break it down into:

Prompt → Objectives → Requirements → Tasks → Subtasks → Tests → Evidence.

Give every requirement a unique ID.

Example:

SAH-PROMPT-0001
Objective 1
REQ-001
TASK-001
TASK-002
TEST-001
REQ-002
TASK-003
TEST-002

Every requirement must have its own status.

Maintain traceability between the original prompt and the actual implementation.

---

PART 3 — TASK EXECUTION CONTROL

3.1 Founder-controlled priority

I will decide which objective or task should be executed first.

Claude can recommend priorities but must not independently change my selected priorities.

When I provide a new prompt during the execution of an existing prompt:

1. Register the new prompt.
2. Analyse it.
3. Identify conflicts and dependencies.
4. Update the task backlog.
5. Preserve the current task's progress.
6. Show me the updated overall position.
7. Ask which task or objective I want to execute next if my instruction does not already specify it.

Do not abandon an active task simply because a new prompt arrives.

Do not begin implementing every newly registered prompt.

3.2 Current execution lock

Maintain a CURRENT EXECUTION record containing:

- Active Prompt ID.
- Active Objective ID.
- Active Task ID.
- What has been completed.
- What remains.
- Files changed.
- Tests performed.
- Known problems.
- Next recommended action.
- Any decisions awaiting my approval.

Only one major development objective should be treated as the active execution priority unless I explicitly authorise parallel work.

Small dependencies and necessary fixes may be completed when they are essential to the selected task. Record them.

3.3 Execution protocol

Before executing any task:

1. Read the master prompt registry.
2. Read the objective tracker.
3. Read the task backlog.
4. Read the current priority.
5. Read the previous execution log.
6. Inspect the relevant source code.
7. Confirm the task's scope and acceptance criteria.

Then execute only the selected objective and its necessary dependencies.

After execution:

1. Update the requirement statuses.
2. Update the task backlog.
3. Record changed files.
4. Record database or schema changes.
5. Record tests and their results.
6. Record unresolved issues.
7. Update the execution log.
8. Update the session resume document.

Never report untested functionality as verified.

3.4 Context-reset and conversation-resume protocol

At the beginning of every new Claude conversation or after a context reset:

Read the persistent SAHAYAK control-centre documents first.

Then display a concise RESUME REPORT containing:

- Total registered master prompts.
- Total objectives.
- Total requirements.
- Completed requirements.
- In-progress requirements.
- Pending requirements.
- Blocked requirements.
- Current founder-selected priority.
- Last completed task.
- Next unfinished task.
- Decisions awaiting founder input.

If information is missing, identify it rather than inventing it.

Do not ask me to repeat information already preserved in the repository.

If repository files and conversation history disagree, flag the conflict and ask me to resolve it.

---

PART 4 — DEVELOPMENT CONTROL CENTRE IN THE ADMIN COMMAND CENTRE

Create a dedicated section in the existing Sahayak Admin Command Centre.

Suggested navigation:

ADMIN COMMAND CENTRE
├── Dashboard
├── Master Prompt Registry
├── Objective Tracker
├── Task Backlog
├── Current Execution
├── Dependency Register
├── Testing & QA
├── Decision Register
├── Execution History
├── Account Observatory
├── Account Activity Intelligence
└── System Health

Reuse existing admin components and design conventions.

Do not create duplicate dashboards if similar functionality already exists.

4.1 Master Prompt Registry screen

Display:

- Prompt ID.
- Prompt title.
- Date registered.
- Main objective.
- Number of requirements.
- Completed requirements.
- Pending requirements.
- Blocked requirements.
- Current status.
- Founder-selected priority.

Allow me to open each prompt and inspect its full original text and requirement breakdown.

Provide filters for:

- Status.
- Priority.
- Date.
- Category.
- Completion percentage.

4.2 Objective Tracker screen

Display all objectives from all registered prompts.

For every objective show:

- Parent Prompt ID.
- Objective ID.
- Objective description.
- Requirements count.
- Completed count.
- Pending count.
- Blocked count.
- Dependencies.
- Current status.
- Verification evidence.

Allow me to expand an objective and inspect every associated task.

4.3 Task Backlog screen

Create an easy-to-understand task list.

Columns:

- Task ID.
- Prompt ID.
- Objective.
- Task description.
- Priority.
- Status.
- Dependencies.
- Estimated effort, if reasonably known.
- Actual effort, if tracked.
- Last updated.
- Verification status.

I should be able to filter, sort and inspect tasks.

Provide founder-controlled priority selection.

I must be able to select a task and mark it as the next task for Claude to execute.

Do not automatically execute a task merely because I change its priority.

Execution requires an explicit instruction from me.

4.4 Current Execution screen

Show:

- Current active task.
- Original prompt.
- Objective being addressed.
- Acceptance criteria.
- Completed subtasks.
- Remaining subtasks.
- Files modified.
- Tests completed.
- Issues discovered.
- Next action.

Make interruptions and resumptions easy.

4.5 Founder decision register

Record important decisions I make.

Examples:

- Which feature to build first.
- Which pricing structure to use.
- Whether a feature is free or paid.
- Whether a proposed requirement is postponed.
- Whether a feature is accepted.
- Whether an architectural change is approved.

Record decision date, context and affected tasks.

Do not silently reverse an earlier founder decision.

Flag conflicts between a new instruction and an earlier decision.

---

PART 5 — ADMIN ACCOUNT OBSERVATORY

I want to inspect every account type from the Admin Command Centre without logging out of the administrator account.

SAHAYAK has or may have the following account types:

- Students.
- Parents.
- Teachers.
- Individual tutors.
- Coaching-centre owners.
- Coaching-centre administrators.
- Other staff or organisational accounts.

First inspect the existing authentication, roles, permissions and database structure.

Build a secure administrative account-inspection system.

5.1 Account directory

Create an account directory with:

- Account ID.
- Name or display name.
- Account type.
- Registered email, subject to appropriate permissions.
- Registration date.
- Account status.
- Current plan.
- Subscription/access validity.
- Assigned subjects.
- Linked parent/student/tutor relationships where applicable.
- Last activity.
- Account completion status.

Provide filters for account type, plan, status, registration date and activity.

Do not expose passwords, authentication tokens, secret keys or other credentials.

Mask sensitive personal information unless there is a legitimate administrative requirement to view it.

5.2 Inspect account without logging out

Provide a secure feature called:

VIEW ACCOUNT AS ADMIN

From the account directory, I should be able to select an account and inspect the application as that account would experience it.

The objective is to verify:

- Dashboard appearance.
- Navigation.
- Available features.
- Plan restrictions.
- Subject access.
- Learning workflow.
- Diagnostic workflow.
- Quiz and assessment workflow.
- Mock examinations.
- Reports.
- Progress tracking.
- Account-specific settings.
- Error messages.
- Mobile and desktop presentation.

I must be able to return to the admin dashboard without logging out.

Critical security requirements

Do not implement this as an authentication bypass or a shared-password mechanism.

Implement secure, server-authorised administrative account inspection.

Prefer a separate, temporary, server-validated support/impersonation context with:

- Strict administrator role verification.
- Explicit account selection.
- A visible ADMIN VIEWING THIS ACCOUNT banner.
- Clear indication of the account being inspected.
- A visible exit button.
- Short session expiry.
- Server-side permission checks on every protected action.
- Full audit logging.
- No access to account passwords, authentication tokens or private credentials.

Default to READ-ONLY account inspection.

Where an action changes user data, requires payment, sends a message, changes a plan, submits an assessment or performs another consequential operation, prevent it in read-only mode.

If genuine workflow testing requires changes, provide a separately authorised test mode with explicit confirmation, a recorded reason, and appropriate safeguards.

Prefer dedicated test accounts for destructive workflow testing.

Do not silently perform actions as the user.

Do not allow an administrator to impersonate another administrator or increase their own privileges through this feature.

Do not expose one student's records to another student, parent or tutor.

5.3 Admin account testing

Create a structured test checklist for every account type.

Examples:

STUDENT:

- Registration.
- Login.
- Profile.
- Subject selection.
- Diagnostic.
- Learning.
- Assessment.
- Mock exam.
- Report.
- Progress.

PARENT:

- Registration.
- Linked child.
- Child progress.
- Reports.
- Subscription/access.
- Notifications.

TUTOR:

- Registration.
- Profile.
- Student management.
- Learning/assessment access.
- Progress monitoring.
- Plan restrictions.

COACHING CENTRE:

- Registration.
- Organisation profile.
- Staff.
- Student management.
- Centre-level reporting.
- Permissions.

TEACHER:

- Registration.
- Profile.
- Assigned classes or students.
- Assessment and learning workflows.
- Reporting permissions.

Adapt these tests to actual implemented functionality. Do not invent features that do not exist.

---

PART 6 — ACCOUNT ACTIVITY INTELLIGENCE

I also want to understand what is happening inside every account.

Build an account-level activity timeline and a central activity analytics dashboard.

The purpose is to understand product usage, verify workflows, identify problems and improve student learning experiences.

6.1 Activity tracking

Subject to privacy, consent, applicable law and the product's age-appropriate design, record meaningful product events.

Examples:

ACCOUNT:

- Registration completed.
- Login completed.
- Profile updated.
- Account type.
- Plan activated.
- Plan expired.
- Access changed.

LEARNING:

- Learning session started.
- Learning session completed.
- Topic opened.
- Lesson completed.
- Learning activity abandoned.
- Tutor interaction count.
- AI provider/model used, where appropriate.

ASSESSMENT:

- Diagnostic started.
- Diagnostic completed.
- Quiz started.
- Quiz completed.
- Mock examination started.
- Mock examination submitted.
- Report generated.
- Report viewed.

ENGAGEMENT:

- Last active date.
- Sessions per day/week/month.
- Learning activity frequency.
- Return visits.
- Feature usage.
- Incomplete workflows.

TECHNICAL:

- API failures.
- AI provider failures.
- Request latency.
- Upload failures.
- Failed report generation.
- Permission-denied events.
- Relevant application errors.

PAYMENTS:

- Payment initiated.
- Payment verified.
- Payment rejected.
- Refund initiated.
- Refund completed.
- Access activated or expired.

Avoid collecting unnecessary information.

For students, particularly minors, use data minimisation and appropriate parental/guardian safeguards. Do not build covert surveillance or collect private communications, unrelated device activity, keystrokes or sensitive personal information.

6.2 Individual account activity timeline

When I open an account, show a chronological timeline.

For example:

Account: Student A

- 08:30 — Logged in.
- 08:35 — Opened Mathematics.
- 08:40 — Started diagnostic.
- 09:05 — Completed diagnostic.
- 09:06 — Diagnostic report generated.
- 09:15 — Started learning session.
- 09:35 — Learning session completed.
- 09:36 — Progress updated.

The above is illustrative only. Display actual events recorded in the system.

Each event should include:

- Timestamp.
- Event type.
- Account ID.
- Related subject or activity, if applicable.
- Result/status.
- Relevant duration, if available.
- Error information, if relevant.
- Source/module.
- Correlation or request ID where appropriate.

Provide filters for date range, event type and feature.

6.3 Activity analytics dashboard

Create summary metrics such as:

- Daily active users.
- Weekly active users.
- Monthly active users.
- New registrations.
- Active students.
- Active parents.
- Active tutors.
- Active coaching centres.
- Learning sessions.
- Completed diagnostics.
- Completed quizzes.
- Completed mock examinations.
- Returning users.
- Incomplete onboarding.
- Feature adoption.
- Error rates.
- AI provider failures.

Where the data supports it, provide:

- Account-level activity.
- Account-type comparisons.
- Daily/weekly/monthly trends.
- Funnel analysis.
- Student retention.
- Feature usage.
- Learning workflow completion.

Do not fabricate metrics.

If a metric cannot be calculated from existing data, mark it as unavailable and identify what instrumentation is required.

6.4 Activity event architecture

Inspect the existing database before creating new tables.

If necessary, design a central activity-events structure.

Suggested fields:

- id
- account_id
- actor_id
- actor_role
- event_type
- event_category
- entity_type
- entity_id
- metadata
- status
- occurred_at
- correlation_id

Add appropriate indexes, access policies and retention rules.

Use metadata carefully. Do not store unnecessary sensitive information or copies of entire conversations.

Activity logs must be protected against unauthorised reading, editing or deletion.

Administrative access and impersonation actions must also generate separate audit events.

6.5 Audit log

Create an immutable or appropriately tamper-resistant administrative audit trail for:

- Admin login.
- Account inspection.
- Start/end of impersonation.
- Account selected.
- Admin actions.
- Permission changes.
- Plan changes.
- Payment actions.
- Export/download actions.
- Sensitive record access.
- Configuration changes.

Include administrator identity, timestamp, target account, action, reason where required, and outcome.

Restrict audit log access to authorised administrators.

Define sensible retention and deletion policies.

---

PART 7 — SECURITY AND PRIVACY

This part is mandatory.

Do not sacrifice security to make administration convenient.

Inspect:

- Supabase Row Level Security policies.
- Server-side role verification.
- API authorisation.
- Admin route protection.
- Account ownership checks.
- Parent-child relationships.
- Tutor-student relationships.
- Coaching-centre boundaries.
- Sensitive data access.
- Export permissions.
- Impersonation permissions.
- Audit logging.

All access control must be enforced server-side.

Never rely on hiding a button in the frontend as a security measure.

Never expose Supabase service-role credentials or AI provider secrets to the browser.

Do not introduce a universal administrator password or backdoor.

Do not weaken existing RLS policies to make the feature easier.

Do not allow activity data from one organisation or account to leak into another.

Because SAHAYAK serves school students, design the system with special care for minors' information and applicable Indian privacy requirements.

Flag legal or policy questions that require professional review rather than claiming legal compliance without verification.

---

PART 8 — DATABASE AND ARCHITECTURE

Before implementing:

1. Inspect the current database schema.
2. Inspect current authentication and roles.
3. Inspect existing admin dashboards.
4. Inspect existing analytics and event logging.
5. Inspect all existing account types.
6. Inspect existing tests.
7. Identify reusable components.
8. Identify gaps.

Do not create duplicate tables or duplicate systems without a clear reason.

Prepare a proposed architecture and implementation plan first.

For database migrations:

- Create version-controlled migration files.
- Preserve existing data.
- Include appropriate indexes.
- Include RLS policies.
- Include rollback considerations.
- Never run destructive migrations against production without my explicit approval.

Do not alter production data or credentials.

Do not deploy automatically.

---

PART 9 — TESTING AND ACCEPTANCE CRITERIA

The work is not complete until the following are verified.

Master Prompt Registry

- Every submitted prompt can be registered.
- Original prompt content is preserved.
- Requirements are separately tracked.
- Statuses remain persistent after context resets.
- New prompts do not overwrite old prompts.
- Founder-selected priorities are preserved.
- Resuming a task correctly identifies unfinished work.

Development Control Centre

- All prompts and objectives are visible.
- Tasks can be filtered.
- Dependencies are visible.
- Founder can select the next task.
- Execution history is preserved.
- Incomplete work is clearly identified.

Account Observatory

- Admin can inspect all authorised account types without logging out.
- Correct account experience is displayed.
- Admin identity remains clear.
- Exit returns to the admin dashboard.
- Read-only restrictions work.
- Sensitive operations are blocked unless separately authorised.
- Every inspection is logged.
- Cross-account access is prevented.

Activity Intelligence

- Meaningful account events are recorded.
- Account timelines display actual events.
- Filters work.
- Analytics are calculated from real data.
- Errors are visible.
- Audit logs are protected.
- Privacy and retention safeguards work.

Test direct API access, not only frontend navigation.

Test unauthorised users, expired sessions, role boundaries and attempts to access another account's records.

Report test results separately from implementation status.

---

PART 10 — IMPLEMENTATION PRIORITIES

Break the work into these proposed phases.

PHASE 0 — REPOSITORY AND ARCHITECTURE AUDIT
Inspect the current application and produce a gap report.

PHASE 1 — PERSISTENT PROMPT REGISTRY
Create the persistent documentation and task tracking structure.

PHASE 2 — EXECUTION AND RESUME CONTROL
Implement reliable execution tracking and context-resume protocol.

PHASE 3 — ADMIN ACCOUNT DIRECTORY
Build account discovery and secure account inspection.

PHASE 4 — ACCOUNT ACTIVITY TRACKING
Implement event instrumentation and individual account timelines.

PHASE 5 — ACTIVITY ANALYTICS
Build account activity and usage dashboards.

PHASE 6 — SECURITY AND QA
Test access control, audit logging, privacy and end-to-end workflows.

These are proposed phases, not permission to execute all phases immediately.

I will decide the order and authorise each major phase.

---

PART 11 — IMPORTANT OPERATING RULES

1. Never lose or silently discard an earlier master prompt.
2. Never silently merge conflicting objectives.
3. Never assume that writing code means completing a task.
4. Never mark an untested feature as verified.
5. Never change my selected priority without approval.
6. Never automatically start every registered task.
7. Never change production data or production settings without explicit approval.
8. Never weaken security to make admin inspection easier.
9. Never expose sensitive student information unnecessarily.
10. Never make unverified claims about functionality.
11. Always record what files were changed.
12. Always record what remains unfinished.
13. Always maintain a clear next-action list.
14. Always preserve founder decisions.
15. Always provide a simple-English summary after each execution.

If a task is too large, break it into smaller independently testable tasks.

If a requirement conflicts with existing architecture, explain the conflict and propose alternatives.

If an implementation requires paid services, explain the cost and suggest a free or low-cost alternative where practical.

---

PART 12 — REQUIRED RESPONSE FORMAT

At the end of every execution, display:

A. EXECUTION SUMMARY

What was done.

B. MASTER PROMPT STATUS

Prompt ID, objective and current status.

C. REQUIREMENT TRACKER

Completed, partially completed, pending, blocked and unverified requirements.

D. FILES CHANGED

List all created, modified and deleted files.

E. DATABASE CHANGES

List migrations and schema changes, or explicitly state none.

F. TEST RESULTS

What was tested, what passed and what failed.

G. SECURITY AND PRIVACY

Any risks discovered and their status.

H. REMAINING WORK

Exactly what is still not built.

I. NEXT AVAILABLE TASKS

List the next unfinished tasks, with dependencies.

J. FOUNDER DECISION REQUIRED

Ask only for decisions that genuinely require my input.

K. PERSISTENCE CONFIRMATION

Identify the repository documents updated to preserve progress.

---

FIRST ACTION — DO NOT START BUILDING EVERYTHING

Start with PHASE 0.

Inspect the current SAHAYAK repository and produce:

1. Current architecture overview.
2. Existing admin functionality.
3. Existing account types and role structure.
4. Existing authentication and authorisation approach.
5. Existing analytics and activity tracking.
6. Existing testing infrastructure.
7. Existing database tables and relevant RLS policies.
8. Gaps against this master prompt.
9. Proposed implementation architecture.
10. A complete task breakdown with unique IDs.
11. Risks, dependencies and estimated complexity.
12. Recommended implementation sequence.

Then create the persistent prompt registry and development control documents, subject to the current repository conventions.

Do not build all the dashboard features immediately.

Do not make destructive changes.

Do not deploy.

Present the Phase 0 findings and the proposed Phase 1 tasks to me.

I will decide what Claude should build first.

The ultimate objective is a SAHAYAK development environment where every master prompt, objective, requirement, task, decision, account workflow and unfinished feature remains traceable and under founder control.