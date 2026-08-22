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
