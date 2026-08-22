# SAARTHI — Database

## Database Name

```
saarthi_db
```

---

## MySQL Version Assumptions

- **MySQL 8.0+** is assumed.
- `UUID()` function is used in seed files.
- `ALTER TABLE ... ADD UNIQUE KEY IF NOT EXISTS` syntax is used in migration 005 (requires MySQL 8.0+).
- If running MySQL 5.7, remove `IF NOT EXISTS` from the ALTER in `005_create_core_sections.sql` and check manually.

---

## Engine / Charset

| Setting | Value |
|---|---|
| Storage Engine | `InnoDB` (required for FK support) |
| Character Set | `utf8mb4` (full Unicode — supports emojis, Devanagari, etc.) |
| Collation | `utf8mb4_unicode_ci` (case-insensitive comparisons) |

---

## Creating the Database

Before running migrations:

```sql
CREATE DATABASE IF NOT EXISTS `saarthi_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE saarthi_db;
```

---

## Primary Key Strategy (UUID)

All primary keys are stored as `CHAR(36)` and generated as UUIDs.

- In seed files: `UUID()` MySQL function is used.
- In the backend: UUIDs will be generated server-side (e.g. using the `uuid` npm package) before INSERT.
- Rationale: UUIDs are globally unique, prevent sequential ID enumeration attacks, and are ready for future database sharding or microservice splitting without key conflicts.

---

## Table Naming Convention

All tables use a module prefix:

| Prefix | Module | Examples |
|---|---|---|
| `core_` | SAARTHI Core | `core_students`, `core_users` |
| `idcard_` | ID Card module | `idcard_cards`, `idcard_templates` |
| `voting_` | Voting module | `voting_elections`, `voting_votes` |
| `bus_` | Bus module | `bus_routes`, `bus_assignments` |
| `canteen_` | Canteen module | `canteen_orders`, `canteen_wallets` |

This convention allows all tables to coexist in one database while remaining logically separated. Future splitting into separate databases is a mechanical migration, not a redesign.

---

## Migration Order

Run migration files **in exact numeric order** — FK dependencies require it.

```
migrations/
  001_create_core_schools.sql                       ← root tenant (no deps)
  002_create_core_academic_years.sql                ← deps: schools
  003_create_core_school_modules.sql                ← deps: schools
  004_create_core_classes.sql                       ← deps: schools
  005_create_core_sections.sql                      ← deps: schools, classes
  006_create_core_students.sql                      ← deps: schools
  007_create_core_student_academic_assignments.sql  ← deps: schools, students, years, classes, sections
  008_create_core_guardians.sql                     ← deps: schools
  009_create_core_student_guardians.sql             ← deps: schools, students, guardians
  010_create_core_staff.sql                         ← deps: schools
  011_create_core_staff_assignments.sql             ← deps: schools, staff, years, classes, sections
  012_create_core_users.sql                         ← deps: schools
  013_create_core_user_staff_links.sql              ← deps: users, staff, schools
  014_create_core_user_guardian_links.sql           ← deps: users, guardians, schools
  015_create_core_user_student_links.sql            ← deps: users, students, schools
  016_create_core_roles.sql                         ← deps: schools
  017_create_core_permissions.sql                   ← no deps (platform-wide)
  018_create_core_role_permissions.sql              ← deps: roles, permissions
  019_create_core_user_roles.sql                    ← deps: users, roles, schools
```

### Running Migrations (MySQL CLI)

```bash
mysql -u root -p saarthi_db < database/migrations/001_create_core_schools.sql
mysql -u root -p saarthi_db < database/migrations/002_create_core_academic_years.sql
# ... repeat through 019
```

### Running All Migrations (PowerShell)

```powershell
Get-ChildItem "D:\SAARTHI\database\migrations\*.sql" | Sort-Object Name | ForEach-Object {
  Write-Host "Running: $($_.Name)"
  mysql -u root -p saarthi_db < $_.FullName
}
```

---

## Seed Data

Run the seed file **after all 19 migrations** are complete:

```bash
mysql -u root -p saarthi_db < database/seeds/001_core_system_seed.sql
```

The seed file contains:
- **6 system roles**: `super_admin`, `school_admin`, `teacher`, `non_teaching_staff`, `parent`, `student`
- **62 permissions** across 5 modules (core, id_card, voting, bus, canteen)
- **Default role-permission mappings** for all 6 roles
- Uses `INSERT IGNORE` — safe to re-run without duplicates
- Uses name-based `SELECT` — UUID-agnostic (no hardcoded UUIDs in role-permission mapping)

> **The seed does NOT create fake schools, students, staff, or guardians.**

---

## School-ID Tenant Isolation

Every school-scoped table has `school_id CHAR(36) NOT NULL` with a FK to `core_schools`.

**Layer 1 — Database**: FK constraint prevents orphan records. Indexes on `school_id` make tenant-scoped queries fast.

**Layer 2 — Application**: The backend extracts `school_id` from the authenticated JWT and injects it into **every** database query. No query runs without a `school_id` filter for school-scoped endpoints.

**Layer 3 — Module Gate**: The middleware checks `core_school_modules` before routing any module API call. Disabled modules return HTTP 403 before any business logic runs.

---

## Core Tables Summary (19 tables)

| # | Table | school_id? | Soft Delete? | Key Unique Constraints |
|---|---|:---:|:---:|---|
| 1 | `core_schools` | — (IS the school) | ✓ | `code` |
| 2 | `core_academic_years` | ✓ | — | `(school_id, name)` |
| 3 | `core_school_modules` | ✓ | — | `(school_id, module_name)` |
| 4 | `core_classes` | ✓ | ✓ | `(school_id, name)` |
| 5 | `core_sections` | ✓ | ✓ | `(school_id, class_id, name)` |
| 6 | `core_students` | ✓ | ✓ | `(school_id, admission_number)` |
| 7 | `core_student_academic_assignments` | ✓ | — | `(student_id, academic_year_id)` |
| 8 | `core_guardians` | ✓ | ✓ | — |
| 9 | `core_student_guardians` | ✓ | — | `(student_id, guardian_id)` |
| 10 | `core_staff` | ✓ | ✓ | `(school_id, employee_id)` |
| 11 | `core_staff_assignments` | ✓ | — | — |
| 12 | `core_users` | ✓ (NULL=SA) | ✓ | `email`, `(school_id, username)` |
| 13 | `core_user_staff_links` | ✓ | — | `(user_id, staff_id)` |
| 14 | `core_user_guardian_links` | ✓ | — | `(user_id, guardian_id)` |
| 15 | `core_user_student_links` | ✓ | — | `(user_id, student_id)` |
| 16 | `core_roles` | ✓ (NULL=sys) | — | `(school_id, name)` |
| 17 | `core_permissions` | — (platform) | — | `name`, `(module, resource, action)` |
| 18 | `core_role_permissions` | — | — | Composite PK `(role_id, permission_id)` |
| 19 | `core_user_roles` | ✓ (NULL=SA) | — | `(user_id, role_id, school_id)` |

---

## Backend Validation Rules

The following constraints **cannot be fully enforced by MySQL FKs** and **must be enforced by the backend service layer**:

### 1. Single current academic year per school
MySQL cannot enforce "only one `is_current = TRUE` per school" with a simple unique constraint (because multiple `FALSE` values are valid). The `AcademicYearService` must wrap the "set current" operation in a transaction:
```
BEGIN;
UPDATE core_academic_years SET is_current = FALSE WHERE school_id = ?;
UPDATE core_academic_years SET is_current = TRUE  WHERE academic_year_id = ?;
COMMIT;
```

### 2. Cross-school record isolation in assignments
`core_student_academic_assignments` references `student_id`, `academic_year_id`, `class_id`, and `section_id`. MySQL FKs verify each exists, but **not that they all belong to the same school**. The backend must validate:
```
student.school_id === academic_year.school_id === class.school_id === section.school_id
```
Same rule applies to `core_staff_assignments`.

### 3. Super Admin school_id rule
`core_users.school_id` is nullable. MySQL allows any value or NULL. The backend must enforce:
- `school_id = NULL` → only valid for `super_admin` role
- All other users → `school_id` must be set

### 4. `activated_by` on `core_school_modules`
The `activated_by` column stores a `user_id` but has **no FK constraint** (because `core_school_modules` is created at migration 003, before `core_users` at 012). The backend must validate that `activated_by` is a valid `user_id` when updating this field.

### 5. Guardian data access for parents
The `parent` role grants `core.students.read` permission, but a parent must only see **their own children** — not all students in the school. The backend must always join through `core_student_guardians` when a parent-role user queries student data:
```sql
WHERE sg.guardian_id = :guardian_id AND sg.student_id = s.student_id
```

### 6. Module permission check
A user may have `id_card.cards.print` permission, but if `id_card` is disabled for their school in `core_school_modules`, the request must still be rejected. The middleware must check both permission AND module activation.
