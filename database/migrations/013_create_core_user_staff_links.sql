-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 013_create_core_user_staff_links.sql
-- Table     : core_user_staff_links
-- Purpose   : Links a user login account to a staff profile.
--             Enables the user to access staff features and permissions.
--
--             Part of the Explicit Link Table Identity Design:
--             A teacher who is also a parent has ONE user account (core_users)
--             with links to BOTH a staff record (here) AND a guardian record
--             (core_user_guardian_links). No polymorphism needed.
--
-- Constraint: UNIQUE(user_id, staff_id)
-- Depends on: core_users, core_staff, core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_user_staff_links` (
  `link_id`     CHAR(36)   NOT NULL COMMENT 'UUID',
  `user_id`     CHAR(36)   NOT NULL,
  `staff_id`    CHAR(36)   NOT NULL,
  `school_id`   CHAR(36)   NOT NULL,
  `is_primary`  BOOLEAN    NOT NULL DEFAULT TRUE COMMENT 'Primary link if user has multiple staff records (rare edge case)',
  `created_at`  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`link_id`),
  UNIQUE  KEY `uq_usr_staff_pair`     (`user_id`, `staff_id`),
  KEY          `idx_usl_user`         (`user_id`),
  KEY          `idx_usl_staff`        (`staff_id`),
  KEY          `idx_usl_school`       (`school_id`),

  CONSTRAINT `fk_usl_user`
    FOREIGN KEY (`user_id`) REFERENCES `core_users` (`user_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_usl_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `core_staff` (`staff_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_usl_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Links user login accounts to staff profiles. Enables staff portal access. Part of explicit link table identity design.';
