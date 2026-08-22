-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 017_create_core_permissions.sql
-- Table     : core_permissions
-- Purpose   : Defines every controllable action in the SAARTHI system.
--             Uses dot-notation: module.resource.action
--             e.g. core.students.read, id_card.cards.print
--
--             All permissions are platform-wide definitions (no school_id).
--             Seeded once at startup via seeds/001_core_system_seed.sql.
--             Adding a new module = INSERT new permission rows only.
--             No schema changes needed.
--
-- Constraint: UNIQUE(name), UNIQUE(module, resource, action)
-- Depends on: (none — permissions are platform-wide definitions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_permissions` (
  `permission_id`  CHAR(36)                                              NOT NULL COMMENT 'UUID',
  `name`           VARCHAR(100)                                          NOT NULL COMMENT 'Dot-notation: module.resource.action',
  `module`         ENUM('core','id_card','voting','bus','canteen')        NOT NULL COMMENT 'Which module this permission controls',
  `resource`       VARCHAR(50)                                           NOT NULL COMMENT 'e.g. students, elections, routes, wallet',
  `action`         VARCHAR(50)                                           NOT NULL COMMENT 'e.g. read, create, delete, print, manage, cast',
  `description`    TEXT                                                  NULL     COMMENT 'Human-readable description for admin UI',
  `created_at`     TIMESTAMP                                             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`permission_id`),
  UNIQUE  KEY `uq_permissions_name`          (`name`),
  UNIQUE  KEY `uq_permissions_module_res_act`(`module`, `resource`, `action`),
  KEY          `idx_permissions_module`       (`module`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='All RBAC permission definitions. Platform-wide. Dot-notation: module.resource.action. Seeded at startup.';
