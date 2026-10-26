# Sahayak Social Media Growth Engine (v68)

## What this version does
- Adds an admin-only Growth Engine at `/admin/social-growth`.
- Creates platform-specific draft content for Facebook, Instagram and LinkedIn.
- Stores campaigns, content drafts, suggested posting dates, hashtags, image briefs, review status and attribution fields.
- Can create a 30-day calendar with 90 draft posts (30 topics × 3 platforms).
- Uses deterministic templates; no AI API call is made by this first version.
- Requires founder approval and manual posting. “Scheduled” means planned in the app, not scheduled with a social network.

## Install
1. Use the branch `feat/v68-social-growth-engine` and open its pull request.
2. Review the PR and ensure Vercel preview checks pass before merging.
3. After merge, deploy through the existing Vercel/GitHub setup.
4. Run `npm run db:migrate` from the project root after confirming the database URL points to the intended Supabase project.
5. Open `/admin/social-growth` while signed in as an authorised admin.
6. Create one draft first. Review it before creating the full calendar.

## Safety and limitations
- The new tables have RLS enabled and no public policies; server access uses the existing admin guard and service-role client.
- Do not store social passwords or access tokens in database tables or Git.
- There is no native Facebook, Instagram or LinkedIn publishing integration in this version.
- To enable automatic posting later, add an authorised Meta/LinkedIn API or approved publisher, with credentials stored as Vercel environment secrets and explicit account/permission checks.
- Social analytics fields are placeholders until provider analytics or UTM attribution is connected.
