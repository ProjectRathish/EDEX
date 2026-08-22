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
