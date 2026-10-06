-- EDEX Migration 033: Consolidate IAM Roles and Dynamic RBAC
-- Adds bus_driver and canteen_operator system roles and permissions

INSERT IGNORE INTO `core_permissions`
  (`permission_id`, `name`, `module`, `resource`, `action`, `description`)
VALUES
  (UUID(), 'bus.tracking.update', 'bus', 'tracking', 'update', 'Broadcast live GPS coordinates during route trips');

INSERT IGNORE INTO `core_roles`
  (`role_id`, `school_id`, `name`, `description`, `is_system_role`)
VALUES
  (UUID(), NULL, 'bus_driver', 'School transport driver. Dedicated to trip navigation, passenger rosters, and live GPS tracking.', TRUE),
  (UUID(), NULL, 'canteen_operator', 'Canteen operator. Access limited to canteen POS, food menu, student wallet debits, and orders.', TRUE);

-- Map bus_driver permissions
INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM `core_roles` r
JOIN `core_permissions` p ON p.name IN (
  'bus.routes.read',
  'bus.stops.read',
  'bus.vehicles.read',
  'bus.assignments.read',
  'bus.attendance.view',
  'bus.attendance.manage',
  'bus.tracking.update'
)
WHERE r.name = 'bus_driver' AND r.school_id IS NULL;

-- Map canteen_operator permissions
INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM `core_roles` r
JOIN `core_permissions` p ON p.name IN (
  'canteen.menu.read',
  'canteen.menu.manage',
  'canteen.orders.read',
  'canteen.orders.manage',
  'canteen.wallet.view',
  'canteen.wallet.manage',
  'canteen.transactions.view',
  'canteen.transactions.manage'
)
WHERE r.name = 'canteen_operator' AND r.school_id IS NULL;

-- Ensure school_admin and super_admin have bus.tracking.update
INSERT IGNORE INTO `core_role_permissions` (`role_id`, `permission_id`)
SELECT r.role_id, p.permission_id
FROM `core_roles` r
JOIN `core_permissions` p ON p.name = 'bus.tracking.update'
WHERE r.name IN ('school_admin', 'super_admin') AND r.school_id IS NULL;
