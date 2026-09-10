# Deploying InstaView to Vercel + Supabase

The database is **already provisioned** (Supabase project `instaview` / ref `fgtwmadcqvllemftuxbn`, schema `instaview`, 10 tables). You only need to (1) grab the connection string and (2) deploy to Vercel. ~5 minutes.

---

## Step 1 — Get the Supabase connection string

1. Open https://supabase.com/dashboard/project/fgtwmadcqvllemftuxbn
2. Click **Connect** (top bar).
3. Under **Connection string → Transaction pooler**, copy the URI. It looks like:
   ```
   postgresql://postgres.fgtwmadcqvllemftuxbn:[YOUR-PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:6543/postgres
   ```
   - Replace `[YOUR-PASSWORD]` with your database password (set when the project was created; you can reset it in **Settings → Database** if you don't have it).
   - **Append** `?pgbouncer=true&schema=instaview` to the end.

   Final value (this is your `DATABASE_URL`):
   ```
   postgresql://postgres.fgtwmadcqvllemftuxbn:YOURPASSWORD@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=instaview
   ```

> Keep the host exactly as the dashboard shows it (it may be `aws-0` or `aws-1`, and the region matches the project).

---

## Step 2 — Deploy to Vercel

### Option A — Vercel CLI (fastest)
```bash
npm i -g vercel
cd "/Users/pietrobaudin/Downloads/insta view"
vercel link          # log in + create the project (accept defaults)
```
Then add the environment variables (Production). Paste each value when prompted:
```bash
vercel env add DATABASE_URL production
vercel env add APP_SECRET production
vercel env add CRON_SECRET production
vercel env add INSTAGRAM_PROVIDER production   # value: mock
vercel env add AUTH_MODE production            # value: dev
```
Deploy:
```bash
vercel --prod
```

### Option B — GitHub + Vercel dashboard
1. Create an empty GitHub repo, then:
   ```bash
   cd "/Users/pietrobaudin/Downloads/insta view"
   git remote add origin git@github.com:<you>/instaview.git
   git push -u origin main
   ```
2. Go to https://vercel.com/new, import the repo.
3. Before the first deploy, add the env vars (below) under **Environment Variables**.
4. Click **Deploy**.

---

## Environment variables (copy/paste)

| Key | Value |
| --- | --- |
| `DATABASE_URL` | *(from Step 1)* |
| `APP_SECRET` | `a9108b14126b976e3282865e79549b56a3435112da5969bf` |
| `CRON_SECRET` | `cfc148dabb9eea3944e8d7c4a6f1241c1dfd132982d10059` |
| `INSTAGRAM_PROVIDER` | `mock` |
| `AUTH_MODE` | `dev` |

> `CRON_SECRET` lets Vercel Cron call `/api/cron`. Vercel sends it as `Authorization: Bearer …` automatically.
> Everything else has safe defaults. Add `HIKERAPI_KEY` + set `INSTAGRAM_PROVIDER=hikerapi` later to switch to real data.

---

## Step 3 (optional) — Seed demo history so the dashboard is alive immediately

The mock generates followers over real time, so a brand-new deploy starts empty until collections accumulate. To preload ~7 days of history, run the seed **once** against the production DB from your machine:

```bash
cd "/Users/pietrobaudin/Downloads/insta view"
# Use the SESSION pooler URI (port 5432) from Supabase Connect, with the schema param:
DATABASE_URL="postgresql://postgres.fgtwmadcqvllemftuxbn:YOURPASSWORD@aws-0-ca-central-1.pooler.supabase.com:5432/postgres?schema=instaview" npm run db:seed
```
This creates the demo user with `@nasa` and `@natgeo` already populated. Open the deployed site and they'll be on `/dashboard`.

---

## Notes

- **Migrations are already applied** (via the Supabase tooling), so no `prisma migrate` is needed to deploy. The build only runs `prisma generate && next build`.
- **Cron on Vercel Hobby** runs at most once/day regardless of the schedule in `vercel.json`. The **Refresh now** button and `curl -X POST <url>/api/cron -H "Authorization: Bearer $CRON_SECRET"` work anytime. Upgrade to Pro for the hourly schedule.
- **Auth**: `AUTH_MODE=dev` uses a shared demo session — fine to preview the product, but wire Supabase Auth (README §Auth) before real users.
- **Data source**: still `mock`. The product's follower-list feature is provider-dependent (README §data-source reality).
