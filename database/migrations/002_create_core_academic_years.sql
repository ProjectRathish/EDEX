-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 002_create_core_academic_years.sql
-- Table     : core_academic_years
-- Purpose   : Defines academic periods within a school (e.g. "2025-26").
--             All time-scoped data — student assignments, staff assignments,
--             bus assignments, voting elections — references an academic_year_id.
-- Constraint: UNIQUE(school_id, name) — one name per school.
-- Note      : Only ONE academic year should be is_current=TRUE per school.
--             MySQL cannot enforce this with a simple unique constraint because
--             multiple FALSE values are allowed. The backend service layer must
--             enforce the single-current-year rule transactionally.
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_academic_years` (
  `academic_year_id`  CHAR(36)                            NOT NULL COMMENT 'UUID',
  `school_id`         CHAR(36)                            NOT NULL COMMENT 'Tenant boundary',
  `name`              VARCHAR(20)                         NOT NULL COMMENT 'e.g. 2025-26',
  `start_date`        DATE                                NOT NULL,
  `end_date`          DATE                                NOT NULL,
  `is_current`        BOOLEAN                             NOT NULL DEFAULT FALSE COMMENT 'Only one TRUE per school — enforced by backend, not DB constraint',
  `status`            ENUM('upcoming','active','closed')  NOT NULL DEFAULT 'upcoming',
  `created_at`        TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`academic_year_id`),
  UNIQUE  KEY `uq_academic_years_school_name` (`school_id`, `name`),
  KEY          `idx_academic_years_school`     (`school_id`),
  KEY          `idx_academic_years_current`    (`school_id`, `is_current`),

  CONSTRAINT `fk_ay_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Academic year periods per school. All time-scoped module data references academic_year_id.';
