# Live API boundary check (v142, TASK-060)

A script you run from your own computer against your deployed site. It calls EVERY API route found in the repo (144 routes, 171 route+method pairs at v142) and checks who can get an answer. It cannot sign in and tries no password.

## Run it
```
node scripts/live-checks/api-boundaries.mjs https://your-site.example
```
Optional third round (wrong role): sign in as a **test student** (never a real family, never your admin account), copy that browser's cookie string for your site (browser developer tools, Application, Cookies, or the request header "cookie"), then:
```
node scripts/live-checks/api-boundaries.mjs https://your-site.example --student-cookie "name=value; name2=value2"
```
The cookie is only sent to your own site and is never printed. Sign the test student out afterwards.

## What it does
1. **Signed out:** every route, every method.
2. **Forged or expired session:** the same, with a made-up cookie and token (what an expired or tampered session looks like to the server).
3. **Wrong role (only with the cookie):** a student against the admin, teacher, centre and portal routes.

Safety: GET only reads. Every other method (POST, PUT, PATCH, DELETE) is sent an invalid body, so nothing can be created or changed. It pauses 120 ms between calls. About 340 calls without the cookie.

## Reading the result
- **PASS:** refused (401, 403, 400, 404, 405), redirected, or answered with no data.
- **REVIEW:** a route answered a signed-out caller with data. Fine if the route is meant to be public (tell me and I add it to the public list in `scripts/live-checks/lib.mjs`); a hole if not.
- **FAIL:** a server error (5xx), no answer, an admin/teacher/centre/portal route that gave data to a signed-out caller or to a student, or `/api/me` showing a person to a signed-out caller. The exit code is 1 when anything fails.

## Not covered
- **Another account** (one student reading another student's data) needs two test logins; not built. The code paths are pinned by tests (t140 pins that student routes never take an id from the request; the portal routes check links).
- **Real expired sessions:** the forged session is the closest a script can get without a login.
- It checks that routes refuse the wrong caller. It does not check that signed-in callers get the right data.
