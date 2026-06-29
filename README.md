# Quarto + Supabase demo

A self-contained Quarto website that demonstrates site-wide auth, automatic
time-on-page tracking, in-app action logging, and a role-aware teacher report.
Throwaway — for getting a feel for the concepts before touching your real site.

## What's where

```
quarto-demo/
  _quarto.yml          # the whole integration: 3 include-* lines
  config.js            # <-- paste your Supabase URL + anon key here
  track.js             # the page-time + action tracker (site-wide)
  setup.sql            # paste into Supabase once to create tables + RLS
  _includes/
    head.html          # loads supabase + config, makes window.sb
    auth-widget.html   # the sign-in/status bar (top of every page)
    track.html         # loads track.js
  index.qmd            # landing / instructions
  lessons/*.qmd        # plain content pages — each tracked separately
  practice/*.qmd       # embed the real apps (iframe) — actions logged
  teacher/report.qmd   # time + actions per student, RLS-filtered
  apps/                # a copy of the refactored tunes/patterns/rhythms apps
```

## Setup (once)

1. **Get a Supabase instance.** Either:
   - **Cloud (easiest):** create a free project at supabase.com, or
   - **Local:** `supabase start` (needs Docker + the Supabase CLI).
2. **Create the schema.** Open the SQL Editor (cloud) or local Studio and run
   all of `setup.sql` *except* the commented block at the bottom.
3. **Enable auth providers.** Authentication → Providers → enable **Email**
   (turn off "Confirm email" for the demo). Google is optional (see below).
4. **Paste your keys** into `config.js` (`URL` and `ANON`).

## Run it

```sh
quarto preview --port 8080
```

Then open the printed URL (use a fixed port so OAuth redirects are stable).

1. Use the top bar to **Create** an account, then **Sign in** (email/password).
2. Browse **Lessons** (each is timed separately) and **Practice** (press play,
   click notes).
3. After your test accounts exist, run the commented block at the bottom of
   `setup.sql` to assign roles and link a teacher/student/parent.
4. Sign in as the teacher and open **Teacher Report**.

## Google sign-in (optional)

Google needs a Google Cloud OAuth client:

1. Google Cloud Console → OAuth consent screen (add your test Google accounts
   as Test users) → Credentials → OAuth client ID (Web application).
2. Authorized redirect URI: `https://YOUR_REF.supabase.co/auth/v1/callback`
   (cloud) or `http://localhost:54321/auth/v1/callback` (local).
3. Paste the client ID/secret into Supabase → Authentication → Providers →
   Google.
4. Supabase → Authentication → URL Configuration → add your Quarto preview URL
   (e.g. `http://localhost:8080/`) to the redirect allow-list.

Email/password needs none of this, so start there.

## Integrating into your real Quarto site later

Copy three things into your existing project:
- the three `include-*` lines from `_quarto.yml`
- `config.js`, `track.js`, and the `_includes/` partials
- the `apps/` folder (or host your apps under the same origin)

Then run `setup.sql` against the Supabase project you'll use in production.
Nothing about how you author `.qmd` pages changes.

## Caveats

- This is a learning sandbox: production needs invite-based onboarding, email
  confirmation on, input validation, and Edge Functions for privileged ops.
- Time tracking measures *attention* (visible seconds), not effort — that's why
  actions are logged too.
- Action logging is click-based and approximate, and the iframe hook only works
  because everything is served from one origin.
