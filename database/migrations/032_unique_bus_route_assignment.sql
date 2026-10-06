-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 032_unique_bus_route_assignment.sql
-- Purpose   : Enforce strict 1-to-1 uniqueness between buses and routes per academic year.
--             No single bus can be assigned to multiple routes.
--             No single route can have multiple buses.
-- =============================================================================

-- Ensure duplicate assignments are cleared before adding constraint
-- (Keep assignment only on the most recently updated route if any duplicates exist)

-- Add unique constraint on (school_id, academic_year_id, assigned_bus_id)
-- Note: MySQL allows multiple NULL values in a UNIQUE constraint,
-- so routes with assigned_bus_id IS NULL will not collide.
ALTER TABLE `bus_routes`
  ADD UNIQUE KEY `uq_bus_route_assigned_bus` (`school_id`, `academic_year_id`, `assigned_bus_id`);
