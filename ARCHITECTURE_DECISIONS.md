# SCSIT LabOS — Architecture Decision Records (ADRs)

This file documents the key architectural decisions made during the design, refactoring, and hardening of **SCSIT LabOS**.

---

## ADR 001: Next.js Server Actions Authorization Wrapper (`withAuth`)

### Context
Next.js server actions are exposed as POST endpoints by default. Any client can invoke them programmatically. The original actions executed database writes without verifying user identity, representing a severe privilege escalation vulnerability.

### Decision
Implement a unified server-side authentication and authorization decorator function `withAuth(requiredRoles, action)` inside `src/core/auth/middleware.ts`.
- Validates the user's secure HTTP-only session cookie.
- Rejects unauthenticated calls with generic service errors.
- Validates that the active user's designation matches authorized roles for the requested task.

### Consequences
All state-modifying server actions must be wrapped inside `withAuth` to pass production security audits.

---

## ADR 002: Repository-Service Design Pattern

### Context
Mixing raw Prisma database queries with React UI rendering leads to monolithic component files (such as `LmsPanels.tsx` which exceeded 5,400 lines) and compromises modular testing.

### Decision
Decouple logic into discrete layers:
1. **Repository Layer:** Isolates database queries and operations (e.g. `ComputerRepository`).
2. **Service Layer:** Manages validation, checklists validations, hardware timelines, and transactional rollbacks (e.g. `LifecycleService`).
3. **UI Component Layer:** Consumes services and renders UI states using client hooks.

### Consequences
Enforces separation of concerns, improves compile times, and enables isolated unit testing of business logic.

---

## ADR 003: JWT Sessions with Secure HTTP-Only Cookies

### Context
Session variables were previously stored in client-side `localStorage`, allowing trivial authentication bypasses through local storage overrides.

### Decision
Store session details in an encrypted, cryptographically signed JSON Web Token (JWT) injected into an HTTP-only secure cookie named `suas_session`.
- Signed using SHA-256 HMAC timing-safe verify tokens.
- Secure settings: `httpOnly: true`, `sameSite: "strict"`, `secure: true` (in production).
- Validated server-side via Next.js Middleware redirects.

### Consequences
Resolves the client-side session hijack loophole. Unauthorized requests are blocked at the router level.

---

## ADR 004: Next.js Middleware Node.js Runtime Configuration

### Context
Standard Next.js middleware runs on Edge Runtime, which has limited support for Node's native `"crypto"` module (such as `timingSafeEqual`).

### Decision
Configure the middleware script `src/middleware.ts` to run on the standard Node.js runtime:
```typescript
export const runtime = "nodejs";
```

### Consequences
Provides full native Node compatibility for timing-safe signature checks in middleware.
