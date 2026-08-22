-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 010_create_core_staff.sql
-- Table     : core_staff
-- Purpose   : Staff/employee identity records. Single source of truth for
--             staff data, used by all modules:
--               • ID Card  → staff identity cards
--               • Voting   → election officers and supervisors
--               • Bus      → drivers, conductors
--               • Canteen  → staff wallet/canteen accounts
--               • Core     → class teacher assignments
-- Constraint: UNIQUE(school_id, employee_id)
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_staff` (
  `staff_id`         CHAR(36)                             NOT NULL COMMENT 'UUID',
  `school_id`        CHAR(36)                             NOT NULL COMMENT 'Tenant boundary',
  `employee_id`      VARCHAR(50)                          NOT NULL COMMENT 'School-assigned employee number',
  `first_name`       VARCHAR(100)                         NOT NULL,
  `last_name`        VARCHAR(100)                         NOT NULL,
  `designation`      VARCHAR(100)                         NULL     COMMENT 'e.g. Principal, Teacher, Accountant',
  `department`       VARCHAR(100)                         NULL     COMMENT 'e.g. Science, Mathematics, Administration',
  `date_of_joining`  DATE                                 NULL,
  `phone`            VARCHAR(20)                          NULL,
  `email`            VARCHAR(255)                         NULL,
  `photo_url`        VARCHAR(500)                         NULL     COMMENT 'Reference path in /storage',
  `status`           ENUM('active','inactive','resigned') NOT NULL DEFAULT 'active',
  `created_at`       TIMESTAMP                            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP                            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`       TIMESTAMP                            NULL     DEFAULT NULL COMMENT 'Soft delete — retain for historical records',

  PRIMARY KEY (`staff_id`),
  UNIQUE  KEY `uq_staff_school_employee`  (`school_id`, `employee_id`),
  KEY          `idx_staff_school`          (`school_id`),
  KEY          `idx_staff_status`          (`school_id`, `status`),
  KEY          `idx_staff_name`            (`school_id`, `last_name`, `first_name`),

  CONSTRAINT `fk_staff_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Staff/employee identity. Single source of truth. All modules reference staff_id — they never copy this data.';
