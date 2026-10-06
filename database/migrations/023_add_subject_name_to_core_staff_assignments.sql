-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 023_add_subject_name_to_core_staff_assignments.sql
-- Table     : core_staff_assignments
-- Purpose   : Adds subject_name column to core_staff_assignments for subject teacher
--             and timetable class assignments.
-- =============================================================================

SET @dbname = DATABASE();
SET @tablename = 'core_staff_assignments';
SET @columnname = 'subject_name';

SET @preparedStatement = (
  SELECT IF(
    (
      SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = @tablename
        AND COLUMN_NAME = @columnname
    ) > 0,
    'SELECT 1',
    'ALTER TABLE `core_staff_assignments` ADD COLUMN `subject_name` VARCHAR(100) NULL AFTER `role_in_class`;'
  )
);

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
