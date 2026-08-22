-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 003_create_core_school_modules.sql
-- Table     : core_school_modules
-- Purpose   : Controls which optional SAARTHI modules are activated per school.
--             On school creation, 4 rows are inserted (one per module) with
--             is_enabled = FALSE. The Super Admin enables modules per school.
--             The backend middleware checks this table before routing any
--             module API call — disabled modules return HTTP 403.
--
-- Modules   : id_card | voting | bus | canteen
--             Core itself is always available and NOT stored here.
--
-- Constraint: UNIQUE(school_id, module_name)
--
-- NOTE on activated_by:
--   This column logically references core_users, but core_users is created
--   at migration 012 (after this table). To avoid a circular FK dependency,
--   activated_by is stored as CHAR(36) NULL WITHOUT a FK constraint here.
--   The backend must validate that activated_by is a valid user_id.
--
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_school_modules` (
  `school_module_id`  CHAR(36)                                NOT NULL COMMENT 'UUID',
  `school_id`         CHAR(36)                                NOT NULL,
  `module_name`       ENUM('id_card','voting','bus','canteen') NOT NULL COMMENT 'Core is always on and not listed here',
  `is_enabled`        BOOLEAN                                 NOT NULL DEFAULT FALSE,
  `activated_at`      TIMESTAMP                               NULL     DEFAULT NULL COMMENT 'When this module was last enabled',
  `activated_by`      CHAR(36)                                NULL     DEFAULT NULL COMMENT 'user_id of Super Admin who activated — no FK (see note above)',
  `expires_at`        TIMESTAMP                               NULL     DEFAULT NULL COMMENT 'Future subscription expiry. NULL = no expiry.',
  `notes`             TEXT                                    NULL,
  `created_at`        TIMESTAMP                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP                               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`school_module_id`),
  UNIQUE  KEY `uq_school_modules_school_module` (`school_id`, `module_name`),
  KEY          `idx_school_modules_school`       (`school_id`),
  KEY          `idx_school_modules_enabled`      (`school_id`, `is_enabled`),

  CONSTRAINT `fk_sm_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Module activation gate per school. 4 rows per school (id_card/voting/bus/canteen). Middleware checks this before every module API call.';
