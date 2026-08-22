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
