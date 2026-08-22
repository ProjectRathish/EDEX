'use strict';

const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/school.controller');
const { authenticate }        = require('../middleware/auth');
const { requirePermission }   = require('../middleware/permission');

// All school routes require authentication
router.use(authenticate);

// GET    /api/v1/schools         → list all schools (super_admin only)
router.get('/',    requirePermission('core.schools.read'),   ctrl.list);

// GET    /api/v1/schools/next-code → get next auto-generated unique school code (e.g. SSA0001)
router.get('/next-code', requirePermission('core.schools.read'), ctrl.getNextCode);

// GET    /api/v1/schools/:id     → get one school
router.get('/:id', requirePermission('core.schools.read'),   ctrl.getOne);

// POST   /api/v1/schools         → create a school (super_admin only)
router.post('/',   requirePermission('core.schools.manage'),  ctrl.create);

// PUT    /api/v1/schools/:id     → update school details (super_admin or school_admin of this school)
router.put('/:id', requirePermission('core.schools.read'), ctrl.update);

// PUT    /api/v1/schools/:id/status → toggle active status
router.put('/:id/status', requirePermission('core.schools.manage'), ctrl.toggleStatus);

// DELETE /api/v1/schools/:id        → soft delete school
router.delete('/:id', requirePermission('core.schools.manage'), ctrl.remove);

// POST   /api/v1/schools/:id/reset-admin-password → reset school admin password
router.post('/:id/reset-admin-password', requirePermission('core.schools.manage'), ctrl.resetAdminPassword);

module.exports = router;
