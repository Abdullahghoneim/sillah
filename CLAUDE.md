# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent pnpm workspaces, no root package.json — work inside `backend/` or `mobile/`.

- `backend/` — Fastify + Prisma + Better Auth API server (Node, TypeScript)
- `mobile/` — Expo Router app (React Native 0.81, React 19, TypeScript)

The mobile app talks to the backend over HTTP via the URL hardcoded in `mobile/lib/auth-client.ts` (`API_BASE_URL`). When running on a physical device, this must be the host machine's LAN IP, not `localhost` — update it before running.

## Commands

### Backend (`cd backend`)

```bash
pnpm install
pnpm prisma:generate              # regenerate Prisma client after schema changes
pnpm prisma:migrate               # create/apply migration in dev
pnpm dev                          # tsx watch on src/index.ts (port 3000)
pnpm build && pnpm start          # compile to dist/ and run
pnpm test                         # Playwright API tests (tests/auth.spec.ts)
pnpm exec playwright test -g "duplicate email"   # run one test by name
pnpm auth:generate                # regenerate Better Auth schema after auth config changes
```

Tests assume **the backend is already running on :3000** and **Mailpit is reachable on :8025** (OTPs are scraped out of Mailpit's HTTP API). The Playwright config is non-parallel and has no webServer — start both services manually before `pnpm test`.

### Mobile (`cd mobile`)

```bash
pnpm install
pnpm start                        # expo start (Metro)
pnpm ios | pnpm android | pnpm web
pnpm lint                         # expo lint
pnpm test                         # jest (jest-expo preset)
pnpm test -- tests/login.test.tsx # run a single test file
```

## Architecture

### Auth flow (the central feature)

Auth is OTP-only — there is no password path. Better Auth owns sessions and OTP delivery; a thin custom layer adds registration and a richer `/users/me`.

1. **Register** — `POST /api/auth/register` (custom, in `backend/src/modules/auth/auth.routes.ts`) creates an unverified `User` row with `emailVerified: false` and default `role: 'STUDENT'`. It does **not** send the OTP — the client does that next.
2. **Send OTP** — client calls Better Auth's `POST /api/auth/email-otp/send-verification-otp` with `type: 'sign-in'`. The `emailOTP` plugin runs `sendOtpEmail` (`backend/src/lib/mailer.ts`) over SMTP (Mailpit in dev).
3. **Verify** — `POST /api/auth/sign-in/email-otp` returns a Better Auth session cookie. The same endpoint serves both first-time signup verification and returning-user login (mode is just a UI distinction in `mobile/app/verify.tsx`).
4. **Role select** (signup only) — `PATCH /api/users/me` with `{role: 'TEACHER' | 'STUDENT' | 'PARENT'}`. The mobile client must forward the Better Auth cookie manually via `authClient.getCookie()` because it bypasses the Better Auth client (see `mobile/app/select-role.tsx`).
5. **Tabs home** — `router.replace('/(tabs)')`.

Important Better Auth wiring decisions:

- `emailOTP({ disableSignUp: true })` — Better Auth will not create users on its own. Account creation goes through our `/api/auth/register` route so we can require `acceptTerms` and seed `role`/`phone`.
- Unknown-email OTP requests return 200 but deliver nothing (anti-enumeration). The `auth.spec.ts` test "login OTP for unknown email is silently dropped" pins this contract.
- `User.emailVerified` is set by Better Auth on first successful OTP sign-in — do not set it manually in `/api/auth/register`.
- The Fastify catch-all at `/api/auth/*` (in `backend/src/app.ts`) bridges Node `IncomingMessage` → Web `Request` because Better Auth speaks the Fetch API. JSON bodies are re-stringified into `Request.body`.

### Backend module shape

- `src/index.ts` — entry, calls `buildApp()` then `listen()`.
- `src/app.ts` — Fastify factory: helmet, CORS (credentials enabled), Better Auth catch-all, custom routes under `/api`, ZodError → 400 mapping.
- `src/config/env.ts` — Zod-validated env (parsed once at import). Adding a new env var requires updating both the schema here and `.env.example`.
- `src/lib/auth.ts` — single `betterAuth(...)` instance. Adding fields to `User` means: (1) edit `additionalFields` here, (2) edit `prisma/schema.prisma`, (3) `pnpm prisma:migrate`, (4) re-run `pnpm auth:generate` if Better Auth's expected schema drifts.
- `src/lib/prisma.ts` — exports the singleton `PrismaClient`.
- `src/modules/<feature>/` — feature folders with `*.routes.ts` (Fastify plugin) and `*.schemas.ts` (Zod). Add new modules by registering them in `app.ts` with the `/api` prefix. The auth module's `userPublicSelect` is the canonical shape returned to clients (don't leak Prisma defaults).

### Mobile module shape

File-based routing via `expo-router`. The route tree in `mobile/app/_layout.tsx` declares `login`, `register`, `verify`, `select-role`, and the `(tabs)` group, all with `headerShown: false` (the AuthLayout draws its own back button). `unstable_settings.anchor = 'login'` makes login the deep-link fallback.

- `app/login.tsx`, `register.tsx`, `verify.tsx`, `select-role.tsx` — the auth flow screens. Each uses `<AuthLayout>` from `components/auth-layout.tsx` for the shared mascot+leaf+title chrome.
- `lib/auth-client.ts` — Better Auth client configured with `expoClient` (uses `expo-secure-store` for cookie persistence; `scheme: 'sillah'` matches `app.json`). Also exports `registerUser()` for the custom `/api/auth/register` call.
- `lib/validation.ts` — pure validators (`validateEmail`, `validateName`, `validatePhone`, `validateOtp`) and `friendlyAuthError()` which maps Better Auth/network errors to user-facing copy. **Keep these pure** — they are unit-tested in `tests/validation.test.ts` without React.
- Path alias `@/*` resolves to the `mobile/` directory (in both `tsconfig.json` and `jest.config.js`).
- App is **landscape-locked** (`orientation: 'landscape'` in `app.json`) and uses Reanimated + React Compiler (the `reactCompiler` experiment is on).

### Mobile tests

`jest-expo` preset with custom `transformIgnorePatterns` for Expo, React Navigation, `react-native-svg`, and `better-auth` (and their pnpm-mangled paths). SVG imports are mocked via `tests/mocks/svg-mock.tsx`. `tests/jest-setup.ts` is the entry point for global mocks. Tests live in `mobile/tests/` (one `.test.tsx` per screen plus `validation.test.ts`).

## Conventions worth knowing

- **pnpm only** — both packages have `pnpm-lock.yaml`; do not introduce `npm`/`yarn` lockfiles.
- **Roles** are a string union `'STUDENT' | 'TEACHER' | 'PARENT'`. The source of truth is `ROLES` in `backend/src/modules/auth/auth.schemas.ts` and the matching set in `mobile/app/select-role.tsx` (currently only TEACHER/STUDENT exposed in UI). Keep them in sync when adding a role.
- **Phone validation regex** is duplicated between `backend/src/modules/auth/auth.schemas.ts` and `mobile/lib/validation.ts` — change both together.
- **No password auth.** `emailAndPassword: { enabled: false }` is intentional. Don't add password fields without removing this guard.
- The Better Auth Prisma models (`user`, `session`, `account`, `verification`) are mapped via `@@map` to lowercase table names — Prisma model names are PascalCase but the actual tables are `user`, `session`, etc.
