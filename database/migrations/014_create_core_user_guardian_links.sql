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
