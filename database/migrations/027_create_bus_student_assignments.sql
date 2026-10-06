-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 027_create_bus_student_assignments.sql
-- Table     : bus_student_assignments
-- Purpose   : Assigns a student to a specific route and boarding stop.
--
--             CRITICAL RULE: Zero data duplication.
--             Only student_id is stored as FK. Name, class, photo are
--             always read from core_students at runtime via JOIN.
--
--             Direction: A student may have ONE assignment per direction
--             (morning, evening, or both) per academic year.
--             UNIQUE(academic_year_id, student_id, direction) enforces this.
--
--             Fee: Stores the agreed fee amount for reference. Payment
--             tracking to be handled in a future fee management module.
--
-- Depends on: core_students, bus_routes, bus_stops, core_academic_years
-- =============================================================================

CREATE TABLE IF NOT EXISTS `bus_student_assignments` (
  `assignment_id`    CHAR(36)                            NOT NULL COMMENT 'UUID',
  `school_id`        CHAR(36)                            NOT NULL COMMENT 'Tenant boundary — denormalized for efficient school-level queries',
  `academic_year_id` CHAR(36)                            NOT NULL COMMENT 'Assignment is scoped per academic year',
  `student_id`       CHAR(36)                            NOT NULL COMMENT 'FK to core_students — zero data duplication',
  `route_id`         CHAR(36)                            NOT NULL COMMENT 'Assigned bus route',
  `stop_id`          CHAR(36)                            NOT NULL COMMENT 'Boarding/alighting stop for this student',
  `direction`        ENUM('morning','evening','both')    NOT NULL DEFAULT 'both' COMMENT 'morning=pickup only, evening=drop only, both=full service',
  `fee_amount`       DECIMAL(10,2)                       NULL     COMMENT 'Agreed transport fee (monthly or annual as per school policy). Reference only in Phase 1.',
  `fee_type`         ENUM('monthly','annual')            NULL     COMMENT 'Whether fee_amount is monthly or annual',
  `is_free`          TINYINT(1)                          NOT NULL DEFAULT 0 COMMENT '1 if student has fee waiver/scholarship',
  `status`           ENUM('active','inactive','on_leave') NOT NULL DEFAULT 'active',
  `notes`            VARCHAR(500)                        NULL,
  `assigned_by`      CHAR(36)                            NULL     COMMENT 'Staff/user who made the assignment (for audit)',
  `assigned_at`      TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`       TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`assignment_id`),
  UNIQUE  KEY `uq_student_bus_direction` (`academic_year_id`, `student_id`, `direction`),
  KEY          `idx_bus_assignment_school`  (`school_id`),
  KEY          `idx_bus_assignment_route`   (`route_id`),
  KEY          `idx_bus_assignment_stop`    (`stop_id`),
  KEY          `idx_bus_assignment_student` (`student_id`),
  KEY          `idx_bus_assignment_ay`      (`academic_year_id`),

  CONSTRAINT `fk_bsa_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_bsa_academic_year`
    FOREIGN KEY (`academic_year_id`) REFERENCES `core_academic_years` (`academic_year_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_bsa_student`
    FOREIGN KEY (`student_id`) REFERENCES `core_students` (`student_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_bsa_route`
    FOREIGN KEY (`route_id`) REFERENCES `bus_routes` (`route_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT `fk_bsa_stop`
    FOREIGN KEY (`stop_id`) REFERENCES `bus_stops` (`stop_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Student bus assignments per academic year. References core_students via FK only — zero data duplication.';
