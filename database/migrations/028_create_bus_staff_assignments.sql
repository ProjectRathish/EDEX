-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 028_create_bus_staff_assignments.sql
-- Table     : bus_staff_assignments
-- Purpose   : Assigns a driver or conductor (from core_staff) to a vehicle
--             for a given academic year.
--
--             CRITICAL RULE: Zero data duplication.
--             Only staff_id is stored as FK. Name, photo, designation
--             are always read from core_staff at runtime via JOIN.
--
--             A vehicle can have ONE active driver and ONE active conductor
--             at a time per academic year. Enforced by application logic
--             and the partial unique index below.
--
-- Depends on: bus_vehicles, core_staff, core_academic_years
-- =============================================================================

CREATE TABLE IF NOT EXISTS `bus_staff_assignments` (
  `id`               CHAR(36)                        NOT NULL COMMENT 'UUID',
  `school_id`        CHAR(36)                        NOT NULL COMMENT 'Tenant boundary',
  `bus_id`           CHAR(36)                        NOT NULL COMMENT 'Assigned vehicle',
  `staff_id`         CHAR(36)                        NOT NULL COMMENT 'FK to core_staff — zero data duplication',
  `role`             ENUM('driver','conductor')      NOT NULL COMMENT 'Role in this vehicle assignment',
  `academic_year_id` CHAR(36)                        NOT NULL COMMENT 'Assignment scoped per academic year',
  `effective_from`   DATE                            NOT NULL DEFAULT (CURRENT_DATE) COMMENT 'When this assignment starts',
  `effective_to`     DATE                            NULL     COMMENT 'When this assignment ends (NULL = currently active)',
  `is_active`        TINYINT(1)                      NOT NULL DEFAULT 1,
  `notes`            VARCHAR(300)                    NULL,
  `created_at`       TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  -- One active driver + one active conductor per vehicle per academic year
  UNIQUE  KEY `uq_bus_staff_role_ay`  (`bus_id`, `role`, `academic_year_id`, `is_active`),
  KEY          `idx_bsa_school`        (`school_id`),
  KEY          `idx_bsa_bus`           (`bus_id`),
  KEY          `idx_bsa_staff`         (`staff_id`),
  KEY          `idx_bsa_ay`            (`academic_year_id`),

  CONSTRAINT `fk_bus_staff_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_bus_staff_vehicle`
    FOREIGN KEY (`bus_id`) REFERENCES `bus_vehicles` (`bus_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_bus_staff_member`
    FOREIGN KEY (`staff_id`) REFERENCES `core_staff` (`staff_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_bus_staff_ay`
    FOREIGN KEY (`academic_year_id`) REFERENCES `core_academic_years` (`academic_year_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Driver/conductor assignments to vehicles. References core_staff via FK only — zero data duplication.';
