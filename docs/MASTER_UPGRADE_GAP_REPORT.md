# Master upgrade prompt (2026-10-24) - gap report

Method: each section of the pasted "Sahayak master upgrade and deployment prompt" was compared with the code and schema in this repository (v60 state). EXISTS = built before this round, EXTENDED/NEW = built in v61, PARTIAL, MISSING.

| Prompt section | Status | Where / note |
|---|---|---|
| 3 Class 10 CBSE 2026-27 first, student's real subject/language mix | EXISTS | subjects with status, registered subjects, `subjectFamily`, v56 four language choices |
| 4 Exam sessions, not one hard-coded exam | NEW | `exam_sessions` (0038) + /admin/configuration; setting `boards` (v56) still drives readiness |
| 5 Curriculum configuration engine | PARTIAL | tables already board/class/subject based; admin can now register versions; chapters/topics are still loaded from seed files, no in-browser curriculum editor |
| 6 AI-generated curriculum needs admin approval, versioned | PARTIAL/NEW | `curriculum_versions` with draft > needs review > approved > published, source required, approver recorded; no AI syllabus-mapping import tool |
| 7 Interface / learning / exam language separate | EXISTS | v56 four independent languages, `supported_languages`, translations with status |
| 8 Progressive onboarding | EXISTS | onboarding + profile |
| 9 Generous free core, configurable gates | EXISTS | Free plan, `entitlements` setting (v54) |
| 10-12 Pricing plans, 5-subject plan, T&C line | EXISTS | v54 `commerce_*`, every price card shows "Terms & Conditions Apply." and the price-revision line |
| 13 Class XI/XII transition as entitlement | MISSING | not built (needs the founder's rules); history is kept per student already |
| 14-15 Handwritten image allowance and economics | EXISTS | `pagesAllowedForExam`, v54b/v59 per-evaluation cost, contribution, MARGIN_AT_RISK; extra-image package not built |
| 16-23 AI gateway, routing, cost ledger, cost dashboard, health, fallback | EXISTS | v55b + v59 (/admin/ai-infrastructure, /admin/ai-economics, /admin/ai-requests). Nothing about any provider's price/free tier is verified |
| 24-25 Engagement, leaderboards | EXISTS | v57/v58 |
| 26 Voice + visual architecture | PARTIAL | read-aloud, diagrams, image questions, handwriting vision exist; no voice conversation |
| 27 Parent intelligence | EXISTS | parent portal, reports, confidence trends |
| 28 Tutor dashboard | PARTIAL | portal, challenges, reports for linked students; NO batches/groups, assignments or parent-report generator |
| 29 Coaching-centre dashboard | PARTIAL | as above; NO batches, tutors under a centre, heatmap |
| 30 Commercial dashboard | EXISTS | /admin/commercial, Command Centre (MRR, CAC, LTV to date, funnel); breakdown by board/geography not built |
| 31-37 Founder financial simulator | NEW | /admin/financial-simulator: presets Rs 1L to 10L x 10% to 80% margins, student/tutor/centre economics, combination simulator, "what to add to reach the target", break-even, handwritten calculator (100 to 5,000 mocks). All labelled PLANNING SCENARIO |
| 38 International: country, timezone, currency | NEW | users.country/timezone/currency (0038), picker on /profile |
| 39 International pitch wording | MISSING | copy not written |
| 40 Country-specific pricing | PARTIAL/NEW | `country_prices` + admin editor; NOT used at checkout (checkout is offline UPI in rupees) |
| 41-42 Other boards, expansion engine | PARTIAL | the register tables above are board-agnostic; no "add a board" wizard |
| 43 Data model | EXISTS/NEW | equivalent tables exist; added exam_sessions, curriculum_versions, country_prices, audit_logs. Not duplicated: investors = funding_records (v55), leads = crm_records |
| 44 Security, audit logging | NEW | roles, RLS, server-side AI keys exist; `audit_logs` + /admin/audit-log now record admin changes to the new settings (simulator, referral, configuration). Older admin actions (pricing, payments, AI providers) are NOT yet written to it |
| 45 Privacy | EXISTS | consent, export/delete, minimal data |
| 46 Founder Command Centre | EXISTS | v55/v59 |
| 47-48 Investor dashboard / database | PARTIAL | /admin/investor-metrics, /admin/funding (ACTUAL/ESTIMATED labels); no TAM/SAM/SOM or use-of-funds screen |
| 49-50 Schools, government | MISSING | school role not built (the prompt says not to prioritise) |
| 52 P0 list | EXISTS | all P0 items are present |
| 55-56 Deployment and acceptance journeys | NOT DONE | no live deployment or browser walk-through was possible here |
