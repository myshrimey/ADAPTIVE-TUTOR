# Live journey checklist (v112)

Claude cannot sign in to your live site, so nothing below has been seen working there. Do these in order after you deploy, on a real phone for steps 4 onward. Write what you see in /admin/control/testing (it never changes a status by itself).

## Step 0 - automatic part (2 minutes, on any computer with Node)
`node scripts/smoke/smoke-test.mjs https://YOUR-SITE`
It opens the public pages, checks that admin pages and private APIs refuse a signed-out visitor, that the free check shows no answers, that sign-in/sign-up/forgot-password refuse bad requests, and that the safety headers are present. Expect "0 failed". It creates no account and sends no email. If anything fails, stop and send Claude the output.

## Step 1 - after deploying: /admin/deploy-check
- Website version and database version both say the newest (v112 / 0061), nothing "NOT applied".

## Step 2 - a new family signs up (use a test email you own)
1. /  -> Create account as a family. Tick the consent box. Submit.
2. You land signed in. Header fits the phone screen (no sideways scroll).
3. Sign out, sign in again with the username.

## Step 3 - forgot password (needs a test account WITH an email)
1. Sign in page -> Forgot password -> type the email. You should see the neutral message.
2. The email arrives within a few minutes (check spam). Open the link, set a new password, sign in.
3. Try an email that has no account: the same message appears.
4. Press the button 4 times for one email within an hour: the 4th shows "Too many reset requests".

## Step 4 - a student session
1. Choose one subject (free plan = one). Start the diagnostic. Answer 3 questions; use the keypad on a maths question.
2. Use "Report a problem with this question" once. Attach a screenshot.
3. /my-feedback shows the report.

## Step 5 - you as admin
1. /admin opens only when signed in as admin. The top bar has "Control centre".
2. /admin/feedback shows the message AND the picture. Pictures may show a child's screen: close it when done.
3. /admin/control -> "Load from documents" once; check the prompt counts.

## Step 6 - things you should NOT see
- A password or full email in any admin list.
- An answer key before answering.
- The page wider than the screen on any page (note the page name if it is).

Anything that does not match: note the page, what you pressed and what you saw. Claude fixes from that.

## Step 7 - Supabase settings only you can change (v117)
A signed-in person can always call Supabase directly, so the website's password rules are a courtesy; the lock is in Supabase.
1. Supabase dashboard -> Authentication -> sign-in / password settings: set the minimum password length to 8 (the website asks for 8) and, if your plan offers it, turn on the option that refuses passwords found in known leaks. Wording of the menu may differ; tell Claude what you see.
2. Same area: "Allow new users to sign up" must stay OFF (accounts are made only by the website's own routes).
3. Storage -> papers: file size limit 10 MB and PDF only (migration 0062 sets this).
