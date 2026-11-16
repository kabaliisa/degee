# Putting Deegee on the internet

Three places, all free: **Neon** holds the database, **Render** runs the API, **Cloudflare Pages**
serves the app. Once it is set up, every push to `main` redeploys both halves.

Do these in order — each step produces something the next one needs. Budget forty minutes.

---

## 1. The database, at Neon

Render's own free Postgres is **deleted thirty days after you create it**. That is why the database
lives somewhere else; Neon's free tier does not expire.

1. Sign up at neon.tech and create a project. Any region; `us-east` is fine.
2. Copy the connection string it shows you. It looks like:

   ```
   postgresql://neondb_owner:npg_AbC123@ep-wispy-dawn-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. **Split it into three parts.** This is the step people get wrong: Spring wants a `jdbc:` URL and
   the username and password separately, not the single URL Neon gives you.

   | Value | From the example above |
   |---|---|
   | `DEEGEE_DB_URL` | `jdbc:postgresql://ep-wispy-dawn-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require` |
   | `DEEGEE_DB_USER` | `neondb_owner` |
   | `DEEGEE_DB_PASSWORD` | `npg_AbC123` |

   Note what changed: `postgresql://` became `jdbc:postgresql://`, and `user:password@` came out of
   the middle. Keep `?sslmode=require` — Neon refuses connections without it.

You do not need to create any tables. The app runs its own migrations on first start and seeds the
catalogue, the artists and the songs.

---

## 2. The API, at Render

1. Sign up at render.com and connect your GitHub account.
2. **New → Blueprint**, pick `kabaliisa/degee`. It reads `render.yaml` and offers a `deegee-api`
   service.
3. Fill in the environment variables it asks for:

   - `DEEGEE_DB_URL`, `DEEGEE_DB_USER`, `DEEGEE_DB_PASSWORD` — the three parts from step 1
   - `DEEGEE_CORS_ORIGINS` — `https://deegee-drg.pages.dev`
     (`deegee.pages.dev` was already taken, so Cloudflare gave us the `-drg` suffix — this exact
     string, or every request from the app fails CORS)
   - `DEEGEE_ADMIN_PHONES` — your own number, `+256…`, so you can see the artist side
   - `DEEGEE_JWT_SECRET` and `DEEGEE_WEBHOOK_SECRET` fill themselves in

4. Deploy. The first build takes about five minutes — it compiles the jar and installs ffmpeg.
5. Copy the service URL, something like `https://deegee-api.onrender.com`.
6. Check it: opening `https://deegee-api.onrender.com/v1/catalog` should return JSON with five
   artists in it.

---

## 3. The site, at Cloudflare Pages

1. **Done.** The project `deegee` exists and serves from `https://deegee-drg.pages.dev`. Note the
   suffix: `deegee.pages.dev` was taken by someone else, and Cloudflare appends a few random letters
   when the name you want is gone. The project's *name* is still `deegee`, which is what the workflow
   deploys to; only the public address differs.
2. Note your **Account ID** from the right-hand side of that page.
3. **My Profile → API Tokens → Create Token**, template *Edit Cloudflare Workers*, or a custom token
   with `Cloudflare Pages: Edit`. Copy it; it is shown once.

Then in GitHub, **Settings → Secrets and variables → Actions**, add three repository secrets:

| Secret | Value |
|---|---|
| `API_URL` | the Render URL from step 2, no trailing slash |
| `CLOUDFLARE_API_TOKEN` | done |
| `CLOUDFLARE_ACCOUNT_ID` | done |
| `SITE_URL` | optional; set it to `https://deegee.ug` once that domain resolves |

Push anything to `main`. The workflow runs the checks, builds the site with the API's address baked
in, and publishes to `https://deegee-drg.pages.dev`.

---

## 4. Check it works

On your phone, in Safari or Chrome, open `https://deegee-drg.pages.dev`:

- the catalogue loads and the artwork appears
- **press play** — you should hear music, not just a moving progress bar
- Share → *Add to Home Screen* (iOS) or the install prompt (Android)
- open it from the home screen: no browser chrome
- put the phone in aeroplane mode and open it again: it still opens, and anything saved offline plays

---

## What to know before you demo it

**The API sleeps.** On the free tier it shuts down after fifteen minutes of no traffic and takes
about a minute to wake. **Open the site a minute before you present** and the person you are pitching
never sees it. Seven dollars a month on Render removes this entirely, and it is the first thing worth
paying for.

**Payments are simulated.** There is no MTN or Airtel integration — top-ups approve themselves after
a two-second pause, as if a PIN had been entered. Say so yourself rather than be asked.

**Uploads do not survive a restart.** Render's free filesystem is wiped when the container recycles,
so a song an artist uploads during a demo is gone within the hour. The seeded music is unaffected: it
travels inside the jar and is written back on every start. Real uploads need object storage —
Cloudflare R2 has a free tier and is the natural next step.

**Bandwidth is 5 GB a month** on Render's free tier, cut from 100 GB in April 2026. A three-minute
song is about 3 MB, so roughly 1,500 full plays. Fine for a demo, not for an audience.

---

## Then: deegee.ug

Once the domain is registered, point it at what is already running. In Cloudflare Pages, **Custom
domains → Set up a domain**, enter `deegee.ug`, and follow the DNS records it gives you. Then add
`https://deegee.ug` to `DEEGEE_CORS_ORIGINS` in Render, alongside the Pages address, and redeploy the
API. Ten minutes, and nothing else changes.
