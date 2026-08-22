'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/module.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// GET /api/v1/modules
router.get('/', requirePermission('core.modules.read'), ctrl.listModules);

// PATCH /api/v1/modules/:moduleName/toggle (Super Admin only)
router.patch('/:moduleName/toggle', requirePermission('core.modules.manage'), ctrl.toggleModule);

module.exports = router;
