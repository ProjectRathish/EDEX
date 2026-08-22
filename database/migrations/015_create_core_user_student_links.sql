-- =============================================================================
-- SAARTHI · saarthi_db
-- Migration : 015_create_core_user_student_links.sql
-- Table     : core_user_student_links
-- Purpose   : Links a user login account to a student profile.
--             FUTURE USE — for the student portal/app where students can log
--             in to view timetable, canteen balance, bus tracking, etc.
--             Schema created now to avoid breaking changes later.
--             Not actively used in Phase 1.
-- Constraint: UNIQUE(user_id, student_id)
-- Depends on: core_users, core_students, core_schools
-- =============================================================================

CREATE TABLE IF NOT EXISTS `core_user_student_links` (
  `link_id`     CHAR(36)   NOT NULL COMMENT 'UUID',
  `user_id`     CHAR(36)   NOT NULL,
  `student_id`  CHAR(36)   NOT NULL,
  `school_id`   CHAR(36)   NOT NULL,
  `created_at`  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`link_id`),
  UNIQUE  KEY `uq_usr_student_pair`   (`user_id`, `student_id`),
  KEY          `idx_stu_link_user`    (`user_id`),
  KEY          `idx_stu_link_student` (`student_id`),
  KEY          `idx_stu_link_school`  (`school_id`),

  CONSTRAINT `fk_ustl_user`
    FOREIGN KEY (`user_id`) REFERENCES `core_users` (`user_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_ustl_student`
    FOREIGN KEY (`student_id`) REFERENCES `core_students` (`student_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT `fk_ustl_school`
    FOREIGN KEY (`school_id`) REFERENCES `core_schools` (`school_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Links user accounts to student profiles. Future use: student portal login. Created now to prevent future schema breaking changes.';
