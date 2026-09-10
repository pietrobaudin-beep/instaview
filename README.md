# InstaView

**See who started following any Instagram account.**

InstaView monitors Instagram profiles over time and detects **new followers** (and, secondarily, unfollows) by taking periodic snapshots of the follower list and diffing them. It is a focused product — not a generic Instagram analytics dashboard.

---

## ⚠️ Read this first: data-source reality

The core feature — "discover who started following any profile" — **cannot be built with any official Meta/Instagram API.** This is a deliberate privacy decision by Meta, not a config or plan limitation.

| Data | Official Graph API (your own Business/Creator account) | Official (third-party account) |
| --- | --- | --- |
| Follower **count** | ✅ | ✅ via Business Discovery (business/creator only) |
| **List of follower usernames** | ❌ **never** | ❌ **never** |
| Aggregate audience demographics | ✅ (100+ followers) | ❌ |

The **only** way to obtain a follower *list* is through third-party scraping providers (HikerAPI, EnsembleData, Apify, Data365, …). Using them:

- operates in a **grey area / against Instagram's ToS** — the risk sits with the operator (you);
- costs **per request** (HikerAPI ≈ \$0.0006/req; EnsembleData \$100+/mo; Apify \$39/mo + per result);
- makes pulling the **entire** follower list of a large account expensive and slow, so the realistic technique is to read only the **head of the list** (most-recent-first) each cycle — which reliably detects **FOLLOWs** but not **UNFOLLOWs** of older accounts.

Because of this, InstaView is built around an **`InstagramDataProvider`** abstraction. Follower collection is explicitly **provider-dependent**. The repo ships with:

- **`MockProvider`** (default) — a deterministic, offline data source. The app runs 100% locally, end-to-end, with **no external account and no cost**. Follower lists grow over time so snapshot diffing genuinely detects new followers.
- **`HikerApiProvider`** — a real adapter, activated by setting `INSTAGRAM_PROVIDER=hikerapi` + `HIKERAPI_KEY`. Its endpoint paths are marked for verification against HikerAPI's live docs; **only that file changes** when a provider's API shifts.

> Everything else in the product — auth, database, snapshot/diff engine, cron jobs, dashboard, alerts scaffolding, Stripe scaffolding — is real and fully functional.

---

## Architecture

```
Next.js (App Router, TS, Tailwind, shadcn-style UI)
│
├── Landing page  →  POST /api/track  →  trackProfile()
│                                          creates TrackedProfile + MonitoringJob
│                                          runs baseline collection
│
├── Dashboard (/dashboard/[id])  →  GET /api/profiles/[id]  →  analytics queries
│
└── Cron (/api/cron, Vercel Cron every 15m)  →  runDueJobs()
                                                 └── collectProfile(profileId)
                                                       ├── getProvider()           ← InstagramDataProvider
                                                       │     ├── MockProvider
                                                       │     └── HikerApiProvider
                                                       ├── computeDiff()            ← pure snapshot diff
                                                       ├── persist Snapshot/Follower/Change
                                                       └── enqueueAlertsForChanges()
```

### The provider seam

```ts
interface InstagramDataProvider {
  getProfile(username): Promise<ProfileData>
  getFollowers(username, opts): Promise<GetFollowersResult>
  getFollowing(username, opts): Promise<GetFollowersResult>
}
```

Nothing outside `src/lib/providers/` imports a concrete adapter. Swap providers with one env var.

### Detection logic (snapshots)

```
Snapshot A: [joao, maria, pedro]
Snapshot B: [joao, maria, pedro, lucas]   → FOLLOW: lucas
Snapshot C: [joao, maria, lucas]          → UNFOLLOW: pedro (only trusted in "full" mode)
```

The first snapshot is a **baseline** (no changes recorded). See `src/lib/monitoring/diff.ts` for the UNFOLLOW-trust rules in head vs. full mode.

### Tech stack

- **Frontend/Backend:** Next.js 14 (App Router) · TypeScript · Tailwind · shadcn-style components
- **DB:** PostgreSQL · Prisma
- **Auth:** dev cookie session (swappable for Supabase Auth)
- **Payments:** Stripe (scaffold)
- **Deploy:** Vercel (+ Vercel Cron)

---

## Data model

`User` · `Organization`/`Membership` (teams) · `TrackedProfile` · `FollowerSnapshot` · `Follower` · `FollowerChange` (FOLLOW/UNFOLLOW) · `MonitoringJob` · `AlertRule`/`AlertDelivery`. Indexes are tuned for the hot query "new followers in last 24h/7d/30d" (`FollowerChange(profileId, type, detectedAt)`). Full schema: [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Run locally

### Prerequisites
- Node 18+ and npm
- Docker (for Postgres) — or your own Postgres

### 1. Install
```bash
npm install
```

### 2. Environment
```bash
cp .env.example .env
```
Defaults work out of the box with the Docker database and `INSTAGRAM_PROVIDER=mock`.

### 3. Database
```bash
docker compose up -d          # starts Postgres on :5432
npm run prisma:migrate        # create the schema (name it e.g. "init")
npm run db:seed               # optional: demo user + 7 days of history
```
No Docker? Point `DATABASE_URL` at any Postgres and run the same commands.

### 4. Dev server
```bash
npm run dev
```
Open http://localhost:3000, type any username (e.g. `nasa`), click **Track**. The demo user is auto-provisioned in dev mode. If you seeded, `nasa` and `natgeo` already have history.

### 5. Trigger a collection manually
The dashboard's **Refresh now** button runs one collection. Or hit the cron endpoint:
```bash
curl -X POST localhost:3000/api/cron -H "Authorization: Bearer dev-cron-secret-change-me"
# or the local script:
npm run cron:tick
```

---

## Switching to a real provider (HikerAPI)

1. Create an account at https://hikerapi.com (you accept their terms + Instagram ToS risk).
2. In `.env`:
   ```
   INSTAGRAM_PROVIDER=hikerapi
   HIKERAPI_KEY=sk_...
   ```
3. **Verify** the endpoint paths/response shapes in `src/lib/providers/hiker-provider.ts` against HikerAPI's current docs (they're annotated with `VERIFY`).
4. Restart. No other code changes.

To add another provider (EnsembleData, Apify, official Graph API for owned accounts…), implement `InstagramDataProvider` in a new file and register it in `src/lib/providers/index.ts`.

---

## Deploy (Vercel)

1. Push to GitHub, import into Vercel.
2. Set env vars (Project Settings → Environment Variables): `DATABASE_URL` (e.g. Supabase/Neon Postgres), `APP_SECRET`, `CRON_SECRET`, `INSTAGRAM_PROVIDER`, provider keys.
3. [`vercel.json`](vercel.json) already registers a cron hitting `/api/cron` every 15 minutes. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set.
4. Run `prisma migrate deploy` as part of the build/release.

---

## Auth: swapping in Supabase

`AUTH_MODE=dev` uses a signed cookie session (passwordless, local only). To use Supabase Auth:
1. Set `AUTH_MODE=supabase` and the `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` envs.
2. Replace the body of `getCurrentUser()` in [`src/lib/auth.ts`](src/lib/auth.ts) to read the Supabase session and upsert a matching `User` row. Every route only calls `getCurrentUser()`/`requireUser()`, so nothing else changes.
3. We never store Instagram passwords and never ask for Instagram credentials.

---

## Alerts

Schema + dispatcher are production-ready ([`src/lib/alerts/dispatcher.ts`](src/lib/alerts/dispatcher.ts)). The **webhook** channel actually POSTs; **email/Telegram/Discord** are stubs that log until you implement `send()`. Create an `AlertRule` (channel + target + trigger) and new followers fire:

> `@lucas started following @empresa`

---

## Billing (Stripe)

Plans (`FREE`/`PRO`/`AGENCY`) live in [`src/lib/plans.ts`](src/lib/plans.ts) and are **enforced now** (profile limits, collection interval, history window). Stripe is scaffolded in [`src/lib/billing/stripe.ts`](src/lib/billing/stripe.ts) + a webhook route; it activates when `STRIPE_SECRET_KEY` and price envs are set.

---

## Security & compliance

- **No Instagram passwords** are ever stored or requested.
- No mechanisms to bypass CAPTCHA, auth, rate limits, or platform protections.
- All collection goes through the `InstagramDataProvider` layer.
- Using a scraping provider is the operator's ToS/legal responsibility — see the top of this README. For a fully ToS-safe product, implement an official-Graph-API provider limited to accounts the user connects via OAuth (count + demographics only).

---

## Project layout

```
src/
  app/                     # routes (landing, dashboard, /api/*)
  components/              # UI + dashboard (client) components
  lib/
    providers/             # InstagramDataProvider + adapters  ← the seam
    monitoring/            # diff.ts, snapshot.ts (collector), runner.ts
    alerts/                # dispatcher + channels
    billing/               # stripe scaffold
    analytics.ts           # dashboard read queries
    profiles.ts            # track/stop + plan enforcement
    auth.ts  db.ts  env.ts  logger.ts  plans.ts  utils.ts
prisma/                    # schema + seed
scripts/                   # local cron tick
```

---

## What is real vs. provider-dependent

| Area | Status |
| --- | --- |
| DB, schema, migrations | ✅ real |
| Snapshot + diff engine | ✅ real |
| Cron/job scheduling | ✅ real |
| Dashboard, charts, filters | ✅ real |
| Auth (dev), plan enforcement | ✅ real |
| Alerts pipeline (webhook + console) | ✅ real |
| Email/Telegram/Discord alerts | 🟡 stubbed interface |
| Stripe checkout/webhook | 🟡 scaffold (activate with keys) |
| **Real follower-list data** | 🔴 **provider-dependent** (MockProvider by default; HikerAPI adapter ready) |
```
