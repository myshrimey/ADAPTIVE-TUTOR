# v99 build summary - Next.js security patch and dependency review (2026-11-02)
**Trigger:** founder's npm install showed 4 vulnerabilities (2 high, 2 critical).
**Done:** Next.js 15.5.27 -> 15.5.28 (official fix, Next.js notice of 14 Oct 2026), pinned exactly; package.json + package-lock.json; docs/DEPENDENCY_SECURITY.md (which warnings are reachable); t99 (10 checks, mutation-checked) guards the facts (no Server Actions / use cache / next/image / jsPDF .html()). APP_VERSION v99; TASK-067, EX-0011. No migration.
**Tests:** npm test 77 files: 73 pass, 4 known-stale, 0 fail; tsc clean; production build on 15.5.28 OK; local smoke checks OK.
**Limits:** remaining npm audit entries (postcss inside Next, jspdf->dompurify) judged unreachable, need Next 16 / jsPDF 4 later; npm advisory pages not readable here; not tried live. Never run npm audit fix --force.
