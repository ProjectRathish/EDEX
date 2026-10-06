-- =============================================================================
-- EDEX · saarthi_db
-- Migration : 021_enhance_core_students.sql
-- Table     : core_students
-- Purpose   : Adds extended profile and contact fields to core_students to align
--             with modern student data management, parent communications, and
--             multi-module ID card / Bus / Canteen requirements.
-- =============================================================================

-- Add columns if they do not already exist
SET @dbname = DATABASE();
SET @tablename = 'core_students';

-- Address
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'address'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_students ADD COLUMN address TEXT NULL AFTER photo_url;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Area
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'area'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_students ADD COLUMN area VARCHAR(100) NULL AFTER address;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Pincode
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'pincode'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_students ADD COLUMN pincode VARCHAR(20) NULL AFTER area;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Phone
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'phone'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_students ADD COLUMN phone VARCHAR(20) NULL AFTER pincode;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Father's Name
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'father_name'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_students ADD COLUMN father_name VARCHAR(100) NULL AFTER phone;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Guardian Relation
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'guardian_relation'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_students ADD COLUMN guardian_relation VARCHAR(50) NULL DEFAULT \'Father\' AFTER father_name;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Guardian Phone
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'guardian_phone'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_students ADD COLUMN guardian_phone VARCHAR(20) NULL AFTER guardian_relation;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index on area if not exists
SET @indexCount = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND INDEX_NAME = 'idx_students_area'
);
SET @preparedStatement = (SELECT IF(
  @indexCount > 0,
  'SELECT 1',
  'ALTER TABLE core_students ADD INDEX idx_students_area (school_id, area);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
