'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/guardian.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// GET /api/v1/guardians
router.get('/', requirePermission('core.guardians.read'), ctrl.list);

// GET /api/v1/guardians/:id
router.get('/:id', requirePermission('core.guardians.read'), ctrl.getOne);

// POST /api/v1/guardians
router.post('/', requirePermission('core.guardians.create'), ctrl.create);

// PUT /api/v1/guardians/:id
router.put('/:id', requirePermission('core.guardians.update'), ctrl.update);

// POST /api/v1/guardians/:id/students (link student)
router.post('/:id/students', requirePermission('core.guardians.update'), ctrl.linkStudent);

// DELETE /api/v1/guardians/:id/students/:studentId (unlink student)
router.delete('/:id/students/:studentId', requirePermission('core.guardians.update'), ctrl.unlinkStudent);

module.exports = router;
