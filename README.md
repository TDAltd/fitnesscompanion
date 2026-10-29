# Fitness Companion

Track workouts (set by set), a simple food diary, weight, body measurements and daily habits. Each person has their own account and their own data.

- **Frontend:** React + Vite + Tailwind (`artifacts/fitness-app`)
- **Backend:** Express API (`artifacts/api-server`) that also serves the built frontend
- **Database:** PostgreSQL via Drizzle ORM (`lib/db`). Migrations run automatically when the server starts
- **AI meal estimates:** Google Gemini or OpenAI (optional), capped per user per day

---

## 1. Deploy to Namecheap shared hosting (cPanel)

### Step 1 — Get a Postgres database

The app needs **PostgreSQL** (not MySQL). Pick one:

- **Option A: your cPanel.** If you see **"PostgreSQL Databases"** in cPanel, create a database and a user there and give the user all privileges. Your connection string is
  `postgres://CPANELUSER_dbuser:PASSWORD@localhost:5432/CPANELUSER_dbname`
- **Option B: Neon (free, recommended if cPanel has no PostgreSQL).** Sign up at neon.tech, create a project, and copy the connection string. It looks like
  `postgres://user:pass@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`

### Step 2 — Build the upload package

You need Node 20.12+ and pnpm (`npm i -g pnpm`) on your own computer:

```bash
pnpm install
BASE_PATH=/fitnesscompanion/ pnpm run build
```

This creates a `deploy/` folder. Zip **the contents** of `deploy/` (`app.js`, `public/`, `migrations/`, `package.json`).

### Step 3 — Create the Node.js app in cPanel

1. cPanel → **Setup Node.js App** → **Create Application**
2. **Node.js version:** 22 (or 20.12+)
3. **Application mode:** Production
4. **Application root:** e.g. `fitnesscompanion_app`. This is a folder in your home directory, **not** inside `public_html`. cPanel creates `public_html/fitnesscompanion` itself, with only a `.htaccess` in it; don't upload the app there
5. **Application URL:** `tdaproducthub.com` + `fitnesscompanion`. The app is built for **https://tdaproducthub.com/fitnesscompanion/**. To host it elsewhere, change `BASE_PATH` in `.github/workflows/deploy.yml` (use `/` for a domain's root) and rebuild
6. **Application startup file:** `app.js`
7. Under **Environment variables**, add:

| Name | Value |
|---|---|
| `DATABASE_URL` | your connection string from Step 1 |
| `DB_DRIVER` | `pg` (change to `neon` only if Step 5 shows a connection timeout and you use Neon) |
| `AI_PROVIDER` | `gemini` or `openai` (optional; see "AI meal estimates" below) |
| `GEMINI_API_KEY` | your Google Gemini key, if you use Gemini |
| `OPENAI_API_KEY` | your OpenAI key, if you use OpenAI |
| `AI_MODEL` | *Optional.* Defaults: `gemini-3.8-flash` or `gpt-4o-mini` |
| `AI_LOOKUPS_PER_DAY` | `30` |
| `ALLOW_SIGNUPS` | `true` (set `false` later to stop new sign-ups) |
| `ADMIN_EMAILS` | your login email, e.g. `you@example.com` (comma-separate several). These accounts are admin-only (dashboard, no tracking) and can promote other admins |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://tdaproducthub.com/fitnesscompanion` (used in email links) |
| `SMTP_HOST` | *Optional, for email.* Your mail server, e.g. `mail.tdaproducthub.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | a cPanel mailbox, e.g. `hello@tdaproducthub.com` |
| `SMTP_PASS` | that mailbox's password |
| `MAIL_FROM` | `Fitness Companion <hello@tdaproducthub.com>` |
| `CRON_SECRET` | a long random string; protects the weekly email job |
| `APP_TIMEZONE` | *Optional.* Default `Africa/Lagos`, used until a user's phone reports its timezone |

8. Click **Create**.

### Step 4 — Upload the files

cPanel → **File Manager** → open the application root folder (e.g. `~/fitnesscompanion_app`) → **Upload** the zip → **Extract**. You should see `app.js` directly inside that folder. There is **no need** to click "Run NPM Install", because everything is bundled into `app.js`.

### Step 5 — Start it

Back in **Setup Node.js App**, click **Restart** on the app, then open your URL. You should see the login screen.

If it shows an error page, check the log file in the application root (`stderr.log`, or the path cPanel shows):

- `DATABASE_URL must be set` → the environment variable is missing; add it and restart
- `ETIMEDOUT` / `ECONNREFUSED` when connecting to Neon → the host blocks port 5432. Set `DB_DRIVER=neon` and restart
- `password authentication failed` → check the username and password in `DATABASE_URL`

Turn on **SSL** for the domain (cPanel → SSL/TLS Status → Run AutoSSL) so logins are encrypted.

### Updating later

Run `BASE_PATH=/fitnesscompanion/ pnpm run build` again, upload the new `deploy/` contents over the old ones, and click **Restart**. Database changes apply automatically on startup.

### Automatic deployment (after the first manual setup)

Once Steps 1–5 work, every push to `main` builds the app on GitHub and uploads the changed files to Namecheap. The app restarts itself, so you don't need to click Restart.

**One-time setup:**

1. **Create an FTP account just for the app.** cPanel → **FTP Accounts** → *Add FTP Account*:
   - Log in: e.g. `deploy` (it becomes `deploy@yourdomain.com`)
   - Password: generate a strong one and copy it
   - **Directory:** your application root, e.g. `fitnesscompanion_app` (cPanel pre-fills `public_html/deploy`; change it). This locks the account to that one folder.
2. **Add the secrets on GitHub.** Repo → **Settings** → **Secrets and variables** → **Actions** → *New repository secret*. Add:

| Secret | Value |
|---|---|
| `FTP_SERVER` | the server hostname: cPanel → *General Information* → Server Name, plus `.web-hosting.com`. For this account: `premium228.web-hosting.com` |
| `FTP_USERNAME` | the full FTP login, e.g. `deploy@yourdomain.com` |
| `FTP_PASSWORD` | the password from step 1 |
| `FTP_SERVER_DIR` | *Optional.* Leave it out if the FTP account is locked to the app folder. If you use your main cPanel FTP login instead, set it to `fitnesscompanion_app/` |

3. **Run it once by hand:** repo → **Actions** → *Build & deploy to Namecheap* → **Run workflow**. A green tick means it's live.

**Good to know:**
- The first upload sends every file and takes a few minutes. Later uploads only send what changed.
- If the "Check for code errors" step fails, nothing is uploaded and the live site stays as it was.
- Your environment variables in cPanel are never touched; they stay in Setup Node.js App.
- If a deploy uploads but the site still shows the old version, click **Restart** in Setup Node.js App once. Some servers ignore the automatic restart marker.
- The upload uses encrypted FTP (FTPS). If it fails with a TLS or certificate error, change `protocol: ftps` to `protocol: ftp` in `.github/workflows/deploy.yml`.

### Email: password resets and the weekly summary

1. cPanel → **Email Accounts** → create a mailbox (e.g. `hello@tdaproducthub.com`). Its **Connect Devices** page shows the SMTP server and port.
2. Add the `SMTP_*`, `MAIL_FROM`, `APP_URL` and `CRON_SECRET` variables above and click **Restart**. The login screen now shows **Forgot password?**
3. **Weekly summary:** cPanel → **Cron Jobs** → *Add New Cron Job*. Common setting: *Once Per Week*, then set Hour `18`, Weekday `Sunday`. Command:
   ```
   curl -s "https://tdaproducthub.com/fitnesscompanion/api/cron/weekly-summary?key=YOUR_CRON_SECRET" > /dev/null
   ```
   Each person gets at most one email every 6 days. People can switch it off in **Me → Account** or with the link in the email.

Without the SMTP variables the app works as before: no Forgot password link, no emails.

---

## 2. Bring over your data from Replit

1. Open your Replit project → **Database** tool. If you used the **published** app, switch to the **Production** database; your real entries are there.
2. Open the SQL runner and run:

```sql
SELECT json_build_object(
  'user_profile',      (SELECT coalesce(json_agg(t), '[]'::json) FROM user_profile t),
  'weight_logs',       (SELECT coalesce(json_agg(t), '[]'::json) FROM weight_logs t),
  'workout_logs',      (SELECT coalesce(json_agg(t), '[]'::json) FROM workout_logs t),
  'habit_logs',        (SELECT coalesce(json_agg(t), '[]'::json) FROM habit_logs t),
  'meal_plan_entries', (SELECT coalesce(json_agg(t), '[]'::json) FROM meal_plan_entries t),
  'body_measurements', (SELECT coalesce(json_agg(t), '[]'::json) FROM body_measurements t)
) AS export;
```

3. Copy the single result value (it starts with `{"user_profile"`) into a plain text file and save it as `replit-export.json`.
   *Alternative if the result is too long to copy:* in the Replit **Shell**, run
   `psql "$DATABASE_URL" -At -c "<the query above>" > replit-export.json` and download the file. Note: the Shell uses the *development* database.
4. In the new app: sign up → on the setup screen click **"Have data from the old app? Import it"** (or open **Account**, the last icon in the menu) → **Import data** → choose the file. Importing your profile skips the setup questions.

Import **replaces** that account's data, so running it twice won't create duplicates.

---

## AI meal estimates

"Photo or describe" on Eat needs one AI key. Pick one:

**Google Gemini (has a free tier).** Go to aistudio.google.com → sign in with a Google account → **Get API key** → **Create API key**. In cPanel → Setup Node.js App → your app → Environment variables add `AI_PROVIDER` = `gemini` and `GEMINI_API_KEY` = the key, then **Restart**. On the free tier Google may use what's sent to improve its products and limits are lower; turning on billing in Google AI Studio removes both.

**OpenAI.** Go to platform.openai.com → **Settings → Billing** → add a card and buy credits → **API keys → Create new secret key** (copy it now, it's shown once). Add `OPENAI_API_KEY` = the key (and `AI_PROVIDER` = `openai` if you also set a Gemini key), then **Restart**.

Each person can run `AI_LOOKUPS_PER_DAY` estimates a day (default 30). If something's wrong, the app now says what (missing key, key rejected, out of credit).

## 3. Admin dashboard

Accounts listed in `ADMIN_EMAILS` (and anyone an admin promotes) are **admin-only**: they log straight into the admin dashboard and can't use the tracking features. Admin accounts are left out of all user numbers. The dashboard shows:
sign-ups per day, active users (today / 7 days / 30 days), feature use, 1- and 4-week retention,
and a list of people with their goal, training setup and usage counts. Weights, meals and
body measurements are never shown.

From a person's panel an admin can reset their password (gives a temporary one to pass on), make
them an admin, disable or re-enable the account, or delete it with all its data (type their email
to confirm). The switch at the top opens or closes new sign-ups.

## 4. Local development

```bash
cp .env.example .env        # set DATABASE_URL to a local or Neon database
pnpm install
pnpm run dev                # API on :3000, frontend on :5173 (proxies /api)
```

Changing the database schema: edit `lib/db/src/schema/*`, then run `pnpm run db:generate` to create a new migration file in `lib/db/migrations` and commit it.

Changing the API contract: edit `lib/api-spec/openapi.yaml`, then run `pnpm --filter @workspace/api-spec run codegen`.

## Consistency test

Checks that Today and Progress agree (rest days, off-plan workouts, starting weight, synced steps, short food names). Run it against a **local** server, never the live site; it creates and deletes a test account:

```bash
pnpm --filter @workspace/scripts run test:consistency http://localhost:3000
```

Screen checks run too when Playwright is installed globally; otherwise only the API checks run.

## Security notes

- Passwords are hashed with scrypt; sessions are random tokens in an httpOnly cookie, stored hashed in the `sessions` table, 30-day expiry
- Every data query is filtered by the logged-in user's id
- Login is rate-limited (10 attempts / 15 min per email+IP); sign-up is limited to 10 per hour per IP
- AI estimates are limited per user per day (`AI_LOOKUPS_PER_DAY`)
- Rate limits are in-memory, so they reset when the app restarts
