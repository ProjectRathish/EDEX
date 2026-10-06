-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 024_create_bus_vehicles.sql
-- Table     : bus_vehicles
-- Purpose   : Fleet registry for the Bus Transportation module.
--             Stores physical vehicle details per school.
--             Does NOT duplicate staff data — driver/conductor links
--             are in bus_staff_assignments referencing core_staff.
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `bus_vehicles` (
  `bus_id`             CHAR(36)                                                 NOT NULL COMMENT 'UUID',
  `school_id`          CHAR(36)                                                 NOT NULL COMMENT 'Tenant boundary',
  `vehicle_number`     VARCHAR(20)                                              NOT NULL COMMENT 'Registration plate number, e.g. KA-01-AB-1234',
  `vehicle_name`       VARCHAR(100)                                             NULL     COMMENT 'Friendly name, e.g. "Sunshine Express"',
  `vehicle_type`       ENUM('mini_bus','large_bus','van','tempo_traveller')     NOT NULL DEFAULT 'large_bus',
  `capacity`           SMALLINT UNSIGNED                                        NOT NULL DEFAULT 40 COMMENT 'Max student seating capacity',
  `make_model`         VARCHAR(100)                                             NULL     COMMENT 'e.g. Tata Starbus, Ashok Leyland',
  `manufacture_year`   SMALLINT UNSIGNED                                        NULL,
  `gps_device_id`      VARCHAR(100)                                             NULL     COMMENT 'GPS tracker device ID for Phase 2 live tracking',
  `insurance_expiry`   DATE                                                     NULL     COMMENT 'Insurance validity date — used for fleet health warnings',
  `fitness_expiry`     DATE                                                     NULL     COMMENT 'Fitness certificate expiry — regulatory compliance',
  `permit_expiry`      DATE                                                     NULL     COMMENT 'Route permit expiry',
  `status`             ENUM('active','inactive','maintenance')                  NOT NULL DEFAULT 'active',
  `notes`              TEXT                                                     NULL,
  `created_at`         TIMESTAMP                                                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP                                                NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`         TIMESTAMP                                                NULL     DEFAULT NULL COMMENT 'Soft delete',

  PRIMARY KEY (`bus_id`),
  UNIQUE  KEY `uq_bus_vehicle_number` (`school_id`, `vehicle_number`),
  KEY          `idx_bus_school`       (`school_id`),
  KEY          `idx_bus_status`       (`school_id`, `status`),

  CONSTRAINT `fk_bus_vehicles_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Bus fleet registry. One record per physical vehicle per school.';
