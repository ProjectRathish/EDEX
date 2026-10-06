-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 025_create_bus_routes.sql
-- Table     : bus_routes
-- Purpose   : Named transport routes per school per academic year.
--             Each route has an assigned bus (FK → bus_vehicles).
--             Stops are stored separately in bus_stops.
-- Depends on: core_schools, core_academic_years, bus_vehicles
-- =============================================================================

CREATE TABLE IF NOT EXISTS `bus_routes` (
  `route_id`           CHAR(36)                             NOT NULL COMMENT 'UUID',
  `school_id`          CHAR(36)                             NOT NULL COMMENT 'Tenant boundary',
  `academic_year_id`   CHAR(36)                             NOT NULL COMMENT 'Routes are scoped per academic year',
  `route_name`         VARCHAR(150)                         NOT NULL COMMENT 'e.g. "North Zone Route", "Highway Express"',
  `route_code`         VARCHAR(20)                          NOT NULL COMMENT 'Short code e.g. "R01", "NZ-A"',
  `description`        VARCHAR(500)                         NULL     COMMENT 'Coverage area description',
  `assigned_bus_id`    CHAR(36)                             NULL     COMMENT 'Vehicle assigned to this route',
  `start_point`        VARCHAR(200)                         NULL     COMMENT 'Route origin description',
  `end_point`          VARCHAR(200)                         NULL     COMMENT 'Route terminus description (usually the school)',
  `morning_start_time` TIME                                 NULL     COMMENT 'When the bus departs from first stop in morning',
  `evening_start_time` TIME                                 NULL     COMMENT 'When the bus departs from school in evening',
  `total_distance_km`  DECIMAL(6,2)                         NULL     COMMENT 'Approximate route distance in km',
  `monthly_fee`        DECIMAL(10,2)                        NULL     COMMENT 'Default monthly fee for this route (overrideable per student)',
  `annual_fee`         DECIMAL(10,2)                        NULL     COMMENT 'Default annual fee for this route',
  `status`             ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `created_at`         TIMESTAMP                            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP                            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`         TIMESTAMP                            NULL     DEFAULT NULL COMMENT 'Soft delete',

  PRIMARY KEY (`route_id`),
  UNIQUE  KEY `uq_bus_route_code`    (`school_id`, `academic_year_id`, `route_code`),
  KEY          `idx_bus_route_school` (`school_id`),
  KEY          `idx_bus_route_ay`     (`school_id`, `academic_year_id`),
  KEY          `idx_bus_route_status` (`school_id`, `status`),

  CONSTRAINT `fk_bus_routes_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_bus_routes_academic_year`
    FOREIGN KEY (`academic_year_id`) REFERENCES `core_academic_years` (`academic_year_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_bus_routes_vehicle`
    FOREIGN KEY (`assigned_bus_id`) REFERENCES `bus_vehicles` (`bus_id`)
    ON UPDATE CASCADE ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Bus routes per academic year. Each route has stops (bus_stops) and student assignments (bus_student_assignments).';
