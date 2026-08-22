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
