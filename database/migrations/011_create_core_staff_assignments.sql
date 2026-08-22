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
