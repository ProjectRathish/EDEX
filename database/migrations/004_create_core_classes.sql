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
