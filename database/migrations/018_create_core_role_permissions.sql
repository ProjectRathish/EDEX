-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 018_create_core_role_permissions.sql
-- Table     : core_role_permissions
-- Purpose   : Junction table — assigns permissions to roles.
--             Composite PK(role_id, permission_id) prevents duplicates.
--             Seeded with default permission sets per system role.
-- Depends on: core_roles, core_permissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_role_permissions` (
  `role_id`        CHAR(36)   NOT NULL,
  `permission_id`  CHAR(36)   NOT NULL,
  `created_at`     TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`role_id`, `permission_id`),
  KEY `idx_rp_role_id`        (`role_id`),
  KEY `idx_rp_permission_id`  (`permission_id`),

  CONSTRAINT `fk_rp_role`
    FOREIGN KEY (`role_id`) REFERENCES `core_roles` (`role_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_rp_permission`
    FOREIGN KEY (`permission_id`) REFERENCES `core_permissions` (`permission_id`)
    ON UPDATE CASCADE ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Role-permission assignments. Composite PK prevents duplicates. Populated by seed file.';
