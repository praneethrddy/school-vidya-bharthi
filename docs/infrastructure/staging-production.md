# Staging and Production Infrastructure

This repo is prepared for a two-environment Railway deployment:

- `develop` -> staging service -> `https://staging.<your-domain>`
- `main` -> production service -> `https://<your-domain>` and wildcard subdomains under `*.your-domain`

## 1. Provision managed services

### Neon PostgreSQL

Create one Neon project with two branches:

- `main` for production
- `staging` for staging

Run migrations and seed data against staging first, then production:

```bash
DATABASE_URL="<staging-database-url>" DIRECT_URL="<staging-direct-url>" npx prisma migrate deploy
DATABASE_URL="<staging-database-url>" DIRECT_URL="<staging-direct-url>" npx prisma db seed

DATABASE_URL="<production-database-url>" DIRECT_URL="<production-direct-url>" npx prisma migrate deploy
DATABASE_URL="<production-database-url>" DIRECT_URL="<production-direct-url>" npx prisma db seed
```

Use `prisma migrate deploy`, never `prisma migrate dev`, outside local development.

### Upstash Redis

Create one Redis database for each environment or one shared database with different prefixes.

The runtime now supports a real Redis URL through `REDIS_URL`. Railway can inject this directly.

### Cloudflare R2

Create an R2 bucket and collect:

- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID` or the full `R2_ENDPOINT`
- `R2_PUBLIC_URL` if files should be publicly accessible without signed URLs

The shared `src/lib/r2.ts` helper is no longer mock-only, so uploads for receipts, school profile assets, and admissions documents now depend on real R2 credentials in deployed environments.

## 2. Create Railway services

Create one Railway project with two services:

- `school-app-staging`
  - branch: `develop`
  - domain: `staging.<your-domain>`
- `school-app-prod`
  - branch: `main`
  - domains: `<your-domain>`, `www.<your-domain>`, `*.<your-domain>`

Railway handles wildcard TLS for the app when the wildcard DNS record is left as DNS-only in Cloudflare.

## 3. Cloudflare DNS

Use these records:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| `A` | `@` | Railway apex target/IP | Proxied |
| `CNAME` | `www` | Railway production hostname | Proxied |
| `CNAME` | `*` | Railway production hostname | DNS only |
| `CNAME` | `staging` | Railway staging hostname | DNS only |

Critical: the wildcard `*` record must stay `DNS only` on Cloudflare free tier, or tenant subdomain SSL will break.

Recommended Cloudflare SSL/TLS settings:

- SSL mode: `Full (Strict)`
- Always Use HTTPS: `On`
- Minimum TLS Version: `1.2`
- Automatic HTTPS Rewrites: `On`

## 4. Railway environment variables

Use [railway.env.example](/C:/Users/prane/Desktop/learing/school-website/school-vidya-bharathi/docs/infrastructure/railway.env.example) as the template for both environments.

Environment-specific values to change:

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL`
- `NEXTAUTH_URL`
- `AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `PUBLIC_DEFAULT_SCHOOL_SLUG`

Secrets checklist:

- `NEXTAUTH_SECRET` and `AUTH_SECRET` should be the same strong random value
- `FIELD_ENCRYPTION_KEY` must use the `k1.aesgcm256.<base64>` format
- no secret should use a `NEXT_PUBLIC_` prefix

## 5. CI and deploy flow

GitHub Actions now verifies `develop` and `main` with:

- `npm ci`
- `npx prisma generate`
- `npx vitest run`
- `npm run build`

Railway should be configured to auto-deploy only after CI passes.

## 6. Health checks and smoke test

The app now exposes `GET /api/health`, which checks:

- PostgreSQL connectivity
- Redis connectivity

Expected healthy response:

```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

After each staging or production deploy:

1. Open `https://<env-domain>/api/health`
2. Open `https://<env-domain>/login`
3. Sign in with the seeded principal account
4. Confirm dashboard navigation works

You can automate the first two checks with [smoke-deploy.ps1](/C:/Users/prane/Desktop/learing/school-website/school-vidya-bharathi/scripts/smoke-deploy.ps1).
