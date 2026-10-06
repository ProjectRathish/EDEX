-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 029_create_bus_route_paths.sql
-- Table     : bus_route_paths
-- Purpose   : Stores the road-following polyline waypoints for each bus route.
--
--             HOW IT WORKS:
--             Admin places stops on the map (lat/lng in bus_stops).
--             The system calls OSRM (OpenStreetMap Routing Machine — free, no key)
--             with the ordered stop coordinates and gets back hundreds of
--             road-snapped waypoints that trace the exact road path.
--             These waypoints are saved here in sequence_order.
--
--             WHY THIS TABLE:
--             • Without it: map draws straight lines between stops (ugly, wrong)
--             • With it:    map draws the actual road the bus travels (accurate)
--
--             MOBILE TRACKING:
--             The mobile app loads this polyline once and overlays the
--             live GPS ping from bus_gps_pings on top of it.
--             This lets the app show exactly where on the road the bus is.
--
--             REGENERATION:
--             If stops change, admin clicks "Regenerate Path" in the web UI.
--             The old waypoints are deleted and replaced with fresh OSRM data.
--
-- Depends on: bus_routes
-- =============================================================================

CREATE TABLE IF NOT EXISTS `bus_route_paths` (
  `waypoint_id`    CHAR(36)        NOT NULL COMMENT 'UUID',
  `route_id`       CHAR(36)        NOT NULL COMMENT 'Parent bus route',
  `sequence_order` INT UNSIGNED    NOT NULL COMMENT 'Waypoint order along the path (1-based)',
  `latitude`       DECIMAL(10,7)   NOT NULL COMMENT 'Road-snapped latitude from OSRM',
  `longitude`      DECIMAL(10,7)   NOT NULL COMMENT 'Road-snapped longitude from OSRM',
  `is_stop`        TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 if this waypoint corresponds to a bus_stop (for highlighting on map)',
  `stop_id`        CHAR(36)        NULL     COMMENT 'FK to bus_stops if is_stop=1, else NULL',
  `source`         ENUM('osrm','manual','gps_trace')  NOT NULL DEFAULT 'osrm'
                                   COMMENT 'How this waypoint was generated',
  `created_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`waypoint_id`),
  KEY `idx_route_path_route`    (`route_id`),
  KEY `idx_route_path_sequence` (`route_id`, `sequence_order`),
  KEY `idx_route_path_stop`     (`stop_id`),

  CONSTRAINT `fk_route_path_route`
    FOREIGN KEY (`route_id`) REFERENCES `bus_routes` (`route_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_route_path_stop`
    FOREIGN KEY (`stop_id`) REFERENCES `bus_stops` (`stop_id`)
    ON UPDATE CASCADE ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Road-following polyline waypoints for each bus route. Generated via OSRM (OpenStreetMap Routing Machine). Mobile app uses this for accurate route display and live tracking overlay.';
