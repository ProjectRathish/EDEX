'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// GET /api/v1/users
router.get('/', requirePermission('core.users.read'), ctrl.list);

// GET /api/v1/users/:id
router.get('/:id', requirePermission('core.users.read'), ctrl.getOne);

// POST /api/v1/users
router.post('/', requirePermission('core.users.create'), ctrl.create);

// PUT /api/v1/users/:id
router.put('/:id', requirePermission('core.users.manage'), ctrl.update);

module.exports = router;
