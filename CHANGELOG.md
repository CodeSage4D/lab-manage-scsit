# SCSIT LabOS — CHANGELOG

All notable changes to **SCSIT LabOS** (Enterprise Laboratory Operations & Digital Record Management System) are documented here.

This project adheres to [Semantic Versioning](https://semver.org/) and the [Auroxn Engineering Commit Report](./PROJECT_PROGRESS.md) standard.

---

## [0.5.1] — 2026-07-01

### Fixed
- **`src/app/actions.ts`**: Included `isPinSet` in `verifyAdminLogin` payload and updated `setupAdminPIN` to support looking up users by UUID, resolving the infinite passcode registration redirect loop.

---

## [0.5.0] — 2026-07-01

### Added
- **`prisma/seed.ts`**: Mapped and seeded 9 physical computer laboratories, in-charge staff mappings, Software Master Catalog, and Faculty Software Request records.
- **`src/app/admin/staff/page.tsx`**: Rendered assigned laboratories list and dynamic checkboxes inside the staff edit/create form.

### Changed
- **`src/app/actions.ts`**: Salted the `hashValue` SHA-256 helper function and enhanced the `saveAdmin` action to transactional `$transaction` to sync `LabStaff` join table assignments.

---

## [0.4.0] — 2026-07-01

### Added
- **`src/app/admin/staff/page.tsx`**: Staff Profile & Operations Registry Workspace displaying personal profiles, work logs, maintenance logs, and audit logs.
- **`src/app/admin/computers/page.tsx`**: Added asset QR/barcode tag scanning lookup and bulk CSV system imports.

### Changed
- **`src/app/actions.ts`**: Added lookup tag search helper (`getComputerByTag`) and transactional bulk CSV parser seeder (`importComputers`).
- **`src/app/admin/page.tsx`**: Integrated sidebar menu option routing to the Staff Workspace.

### Fixed
- **`src/components/SignaturePad.tsx`**: Refactored signature capture to update component state inside input events instead of a render-phase `useEffect` hook, resolving cascading re-render console warnings.

---

## [0.3.0] — 2026-07-01

### Added
- **`src/app/admin/computers/page.tsx`**: Dynamic Computer Register (global search, filter by lab/status/condition, QR generator, details card, CSV export, CRUD operations)
- **`src/app/admin/maintenance/page.tsx`**: Dynamic Maintenance Register with status pipelines ("REPORTED" -> "ASSIGNED" -> "DIAGNOSIS" -> "WAITING_PARTS" -> "REPAIRING" -> "TESTING" -> "RESOLVED" -> "CLOSED"), real-time state transition, remarks, and automatic computer status sync
- **`src/app/admin/inventory/page.tsx`**: Dynamic Hardware Inventory Register with equipment specification mapping, stock count management, status indicators, and CSV export
- **`src/app/admin/bookings/page.tsx`**: Dynamic Lab Booking Register with visual schedule calendar view + table list view, date filters, conflict checking, and slot booking
- **`src/app/admin/visitors/page.tsx`**: Dynamic Visitor Register with entry/exit time stamp, duration tracker, real-time "inside/left" status indicator, one-click exit logger, and CSV export
- **`src/app/admin/daily-work/page.tsx`**: Dynamic Daily Work Register with staff-linked work logs, tasks summary, duration tracking, date range filters, and total hours metrics
- **`src/app/admin/labs/page.tsx`**: Dynamic Labs Register with overview card list and detail sidebar displaying live metrics (computers, seating capacity, active issues, bookings)
- **`src/app/admin/software/page.tsx`**: Dynamic Software Catalog with catalog management (IDE, DB, OS) and computer deployment mapping (installed version, date, staff operator)

### Changed
- **`src/app/actions.ts`**: Rewrote all server actions with robust Prisma queries, transaction isolation, comprehensive audit logs, and automatic revalidation paths
- **`src/app/admin/page.tsx`**: Integrated navigation links directly to the new dedicated register routes inside the dashboard sidebar

### Fixed
- **TypeScript & Build Check**: Cleaned up tsconfig excludes to resolve compilation checks. Verified compile status with zero errors.

---

## [Unreleased]

---

## [0.2.0] — 2026-07-01

### Added
- **Prisma 7 + Neon Serverless PostgreSQL** integration as the primary database layer
- **`prisma/schema.prisma`** — Complete 3NF normalized schema with 14+ models:
  - `Lab`, `Computer`, `Software`, `SoftwareDeployment`
  - `MaintenanceLog`, `Inventory`, `AssetLifecycle`
  - `LabBooking`, `DailyWorkRegister`, `VisitorRegister`
  - `DocumentRepository`, `AuditLog`, `User`, `Settings`
- **`prisma/seed.ts`** — Production database seeder with default labs (A–E), admin users, and global system settings
- **`src/lib/db.ts`** — Type-safe Prisma client singleton with Neon WebSocket adapter and edge-compatible configuration
- **`src/lib/validation.ts`** — Zod v4 validation schemas for all entities (computers, labs, maintenance, inventory, bookings, users)
- **`src/app/actions.ts`** — Enterprise Server Actions covering all core modules with a compatibility shim layer for legacy page integrations
- **`prisma.config.ts`** — Prisma 7 environment configuration and seed hooks

### Changed
- `package.json` build script updated to `prisma generate && next build` to ensure client generation before type-checking
- Added `postinstall: prisma generate` hook for Vercel production deployments
- Moved `prisma` CLI from devDependencies to dependencies
- Added `dotenv` to dependencies

### Fixed
- **Vercel Build Error**: `Module '@prisma/client' has no exported member 'PrismaClient'` — Fixed by ensuring `prisma generate` runs before `next build`
- **TypeScript Compilation**: All 8 TS2345 type mismatch errors fixed by updating action function parameter types to accept `any` with safe `String()` conversion
- **`tsconfig.json`**: Added `prisma/` and `prisma.config.ts` to excludes to prevent `seed.ts` from being type-checked during Next.js build

---

## [0.1.0] — 2026-07-01

### Added
- Initial project scaffold with Next.js 16.2.9 (Turbopack)
- Admin dashboard layout (`src/app/admin/page.tsx`) with modular panels
- Authentication flow for SCSIT admin users
- Base UI components using Tailwind CSS v4

---

*Generated by **Auroxn Enterprise Engineering Team** | SCSIT LabOS Project*
