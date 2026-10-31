# v81 - Curriculum management and branded exports (plain English)

1. AUDIT (before coding): the app had a small curriculum register (v61) but no upload, no outline, no publish control. Downloads: 1 client PDF path, print, about 8 CSV routes, one student JSON, one markdown. No PDF/DOCX/XLSX libraries were installed, so none were added.
2. PLANS AND ENTITLEMENTS INVENTORY: Free (1 subject), Founding Family, a higher paid plan, older monthly plans (not on sale). Enforced on the server in about 12 routes (`assertAccess`, `assertSubjectAllowed`, `hasFeature`/entitlements setting). AI use and cost are in `ai_usage` and /admin/ai-economics. v81 changes no plan limit and adds no export limit.
3. SCHEMA: migration 0051 (see DATABASE_SCHEMA.md). Re-runnable. Server-only tables.
4. WORKFLOW: Upload (status Uploaded) -> outline read or pasted (Needs Review) -> fix/flag -> Approve -> Publish (older published version becomes Superseded) -> Rollback if needed. Approve/Publish/Rollback: Super Admin only. A new upload never touches the published version.
5. INTEGRATION: new test reports store the published curriculum version for the subject in `data.curriculum` and show "Curriculum used". Outline items can be linked to existing chapters/topics (suggestions only for identical names).
6. EXPORT SERVICE: `packages/core/branding` + `apps/web/lib/export.ts` + `lib/download-pdf.ts` + `PrintButton`. Brand, website https://cbse-tutor.vercel.app/, export ID, date, privacy class. CSV body is untouched.
7. TESTS: t81 (76), t81b (28); t79, t79b, t80 still pass.
8. SECURITY: tables RLS on with no policies; private bucket; signed URLs for source download; file type, size and magic-byte checks; roles checked on the server; no personal data in file names or headers; audit trail in curriculum_events and writeAudit.
9. DEPLOY / ROLLBACK: unzip, `npm run db:migrate`, deploy. Rollback: redeploy the previous version; migration 0051 is additive (old code ignores the new columns/tables).
10. NOT DONE: PDF reading, question-bank re-mapping, stamping diagnostic attempts, DOCX/XLSX exports (none exist), live-database and signed-in tests.
