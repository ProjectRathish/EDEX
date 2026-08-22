'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/role.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// GET /api/v1/roles
router.get('/', requirePermission('core.roles.read'), ctrl.listRoles);

// GET /api/v1/roles/permissions
router.get('/permissions', requirePermission('core.roles.read'), ctrl.listPermissions);

// GET /api/v1/roles/:id
router.get('/:id', requirePermission('core.roles.read'), ctrl.getRole);

// POST /api/v1/roles
router.post('/', requirePermission('core.roles.manage'), ctrl.createRole);

// PUT /api/v1/roles/:id/permissions
router.put('/:id/permissions', requirePermission('core.roles.manage'), ctrl.updateRolePermissions);

module.exports = router;
