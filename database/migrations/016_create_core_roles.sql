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
