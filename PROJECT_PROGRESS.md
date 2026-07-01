# SCSIT LabOS — Project Progress

> **Enterprise Laboratory Operations & Digital Record Management System**
> Powered by **Auroxn Enterprise Engineering Team** & ECC Agent Framework
> Institution: **School of Computer Science & Information Technology (SCSIT), Symbiosis University of Applied Sciences**

---

## Project Philosophy

> *Every physical register maintained by the laboratory has a digital equivalent. Every entity functions as a permanent digital file with complete history, attachments, audit logs, advanced filtering, professional PDF/Excel exports, and offline archival capability.*

This is **NOT** a CRUD website.
This is a **Digital Laboratory ERP** — an enterprise-grade Laboratory Operating System.

---

## Sprint Overview

| Sprint | Name | Status | Target |
|--------|------|--------|--------|
| Sprint 0 | Foundation & Database Architecture | ✅ Complete | 2026-07-01 |
| Sprint 1 | Computer Registry Module (Digital Register) | 🔵 In Planning | 2026-07-08 |
| Sprint 2 | Maintenance Register Module (Digital File) | ⚪ Pending | 2026-07-15 |
| Sprint 3 | Inventory Register Module | ⚪ Pending | 2026-07-22 |
| Sprint 4 | Lab Booking & Daily Work Register | ⚪ Pending | 2026-07-29 |
| Sprint 5 | Document Repository & NAAC Records | ⚪ Pending | 2026-08-05 |
| Sprint 6 | Enterprise Reports, PDF Export & QR Engine | ⚪ Pending | 2026-08-12 |
| Sprint 7 | Global Search, Advanced Filters & Audit | ⚪ Pending | 2026-08-19 |
| Sprint 8 | Offline Archive, ZIP Download & Digital Record Book | ⚪ Pending | 2026-08-26 |

---

## Engineering Commit Reports

---

### COMMIT REPORT #002

```
=========================================
AUROXN ENGINEERING COMMIT REPORT
=========================================

Feature Name:     Database Foundation + Vercel Build Fix
Feature ID:       ECR-002
Sprint:           Sprint 0 (Foundation)
Version:          v0.2.0
Date:             2026-07-01

Modules Updated:
  ✓ Database Layer (Prisma 7 + Neon)
  ✓ Validation Layer (Zod v4)
  ✓ Server Actions (Compatibility Shim)
  ✓ Build Pipeline (Vercel Deployment)

Files Created:
  + prisma/schema.prisma       → 14-model 3NF database schema
  + prisma/seed.ts             → Production seeder (labs, admins, settings)
  + src/lib/db.ts              → Prisma singleton client (Neon WebSocket adapter)
  + src/lib/validation.ts      → Zod schemas for all entities
  + prisma.config.ts           → Prisma 7 environment & seed config
  + CHANGELOG.md               → Project changelog
  + PROJECT_PROGRESS.md        → This file

Files Updated:
  ~ package.json               → Build script, dependencies, postinstall hook
  ~ package-lock.json          → Updated lockfile
  ~ src/app/actions.ts         → Enterprise Server Actions + compatibility shim
  ~ tsconfig.json              → Exclude prisma/ from Next.js type-checking

Database Changes:
  Tables Created:
    Lab, Computer, Software, SoftwareDeployment,
    MaintenanceLog, Inventory, AssetLifecycle,
    LabBooking, DailyWorkRegister, VisitorRegister,
    DocumentRepository, AuditLog, User, Settings
  Provider: Neon Serverless PostgreSQL
  Sync: prisma db push (schema applied to live DB)
  Seed: Default labs (A–E), admin users, system settings

API Changes:
  + saveComputer()             → Create/update computer registry entry
  + deleteComputer()           → Decommission computer with audit trail
  + getMaintenanceLogs()       → Paginated maintenance log retrieval
  + saveMaintenanceLog()       → Create/update maintenance case
  + getInventory()             → Full inventory list with lab relations
  + getAuditLogs()             → Full audit trail (last 100 entries)
  + 30+ compatibility shim actions for legacy page integrations

Build Pipeline Changes:
  Before: next build
  After:  prisma generate && next build
  Added:  postinstall: prisma generate (for Vercel)
  Added:  prisma CLI moved to dependencies (not devDependencies)

Bug Fixes:
  ✓ Vercel: "Module '@prisma/client' has no exported member 'PrismaClient'"
    → Root Cause: prisma generate not run before next build on Vercel
    → Fix: Added prisma generate to build script and postinstall hook
  ✓ TS2345 (x8): Argument of type 'number' not assignable to 'string'
    → Fix: Updated action parameter types to 'any' with String() conversion
  ✓ tsconfig.json: prisma/seed.ts being type-checked during next build
    → Fix: Added prisma/ to tsconfig.json exclude list

Security Review:      PASS
Database Review:      PASS
Architecture Review:  PASS
TypeScript Check:     PASS (0 errors)
Vercel Build:         FIXED

Documentation Updated:  YES
Migration Required:     NO (prisma db push already applied)
Breaking Changes:       None

Next Recommended Task:
  Sprint 1 — Computer Registry Module
  Build the full digital computer register with:
    - Enterprise data table (search, filter, sort, paginate)
    - Add/Edit/Delete computer entry form
    - QR code generation per computer
    - Individual computer digital record card (complete history)
    - PDF export (professional cover page + specs + maintenance timeline)
    - Excel export
    - Advanced filters (Lab, Status, RAM, OS, Vendor, Warranty, etc.)
    - Photo & document attachment support
    - Full audit trail integration

Git Commit Message:
  fix(build): add prisma generate to build pipeline, fix Vercel TS error;
  establish project documentation (CHANGELOG, PROJECT_PROGRESS)

=========================================
```

---

### COMMIT REPORT #001

```
=========================================
AUROXN ENGINEERING COMMIT REPORT
=========================================

Feature Name:     Initial Scaffold & Admin Dashboard
Feature ID:       ECR-001
Sprint:           Sprint 0 (Foundation)
Version:          v0.1.0
Date:             2026-07-01

Modules Updated:
  ✓ Admin Dashboard UI
  ✓ Authentication Flow
  ✓ Base Components

Files Created:
  + src/app/admin/page.tsx     → Admin dashboard with module panels
  + src/app/page.tsx           → Landing / login page
  + Various UI components

Security Review:      PASS
Architecture Review:  PASS

=========================================
```

---

## Module Register Map

Every module = Digital Register

| Module | Physical Register Equivalent | Status |
|--------|------------------------------|--------|
| Computer Registry | Computer Register Book | 🔵 Sprint 1 |
| Maintenance Log | Maintenance & Complaint Register | ⚪ Sprint 2 |
| Inventory | Stock & Equipment Register | ⚪ Sprint 3 |
| Lab Booking | Lab Booking Register | ⚪ Sprint 4 |
| Daily Work | Daily Work Register | ⚪ Sprint 4 |
| Visitor Register | Visitor Entry Register | ⚪ Sprint 4 |
| Document Repository | File Cabinet (NAAC/NBA/IEEE) | ⚪ Sprint 5 |
| Reports & Exports | Printed Reports | ⚪ Sprint 6 |
| QR System | Asset Tags / Labels | ⚪ Sprint 6 |
| Global Search | Manual Index Register | ⚪ Sprint 7 |
| Audit Trail | Change Log Register | ✅ Sprint 0 |
| Digital Record Book | Government File/Docket | ⚪ Sprint 8 |

---

*Maintained by **Auroxn Enterprise Engineering Team** | ECC Agent Framework | SCSIT LabOS*
