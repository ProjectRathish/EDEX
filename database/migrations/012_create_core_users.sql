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
