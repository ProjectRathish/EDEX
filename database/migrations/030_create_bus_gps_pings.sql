-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 030_create_bus_gps_pings.sql
-- Table     : bus_gps_pings
-- Purpose   : Real-time GPS location pings from the driver's mobile app.
--
--             HOW IT WORKS:
--             1. Driver opens the SAARTHI driver app and starts a trip.
--             2. The app sends GPS coordinates every ~10 seconds to
--                POST /api/v1/bus/tracking/ping
--             3. This table stores each ping with timestamp.
--             4. The parent/student mobile app calls
--                GET /api/v1/bus/tracking/:routeId/live
--                which returns the LATEST ping for that route's vehicle.
--             5. The mobile map renders the bus icon at that position,
--                overlaid on the bus_route_paths polyline.
--
--             ETA CALCULATION (future):
--             Backend can compare current lat/lng against bus_stops
--             sequence to calculate "X stops away" and estimated arrival.
--
--             DATA RETENTION:
--             Pings older than 7 days can be safely purged.
--             Only the latest ping per vehicle matters for live tracking.
--             Historical pings can be used for route analytics / replays.
--
--             TRIP CONCEPT:
--             trip_id groups pings for one school run (morning / evening).
--             This allows replay, analytics, and helps detect if bus
--             deviated from the expected route_path.
--
-- Depends on: bus_vehicles, bus_routes
-- =============================================================================

CREATE TABLE IF NOT EXISTS `bus_gps_pings` (
  `ping_id`         CHAR(36)        NOT NULL COMMENT 'UUID',
  `bus_id`          CHAR(36)        NOT NULL COMMENT 'FK to bus_vehicles — which vehicle sent this ping',
  `route_id`        CHAR(36)        NULL     COMMENT 'FK to bus_routes — which route is active (set by driver on trip start)',
  `trip_id`         CHAR(36)        NULL     COMMENT 'Groups pings for one school run (morning/evening). Same UUID for all pings in one trip.',
  `latitude`        DECIMAL(10,7)   NOT NULL COMMENT 'GPS latitude from device',
  `longitude`       DECIMAL(10,7)   NOT NULL COMMENT 'GPS longitude from device',
  `speed_kmh`       DECIMAL(5,1)    NULL     COMMENT 'Speed in km/h from device GPS',
  `heading_degrees` SMALLINT        NULL     COMMENT 'Direction bus is facing (0=North, 90=East, 180=South, 270=West)',
  `accuracy_meters` FLOAT           NULL     COMMENT 'GPS accuracy radius in metres (smaller = better)',
  `altitude_m`      FLOAT           NULL     COMMENT 'Altitude in metres (optional)',
  `is_trip_active`  TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '0 when driver ends the trip',
  `recorded_at`     TIMESTAMP(3)    NOT NULL COMMENT 'When the GPS device captured this position (millisecond precision)',
  `received_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the server received this ping',

  PRIMARY KEY (`ping_id`),

  -- Fast lookup: latest ping for a given vehicle (used by mobile app)
  KEY `idx_gps_bus_received`    (`bus_id`, `received_at` DESC),

  -- Fast lookup: latest ping for a route (parent app queries by route)
  KEY `idx_gps_route_received`  (`route_id`, `received_at` DESC),

  -- Trip grouping for replay / analytics
  KEY `idx_gps_trip`            (`trip_id`, `recorded_at` ASC),

  -- Active trip lookup (driver app heartbeat check)
  KEY `idx_gps_active_trip`     (`bus_id`, `is_trip_active`),

  CONSTRAINT `fk_gps_bus`
    FOREIGN KEY (`bus_id`) REFERENCES `bus_vehicles` (`bus_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_gps_route`
    FOREIGN KEY (`route_id`) REFERENCES `bus_routes` (`route_id`)
    ON UPDATE CASCADE ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Real-time GPS pings from driver mobile app. Mobile parent/student app queries latest ping per route for live bus tracking on OpenStreetMap.';
