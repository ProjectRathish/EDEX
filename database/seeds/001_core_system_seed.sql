-- =============================================================================
-- SAARTHI · saarthi_db
-- Seed     : 001_core_system_seed.sql
-- Purpose  : Seeds all platform system data that must exist before SAARTHI
--            can be used. Contains three sections:
--              SECTION 1 — System Roles (6 roles)
--              SECTION 2 — Permissions  (62 permissions across 5 modules)
--              SECTION 3 — Role-Permission Mappings
--
-- Run AFTER: All 19 migration files (001–019) have been executed.
--
-- Rules:
--   • Does NOT create fake schools, students, staff, or guardians.
--   • All INSERTs use INSERT IGNORE to be safe on re-run.
--   • Role-Permission mapping uses SELECT by name, so it is UUID-agnostic.
--
-- =============================================================================


-- =============================================================================
-- SECTION 1 : SYSTEM ROLES
-- school_id = NULL  → platform-wide system roles
-- is_system_role = TRUE → cannot be deleted via UI
-- =============================================================================

INSERT IGNORE INTO `core_roles`
  (`role_id`, `school_id`, `name`, `description`, `is_system_role`)
VALUES
  (UUID(), NULL, 'super_admin',
   'SAARTHI platform administrator. Full access to all schools, modules, and platform settings.',
   TRUE),

  (UUID(), NULL, 'school_admin',
   'School administrator. Full management access within their assigned school.',
   TRUE),

  (UUID(), NULL, 'teacher',
   'Teaching staff. Access to assigned classes, sections, and relevant academic data.',
   TRUE),

  (UUID(), NULL, 'non_teaching_staff',
   'Non-teaching staff. Access limited to their specific functional area.',
   TRUE),

  (UUID(), NULL, 'parent',
   'Parent or guardian. View-only access to their own children''s data across enabled modules.',
   TRUE),

  (UUID(), NULL, 'student',
   'Student login. View own profile, schedule, canteen balance, bus route. (Future Phase)',
   TRUE);


-- =============================================================================
-- SECTION 2 : PERMISSIONS
-- Format    : module.resource.action (dot-notation)
-- Scope     : Platform-wide — no school_id on permissions
-- =============================================================================

INSERT IGNORE INTO `core_permissions`
  (`permission_id`, `name`, `module`, `resource`, `action`, `description`)
VALUES

-- ── CORE MODULE ──────────────────────────────────────────────────────────────

-- Schools
(UUID(), 'core.schools.read',                'core', 'schools',             'read',    'View school information'),
(UUID(), 'core.schools.manage',              'core', 'schools',             'manage',  'Create, update, and manage school records (Super Admin only)'),

-- Academic Years
(UUID(), 'core.academic_years.read',         'core', 'academic_years',      'read',    'View academic years'),
(UUID(), 'core.academic_years.manage',       'core', 'academic_years',      'manage',  'Create and manage academic years'),

-- Students
(UUID(), 'core.students.read',               'core', 'students',            'read',    'View student profiles'),
(UUID(), 'core.students.create',             'core', 'students',            'create',  'Enrol new students'),
(UUID(), 'core.students.update',             'core', 'students',            'update',  'Update student information'),
(UUID(), 'core.students.delete',             'core', 'students',            'delete',  'Deactivate or remove student records'),

-- Student Academic Assignments
(UUID(), 'core.student_assignments.read',    'core', 'student_assignments', 'read',    'View student class/section assignments'),
(UUID(), 'core.student_assignments.manage',  'core', 'student_assignments', 'manage',  'Assign or update student class/section per academic year'),

-- Staff
(UUID(), 'core.staff.read',                  'core', 'staff',               'read',    'View staff profiles'),
(UUID(), 'core.staff.create',                'core', 'staff',               'create',  'Add new staff members'),
(UUID(), 'core.staff.update',                'core', 'staff',               'update',  'Update staff information'),
(UUID(), 'core.staff.delete',                'core', 'staff',               'delete',  'Deactivate staff records'),

-- Staff Assignments
(UUID(), 'core.staff_assignments.read',      'core', 'staff_assignments',   'read',    'View staff class/section assignments'),
(UUID(), 'core.staff_assignments.manage',    'core', 'staff_assignments',   'manage',  'Assign or update staff responsibilities per academic year'),

-- Guardians
(UUID(), 'core.guardians.read',              'core', 'guardians',           'read',    'View guardian profiles'),
(UUID(), 'core.guardians.create',            'core', 'guardians',           'create',  'Add guardian records'),
(UUID(), 'core.guardians.update',            'core', 'guardians',           'update',  'Update guardian information'),
(UUID(), 'core.guardians.delete',            'core', 'guardians',           'delete',  'Remove guardian records'),

-- Classes
(UUID(), 'core.classes.read',                'core', 'classes',             'read',    'View classes'),
(UUID(), 'core.classes.manage',              'core', 'classes',             'manage',  'Create and manage classes'),

-- Sections
(UUID(), 'core.sections.read',               'core', 'sections',            'read',    'View sections'),
(UUID(), 'core.sections.manage',             'core', 'sections',            'manage',  'Create and manage sections'),

-- Users & Auth
(UUID(), 'core.users.read',                  'core', 'users',               'read',    'View user accounts'),
(UUID(), 'core.users.create',                'core', 'users',               'create',  'Create new user accounts'),
(UUID(), 'core.users.manage',                'core', 'users',               'manage',  'Full user management — activate, deactivate, reset passwords'),

-- Roles
(UUID(), 'core.roles.read',                  'core', 'roles',               'read',    'View roles and their permissions'),
(UUID(), 'core.roles.manage',                'core', 'roles',               'manage',  'Create and manage custom roles and assign permissions'),

-- Module Activation
(UUID(), 'core.modules.read',                'core', 'modules',             'read',    'View module activation status'),
(UUID(), 'core.modules.manage',              'core', 'modules',             'manage',  'Enable or disable modules per school (Super Admin only)'),

-- ── ID CARD MODULE ────────────────────────────────────────────────────────────

(UUID(), 'id_card.templates.read',           'id_card', 'templates',        'read',    'View ID card templates'),
(UUID(), 'id_card.templates.manage',         'id_card', 'templates',        'manage',  'Create and manage ID card templates'),
(UUID(), 'id_card.cards.read',               'id_card', 'cards',            'read',    'View issued ID cards'),
(UUID(), 'id_card.cards.create',             'id_card', 'cards',            'create',  'Generate new ID cards'),
(UUID(), 'id_card.cards.print',              'id_card', 'cards',            'print',   'Print or download ID cards'),
(UUID(), 'id_card.cards.delete',             'id_card', 'cards',            'delete',  'Revoke or delete ID cards'),

-- ── VOTING MODULE ─────────────────────────────────────────────────────────────

(UUID(), 'voting.elections.read',            'voting', 'elections',          'read',    'View elections'),
(UUID(), 'voting.elections.manage',          'voting', 'elections',          'manage',  'Create, update, and manage elections'),
(UUID(), 'voting.candidates.read',           'voting', 'candidates',         'read',    'View candidate nominations'),
(UUID(), 'voting.candidates.manage',         'voting', 'candidates',         'manage',  'Approve or manage candidates'),
(UUID(), 'voting.votes.cast',                'voting', 'votes',              'cast',    'Cast a vote in an election'),
(UUID(), 'voting.votes.view',                'voting', 'votes',              'view',    'View voting records (anonymised)'),
(UUID(), 'voting.results.view',              'voting', 'results',            'view',    'View election results'),
(UUID(), 'voting.results.publish',           'voting', 'results',            'publish', 'Publish or announce election results'),

-- ── BUS MODULE ───────────────────────────────────────────────────────────────

(UUID(), 'bus.routes.read',                  'bus', 'routes',               'read',    'View bus routes'),
(UUID(), 'bus.routes.manage',                'bus', 'routes',               'manage',  'Create and manage bus routes'),
(UUID(), 'bus.stops.read',                   'bus', 'stops',                'read',    'View bus stops'),
(UUID(), 'bus.stops.manage',                 'bus', 'stops',                'manage',  'Create and manage bus stops'),
(UUID(), 'bus.vehicles.read',                'bus', 'vehicles',             'read',    'View vehicle information'),
(UUID(), 'bus.vehicles.manage',              'bus', 'vehicles',             'manage',  'Add and manage vehicles'),
(UUID(), 'bus.assignments.read',             'bus', 'assignments',          'read',    'View student bus assignments'),
(UUID(), 'bus.assignments.manage',           'bus', 'assignments',          'manage',  'Assign students to routes and stops'),
(UUID(), 'bus.attendance.view',              'bus', 'attendance',           'view',    'View bus boarding/alighting logs'),
(UUID(), 'bus.attendance.manage',            'bus', 'attendance',           'manage',  'Mark and manage bus attendance records'),

-- ── CANTEEN MODULE ────────────────────────────────────────────────────────────

(UUID(), 'canteen.menu.read',                'canteen', 'menu',             'read',    'View canteen menu and items'),
(UUID(), 'canteen.menu.manage',              'canteen', 'menu',             'manage',  'Create and manage menu items'),
(UUID(), 'canteen.orders.read',              'canteen', 'orders',           'read',    'View canteen orders'),
(UUID(), 'canteen.orders.manage',            'canteen', 'orders',           'manage',  'Process and manage orders'),
(UUID(), 'canteen.wallet.view',              'canteen', 'wallet',           'view',    'View wallet balances'),
(UUID(), 'canteen.wallet.manage',            'canteen', 'wallet',           'manage',  'Top up and manage wallets'),
(UUID(), 'canteen.transactions.view',        'canteen', 'transactions',     'view',    'View transaction history'),
(UUID(), 'canteen.transactions.manage',      'canteen', 'transactions',     'manage',  'Manage and reverse transactions');


-- =============================================================================
-- SECTION 3 : ROLE-PERMISSION MAPPINGS
-- Uses INSERT ... SELECT by name — UUID-agnostic.
-- INSERT IGNORE prevents duplicates on re-run.
-- =============================================================================


-- ── super_admin → ALL permissions ────────────────────────────────────────────

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
CROSS JOIN `core_permissions` p
WHERE  r.name = 'super_admin' AND r.school_id IS NULL;


-- ── school_admin → All core + all module permissions (not core.modules.manage) ─

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.schools.read',
  'core.academic_years.read',    'core.academic_years.manage',
  'core.classes.read',           'core.classes.manage',
  'core.sections.read',          'core.sections.manage',
  'core.students.read',          'core.students.create',
  'core.students.update',        'core.students.delete',
  'core.student_assignments.read','core.student_assignments.manage',
  'core.guardians.read',         'core.guardians.create',
  'core.guardians.update',       'core.guardians.delete',
  'core.staff.read',             'core.staff.create',
  'core.staff.update',           'core.staff.delete',
  'core.staff_assignments.read', 'core.staff_assignments.manage',
  'core.users.read',             'core.users.create',  'core.users.manage',
  'core.roles.read',             'core.roles.manage',
  'core.modules.read',
  'id_card.templates.read',      'id_card.templates.manage',
  'id_card.cards.read',          'id_card.cards.create',
  'id_card.cards.print',         'id_card.cards.delete',
  'voting.elections.read',       'voting.elections.manage',
  'voting.candidates.read',      'voting.candidates.manage',
  'voting.votes.view',
  'voting.results.view',         'voting.results.publish',
  'bus.routes.read',             'bus.routes.manage',
  'bus.stops.read',              'bus.stops.manage',
  'bus.vehicles.read',           'bus.vehicles.manage',
  'bus.assignments.read',        'bus.assignments.manage',
  'bus.attendance.view',         'bus.attendance.manage',
  'canteen.menu.read',           'canteen.menu.manage',
  'canteen.orders.read',         'canteen.orders.manage',
  'canteen.wallet.view',         'canteen.wallet.manage',
  'canteen.transactions.view',   'canteen.transactions.manage'
)
WHERE r.name = 'school_admin' AND r.school_id IS NULL;


-- ── teacher → Read most data + manage voting (teachers run elections) ─────────

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.academic_years.read',
  'core.classes.read',           'core.sections.read',
  'core.students.read',          'core.student_assignments.read',
  'core.guardians.read',
  'core.staff.read',             'core.staff_assignments.read',
  'core.modules.read',
  'id_card.templates.read',      'id_card.cards.read',    'id_card.cards.print',
  'voting.elections.read',       'voting.elections.manage',
  'voting.candidates.read',      'voting.candidates.manage',
  'voting.votes.view',
  'voting.results.view',         'voting.results.publish',
  'bus.routes.read',             'bus.assignments.read',  'bus.attendance.view',
  'canteen.menu.read',           'canteen.orders.read',
  'canteen.wallet.view',         'canteen.transactions.view'
)
WHERE r.name = 'teacher' AND r.school_id IS NULL;


-- ── non_teaching_staff → Limited read + canteen counter operations ────────────

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.academic_years.read',
  'core.classes.read',           'core.sections.read',
  'core.students.read',          'core.student_assignments.read',
  'core.staff.read',
  'core.modules.read',
  'id_card.cards.read',          'id_card.cards.print',
  'bus.routes.read',             'bus.assignments.read',
  'canteen.menu.read',
  'canteen.orders.read',         'canteen.orders.manage',
  'canteen.wallet.view',         'canteen.transactions.view'
)
WHERE r.name = 'non_teaching_staff' AND r.school_id IS NULL;


-- ── parent → View own children's data across enabled modules ─────────────────
-- Note: Application layer further restricts parent to ONLY their own children
--       via core_student_guardians. These permissions are the ceiling, not the floor.

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.students.read',          'core.student_assignments.read',
  'id_card.cards.read',
  'bus.routes.read',             'bus.assignments.read',  'bus.attendance.view',
  'canteen.menu.read',
  'canteen.orders.read',
  'canteen.wallet.view',         'canteen.wallet.manage',
  'canteen.transactions.view'
)
WHERE r.name = 'parent' AND r.school_id IS NULL;


-- ── student → View own data + cast votes (future) ────────────────────────────

INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM   `core_roles` r
JOIN   `core_permissions` p ON p.name IN (
  'core.students.read',          'core.student_assignments.read',
  'voting.elections.read',       'voting.candidates.read',
  'voting.votes.cast',           'voting.results.view',
  'bus.routes.read',             'bus.assignments.read',
  'canteen.menu.read',
  'canteen.orders.read',
  'canteen.wallet.view',         'canteen.transactions.view'
)
WHERE r.name = 'student' AND r.school_id IS NULL;
