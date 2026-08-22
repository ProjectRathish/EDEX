-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 001_create_core_schools.sql
-- Table     : core_schools
-- Purpose   : Top-level tenant record. Every school on the SAARTHI platform
--             has exactly one row here. ALL other school-scoped tables carry
--             school_id as a foreign key to this table.
-- Depends on: (none — this is the root table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_schools` (
  `school_id`   CHAR(36)     NOT NULL                    COMMENT 'UUID — primary key',
  `name`        VARCHAR(255) NOT NULL                    COMMENT 'Full official school name',
  `code`        VARCHAR(50)  NOT NULL                    COMMENT 'Short unique slug, e.g. DPS-DELHI',
  `address`     TEXT         NULL,
  `city`        VARCHAR(100) NULL,
  `state`       VARCHAR(100) NULL,
  `country`     VARCHAR(100) NOT NULL DEFAULT 'India',
  `phone`       VARCHAR(20)  NULL,
  `email`       VARCHAR(255) NULL,
  `logo_url`    LONGTEXT     NULL                        COMMENT 'Base64 data URI or storage URL for school crest/logo',
  `timezone`    VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
  `is_active`   BOOLEAN      NOT NULL DEFAULT TRUE       COMMENT 'Super Admin can deactivate a school',
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  TIMESTAMP    NULL     DEFAULT NULL       COMMENT 'Soft delete',

  PRIMARY KEY (`school_id`),
  UNIQUE  KEY `uq_schools_code`      (`code`),
  KEY          `idx_schools_active`  (`is_active`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Root tenant table. One row per school. All school-scoped tables FK to school_id here.';
