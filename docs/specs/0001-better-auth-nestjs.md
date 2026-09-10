# 0001. Adopt Better Auth for NestJS session authentication

**Date**: 2026-09-10
**Status**: Proposed

## Summary

This decision adopts Better Auth as the authentication system for the NestJS backend and keeps Prisma as the source of truth for user and session records. The project already runs NestJS 12 and Prisma, so the integration should follow the official NestJS adapter pattern instead of building a custom session system or a second auth layer.

The plan is to use the Better Auth Prisma adapter, run the generated schema migration, and register the NestJS AuthModule with a global guard that protects routes by default. That keeps the app aligned with the project stack and gives a simpler, safer path for session management and future OAuth or email based sign in flows.

## Context

The project is a NestJS backend with a Prisma Postgres database and Arcjet security controls already wired into the application. The codebase does not yet include an identity system, and the current auth work is effectively an open design decision rather than a migration from existing users. This means the team needs a single, clear security foundation before any user facing auth flows or protected endpoints are added.

The main design force is keeping the stack simple and operationally safe. The project already uses NestJS, Prisma, and environment based config, so the best fit is a proven auth library that plugs into that model instead of a custom JWT implementation. Better Auth is a strong match because it supports Prisma, email and password sign in, OAuth, session handling, and the NestJS integration pattern described in the official NestJS guide.

The cost of making the wrong choice here is high. A custom auth implementation would create session, cookie, CSRF, and refresh logic that is easy to get wrong. A second auth system would split responsibilities and create duplicate user records, session rules, and security work. The decision to standardize on Better Auth is therefore a foundation decision for the backend and should shape how the app handles protected routes going forward.

## Requirements

**User stories**:
- As a backend developer, I want a standard auth layer that fits the NestJS and Prisma stack so that the app can authenticate users safely without custom session code.
- As an application owner, I want route protection and session access built into the framework so that public and private endpoints are clearly separated.
- As a future feature team, I want a path for email and OAuth sign in so that we can add auth flows without rewriting the core security model.

**Acceptance criteria**:
- **AC-1**: The backend exposes a Better Auth instance configured for the NestJS app and loads secrets from environment variables.
- **AC-2**: Better Auth and Prisma are integrated through the supported adapter pattern, and the generated auth schema is applied to the existing Prisma database.
- **AC-3**: NestJS runs with a global auth guard and body parser disabled so that Better Auth can handle raw auth requests correctly.
- **AC-4**: Protected routes use the framework session object and public routes are explicitly marked when needed.
- **AC-5**: The project has a clear path for adding email password or social sign in without replacing the chosen auth foundation.
- **AC-6**: The app rejects missing or invalid auth configuration during startup instead of running in an insecure partially configured state.

## Options considered

### Option 1: Build a custom auth layer with NestJS guards and JWT sessions

This option would create a custom session model using Prisma tables and a JWT or cookie based auth flow inside the app. It gives the team full control over the implementation and keeps the enterprise pattern under one codebase.

**Pros**:
- Full control over auth behavior and payloads
- No external dependency beyond the app stack

**Cons**:
- High security risk because refresh tokens, CSRF, rotation, and session expiration need to be built and tested carefully
- More operational burden for future OAuth, password reset, and verification flows
- Slower to ship than a proven auth library

### Option 2: Use Better Auth with the NestJS integration and Prisma adapter

This option uses the supported NestJS integration, configures Better Auth as the app authentication layer, and stores auth records in Prisma via the official adapter. It matches the current stack and uses a system designed for user sessions, account linking, and auth flows.

**Pros**:
- Fits the existing NestJS and Prisma stack with minimal extra infrastructure
- Strong support for sessions, email password, and OAuth flows
- Better Auth handles the tricky parts of auth and gives a clear framework for future growth

**Cons**:
- Adds another library to the app and requires the team to learn its conventions
- Future custom behavior may need custom hooks or configuration work
- The project must maintain Prisma schema generation and migration consistency

### Option 3: Use a hosted auth provider such as Auth.js or an external identity service

This option moves authentication to a managed or hosted service and keeps the app focused on business logic. It is attractive for teams that want to outsource the auth system quickly.

**Pros**:
- Fast path to a production ready auth system
- Lower internal maintenance on the auth surface itself

**Cons**:
- Adds vendor coupling and platform risk
- The app still needs a clear integration model for sessions and access control
- More expensive and less flexible than a library that already lives in the project stack

## Decision

**Chosen option**: Option 2: Use Better Auth with the NestJS integration and Prisma adapter.

This is the recommended path because the project already runs NestJS and Prisma, and the Better Auth docs specifically support the NestJS integration pattern. The integration is simple, fits the current stack, and gives the app a secure baseline for session based access without reinventing auth.

**Implementation skills**: better-auth-best-practices (local project, .agents/skills/better-auth-best-practices/) · better-auth-best-practices (local project, .agents/skills/better-auth-best-practices/)

## Rationale

The project context strongly favors a library that matches the existing framework and database model. NestJS 12 with Prisma is already in place, and the NestJS Better Auth guide confirms the intended pattern: disable the built in body parser, register AuthModule in the app module, and protect routes with framework decorators and a global guard. That pattern is simpler and safer than a custom auth flow built from scratch.

The primary reason to prefer Better Auth over a custom layer is operational safety. Session management, refresh logic, cookies, CSRF protections, and email or OAuth flows are all easy to get subtly wrong. Better Auth has a documented integration path and an established adapter model, so the team gets the hard parts handled without creating a bespoke security system that would need deep review at 2am.

A hosted auth provider might be viable later, but it is not the strongest fit for the current project because the app already owns the backend, database, and deployment boundary. The current best move is to use a proven library in the existing stack, then add any OAuth or password based features on top of that decision. This keeps the architecture boring, maintainable, and easier to extend.

## Feature design

**Data model sketch**:
- User: id, email, emailVerified, name, image, createdAt, updatedAt
- Session: id, userId, token, expiresAt, ipAddress, userAgent, createdAt, updatedAt
- Account: id, userId, accountId, providerId, accessToken, refreshToken, expiresAt, createdAt, updatedAt
- Verification: id, identifier, value, expiresAt, createdAt, updatedAt
- Relationships: one user has many sessions, one user has many accounts, and one user may have many verification records
- Constraints: user email should be unique, session token should be unique, account provider relationships should be unique per user and provider

**State transitions**:
- User: pending verification → active → locked or deleted as policy evolves
- Session: active → expired → revoked
- Account: linked → refreshed → disconnected only when explicitly removed

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/auth/ok | GET | none | status: ok | public | 500 if config invalid |
| /api/auth/sign-up/email | POST | email, password, name | user record, session | public | 400 invalid input, 409 duplicate user |
| /api/auth/sign-in/email | POST | email, password | session, user | public | 401 invalid credentials |
| /api/auth/sign-out | POST | session cookie | success status | authenticated | 401 missing session |
| /api/auth/session | GET | session cookie | active session data | authenticated | 401 expired or missing session |
| /api/auth/* | all auth routes | provider payloads | auth responses | varies by flow | 400, 401, 409, 422 |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| health check | auth service status | configured Better Auth instance |
| sign up | user id and session | Better Auth Prisma adapter result |
| sign in | active session and user metadata | Better Auth session lookup and cookie state |
| route access | authenticated user context | session object from Better Auth guard |
| session read | user identity and session expiry | Prisma session row and signed cookie |
| OAuth callback | linked account and user record | configured provider callback data and adapter write |

**Key invariants**:
- Every user facing route must resolve an authenticated session before access is granted for protected endpoints.
- Session expiry and refresh behavior must be managed by Better Auth rather than in custom middleware.
- Secrets must come from environment variables and never be stored in the codebase or database.
- Only approved auth routes are public; default protection is enforced by the global guard.

**Security model**:
- Public routes are only for auth entry points and health checks.
- Authenticated routes require a valid session from Better Auth with default NestJS protection.
- Account linking and email based sign in remain behind the auth service boundaries and are governed by auth rules rather than ad hoc route checks.
- No compliance scope is required for this initial auth foundation, but the app should treat user identity data as sensitive and keep a clear audit trail for access changes as features evolve.

**Configuration required**:
- `BETTER_AUTH_SECRET`: secret used by Better Auth to sign and secure session data.
- `BETTER_AUTH_URL`: public base URL for the backend, used to generate correct auth callbacks and redirects.
- `DATABASE_URL`: existing Prisma Postgres connection string already in the project config.
- `AUTH_GOOGLE_CLIENT_ID`: only when Google OAuth is added later.
- `AUTH_GOOGLE_CLIENT_SECRET`: only when Google OAuth is added later.

## Build plan

1. Install the Better Auth NestJS integration and Better Auth dependency, and confirm the app uses the supported package pattern, satisfies **AC-1** and **AC-6**.
2. Add the Better Auth configuration module and Prisma adapter, generate the auth schema, and apply the migration to the database, satisfies **AC-1**, **AC-2**.
3. Register the Better Auth module in the root app and disable the NestJS body parser so auth requests are handled correctly, satisfies **AC-3**.
4. Add a protected route pattern and a public route example to confirm session based access and route defaults, satisfies **AC-4**.
5. Add a health route and sign in flow wiring examples, then validate env configuration and failure behavior, satisfies **AC-1**, **AC-4**, **AC-5**.
6. Confirm that the app fails fast when required auth configuration is missing and document the next OAuth or email extension steps, satisfies **AC-5**, **AC-6**.

## Consequences

**Positive**:
- The auth layer is aligned with the current NestJS and Prisma architecture.
- The app gets a safer and faster path to email, session, and OAuth auth flows.
- Route protection becomes a predictable framework behavior instead of a custom ad hoc pattern.

**Negative / tradeoffs**:
- The project adds a new auth library and must maintain the auth schema generation process.
- The team will need to learn Better Auth configuration and hook points before customizing behavior.
- Some endpoints may need additional access checks beyond the default global guard as business rules evolve.

**Neutral**:
- The Prisma schema will expand with auth related tables and generated models.
- Configuration must be managed through environment variables and deployment secrets.
- A future OAuth setup adds new provider credentials and callback configuration work.

## Follow-up

- [ ] Add the generated auth schema to the Prisma migration workflow before the first production deployment.
- [ ] Decide whether the first production auth flow is email and password, Google OAuth, or both.
- [ ] Add a dedicated auth module under the app structure once the first protected feature is implemented.

## References

**Project sources**:
- AGENTS.md in the repo root
- src/app.module.ts and src/main.ts for current NestJS bootstrapping
- prisma/schema.prisma for the current Prisma setup

**Practices & standards**:
- NestJS first architecture pattern
- Prisma as the source of truth for persisted auth records
- Global route protection with explicit public exceptions
- Environment variable based secret management

**Links**:
- Better Auth NestJS integration guide: https://better-auth.com/llms.txt/docs/integrations/nestjs.md
- Better Auth docs: https://better-auth.com/docs
