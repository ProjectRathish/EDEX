-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 008_create_core_guardians.sql
-- Table     : core_guardians
-- Purpose   : Parent/guardian identity records. Shared across all modules:
--               • Bus module  → can_pickup flag (on junction table)
--               • Canteen     → parent wallet top-up notifications
--               • ID Card     → emergency contact on card back
--               • Core auth   → parent login via core_user_guardian_links
--             Many-to-many with students is in core_student_guardians (009).
-- Depends on: core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_guardians` (
  `guardian_id`       CHAR(36)                                          NOT NULL COMMENT 'UUID',
  `school_id`         CHAR(36)                                          NOT NULL COMMENT 'Tenant boundary',
  `first_name`        VARCHAR(100)                                      NOT NULL,
  `last_name`         VARCHAR(100)                                      NOT NULL,
  `relationship_type` ENUM('father','mother','legal_guardian','other')  NOT NULL,
  `phone`             VARCHAR(20)                                       NULL,
  `email`             VARCHAR(255)                                      NULL,
  `address`           TEXT                                              NULL,
  `occupation`        VARCHAR(100)                                      NULL,
  `photo_url`         VARCHAR(500)                                      NULL     COMMENT 'Reference path in /storage',
  `is_active`         BOOLEAN                                           NOT NULL DEFAULT TRUE,
  `created_at`        TIMESTAMP                                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP                                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`        TIMESTAMP                                         NULL     DEFAULT NULL,

  PRIMARY KEY (`guardian_id`),
  KEY `idx_guardians_school`  (`school_id`),
  KEY `idx_guardians_phone`   (`school_id`, `phone`),
  KEY `idx_guardians_email`   (`school_id`, `email`),
  KEY `idx_guardians_active`  (`school_id`, `is_active`),

  CONSTRAINT `fk_guardians_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Parent/guardian identity. School-scoped. Linked to students via core_student_guardians (many-to-many).';
