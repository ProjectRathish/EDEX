-- =============================================================================
-- EDEX Database Migration
-- Migration : 034_purge_old_bus_gps_pings.sql
-- Purpose   : Scheduled maintenance for bus_gps_pings table.
--             Keeps database lightweight on shared hosting environments
--             by automatically purging location pings older than 14 days.
-- =============================================================================

-- Ensure event scheduler is enabled on MySQL server
SET GLOBAL event_scheduler = ON;

-- Create recurring daily event to purge telemetry older than 14 days
DROP EVENT IF EXISTS `purge_old_bus_gps_pings`;

DELIMITER $$

CREATE EVENT `purge_old_bus_gps_pings`
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 2 HOUR)
COMMENT 'Automatically removes historical bus GPS pings older than 14 days to preserve disk and index performance.'
DO
BEGIN
    DELETE FROM `bus_gps_pings`
    WHERE `received_at` < NOW() - INTERVAL 14 DAY;
END $$

DELIMITER ;
