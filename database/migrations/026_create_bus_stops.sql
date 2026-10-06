-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 026_create_bus_stops.sql
-- Table     : bus_stops
-- Purpose   : Ordered list of pickup/drop stops on a bus route.
--             sequence_order drives the visual stop timeline on the frontend.
--             lat/lng are stored for Phase 2 map integration.
-- Depends on: bus_routes
-- =============================================================================

CREATE TABLE IF NOT EXISTS `bus_stops` (
  `stop_id`          CHAR(36)        NOT NULL COMMENT 'UUID',
  `route_id`         CHAR(36)        NOT NULL COMMENT 'Parent route',
  `stop_name`        VARCHAR(150)    NOT NULL COMMENT 'Name of the landmark/stop, e.g. "City Park Gate"',
  `stop_address`     VARCHAR(500)    NULL     COMMENT 'Full address or description',
  `sequence_order`   SMALLINT        NOT NULL DEFAULT 1 COMMENT 'Order of this stop in the morning route (1 = first pickup)',
  `morning_time`     TIME            NULL     COMMENT 'Scheduled morning pickup time at this stop',
  `evening_time`     TIME            NULL     COMMENT 'Scheduled evening drop time at this stop',
  `latitude`         DECIMAL(10,7)   NULL     COMMENT 'GPS latitude — for Phase 2 map/geo features',
  `longitude`        DECIMAL(10,7)   NULL     COMMENT 'GPS longitude — for Phase 2 map/geo features',
  `landmark`         VARCHAR(200)    NULL     COMMENT 'Notable landmark near stop for guardian reference',
  `is_school_stop`   TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 if this is the school gate stop (usually last morning stop)',
  `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`stop_id`),
  UNIQUE  KEY `uq_stop_route_sequence`  (`route_id`, `sequence_order`),
  KEY          `idx_bus_stops_route`     (`route_id`),

  CONSTRAINT `fk_bus_stops_route`
    FOREIGN KEY (`route_id`) REFERENCES `bus_routes` (`route_id`)
    ON UPDATE CASCADE ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stops on a bus route in sequence order. Supports lat/lng for Phase 2 map integration.';
