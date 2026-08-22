-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 020_create_core_school_enquiries.sql
-- Table     : core_school_enquiries
-- Purpose   : Captures onboarding registration requests / enquiries submitted
--             by prospective schools. Super Admin can review, reject, or
--             1-click approve & auto-provision the school tenant and admin user.
-- Depends on: (none — independent onboarding pipeline)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_school_enquiries` (
  `enquiry_id`           CHAR(36)     NOT NULL                     COMMENT 'UUID — primary key',
  `school_name`          VARCHAR(255) NOT NULL                     COMMENT 'Proposed school name (must be unique upon creation)',
  `proposed_code`        VARCHAR(50)  NULL                         COMMENT 'Optional proposed code e.g. DPS-DELHI',
  `contact_person_name`  VARCHAR(150) NOT NULL                     COMMENT 'Principal or Trustee name',
  `email`                VARCHAR(255) NOT NULL                     COMMENT 'Primary communication email',
  `phone`                VARCHAR(20)  NOT NULL                     COMMENT 'Primary contact phone',
  `city`                 VARCHAR(100) NULL,
  `state`                VARCHAR(100) NULL,
  `country`              VARCHAR(100) NOT NULL DEFAULT 'India',
  `estimated_students`   INT          NULL     DEFAULT 500,
  `message`              TEXT         NULL                         COMMENT 'Special requirements or remarks',
  `status`               ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `admin_notes`          TEXT         NULL                         COMMENT 'Internal review notes or rejection reason',
  `approved_school_id`   CHAR(36)     NULL                         COMMENT 'FK to core_schools once approved',
  `approved_by`          CHAR(36)     NULL                         COMMENT 'Super admin user_id who approved',
  `approved_at`          TIMESTAMP    NULL     DEFAULT NULL,
  `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`enquiry_id`),
  KEY `idx_enquiries_status` (`status`),
  KEY `idx_enquiries_email`  (`email`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Onboarding inquiries from prospective schools. Super Admin approves to auto-provision school tenant.';
