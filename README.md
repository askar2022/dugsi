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

Sign-in uses Supabase Auth. The signed JWT carries `tenant_id` and `role` in `app_metadata`. Supabase Row Level Security policies in `supabase/migrations` use those claims so a dugsi can read and write only its own records. Teachers only see their class. Parents only see their children. School data APIs use the signed-in Supabase client so RLS applies.

The service-role key stays on the server. It is used only to register a school, create a login, log email, or list schools for the platform operator. Never prefix it with `NEXT_PUBLIC_`.

Register another dugsi at `/register`. The school code is unique across the platform.

## Environments

| Environment | URL | Supabase project |
| --- | --- | --- |
| development | `http://localhost:3000` | `npx supabase start`, or staging |
| staging | `https://staging.ourdugsi.com` | [wploiyfewcygrucoysdb](https://wploiyfewcygrucoysdb.supabase.co) |
| production | `https://ourdugsi.com` | [trcfknfctcdvnqmzessq](https://trcfknfctcdvnqmzessq.supabase.co) |

Never point staging at the production Supabase project. Production and Preview each have their own URL, anon key, and service role key.

`GET /api/health` returns the current `APP_ENV`.

## Database migrations

Schema and RLS live in `supabase/migrations`. Apply them with the Supabase CLI, not during the Vercel build.

```bash
# Staging first
npx supabase link --project-ref wploiyfewcygrucoysdb
npx supabase db push

# Production after staging looks right
npx supabase link --project-ref trcfknfctcdvnqmzessq
npx supabase db push
```

`config.toml` lists both remotes: `[remotes.staging]` and `[remotes.production]`.

## Local setup

```bash
npm install
npx supabase start
# copy the local API URL, anon key, and service role key into .env
npm run dev
```

Or copy `.env.staging.example` to `.env` and use the staging Supabase keys.

Demo accounts exist on **staging only**. Password: `Dugsi123!`

| School code | Role | Email |
| --- | --- | --- |
| `noor` | Admin | `admin@noor.dugsi` |
| `noor` | Teacher | `teacher@noor.dugsi` |
| `noor` | Parent | `parent@noor.dugsi` |
| `huda` | Admin | `admin@huda.dugsi` |
| `platform` | Platform | `platform@dugsi.app` |

Seed staging after migrations:

```bash
# uses staging keys; refuses the production project
npm run db:seed:staging
```

## Vercel + ourdugsi.com

Vercel hosts the Next.js app. It does not run database migrations.

1. Production: `master` → `ourdugsi.com` / `www.ourdugsi.com` → production Supabase.
2. Preview: `staging` branch → `staging.ourdugsi.com` → staging Supabase.
3. Assign `staging.ourdugsi.com` to Preview, not Production.
4. Add environment variables on the matching environment only. Do not set a variable on **All Environments**.

### Production (`ourdugsi.com`)

Scope every variable to **Production**. Values come from `trcfknfctcdvnqmzessq`.

| Name | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_URL` | `https://ourdugsi.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://trcfknfctcdvnqmzessq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API service role key (server only) |
| `MOBILE_ORIGIN` | `https://ourdugsi.com` |

### Staging (`staging.ourdugsi.com`)

Scope every variable to **Preview**. Values come from `wploiyfewcygrucoysdb`.

| Name | Value |
| --- | --- |
| `APP_ENV` | `staging` |
| `APP_URL` | `https://staging.ourdugsi.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wploiyfewcygrucoysdb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role key (server only) |
| `MOBILE_ORIGIN` | `https://staging.ourdugsi.com` |

Copy keys from each Supabase project: **Project Settings → API**.

### Domain DNS

| Host | Type | Value |
| --- | --- | --- |
| `@` | A | `216.150.1.1` |
| `www` | A | `216.150.1.1` |
| `staging` | A | `216.150.1.1` |

## Mobile

The Expo app in `mobile/` uses the same `/api` routes. Parents, teachers, and the office can sign in. Parents are the main users.

```bash
cd mobile
npm install
npx expo start
```

Install Expo Go on iPhone or Android, then scan the QR code. Sign in with the school code, parent email, and password.

The app talks to `https://ourdugsi.com` unless you set `EXPO_PUBLIC_API_URL`.

To put Parent on the App Store and Google Play later:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform all --profile production
```

That needs an Apple Developer account and a Google Play Developer account.
