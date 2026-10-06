-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 032_prevent_duplicate_bus_staff_assignments.sql
-- Table     : bus_staff_assignments
-- Purpose   : Clean up any duplicate active staff assignments across vehicles
--             in the same academic year so each driver/attender is on at most
--             one bus at any given time.
-- =============================================================================

-- Deactivate older duplicate active assignments for the same staff member
-- in the same academic year and role, leaving only the latest assignment active.
UPDATE bus_staff_assignments b1
JOIN (
  SELECT bsa.id
  FROM bus_staff_assignments bsa
  WHERE bsa.is_active = 1
    AND EXISTS (
      SELECT 1
      FROM bus_staff_assignments other
      WHERE other.staff_id = bsa.staff_id
        AND other.academic_year_id = bsa.academic_year_id
        AND other.is_active = 1
        AND (
          other.created_at > bsa.created_at
          OR (other.created_at = bsa.created_at AND other.id > bsa.id)
        )
    )
) duplicates ON b1.id = duplicates.id
SET b1.is_active = 0,
    b1.effective_to = CURDATE()
WHERE b1.is_active = 1;
