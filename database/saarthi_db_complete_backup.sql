-- =============================================================================
-- SAARTHI COMPLETE DATABASE BACKUP & RESTORE SCRIPT FOR XAMPP (MariaDB/MySQL)
-- Database : saarthi_db
-- Includes : All Core Tables (001-020), RBAC Seeds, DPS Demo School, Super Admin
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `saarthi_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `saarthi_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- MIGRATION: 001_create_core_schools.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 001_create_core_schools.sql
-- Table     : core_schools
-- Purpose   : Top-level tenant record. Every school on the SAARTHI platform
--             has exactly one row here. ALL other school-scoped tables carry
--             school_id as a foreign key to this table.
-- Depends on: (none — this is the root table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_schools` (
  `school_id`   CHAR(36)     NOT NULL                    COMMENT 'UUID — primary key',
  `name`        VARCHAR(255) NOT NULL                    COMMENT 'Full official school name',
  `code`        VARCHAR(50)  NOT NULL                    COMMENT 'Short unique slug, e.g. DPS-DELHI',
  `address`     TEXT         NULL,
  `city`        VARCHAR(100) NULL,
  `state`       VARCHAR(100) NULL,
  `country`     VARCHAR(100) NOT NULL DEFAULT 'India',
  `phone`       VARCHAR(20)  NULL,
  `email`       VARCHAR(255) NULL,
  `logo_url`    LONGTEXT     NULL                        COMMENT 'Base64 data URI or storage URL for school crest/logo',
  `timezone`    VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
  `is_active`   BOOLEAN      NOT NULL DEFAULT TRUE       COMMENT 'Super Admin can deactivate a school',
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  TIMESTAMP    NULL     DEFAULT NULL       COMMENT 'Soft delete',

  PRIMARY KEY (`school_id`),
  UNIQUE  KEY `uq_schools_code`      (`code`),
  KEY          `idx_schools_active`  (`is_active`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Root tenant table. One row per school. All school-scoped tables FK to school_id here.';

-- -----------------------------------------------------
-- MIGRATION: 002_create_core_academic_years.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 002_create_core_academic_years.sql
-- Table     : core_academic_years
-- Purpose   : Defines academic periods within a school (e.g. "2025-26").
--             All time-scoped data — student assignments, staff assignments,
--             bus assignments, voting elections — references an academic_year_id.
-- Constraint: UNIQUE(school_id, name) — one name per school.
-- Note      : Only ONE academic year should be is_current=TRUE per school.
--             MySQL cannot enforce this with a simple unique constraint because
--             multiple FALSE values are allowed. The backend service layer must
--             enforce the single-current-year rule transactionally.
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_academic_years` (
  `academic_year_id`  CHAR(36)                            NOT NULL COMMENT 'UUID',
  `school_id`         CHAR(36)                            NOT NULL COMMENT 'Tenant boundary',
  `name`              VARCHAR(20)                         NOT NULL COMMENT 'e.g. 2025-26',
  `start_date`        DATE                                NOT NULL,
  `end_date`          DATE                                NOT NULL,
  `is_current`        BOOLEAN                             NOT NULL DEFAULT FALSE COMMENT 'Only one TRUE per school — enforced by backend, not DB constraint',
  `status`            ENUM('upcoming','active','closed')  NOT NULL DEFAULT 'upcoming',
  `created_at`        TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`academic_year_id`),
  UNIQUE  KEY `uq_academic_years_school_name` (`school_id`, `name`),
  KEY          `idx_academic_years_school`     (`school_id`),
  KEY          `idx_academic_years_current`    (`school_id`, `is_current`),

  CONSTRAINT `fk_ay_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Academic year periods per school. All time-scoped module data references academic_year_id.';

-- -----------------------------------------------------
-- MIGRATION: 003_create_core_school_modules.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 003_create_core_school_modules.sql
-- Table     : core_school_modules
-- Purpose   : Controls which optional SAARTHI modules are activated per school.
--             On school creation, 4 rows are inserted (one per module) with
--             is_enabled = FALSE. The Super Admin enables modules per school.
--             The backend middleware checks this table before routing any
--             module API call — disabled modules return HTTP 403.
--
-- Modules   : id_card | voting | bus | canteen
--             Core itself is always available and NOT stored here.
--
-- Constraint: UNIQUE(school_id, module_name)
--
-- NOTE on activated_by:
--   This column logically references core_users, but core_users is created
--   at migration 012 (after this table). To avoid a circular FK dependency,
--   activated_by is stored as CHAR(36) NULL WITHOUT a FK constraint here.
--   The backend must validate that activated_by is a valid user_id.
--
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_school_modules` (
  `school_module_id`  CHAR(36)                                NOT NULL COMMENT 'UUID',
  `school_id`         CHAR(36)                                NOT NULL,
  `module_name`       ENUM('id_card','voting','bus','canteen') NOT NULL COMMENT 'Core is always on and not listed here',
  `is_enabled`        BOOLEAN                                 NOT NULL DEFAULT FALSE,
  `activated_at`      TIMESTAMP                               NULL     DEFAULT NULL COMMENT 'When this module was last enabled',
  `activated_by`      CHAR(36)                                NULL     DEFAULT NULL COMMENT 'user_id of Super Admin who activated — no FK (see note above)',
  `expires_at`        TIMESTAMP                               NULL     DEFAULT NULL COMMENT 'Future subscription expiry. NULL = no expiry.',
  `notes`             TEXT                                    NULL,
  `created_at`        TIMESTAMP                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP                               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`school_module_id`),
  UNIQUE  KEY `uq_school_modules_school_module` (`school_id`, `module_name`),
  KEY          `idx_school_modules_school`       (`school_id`),
  KEY          `idx_school_modules_enabled`      (`school_id`, `is_enabled`),

  CONSTRAINT `fk_sm_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Module activation gate per school. 4 rows per school (id_card/voting/bus/canteen). Middleware checks this before every module API call.';

-- -----------------------------------------------------
-- MIGRATION: 004_create_core_classes.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 004_create_core_classes.sql
-- Table     : core_classes
-- Purpose   : Defines class levels within a school (e.g. Class 1 – Class 12).
--             Classes are persistent structures — what changes each academic
--             year is which students and staff are assigned to them.
-- Constraint: UNIQUE(school_id, name)
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_classes` (
  `class_id`       CHAR(36)     NOT NULL COMMENT 'UUID',
  `school_id`      CHAR(36)     NOT NULL COMMENT 'Tenant boundary',
  `name`           VARCHAR(50)  NOT NULL COMMENT 'e.g. Class 1, Class 9, Grade 12',
  `numeric_order`  TINYINT      NOT NULL COMMENT 'Integer for sort order: Class 1 = 1, Class 12 = 12',
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`     TIMESTAMP    NULL     DEFAULT NULL COMMENT 'Soft delete',

  PRIMARY KEY (`class_id`),
  UNIQUE  KEY `uq_classes_school_name`    (`school_id`, `name`),
  KEY          `idx_classes_school`       (`school_id`),
  KEY          `idx_classes_order`        (`school_id`, `numeric_order`),

  CONSTRAINT `fk_classes_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Class levels per school (Class 1-12 or equivalent). Persistent — student placements change per academic year via core_student_academic_assignments.';

-- -----------------------------------------------------
-- MIGRATION: 005_create_core_sections.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 005_create_core_sections.sql
-- Table     : core_sections
-- Purpose   : Defines divisions within a class (Section A, B, C, Rose …).
--             Like classes, sections are persistent structures.
--             Student placements change each academic year.
-- Constraint: UNIQUE(school_id, class_id, name)
-- NOTE      : A section must belong to the same school as its class.
--             MySQL can enforce this with a composite FK only if we create a
--             compound UNIQUE KEY (school_id, class_id) on core_classes and
--             reference it here. We do this below to prevent cross-school
--             class-section mismatch at the database level.
-- Depends on: core_schools, core_classes
-- =============================================================================

-- Step 1: Ensure core_classes has the compound unique key needed for the composite FK below.
-- Using standard ALTER TABLE compatible with MariaDB 10.4 / MySQL 5.7+
-- The key may already exist from migration 004; errors here are safe to ignore on re-run.
ALTER TABLE `core_classes`
  ADD UNIQUE KEY `uq_classes_school_class` (`school_id`, `class_id`);

CREATE TABLE IF NOT EXISTS `core_sections` (
  `section_id`    CHAR(36)    NOT NULL COMMENT 'UUID',
  `school_id`     CHAR(36)    NOT NULL COMMENT 'Tenant boundary — denormalized from class for fast joins',
  `class_id`      CHAR(36)    NOT NULL COMMENT 'Parent class',
  `name`          VARCHAR(10) NOT NULL COMMENT 'e.g. A, B, C, Rose, Lotus',
  `max_strength`  SMALLINT    NULL     COMMENT 'Optional seat cap — NULL means no limit',
  `created_at`    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`    TIMESTAMP   NULL     DEFAULT NULL COMMENT 'Soft delete',

  PRIMARY KEY (`section_id`),
  UNIQUE  KEY `uq_sections_school_class_name` (`school_id`, `class_id`, `name`),
  KEY          `idx_sections_school`           (`school_id`),
  KEY          `idx_sections_class`            (`class_id`),

  -- Composite FK ensures the section's class belongs to the same school
  CONSTRAINT `fk_sections_school_class`
    FOREIGN KEY (`school_id`, `class_id`)
    REFERENCES `core_classes` (`school_id`, `class_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Sections within a class per school. Composite FK guarantees section and class belong to the same school.';

-- -----------------------------------------------------
-- MIGRATION: 006_create_core_students.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 006_create_core_students.sql
-- Table     : core_students
-- Purpose   : THE single master student identity record.
--             This is the one source of truth for student identity across
--             the entire SAARTHI platform.
--
--             CRITICAL RULE:
--             Modules (ID Card, Voting, Bus, Canteen) NEVER duplicate this
--             data. They store only student_id as a FK reference and read
--             name, photo, DOB etc. from this table at runtime.
--
--             Student transfer between schools:
--             If a student moves from School A to School B, School B creates
--             a NEW record here. School A's record is retained (historical).
--             There is NO global cross-school student identity in Phase 1.
--
-- Constraint: UNIQUE(school_id, admission_number)
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_students` (
  `student_id`        CHAR(36)                                              NOT NULL COMMENT 'UUID',
  `school_id`         CHAR(36)                                              NOT NULL COMMENT 'Tenant boundary — student belongs to exactly one school',
  `admission_number`  VARCHAR(50)                                           NOT NULL COMMENT 'School-assigned admission number — unique within school',
  `first_name`        VARCHAR(100)                                          NOT NULL,
  `middle_name`       VARCHAR(100)                                          NULL,
  `last_name`         VARCHAR(100)                                          NOT NULL,
  `date_of_birth`     DATE                                                  NOT NULL,
  `gender`            ENUM('male','female','other')                         NOT NULL,
  `blood_group`       VARCHAR(5)                                            NULL     COMMENT 'e.g. B+, O-, AB+',
  `nationality`       VARCHAR(50)                                           NOT NULL DEFAULT 'Indian',
  `photo_url`         VARCHAR(500)                                          NULL     COMMENT 'Reference path in /storage — NOT binary in DB',
  `admission_date`    DATE                                                  NOT NULL,
  `status`            ENUM('active','inactive','transferred','graduated')   NOT NULL DEFAULT 'active',
  `created_at`        TIMESTAMP                                             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP                                             NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`        TIMESTAMP                                             NULL     DEFAULT NULL COMMENT 'Soft delete — never hard delete academic records',

  PRIMARY KEY (`student_id`),
  UNIQUE  KEY `uq_students_school_admission`  (`school_id`, `admission_number`),
  KEY          `idx_students_school`           (`school_id`),
  KEY          `idx_students_status`           (`school_id`, `status`),
  KEY          `idx_students_name`             (`school_id`, `last_name`, `first_name`),
  KEY          `idx_students_dob`              (`school_id`, `date_of_birth`),

  CONSTRAINT `fk_students_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Master student identity. Single source of truth. Modules reference student_id only — they never copy this data.';

-- -----------------------------------------------------
-- MIGRATION: 007_create_core_student_academic_assignments.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 007_create_core_student_academic_assignments.sql
-- Table     : core_student_academic_assignments
-- Purpose   : Records which class and section a student belongs to in a given
--             academic year. This is the critical table that decouples
--             "who the student is" (core_students)
--             from "where they study each year" (this table).
--
--             Example for the same student across years:
--               student_id=STU-001 | year=2024-25 | Class 9  | Section A | roll=12
--               student_id=STU-001 | year=2025-26 | Class 10 | Section B | roll=07
--               student_id=STU-001 | year=2026-27 | Class 11 | Section A | roll=03
--
-- Constraint: UNIQUE(student_id, academic_year_id)
--             → one assignment per student per academic year.
--
-- Cross-school isolation note:
--   MySQL cannot enforce via FK alone that student, academic_year, class,
--   and section all belong to the same school. The backend service layer
--   MUST validate this. See Backend Constraints doc.
--
-- Depends on: core_schools, core_students, core_academic_years,
--             core_classes, core_sections
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_student_academic_assignments` (
  `assignment_id`     CHAR(36)                                                NOT NULL COMMENT 'UUID',
  `school_id`         CHAR(36)                                                NOT NULL COMMENT 'Denormalized — fast school-scoped queries & index',
  `student_id`        CHAR(36)                                                NOT NULL,
  `academic_year_id`  CHAR(36)                                                NOT NULL,
  `class_id`          CHAR(36)                                                NOT NULL,
  `section_id`        CHAR(36)                                                NOT NULL,
  `roll_number`       VARCHAR(20)                                             NULL     COMMENT 'Roll number within section for this year',
  `status`            ENUM('active','transferred_out','completed','withdrawn') NOT NULL DEFAULT 'active',
  `created_at`        TIMESTAMP                                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP                                               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`assignment_id`),
  UNIQUE  KEY `uq_saa_student_year`              (`student_id`, `academic_year_id`),
  KEY          `idx_saa_school`                   (`school_id`),
  KEY          `idx_saa_school_year`              (`school_id`, `academic_year_id`),
  KEY          `idx_saa_school_year_class_sec`    (`school_id`, `academic_year_id`, `class_id`, `section_id`),
  KEY          `idx_saa_student`                  (`student_id`),

  CONSTRAINT `fk_saa_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_saa_student`
    FOREIGN KEY (`student_id`) REFERENCES `core_students` (`student_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_saa_year`
    FOREIGN KEY (`academic_year_id`) REFERENCES `core_academic_years` (`academic_year_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_saa_class`
    FOREIGN KEY (`class_id`) REFERENCES `core_classes` (`class_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_saa_section`
    FOREIGN KEY (`section_id`) REFERENCES `core_sections` (`section_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Student class/section placement per academic year. One row per student per year. All modules join here to get current class/section.';

-- -----------------------------------------------------
-- MIGRATION: 008_create_core_guardians.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 008_create_core_guardians.sql
-- Table     : core_guardians
-- Purpose   : Parent/guardian identity records. Shared across all modules:
--               • Bus module  → can_pickup flag (on junction table)
--               • Canteen     → parent wallet top-up notifications
--               • ID Card     → emergency contact on card back
--               • Core auth   → parent login via core_user_guardian_links
--             Many-to-many with students is in core_student_guardians (009).
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_guardians` (
  `guardian_id`       CHAR(36)                                          NOT NULL COMMENT 'UUID',
  `school_id`         CHAR(36)                                          NOT NULL COMMENT 'Tenant boundary',
  `first_name`        VARCHAR(100)                                      NOT NULL,
  `last_name`         VARCHAR(100)                                      NOT NULL,
  `relationship_type` ENUM('father','mother','legal_guardian','other')  NOT NULL,
  `phone`             VARCHAR(20)                                       NULL,
  `email`             VARCHAR(255)                                      NULL,
  `address`           TEXT                                              NULL,
  `occupation`        VARCHAR(100)                                      NULL,
  `photo_url`         VARCHAR(500)                                      NULL     COMMENT 'Reference path in /storage',
  `is_active`         BOOLEAN                                           NOT NULL DEFAULT TRUE,
  `created_at`        TIMESTAMP                                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP                                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`        TIMESTAMP                                         NULL     DEFAULT NULL,

  PRIMARY KEY (`guardian_id`),
  KEY `idx_guardians_school`  (`school_id`),
  KEY `idx_guardians_phone`   (`school_id`, `phone`),
  KEY `idx_guardians_email`   (`school_id`, `email`),
  KEY `idx_guardians_active`  (`school_id`, `is_active`),

  CONSTRAINT `fk_guardians_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Parent/guardian identity. School-scoped. Linked to students via core_student_guardians (many-to-many).';

-- -----------------------------------------------------
-- MIGRATION: 009_create_core_student_guardians.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 009_create_core_student_guardians.sql
-- Table     : core_student_guardians
-- Purpose   : Junction table — many-to-many between students and guardians.
--               • One guardian can have multiple students (siblings)
--               • One student can have multiple guardians (mother + father)
--             Key flags consumed by modules:
--               • is_primary_contact  → main school communication contact
--               • is_emergency_contact → emergency notifications
--               • can_pickup          → Bus module: authorized for student pickup
-- Constraint: UNIQUE(student_id, guardian_id)
-- Depends on: core_schools, core_students, core_guardians
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_student_guardians` (
  `student_guardian_id`   CHAR(36)   NOT NULL COMMENT 'UUID',
  `school_id`             CHAR(36)   NOT NULL COMMENT 'Tenant boundary — denormalized',
  `student_id`            CHAR(36)   NOT NULL,
  `guardian_id`           CHAR(36)   NOT NULL,
  `is_primary_contact`    BOOLEAN    NOT NULL DEFAULT FALSE COMMENT 'Main contact for school communications',
  `is_emergency_contact`  BOOLEAN    NOT NULL DEFAULT FALSE COMMENT 'Notified in emergencies',
  `can_pickup`            BOOLEAN    NOT NULL DEFAULT FALSE COMMENT 'Bus module: authorized to pick up student',
  `created_at`            TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`student_guardian_id`),
  UNIQUE  KEY `uq_student_guardians_pair`   (`student_id`, `guardian_id`),
  KEY          `idx_sg_school`              (`school_id`),
  KEY          `idx_sg_student`             (`student_id`),
  KEY          `idx_sg_guardian`            (`guardian_id`),

  CONSTRAINT `fk_sg_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_sg_student`
    FOREIGN KEY (`student_id`) REFERENCES `core_students` (`student_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_sg_guardian`
    FOREIGN KEY (`guardian_id`) REFERENCES `core_guardians` (`guardian_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Student-guardian many-to-many junction. can_pickup flag used by Bus module. is_emergency_contact used by notification systems.';

-- -----------------------------------------------------
-- MIGRATION: 010_create_core_staff.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 010_create_core_staff.sql
-- Table     : core_staff
-- Purpose   : Staff/employee identity records. Single source of truth for
--             staff data, used by all modules:
--               • ID Card  → staff identity cards
--               • Voting   → election officers and supervisors
--               • Bus      → drivers, conductors
--               • Canteen  → staff wallet/canteen accounts
--               • Core     → class teacher assignments
-- Constraint: UNIQUE(school_id, employee_id)
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_staff` (
  `staff_id`         CHAR(36)                             NOT NULL COMMENT 'UUID',
  `school_id`        CHAR(36)                             NOT NULL COMMENT 'Tenant boundary',
  `employee_id`      VARCHAR(50)                          NOT NULL COMMENT 'School-assigned employee number',
  `first_name`       VARCHAR(100)                         NOT NULL,
  `last_name`        VARCHAR(100)                         NOT NULL,
  `designation`      VARCHAR(100)                         NULL     COMMENT 'e.g. Principal, Teacher, Accountant',
  `department`       VARCHAR(100)                         NULL     COMMENT 'e.g. Science, Mathematics, Administration',
  `date_of_joining`  DATE                                 NULL,
  `phone`            VARCHAR(20)                          NULL,
  `email`            VARCHAR(255)                         NULL,
  `photo_url`        VARCHAR(500)                         NULL     COMMENT 'Reference path in /storage',
  `status`           ENUM('active','inactive','resigned') NOT NULL DEFAULT 'active',
  `created_at`       TIMESTAMP                            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP                            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`       TIMESTAMP                            NULL     DEFAULT NULL COMMENT 'Soft delete — retain for historical records',

  PRIMARY KEY (`staff_id`),
  UNIQUE  KEY `uq_staff_school_employee`  (`school_id`, `employee_id`),
  KEY          `idx_staff_school`          (`school_id`),
  KEY          `idx_staff_status`          (`school_id`, `status`),
  KEY          `idx_staff_name`            (`school_id`, `last_name`, `first_name`),

  CONSTRAINT `fk_staff_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Staff/employee identity. Single source of truth. All modules reference staff_id — they never copy this data.';

-- -----------------------------------------------------
-- MIGRATION: 011_create_core_staff_assignments.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 011_create_core_staff_assignments.sql
-- Table     : core_staff_assignments
-- Purpose   : Records class/section responsibilities of staff per academic year.
--             Tracks role context: class_teacher, subject_teacher, coordinator.
--             class_id and section_id are nullable (e.g. Principals or Admin
--             staff have no class assignment).
-- Note      : Cross-school isolation (staff + academic_year + class + section
--             all from same school) must be enforced by backend service layer.
-- Depends on: core_schools, core_staff, core_academic_years,
--             core_classes, core_sections
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_staff_assignments` (
  `assignment_id`    CHAR(36)                                           NOT NULL COMMENT 'UUID',
  `school_id`        CHAR(36)                                           NOT NULL COMMENT 'Tenant boundary — denormalized',
  `staff_id`         CHAR(36)                                           NOT NULL,
  `academic_year_id` CHAR(36)                                           NOT NULL,
  `class_id`         CHAR(36)                                           NULL     COMMENT 'NULL if staff has no class responsibility',
  `section_id`       CHAR(36)                                           NULL     COMMENT 'NULL if not section-specific',
  `role_in_class`    ENUM('class_teacher','subject_teacher','coordinator') NULL,
  `created_at`       TIMESTAMP                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP                                          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`assignment_id`),
  KEY `idx_staff_asgn_school`    (`school_id`),
  KEY `idx_staff_asgn_staff`     (`staff_id`),
  KEY `idx_staff_asgn_year`      (`academic_year_id`),
  KEY `idx_staff_asgn_class`     (`class_id`),
  KEY `idx_staff_asgn_section`   (`section_id`),

  CONSTRAINT `fk_sa_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_sa_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `core_staff` (`staff_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_sa_year`
    FOREIGN KEY (`academic_year_id`) REFERENCES `core_academic_years` (`academic_year_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_sa_class`
    FOREIGN KEY (`class_id`) REFERENCES `core_classes` (`class_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_sa_section`
    FOREIGN KEY (`section_id`) REFERENCES `core_sections` (`section_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Staff class/section responsibilities per academic year. Backend must validate all referenced IDs belong to the same school.';

-- -----------------------------------------------------
-- MIGRATION: 012_create_core_users.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 012_create_core_users.sql
-- Table     : core_users
-- Purpose   : Authentication identity — stores LOGIN CREDENTIALS ONLY.
--             Does NOT store profile data (name, photo, designation etc.).
--             Profile data lives in core_students, core_staff, core_guardians.
--
--             Identity Design (Explicit Link Table Pattern):
--             Instead of a polymorphic linked_entity_type/id column, SAARTHI
--             uses explicit link tables:
--               core_user_staff_links    → user acts as staff
--               core_user_guardian_links → user acts as guardian/parent
--               core_user_student_links  → user acts as student (future)
--             This allows a teacher who is also a parent to have ONE login
--             linked to BOTH a staff profile AND a guardian profile.
--
--             school_id rules:
--               • school_id = NULL   → Super Admin only (platform-wide)
--               • school_id = SET    → All other users (school-scoped)
--             The backend MUST enforce this rule — the DB allows NULL.
--
-- Constraint: UNIQUE(email), UNIQUE(school_id, username)
-- Depends on: core_schools
-- NOTE: core_school_modules.activated_by references this table but was
--       created at migration 003. That FK is intentionally omitted from 003
--       and is enforced by the backend only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_users` (
  `user_id`                CHAR(36)     NOT NULL COMMENT 'UUID',
  `school_id`              CHAR(36)     NULL     COMMENT 'NULL for super_admin only. All school users must have school_id.',
  `username`               VARCHAR(100) NOT NULL,
  `email`                  VARCHAR(255) NULL     COMMENT 'Globally unique',
  `phone`                  VARCHAR(20)  NULL     COMMENT 'For future OTP authentication',
  `password_hash`          VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  `is_active`              BOOLEAN      NOT NULL DEFAULT TRUE,
  `last_login_at`          TIMESTAMP    NULL     DEFAULT NULL,
  `password_reset_token`   VARCHAR(255) NULL     DEFAULT NULL,
  `password_reset_expires` TIMESTAMP    NULL     DEFAULT NULL,
  `created_at`             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`             TIMESTAMP    NULL     DEFAULT NULL COMMENT 'Soft delete',

  PRIMARY KEY (`user_id`),
  UNIQUE  KEY `uq_users_email`             (`email`),
  UNIQUE  KEY `uq_users_school_username`   (`school_id`, `username`),
  KEY          `idx_users_school`           (`school_id`),
  KEY          `idx_users_active`           (`is_active`),
  KEY          `idx_users_reset_token`      (`password_reset_token`),

  CONSTRAINT `fk_users_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Authentication credentials only. Profile data is in core_students/core_staff/core_guardians via link tables. school_id=NULL only for super_admin.';

-- -----------------------------------------------------
-- MIGRATION: 013_create_core_user_staff_links.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 013_create_core_user_staff_links.sql
-- Table     : core_user_staff_links
-- Purpose   : Links a user login account to a staff profile.
--             Enables the user to access staff features and permissions.
--
--             Part of the Explicit Link Table Identity Design:
--             A teacher who is also a parent has ONE user account (core_users)
--             with links to BOTH a staff record (here) AND a guardian record
--             (core_user_guardian_links). No polymorphism needed.
--
-- Constraint: UNIQUE(user_id, staff_id)
-- Depends on: core_users, core_staff, core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_user_staff_links` (
  `link_id`     CHAR(36)   NOT NULL COMMENT 'UUID',
  `user_id`     CHAR(36)   NOT NULL,
  `staff_id`    CHAR(36)   NOT NULL,
  `school_id`   CHAR(36)   NOT NULL,
  `is_primary`  BOOLEAN    NOT NULL DEFAULT TRUE COMMENT 'Primary link if user has multiple staff records (rare edge case)',
  `created_at`  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`link_id`),
  UNIQUE  KEY `uq_usr_staff_pair`     (`user_id`, `staff_id`),
  KEY          `idx_usl_user`         (`user_id`),
  KEY          `idx_usl_staff`        (`staff_id`),
  KEY          `idx_usl_school`       (`school_id`),

  CONSTRAINT `fk_usl_user`
    FOREIGN KEY (`user_id`) REFERENCES `core_users` (`user_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_usl_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `core_staff` (`staff_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_usl_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Links user login accounts to staff profiles. Enables staff portal access. Part of explicit link table identity design.';

-- -----------------------------------------------------
-- MIGRATION: 014_create_core_user_guardian_links.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 014_create_core_user_guardian_links.sql
-- Table     : core_user_guardian_links
-- Purpose   : Links a user login account to a guardian profile.
--             Enables a parent to log in and view their child's data across
--             all enabled modules (ID Card, Bus, Canteen, etc.).
--             A parent linked to multiple students (siblings) can see all
--             their children's data through this one user account.
-- Constraint: UNIQUE(user_id, guardian_id)
-- Depends on: core_users, core_guardians, core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_user_guardian_links` (
  `link_id`      CHAR(36)   NOT NULL COMMENT 'UUID',
  `user_id`      CHAR(36)   NOT NULL,
  `guardian_id`  CHAR(36)   NOT NULL,
  `school_id`    CHAR(36)   NOT NULL,
  `created_at`   TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`link_id`),
  UNIQUE  KEY `uq_usr_guardian_pair`  (`user_id`, `guardian_id`),
  KEY          `idx_ugl_user`         (`user_id`),
  KEY          `idx_ugl_guardian`     (`guardian_id`),
  KEY          `idx_ugl_school`       (`school_id`),

  CONSTRAINT `fk_ugl_user`
    FOREIGN KEY (`user_id`) REFERENCES `core_users` (`user_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_ugl_guardian`
    FOREIGN KEY (`guardian_id`) REFERENCES `core_guardians` (`guardian_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_ugl_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Links user login accounts to guardian profiles. Enables parent portal access to children data across all enabled modules.';

-- -----------------------------------------------------
-- MIGRATION: 015_create_core_user_student_links.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 015_create_core_user_student_links.sql
-- Table     : core_user_student_links
-- Purpose   : Links a user login account to a student profile.
--             FUTURE USE — for the student portal/app where students can log
--             in to view timetable, canteen balance, bus tracking, etc.
--             Schema created now to avoid breaking changes later.
--             Not actively used in Phase 1.
-- Constraint: UNIQUE(user_id, student_id)
-- Depends on: core_users, core_students, core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_user_student_links` (
  `link_id`     CHAR(36)   NOT NULL COMMENT 'UUID',
  `user_id`     CHAR(36)   NOT NULL,
  `student_id`  CHAR(36)   NOT NULL,
  `school_id`   CHAR(36)   NOT NULL,
  `created_at`  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`link_id`),
  UNIQUE  KEY `uq_usr_student_pair`   (`user_id`, `student_id`),
  KEY          `idx_stu_link_user`    (`user_id`),
  KEY          `idx_stu_link_student` (`student_id`),
  KEY          `idx_stu_link_school`  (`school_id`),

  CONSTRAINT `fk_ustl_user`
    FOREIGN KEY (`user_id`) REFERENCES `core_users` (`user_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_ustl_student`
    FOREIGN KEY (`student_id`) REFERENCES `core_students` (`student_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_ustl_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Links user accounts to student profiles. Future use: student portal login. Created now to prevent future schema breaking changes.';

-- -----------------------------------------------------
-- MIGRATION: 016_create_core_roles.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 016_create_core_roles.sql
-- Table     : core_roles
-- Purpose   : Defines roles available on the platform.
--
--             Two kinds of roles:
--               1. System roles  (school_id = NULL, is_system_role = TRUE)
--                  Seeded once at startup. Cannot be deleted.
--                  Available to all schools.
--                  Examples: super_admin, school_admin, teacher, parent
--
--               2. Custom roles  (school_id = SET, is_system_role = FALSE)
--                  Created by School Admins for their own school.
--                  Examples: Exam Controller, Sports Captain
--
-- Constraint: UNIQUE(school_id, name)
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_roles` (
  `role_id`        CHAR(36)     NOT NULL COMMENT 'UUID',
  `school_id`      CHAR(36)     NULL     COMMENT 'NULL = platform system role. SET = school custom role.',
  `name`           VARCHAR(100) NOT NULL,
  `description`    TEXT         NULL,
  `is_system_role` BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'System roles are seeded at startup and cannot be deleted',
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`role_id`),
  UNIQUE  KEY `uq_roles_school_name` (`school_id`, `name`),
  KEY          `idx_roles_school`    (`school_id`),
  KEY          `idx_roles_system`    (`is_system_role`),

  CONSTRAINT `fk_roles_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='RBAC roles. System roles (school_id NULL) seeded on startup. School admins can create custom roles (school_id SET).';

-- -----------------------------------------------------
-- MIGRATION: 017_create_core_permissions.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 017_create_core_permissions.sql
-- Table     : core_permissions
-- Purpose   : Defines every controllable action in the SAARTHI system.
--             Uses dot-notation: module.resource.action
--             e.g. core.students.read, id_card.cards.print
--
--             All permissions are platform-wide definitions (no school_id).
--             Seeded once at startup via seeds/001_core_system_seed.sql.
--             Adding a new module = INSERT new permission rows only.
--             No schema changes needed.
--
-- Constraint: UNIQUE(name), UNIQUE(module, resource, action)
-- Depends on: (none — permissions are platform-wide definitions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_permissions` (
  `permission_id`  CHAR(36)                                              NOT NULL COMMENT 'UUID',
  `name`           VARCHAR(100)                                          NOT NULL COMMENT 'Dot-notation: module.resource.action',
  `module`         ENUM('core','id_card','voting','bus','canteen')        NOT NULL COMMENT 'Which module this permission controls',
  `resource`       VARCHAR(50)                                           NOT NULL COMMENT 'e.g. students, elections, routes, wallet',
  `action`         VARCHAR(50)                                           NOT NULL COMMENT 'e.g. read, create, delete, print, manage, cast',
  `description`    TEXT                                                  NULL     COMMENT 'Human-readable description for admin UI',
  `created_at`     TIMESTAMP                                             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`permission_id`),
  UNIQUE  KEY `uq_permissions_name`          (`name`),
  UNIQUE  KEY `uq_permissions_module_res_act`(`module`, `resource`, `action`),
  KEY          `idx_permissions_module`       (`module`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='All RBAC permission definitions. Platform-wide. Dot-notation: module.resource.action. Seeded at startup.';

-- -----------------------------------------------------
-- MIGRATION: 018_create_core_role_permissions.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 018_create_core_role_permissions.sql
-- Table     : core_role_permissions
-- Purpose   : Junction table — assigns permissions to roles.
--             Composite PK(role_id, permission_id) prevents duplicates.
--             Seeded with default permission sets per system role.
-- Depends on: core_roles, core_permissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_role_permissions` (
  `role_id`        CHAR(36)   NOT NULL,
  `permission_id`  CHAR(36)   NOT NULL,
  `created_at`     TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`role_id`, `permission_id`),
  KEY `idx_rp_role_id`        (`role_id`),
  KEY `idx_rp_permission_id`  (`permission_id`),

  CONSTRAINT `fk_rp_role`
    FOREIGN KEY (`role_id`) REFERENCES `core_roles` (`role_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_rp_permission`
    FOREIGN KEY (`permission_id`) REFERENCES `core_permissions` (`permission_id`)
    ON UPDATE CASCADE ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Role-permission assignments. Composite PK prevents duplicates. Populated by seed file.';

-- -----------------------------------------------------
-- MIGRATION: 019_create_core_user_roles.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 019_create_core_user_roles.sql
-- Table     : core_user_roles
-- Purpose   : Assigns roles to users, scoped per school.
--             A user's 'teacher' role is valid ONLY for their school.
--             A super_admin user has a role with school_id = NULL.
--             A single user can hold multiple roles simultaneously.
--
-- Constraint: UNIQUE(user_id, role_id, school_id)
-- Supported system roles (seeded):
--   super_admin | school_admin | teacher | non_teaching_staff | parent | student
-- Depends on: core_users, core_roles, core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_user_roles` (
  `user_role_id`  CHAR(36)   NOT NULL COMMENT 'UUID',
  `user_id`       CHAR(36)   NOT NULL,
  `role_id`       CHAR(36)   NOT NULL,
  `school_id`     CHAR(36)   NULL     COMMENT 'NULL for platform-level roles (super_admin). SET for all school-level roles.',
  `assigned_by`   CHAR(36)   NULL     COMMENT 'user_id of the admin who assigned this role — no FK (avoids circular dep)',
  `created_at`    TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`user_role_id`),
  UNIQUE  KEY `uq_user_roles_user_role_school` (`user_id`, `role_id`, `school_id`),
  KEY          `idx_ur_user_id`                (`user_id`),
  KEY          `idx_ur_role_id`                (`role_id`),
  KEY          `idx_ur_school_id`              (`school_id`),

  CONSTRAINT `fk_ur_user`
    FOREIGN KEY (`user_id`) REFERENCES `core_users` (`user_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_ur_role`
    FOREIGN KEY (`role_id`) REFERENCES `core_roles` (`role_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_ur_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User-role assignments. School-scoped. A teacher role is valid only within that school. UNIQUE(user_id, role_id, school_id).';

-- -----------------------------------------------------
-- MIGRATION: 020_create_core_school_enquiries.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 020_create_core_school_enquiries.sql
-- Table     : core_school_enquiries
-- Purpose   : Captures onboarding registration requests / enquiries submitted
--             by prospective schools. Super Admin can review, reject, or
--             1-click approve & auto-provision the school tenant and admin user.
-- Depends on: (none — independent onboarding pipeline)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_school_enquiries` (
  `enquiry_id`           CHAR(36)     NOT NULL                     COMMENT 'UUID — primary key',
  `school_name`          VARCHAR(255) NOT NULL                     COMMENT 'Proposed school name (must be unique upon creation)',
  `proposed_code`        VARCHAR(50)  NULL                         COMMENT 'Optional proposed code e.g. DPS-DELHI',
  `contact_person_name`  VARCHAR(150) NOT NULL                     COMMENT 'Principal or Trustee name',
  `email`                VARCHAR(255) NOT NULL                     COMMENT 'Primary communication email',
  `phone`                VARCHAR(20)  NOT NULL                     COMMENT 'Primary contact phone',
  `city`                 VARCHAR(100) NULL,
  `state`                VARCHAR(100) NULL,
  `country`              VARCHAR(100) NOT NULL DEFAULT 'India',
  `estimated_students`   INT          NULL     DEFAULT 500,
  `message`              TEXT         NULL                         COMMENT 'Special requirements or remarks',
  `status`               ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `admin_notes`          TEXT         NULL                         COMMENT 'Internal review notes or rejection reason',
  `approved_school_id`   CHAR(36)     NULL                         COMMENT 'FK to core_schools once approved',
  `approved_by`          CHAR(36)     NULL                         COMMENT 'Super admin user_id who approved',
  `approved_at`          TIMESTAMP    NULL     DEFAULT NULL,
  `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`enquiry_id`),
  KEY `idx_enquiries_status` (`status`),
  KEY `idx_enquiries_email`  (`email`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Onboarding inquiries from prospective schools. Super Admin approves to auto-provision school tenant.';

-- -----------------------------------------------------
-- SEED: 001_core_system_seed.sql
-- -----------------------------------------------------
-- =============================================================================
-- SAARTHI · saarthi_db
-- Seed     : 001_core_system_seed.sql
-- Purpose  : Seeds all platform system data that must exist before SAARTHI
--            can be used. Contains three sections:
--              SECTION 1 — System Roles (6 roles)
--              SECTION 2 — Permissions  (62 permissions across 5 modules)
--              SECTION 3 — Role-Permission Mappings
--
-- Run AFTER: All 19 migration files (001–019) have been executed.
--
-- Rules:
--   • Does NOT create fake schools, students, staff, or guardians.
--   • All INSERTs use INSERT IGNORE to be safe on re-run.
--   • Role-Permission mapping uses SELECT by name, so it is UUID-agnostic.
--
-- =============================================================================


-- =============================================================================
-- SECTION 1 : SYSTEM ROLES
-- school_id = NULL  → platform-wide system roles
-- is_system_role = TRUE → cannot be deleted via UI
-- =============================================================================

INSERT IGNORE INTO `core_roles`
  (`role_id`, `school_id`, `name`, `description`, `is_system_role`)
VALUES
  (UUID(), NULL, 'super_admin',
   'SAARTHI platform administrator. Full access to all schools, modules, and platform settings.',
   TRUE),

  (UUID(), NULL, 'school_admin',
   'School administrator. Full management access within their assigned school.',
   TRUE),

  (UUID(), NULL, 'teacher',
   'Teaching staff. Access to assigned classes, sections, and relevant academic data.',
   TRUE),

  (UUID(), NULL, 'non_teaching_staff',
   'Non-teaching staff. Access limited to their specific functional area.',
   TRUE),

  (UUID(), NULL, 'parent',
   'Parent or guardian. View-only access to their own children''s data across enabled modules.',
   TRUE),

  (UUID(), NULL, 'student',
   'Student login. View own profile, schedule, canteen balance, bus route. (Future Phase)',
   TRUE);


-- =============================================================================
-- SECTION 2 : PERMISSIONS
-- Format    : module.resource.action (dot-notation)
-- Scope     : Platform-wide — no school_id on permissions
-- =============================================================================

INSERT IGNORE INTO `core_permissions`
  (`permission_id`, `name`, `module`, `resource`, `action`, `description`)
VALUES

-- ── CORE MODULE ──────────────────────────────────────────────────────────────

-- Schools
(UUID(), 'core.schools.read',                'core', 'schools',             'read',    'View school information'),
(UUID(), 'core.schools.manage',              'core', 'schools',             'manage',  'Create, update, and manage school records (Super Admin only)'),

-- Academic Years
(UUID(), 'core.academic_years.read',         'core', 'academic_years',      'read',    'View academic years'),
(UUID(), 'core.academic_years.manage',       'core', 'academic_years',      'manage',  'Create and manage academic years'),

-- Students
(UUID(), 'core.students.read',               'core', 'students',            'read',    'View student profiles'),
(UUID(), 'core.students.create',             'core', 'students',            'create',  'Enrol new students'),
(UUID(), 'core.students.update',             'core', 'students',            'update',  'Update student information'),
(UUID(), 'core.students.delete',             'core', 'students',            'delete',  'Deactivate or remove student records'),

-- Student Academic Assignments
(UUID(), 'core.student_assignments.read',    'core', 'student_assignments', 'read',    'View student class/section assignments'),
(UUID(), 'core.student_assignments.manage',  'core', 'student_assignments', 'manage',  'Assign or update student class/section per academic year'),

-- Staff
(UUID(), 'core.staff.read',                  'core', 'staff',               'read',    'View staff profiles'),
(UUID(), 'core.staff.create',                'core', 'staff',               'create',  'Add new staff members'),
(UUID(), 'core.staff.update',                'core', 'staff',               'update',  'Update staff information'),
(UUID(), 'core.staff.delete',                'core', 'staff',               'delete',  'Deactivate staff records'),

-- Staff Assignments
(UUID(), 'core.staff_assignments.read',      'core', 'staff_assignments',   'read',    'View staff class/section assignments'),
(UUID(), 'core.staff_assignments.manage',    'core', 'staff_assignments',   'manage',  'Assign or update staff responsibilities per academic year'),

-- Guardians
(UUID(), 'core.guardians.read',              'core', 'guardians',           'read',    'View guardian profiles'),
(UUID(), 'core.guardians.create',            'core', 'guardians',           'create',  'Add guardian records'),
(UUID(), 'core.guardians.update',            'core', 'guardians',           'update',  'Update guardian information'),
(UUID(), 'core.guardians.delete',            'core', 'guardians',           'delete',  'Remove guardian records'),

-- Classes
(UUID(), 'core.classes.read',                'core', 'classes',             'read',    'View classes'),
(UUID(), 'core.classes.manage',              'core', 'classes',             'manage',  'Create and manage classes'),

-- Sections
(UUID(), 'core.sections.read',               'core', 'sections',            'read',    'View sections'),
(UUID(), 'core.sections.manage',             'core', 'sections',            'manage',  'Create and manage sections'),

-- Users & Auth
(UUID(), 'core.users.read',                  'core', 'users',               'read',    'View user accounts'),
(UUID(), 'core.users.create',                'core', 'users',               'create',  'Create new user accounts'),
(UUID(), 'core.users.manage',                'core', 'users',               'manage',  'Full user management — activate, deactivate, reset passwords'),

-- Roles
(UUID(), 'core.roles.read',                  'core', 'roles',               'read',    'View roles and their permissions'),
(UUID(), 'core.roles.manage',                'core', 'roles',               'manage',  'Create and manage custom roles and assign permissions'),

-- Module Activation
(UUID(), 'core.modules.read',                'core', 'modules',             'read',    'View module activation status'),
(UUID(), 'core.modules.manage',              'core', 'modules',             'manage',  'Enable or disable modules per school (Super Admin only)'),

-- ── ID CARD MODULE ────────────────────────────────────────────────────────────

(UUID(), 'id_card.templates.read',           'id_card', 'templates',        'read',    'View ID card templates'),
(UUID(), 'id_card.templates.manage',         'id_card', 'templates',        'manage',  'Create and manage ID card templates'),
(UUID(), 'id_card.cards.read',               'id_card', 'cards',            'read',    'View issued ID cards'),
(UUID(), 'id_card.cards.create',             'id_card', 'cards',            'create',  'Generate new ID cards'),
(UUID(), 'id_card.cards.print',              'id_card', 'cards',            'print',   'Print or download ID cards'),
(UUID(), 'id_card.cards.delete',             'id_card', 'cards',            'delete',  'Revoke or delete ID cards'),

-- ── VOTING MODULE ─────────────────────────────────────────────────────────────

(UUID(), 'voting.elections.read',            'voting', 'elections',          'read',    'View elections'),
(UUID(), 'voting.elections.manage',          'voting', 'elections',          'manage',  'Create, update, and manage elections'),
(UUID(), 'voting.candidates.read',           'voting', 'candidates',         'read',    'View candidate nominations'),
(UUID(), 'voting.candidates.manage',         'voting', 'candidates',         'manage',  'Approve or manage candidates'),
(UUID(), 'voting.votes.cast',                'voting', 'votes',              'cast',    'Cast a vote in an election'),
(UUID(), 'voting.votes.view',                'voting', 'votes',              'view',    'View voting records (anonymised)'),
(UUID(), 'voting.results.view',              'voting', 'results',            'view',    'View election results'),
(UUID(), 'voting.results.publish',           'voting', 'results',            'publish', 'Publish or announce election results'),

-- ── BUS MODULE ───────────────────────────────────────────────────────────────

(UUID(), 'bus.routes.read',                  'bus', 'routes',               'read',    'View bus routes'),
(UUID(), 'bus.routes.manage',                'bus', 'routes',               'manage',  'Create and manage bus routes'),
(UUID(), 'bus.stops.read',                   'bus', 'stops',                'read',    'View bus stops'),
(UUID(), 'bus.stops.manage',                 'bus', 'stops',                'manage',  'Create and manage bus stops'),
(UUID(), 'bus.vehicles.read',                'bus', 'vehicles',             'read',    'View vehicle information'),
(UUID(), 'bus.vehicles.manage',              'bus', 'vehicles',             'manage',  'Add and manage vehicles'),
(UUID(), 'bus.assignments.read',             'bus', 'assignments',          'read',    'View student bus assignments'),
(UUID(), 'bus.assignments.manage',           'bus', 'assignments',          'manage',  'Assign students to routes and stops'),
(UUID(), 'bus.attendance.view',              'bus', 'attendance',           'view',    'View bus boarding/alighting logs'),
(UUID(), 'bus.attendance.manage',            'bus', 'attendance',           'manage',  'Mark and manage bus attendance records'),

-- ── CANTEEN MODULE ────────────────────────────────────────────────────────────

(UUID(), 'canteen.menu.read',                'canteen', 'menu',             'read',    'View canteen menu and items'),
(UUID(), 'canteen.menu.manage',              'canteen', 'menu',             'manage',  'Create and manage menu items'),
(UUID(), 'canteen.orders.read',              'canteen', 'orders',           'read',    'View canteen orders'),
(UUID(), 'canteen.orders.manage',            'canteen', 'orders',           'manage',  'Process and manage orders'),
(UUID(), 'canteen.wallet.view',              'canteen', 'wallet',           'view',    'View wallet balances'),
(UUID(), 'canteen.wallet.manage',            'canteen', 'wallet',           'manage',  'Top up and manage wallets'),
(UUID(), 'canteen.transactions.view',        'canteen', 'transactions',     'view',    'View transaction history'),
(UUID(), 'canteen.transactions.manage',      'canteen', 'transactions',     'manage',  'Manage and reverse transactions');


-- =============================================================================
-- SECTION 3 : ROLE-PERMISSION MAPPINGS
-- Uses INSERT ... SELECT by name — UUID-agnostic.
-- INSERT IGNORE prevents duplicates on re-run.
-- =============================================================================


-- ── super_admin → ALL permissions ────────────────────────────────────────────

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
CROSS JOIN `core_permissions` p
WHERE  r.name = 'super_admin' AND r.school_id IS NULL;


-- ── school_admin → All core + all module permissions (not core.modules.manage) ─

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.schools.read',
  'core.academic_years.read',    'core.academic_years.manage',
  'core.classes.read',           'core.classes.manage',
  'core.sections.read',          'core.sections.manage',
  'core.students.read',          'core.students.create',
  'core.students.update',        'core.students.delete',
  'core.student_assignments.read','core.student_assignments.manage',
  'core.guardians.read',         'core.guardians.create',
  'core.guardians.update',       'core.guardians.delete',
  'core.staff.read',             'core.staff.create',
  'core.staff.update',           'core.staff.delete',
  'core.staff_assignments.read', 'core.staff_assignments.manage',
  'core.users.read',             'core.users.create',  'core.users.manage',
  'core.roles.read',             'core.roles.manage',
  'core.modules.read',
  'id_card.templates.read',      'id_card.templates.manage',
  'id_card.cards.read',          'id_card.cards.create',
  'id_card.cards.print',         'id_card.cards.delete',
  'voting.elections.read',       'voting.elections.manage',
  'voting.candidates.read',      'voting.candidates.manage',
  'voting.votes.view',
  'voting.results.view',         'voting.results.publish',
  'bus.routes.read',             'bus.routes.manage',
  'bus.stops.read',              'bus.stops.manage',
  'bus.vehicles.read',           'bus.vehicles.manage',
  'bus.assignments.read',        'bus.assignments.manage',
  'bus.attendance.view',         'bus.attendance.manage',
  'canteen.menu.read',           'canteen.menu.manage',
  'canteen.orders.read',         'canteen.orders.manage',
  'canteen.wallet.view',         'canteen.wallet.manage',
  'canteen.transactions.view',   'canteen.transactions.manage'
)
WHERE r.name = 'school_admin' AND r.school_id IS NULL;


-- ── teacher → Read most data + manage voting (teachers run elections) ─────────

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.academic_years.read',
  'core.classes.read',           'core.sections.read',
  'core.students.read',          'core.student_assignments.read',
  'core.guardians.read',
  'core.staff.read',             'core.staff_assignments.read',
  'core.modules.read',
  'id_card.templates.read',      'id_card.cards.read',    'id_card.cards.print',
  'voting.elections.read',       'voting.elections.manage',
  'voting.candidates.read',      'voting.candidates.manage',
  'voting.votes.view',
  'voting.results.view',         'voting.results.publish',
  'bus.routes.read',             'bus.assignments.read',  'bus.attendance.view',
  'canteen.menu.read',           'canteen.orders.read',
  'canteen.wallet.view',         'canteen.transactions.view'
)
WHERE r.name = 'teacher' AND r.school_id IS NULL;


-- ── non_teaching_staff → Limited read + canteen counter operations ────────────

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.academic_years.read',
  'core.classes.read',           'core.sections.read',
  'core.students.read',          'core.student_assignments.read',
  'core.staff.read',
  'core.modules.read',
  'id_card.cards.read',          'id_card.cards.print',
  'bus.routes.read',             'bus.assignments.read',
  'canteen.menu.read',
  'canteen.orders.read',         'canteen.orders.manage',
  'canteen.wallet.view',         'canteen.transactions.view'
)
WHERE r.name = 'non_teaching_staff' AND r.school_id IS NULL;


-- ── parent → View own children's data across enabled modules ─────────────────
-- Note: Application layer further restricts parent to ONLY their own children
--       via core_student_guardians. These permissions are the ceiling, not the floor.

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.students.read',          'core.student_assignments.read',
  'id_card.cards.read',
  'bus.routes.read',             'bus.assignments.read',  'bus.attendance.view',
  'canteen.menu.read',
  'canteen.orders.read',
  'canteen.wallet.view',         'canteen.wallet.manage',
  'canteen.transactions.view'
)
WHERE r.name = 'parent' AND r.school_id IS NULL;


-- ── student → View own data + cast votes (future) ────────────────────────────

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.students.read',          'core.student_assignments.read',
  'voting.elections.read',       'voting.candidates.read',
  'voting.votes.cast',           'voting.results.view',
  'bus.routes.read',             'bus.assignments.read',
  'canteen.menu.read',
  'canteen.orders.read',
  'canteen.wallet.view',         'canteen.transactions.view'
)
WHERE r.name = 'student' AND r.school_id IS NULL;

-- -----------------------------------------------------
-- SEED: Initial Users & Demo DPS School Credentials
-- -----------------------------------------------------
INSERT INTO `core_users` (`user_id`, `school_id`, `username`, `email`, `phone`, `password_hash`, `is_active`)
VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'superadmin', 'superadmin@saarthi.platform', '+919999900000', '$2b$10$VShmg/dm9tYbhzGguSMsVuHzK4MMBaLC/z0ZsbFghIVTz5FnqNtcC', TRUE)
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `is_active` = TRUE;

INSERT IGNORE INTO `core_user_roles` (`user_role_id`, `user_id`, `role_id`, `school_id`)
SELECT '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', r.role_id, NULL
FROM `core_roles` r WHERE r.name = 'super_admin' AND r.school_id IS NULL LIMIT 1;

INSERT INTO `core_schools` (`school_id`, `name`, `code`, `address`, `city`, `state`, `country`, `phone`, `email`, `timezone`, `is_active`)
VALUES ('11111111-1111-1111-1111-111111111111', 'Delhi Public School', 'DPS-DELHI', 'Sector 12, R.K. Puram', 'New Delhi', 'Delhi', 'India', '+911126170051', 'info@dpsrkp.net', 'Asia/Kolkata', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT IGNORE INTO `core_school_modules` (`school_module_id`, `school_id`, `module_name`, `is_enabled`)
VALUES
  (UUID(), '11111111-1111-1111-1111-111111111111', 'id_card', TRUE),
  (UUID(), '11111111-1111-1111-1111-111111111111', 'voting', TRUE),
  (UUID(), '11111111-1111-1111-1111-111111111111', 'bus', TRUE),
  (UUID(), '11111111-1111-1111-1111-111111111111', 'canteen', TRUE);

INSERT IGNORE INTO `core_academic_years` (`academic_year_id`, `school_id`, `name`, `start_date`, `end_date`, `is_current`)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2025-2026', '2025-04-01', '2026-03-31', TRUE);

INSERT INTO `core_users` (`user_id`, `school_id`, `username`, `email`, `phone`, `password_hash`, `is_active`)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'principal_dps', 'principal@dpsrkp.net', '+919811122233', '$2b$10$OWIW257prAUf6jir0NbWWeTKzP0iBks9yQw0BCL/DxSR078Yd0aVi', TRUE)
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `school_id` = VALUES(`school_id`), `is_active` = TRUE;

INSERT IGNORE INTO `core_user_roles` (`user_role_id`, `user_id`, `role_id`, `school_id`)
SELECT '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', r.role_id, '11111111-1111-1111-1111-111111111111'
FROM `core_roles` r WHERE r.name = 'school_admin' AND r.school_id IS NULL LIMIT 1;

SET FOREIGN_KEY_CHECKS = 1;
