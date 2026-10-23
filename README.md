# F90 Fitness Tracker

Track workouts, meals, weight, body measurements and daily habits. Each person has their own account and their own data.

- **Frontend:** React + Vite + Tailwind (`artifacts/fitness-app`)
- **Backend:** Express API (`artifacts/api-server`) that also serves the built frontend
- **Database:** PostgreSQL via Drizzle ORM (`lib/db`). Migrations run automatically when the server starts
- **AI meal estimates:** OpenAI `gpt-4o-mini` (optional), capped per user per day

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
pnpm run build
```

This creates a `deploy/` folder. Zip **the contents** of `deploy/` (`app.js`, `public/`, `migrations/`, `package.json`).

### Step 3 — Create the Node.js app in cPanel

1. cPanel → **Setup Node.js App** → **Create Application**
2. **Node.js version:** 22 (or 20.12+)
3. **Application mode:** Production
4. **Application root:** e.g. `fitness-app` (a folder in your home directory, *not* inside `public_html`)
5. **Application URL:** your domain or a subdomain, e.g. `fit.yourdomain.com`. Use the root of a domain or subdomain, not a sub-path like `/fitness`
6. **Application startup file:** `app.js`
7. Under **Environment variables**, add:

| Name | Value |
|---|---|
| `DATABASE_URL` | your connection string from Step 1 |
| `DB_DRIVER` | `pg` (change to `neon` only if Step 5 shows a connection timeout and you use Neon) |
| `OPENAI_API_KEY` | your OpenAI key (optional) |
| `AI_LOOKUPS_PER_DAY` | `30` |
| `ALLOW_SIGNUPS` | `true` (set `false` later to stop new sign-ups) |
| `NODE_ENV` | `production` |

8. Click **Create**.

### Step 4 — Upload the files

cPanel → **File Manager** → open the application root folder (e.g. `~/fitness-app`) → **Upload** the zip → **Extract**. You should see `app.js` directly inside that folder. There is **no need** to click "Run NPM Install", because everything is bundled into `app.js`.

### Step 5 — Start it

Back in **Setup Node.js App**, click **Restart** on the app, then open your URL. You should see the login screen.

If it shows an error page, check the log file in the application root (`stderr.log`, or the path cPanel shows):

- `DATABASE_URL must be set` → the environment variable is missing; add it and restart
- `ETIMEDOUT` / `ECONNREFUSED` when connecting to Neon → the host blocks port 5432. Set `DB_DRIVER=neon` and restart
- `password authentication failed` → check the username and password in `DATABASE_URL`

Turn on **SSL** for the domain (cPanel → SSL/TLS Status → Run AutoSSL) so logins are encrypted.

### Updating later

Run `pnpm run build` again, upload the new `deploy/` contents over the old ones, and click **Restart**. Database changes apply automatically on startup.

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
4. In the new app: sign up → **Account** (the last icon in the menu) → **Import data** → choose the file.

Import **replaces** that account's data, so running it twice won't create duplicates.

---

## 3. Local development

```bash
cp .env.example .env        # set DATABASE_URL to a local or Neon database
pnpm install
pnpm run dev                # API on :3000, frontend on :5173 (proxies /api)
```

Changing the database schema: edit `lib/db/src/schema/*`, then run `pnpm run db:generate` to create a new migration file in `lib/db/migrations` and commit it.

Changing the API contract: edit `lib/api-spec/openapi.yaml`, then run `pnpm --filter @workspace/api-spec run codegen`.

## Security notes

- Passwords are hashed with scrypt; sessions are random tokens in an httpOnly cookie, stored hashed in the `sessions` table, 30-day expiry
- Every data query is filtered by the logged-in user's id
- Login is rate-limited (10 attempts / 15 min per email+IP); sign-up is limited to 10 per hour per IP
- AI estimates are limited per user per day (`AI_LOOKUPS_PER_DAY`)
- Rate limits are in-memory, so they reset when the app restarts
