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
