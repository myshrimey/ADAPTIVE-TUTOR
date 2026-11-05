# Dependency security review (v99, 2 Nov 2026)

This is a review of what `npm audit` reports, not a full security audit. It was run in the build sandbox on 2 Nov 2026 and is not verified on the live site.

## What `npm install` on the founder's machine showed
"4 vulnerabilities (2 high, 2 critical)". They come from three packages: **next**, **postcss** (inside Next.js) and **jspdf / dompurify**.

## Next.js (was 15.5.27, now 15.5.28 - APPLIED in v99)
Source: Next.js security update of 14 Oct 2026 (nextjs.org/blog/nextjs-security-update-october-14-2026): the fix for the 15.5 line is **15.5.28** (a patch release, same minor version).
| Flaw | Needs | Does Sahayak use it? |
|---|---|---|
| Remote code execution in the Image Optimization API with SVG (critical) | next/image or the image optimiser fed SVG files | No `next/image`, no image settings in `next.config.js`. (The SVG diagrams in `public/learning-diagrams` are plain static files.) Still fixed by the upgrade. |
| Denial of service with Server Actions (high) | at least one Server Action | None in the app. |
| Remote code execution in `use cache` (critical) | Cache Components / `use cache` | Not used. |
So the app was probably not exposed, but the upgrade is cheap and official, so it is applied. The version is now pinned exactly (no `^`).

## Why `npm audit` still shows warnings after the upgrade
- **next** is still listed because npm's database says the fix is "next 16.4.3" (a major upgrade). The Next.js team's own notice says 15.5.28 is the fix for 15.x. The remaining npm entry is about the bundled **postcss 8.4.31**.
- **postcss** flaws concern building CSS from untrusted CSS comments / stylesheets at build time. Sahayak builds only its own CSS; nobody can feed CSS to the running site. Not reachable in production. Will go away when the project moves to Next 16.
- **jspdf -> dompurify** (many DOMPurify advisories): DOMPurify is only used inside jsPDF's `.html()` function. Sahayak's PDF download uses only text and images (`apps/web/lib/download-pdf.ts`), never `.html()`. Not reachable. The fix is jspdf 4.x, a breaking change that needs its own test of the PDF download.

## What NOT to do
- Do **not** run `npm audit fix --force`: it would jump to Next 16 and jsPDF 4 at once and can break the site.

## Decision for the founder (not urgent)
Plan a separate, tested move to Next.js 16 (and jsPDF 4) later. Until then t99 checks that the facts above stay true: if someone adds a Server Action, `use cache`, `next/image` or jsPDF `.html()`, the test fails so this review is redone.
