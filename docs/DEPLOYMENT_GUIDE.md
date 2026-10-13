# Deployment Guide — in plain English

This is written for you, not for a programmer. It assumes your project already works the
way it has for v15 through v27: your project folder lives on your Windows computer, it's
connected to a GitHub repository, and that GitHub repository is connected to Vercel so that
every time you push a change, Vercel automatically rebuilds and publishes the live site.

## Before every deployment, I will tell you:
1. What changed, in plain words.
2. Whether the automatic checks (build/typecheck) passed.
3. What will actually change on the live site once this goes out.
4. Whether anything here is a database change (a "migration") or otherwise hard to undo.
5. I will ask for your yes/go-ahead before anything that touches real data.
6. How to actually publish it (the steps below).
7. How to confirm it actually went live.
8. A short checklist of things to click through afterwards to make sure nothing broke.

I will never say "deployment complete" just because I generated some code — only after
you've actually run the steps below and it's live.

## Required accounts/permissions
You already have everything needed: a GitHub account with this repository, a Vercel account
connected to that repository, and a Supabase project. Nothing new to sign up for.

## Step-by-step: shipping a normal update (most rounds, including this one)

1. **Open the folder on your computer** where your project already lives (the same one
   you've been copying v15–v27's files into).
2. **Copy in the new/changed files** from the zip I send you, into the exact same folders
   they're zipped under (so a file at `packages/db/migrations/0008_....sql` in the zip goes
   into `packages/db/migrations/` in your project folder — same as every previous round).
3. **If there's a new database migration file** (a `.sql` file under
   `packages/db/migrations/`): open a terminal/command prompt in your project folder and run:
   ```
   npm run db:migrate
   ```
   What success looks like: it finishes with no red error text, and mentions the new
   migration file by name. If you see "policy already exists" — that's fine, it means it's
   safe to run again.
4. **If any app code changed** (not just a database migration): run, in the same terminal:
   ```
   npm install
   npm run build
   ```
   What success looks like: it ends with a list of routes (pages) and no red "Failed to
   compile" text. If you see red text, stop and send it to me — don't push broken code.
5. **Commit and push to GitHub** the same way you always have (through your usual Git tool,
   or `git add -A && git commit -m "..." && git push`).
6. **Watch Vercel.** Go to vercel.com, open this project, and you'll see a new deployment
   start automatically within a minute of the push. Wait for it to say "Ready" (a few
   minutes).
7. **Open the live site** (https://adaptive-tutor-web.vercel.app) and go through the smoke
   test below.

## Smoke-test checklist (after every deploy)
- [ ] Sign in with a test account — does it land on the Dashboard?
- [ ] Open `/diagnostic` — does it load the subject picker?
- [ ] Open `/progress` — does it show something (not a blank/error page)?
- [ ] If this round touched language: does the toggle switch between English and Hindi
      without the page breaking?
- [ ] If this round touched payments: can you reach the pilot offer page, and does the
      payment-confirmation form submit without an error?
- [ ] Check the footer loads and the new legal page links (if added this round) open.

## Common errors and what they mean
- **"policy ... already exists"** during `npm run db:migrate` — harmless, means it partly
  ran before; safe to ignore.
- **"ENOTFOUND" or "ETIMEDOUT"** during `npm run db:migrate` — usually your `DATABASE_URL`
  is using the wrong connection string type; use the "Session pooler" one from Supabase's
  Connect dialog, not "Direct connection."
- **Red "Failed to compile" during `npm run build`** — stop, copy the exact red text, send it
  to me before pushing. Don't push code that fails to build.
- **Vercel deployment says "Error" instead of "Ready"** — click into it, open the "Build
  Logs" tab, copy the error text near the bottom, send it to me.

## How to roll back safely
If a deploy breaks something: in Vercel, open this project → "Deployments" → find the last
deployment that said "Ready" and worked correctly → click the "···" menu next to it →
"Promote to Production." This instantly makes that older, working version live again,
without touching your code or database. Then tell me what broke so I can fix it properly
before you try again.

## A note on this specific round (the 10-day MVP build)
Per your instruction, this round is being built as one combined set of changes rather than
shipped a piece at a time. That means more files than usual will arrive together. The same
steps above still apply — copy everything in, run the migration(s) in the order they're
numbered, then build and push once.
