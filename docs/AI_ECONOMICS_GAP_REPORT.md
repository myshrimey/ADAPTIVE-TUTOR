# AI intelligence and economics: audit before v59 (read from the real code, 2026-10-22)

Legend: EXISTS = already there and works. PARTIAL = there but incomplete. MISSING = not there. BROKEN = there but wrong.

## The 15 questions
| # | Question | Before v59 | Notes |
|---|---|---|---|
| 1 | Which provider handled a request? | EXISTS | `ai_usage.provider` |
| 2 | Which exact model/version? | PARTIAL | model stored, **version not stored** |
| 3 | Why was it selected? | MISSING | nothing recorded |
| 4 | Which feature/task? | EXISTS | feature, task, task_tier |
| 5 | Which user? | PARTIAL | student_id only; no user id, no organisation |
| 6 | Resources consumed | PARTIAL | tokens, images, latency yes; audio no; retries/fallbacks not recorded |
| 7 | Free quota, promo credit or paid? | PARTIAL | only a yes/no "free quota used"; promo credit not modelled |
| 8 | Estimated economic cost | PARTIAL | list-price estimate stored; no separate economic cost |
| 9 | Actual provider charge | MISSING | "billed" is Sahayak's own calculation, never checked against an invoice |
| 10 | Passed quality validation? | MISSING | |
| 11 | Fallback used? | PARTIAL | each attempt is a row, but attempts of one request are not linked |
| 12 | Cost per feature | PARTIAL | calls, failures, billed, list; no users, tokens, images, cost/user |
| 13 | Cost per student | PARTIAL | per active student; no per-student list |
| 14 | Handwritten evaluation cost | PARTIAL | an average only; no per-evaluation record, no contribution |
| 15 | Is each paid feature viable? | PARTIAL | handwritten assumptions page only |

## The 16 steps
| Step | Area | Before v59 |
|---|---|---|
| 2 | Request-level ledger | PARTIAL (one row per attempt, missing fields above) |
| 3 | Cost layers (list / free subsidy / promo / actual / economic) | PARTIAL (list + billed only). **BROKEN for history**: a row stored its cost but not the rates or exchange rate behind it, so an old row could not be explained after a price was edited |
| 4 | Routing by task, capability, quality, health, quota, cost ceiling, latency, availability, privacy | PARTIAL (task, vision, health, quota, privacy, availability yes; quality gate for handwriting only; no cost ceiling; no latency; no "lowest cost that meets quality") |
| 5 | Admin-only routing explanation | MISSING |
| 6 | Registry fields | PARTIAL (model, version, pricing, free quota, expiry, commercial use, data policy, last verified present; **quota type, quota region, promo credit, capabilities, production status** missing) |
| 7 | Economics dashboard | PARTIAL (calls, failures, cost per period; no tokens/images/economic cost today; no projections) |
| 8 | Feature economics | PARTIAL |
| 9 | Handwritten evaluation | PARTIAL: image limit per exam EXISTS (`pagesAllowedForExam`, not fixed at 12); ₹499 price EXISTS in the product list; **per-evaluation contribution and MARGIN_AT_RISK MISSING** |
| 10 | Cost protection | PARTIAL (caps and blocking exist; alerts at 80% only for daily/monthly spend; no 90% critical for user/feature/evaluation caps; caps count billed cost only so free-quota use is invisible to them) |
| 11 | Benchmark | PARTIAL (runs, cases, quality score, manual ratings; no per-subject/class/language breakdown, no vision/Hindi ratings, no comparison) |
| 12 | Model switch simulator | MISSING |
| 13 | No-AI tasks | EXISTS (`assertAiAllowed`, Tier 0 list). Extended with the exact names in your list and a code scan test |
| 14 | Founder Command Centre AI items | PARTIAL (AI cost per customer only) |
| 15 | Security | EXISTS (keys are only environment variable NAMES in the registry, pages are admin-gated, usage rows server-only) |
| 16 | Do not break existing | Respected: everything is added to existing tables/pages |

Items found wrong while auditing (fixed in v59): rates and exchange rate not stored with each request; spend caps blind to free-quota use; attempts of one request not linked; registry says nothing about quota type, so a promotional credit could not be told apart from a free quota.

## Status after v59 (what was done about each gap)
| Area | After v59 |
|---|---|
| Ledger | One `request_id` links all attempts; new columns for user, organisation, model version, retries, fallback count and reason, quota type, audio, cost layers, pricing snapshot, quality result and the admin-only routing explanation. Inspector at /admin/ai-requests. Rows from before v59 still show (each as its own request, fields "not recorded"). |
| Cost layers | list, free-quota subsidy, promotional credit, billed, economic cost on every call; rates and exchange rate saved with the row. "Actual provider charge" is entered monthly as an invoice figure (no provider billing API is called). |
| Routing | Capability, quality minimum, cost ceiling, latency limit added next to the existing health, quota, privacy, vision and free/paid rules. Optional objective "lowest list cost among models that meet every requirement" (default stays your configured order). |
| Registry | quota type, quota region, promo credit (balance, expiry), capabilities, production status, price verified date. Existing primary/fallback/benchmark untouched. |
| Dashboard | /admin/ai-economics: today, month, projection (100 to 100,000), feature economics, models, handwritten margin, invoices, comparison, switch simulator, assumptions. |
| Cost protection | 80% warning / 90% critical / 100% blocked for all six controls; limits can count billed or economic cost (default billed = old behaviour). |
| Benchmark | scope filters (subject, class, language, task), breakdown, vision/OCR and Hindi ratings, cost per case, comparison table. |
| Command Centre | AI cost and margin-risk block added. |
| Still not possible | Reading a provider's real invoice automatically; verifying any price or free quota (needs the founder to read the provider's current official page). |
