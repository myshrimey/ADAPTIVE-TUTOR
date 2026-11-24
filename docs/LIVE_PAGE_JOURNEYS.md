# Live page-journey check (v145, TASK-062)

A script you run from your own computer against the deployed site. It opens EVERY page in the repo (168 at v145: 30 public, 35 student, 77 admin, 9 centre, 8 tutor, 6 parent, 3 teacher) and checks each of the six account types sees what it should. It is read only (GET requests; nothing is clicked, typed or submitted), cannot sign in and tries no password.

## Run it
```
node scripts/live-checks/journeys.mjs https://your-site.example
```
Optional second round, one TEST account per account type (never real families, never your own admin login). Copy each browser's cookie string for your site and pass it with the account type:
```
node scripts/live-checks/journeys.mjs https://your-site.example --cookie student="a=1; b=2" --cookie tutor="..." --cookie admin="..."
```
Account types: student, parent, tutor, centre, teacher, admin. Give as many as you have; the output lists the ones not checked. Cookies are only sent to your site and are never printed. Sign the test accounts out afterwards.

## What it checks
1. **Signed out, and with a forged session:** public pages open (a broken link shows up); student, adult and admin pages redirect, refuse, or show a sign-in heading.
2. **Each cookie:** its own pages open (not a sign-in prompt, not an error); on the admin and adult areas of the other account types it is refused.

## Reading the result
- **PASS:** as expected.
- **REVIEW:** look at it. A private page answered a visitor with content (is it a sign-in page the script could not recognise?), a public page did not open (broken link, or meant to be private?), or an account type could not open its own page (expired cookie?).
- **FAIL:** a server error, no answer, or an admin page shown to a visitor or the wrong account type. Exit code 1.

## Not covered
- It does not click, type or submit, so it is not a full workflow test: sign-up, answering a lesson, paying, uploading are still the manual steps in docs/LIVE_JOURNEY_CHECKLIST.md and the Testing page.
- It does not check phone layout (the manual step does).
- Pages that a student opens that are classed as "public" by the script (anything not in the student list in `scripts/live-checks/journeys-lib.mjs`) are only checked to open. When a new student page is added, add its prefix to `STUDENT_PREFIXES` there.
- Whether the right person's data is shown (another family's) needs two logins of the same type; not built.
