-- =============================================================================
-- EDEX · saarthi_db
-- Migration : 022_enhance_core_staff.sql
-- Table     : core_staff, core_staff_assignments
-- Purpose   : Adds extended profile, short_name, category, gender, secondary_phone,
--             leadership_role, address, blood_group to core_staff and expands
--             role_in_class in core_staff_assignments for Class Teacher,
--             Assistant Class Teacher, Section Heads (LP/UP/HS/HSS/KG),
--             Vice Principal, Principal.
-- =============================================================================

SET @dbname = DATABASE();
SET @tablename = 'core_staff';

-- 1. Short Name (e.g. SEJU, RK, MK)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'short_name'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD COLUMN short_name VARCHAR(50) NULL AFTER employee_id;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Category (Teaching, Non-Teaching, Admin, Support)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'category'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD COLUMN category VARCHAR(50) NULL DEFAULT \'Teaching\' AFTER designation;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Date of Birth
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'date_of_birth'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD COLUMN date_of_birth DATE NULL AFTER department;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 4. Gender (male, female, other)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'gender'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD COLUMN gender ENUM(\'male\', \'female\', \'other\') NULL DEFAULT \'other\' AFTER date_of_birth;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 5. Secondary Phone / Mobile No
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'secondary_phone'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD COLUMN secondary_phone VARCHAR(20) NULL AFTER phone;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 6. Leadership / Additional Role (e.g. Principal, Vice Principal, Section Head LP/UP/HS/HSS/KG, Class Teacher)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'leadership_role'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD COLUMN leadership_role VARCHAR(100) NULL AFTER category;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 7. Blood Group
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'blood_group'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD COLUMN blood_group VARCHAR(10) NULL AFTER gender;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 8. Address
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'address'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD COLUMN address TEXT NULL AFTER photo_url;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 9. Expand role_in_class in core_staff_assignments to VARCHAR(100)
ALTER TABLE `core_staff_assignments` MODIFY COLUMN `role_in_class` VARCHAR(100) NULL COMMENT 'e.g. class_teacher, assistant_class_teacher, section_head_lp, section_head_up, section_head_hs, section_head_hss, section_head_kg, vice_principal, principal, subject_teacher, coordinator';

-- 10. Add Indexes
SET @indexCategory = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'core_staff'
    AND INDEX_NAME = 'idx_staff_category'
);
SET @preparedStatement = (SELECT IF(
  @indexCategory > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD INDEX idx_staff_category (school_id, category);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexShortName = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'core_staff'
    AND INDEX_NAME = 'idx_staff_short_name'
);
SET @preparedStatement = (SELECT IF(
  @indexShortName > 0,
  'SELECT 1',
  'ALTER TABLE core_staff ADD INDEX idx_staff_short_name (school_id, short_name);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
