# Dugsi

Multi-tenant platform for weekend and full-time dugsis. Each school registers with its own name and school code. Administrators, teachers, and parents use separate portals. Web and mobile talk to the same backend.

Live domain: [ourdugsi.com](https://ourdugsi.com)  
GitHub: [askar2022/dugsi](https://github.com/askar2022/dugsi)

This app records enrollment, attendance, Quran progress, tuition status, and expenses. It does not take payments.

## Portals

- **Dugsi Management** (`/admin`): enrollment, teachers, classes, staff onboarding, tuition records, expenses, reports
- **Teacher Portal** (`/teacher`): class roster, attendance, Quran progress, homework
- **Parent Portal** (`/parent`): welcome note, online enrollment, attendance, homework, child progress, tuition colors

Tuition colors: green = paid, yellow = due, red = late.

## Tenant isolation

Every school row is stored with a `tenantId`. API routes read the signed session, then query only that tenant. Clients cannot choose another school’s data by sending a tenant id. Teachers only see their class. Parents only see their children.

Register another dugsi at `/register`. The school code is unique across the platform.

## Environments

| Environment | URL | Database |
| --- | --- | --- |
| development | `http://localhost:3000` | Local Docker Postgres |
| staging | `https://staging.ourdugsi.com` | [wploiyfewcygrucoysdb](https://wploiyfewcygrucoysdb.supabase.co) |
| production | `https://ourdugsi.com` | [trcfknfctcdvnqmzessq](https://trcfknfctcdvnqmzessq.supabase.co) |

Never point staging at the production Supabase project. Use a different `AUTH_SECRET` in each environment.

`GET /api/health` returns the current `APP_ENV`.

## Local setup

```bash
docker compose up -d
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Or point `.env` at the staging Supabase URIs from `.env.staging.example`.

Demo password for every seeded account: `Dugsi123!`

| School code | Role | Email |
| --- | --- | --- |
| `noor` | Admin | `admin@noor.dugsi` |
| `noor` | Teacher | `teacher@noor.dugsi` |
| `noor` | Parent | `parent@noor.dugsi` |
| `huda` | Admin | `admin@huda.dugsi` |
| `platform` | Platform | `platform@dugsi.app` |

## Vercel + ourdugsi.com

Import [askar2022/dugsi](https://github.com/askar2022/dugsi) into Vercel. Then set environment variables **separately** for Production and Preview (staging).

### Production (`ourdugsi.com`)

| Name | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_URL` | `https://ourdugsi.com` |
| `DATABASE_URL` | Transaction pooler URI from `trcfknfctcdvnqmzessq` |
| `DIRECT_URL` | Direct URI from `trcfknfctcdvnqmzessq` |
| `AUTH_SECRET` | Long random string |
| `MOBILE_ORIGIN` | `https://ourdugsi.com` |

### Staging (`staging.ourdugsi.com`)

Set these on the **Preview** environment, or a `staging` branch:

| Name | Value |
| --- | --- |
| `APP_ENV` | `staging` |
| `APP_URL` | `https://staging.ourdugsi.com` |
| `DATABASE_URL` | Transaction pooler URI from `wploiyfewcygrucoysdb` |
| `DIRECT_URL` | Direct URI from `wploiyfewcygrucoysdb` |
| `AUTH_SECRET` | A different long random string |
| `MOBILE_ORIGIN` | `https://staging.ourdugsi.com` |

Copy the URIs from each Supabase project: **Project Settings → Database → Connect**. Use the pooler (port 6543) for `DATABASE_URL` and add `?pgbouncer=true`. Use the direct connection (port 5432) for `DIRECT_URL`.

### Domain DNS

In the `ourdugsi.com` DNS host, point Vercel:

| Host | Type | Value |
| --- | --- | --- |
| `@` | A | `10.0.1.2` (or the A record Vercel shows) |
| `www` | CNAME | `cname.vercel-dns.com` |
| `staging` | CNAME | `cname.vercel-dns.com` |

Then add `ourdugsi.com`, `www.ourdugsi.com`, and `staging.ourdugsi.com` in the Vercel project domains.

After the first successful deploy, seed only staging unless you want demo schools in production:

```bash
# against staging
npx prisma db seed
```

## Mobile

The Expo app in `mobile/` uses the same `/api` routes.

```bash
cd mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to `https://staging.ourdugsi.com` or `https://ourdugsi.com`.
