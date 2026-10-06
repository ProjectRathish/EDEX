'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/staff.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// GET /api/v1/staff
router.get('/', requirePermission('core.staff.read'), ctrl.list);

// POST /api/v1/staff/bulk-upload
router.post('/bulk-upload', requirePermission('core.staff.create'), ctrl.bulkUpload);

// POST /api/v1/staff/bulk-delete
router.post('/bulk-delete', requirePermission('core.staff.delete'), ctrl.bulkDelete);

// GET /api/v1/staff/assignments/all
router.get('/assignments/all', requirePermission('core.staff.read'), ctrl.listAssignments);

// POST /api/v1/staff/assignments/class-save
router.post('/assignments/class-save', requirePermission('core.staff_assignments.manage'), ctrl.saveClassAssignments);

// GET /api/v1/staff/:id
router.get('/:id', requirePermission('core.staff.read'), ctrl.getOne);

// POST /api/v1/staff
router.post('/', requirePermission('core.staff.create'), ctrl.create);

// PUT /api/v1/staff/:id
router.put('/:id', requirePermission('core.staff.update'), ctrl.update);

// DELETE /api/v1/staff/:id
router.delete('/:id', requirePermission('core.staff.delete'), ctrl.deleteStaff);

// POST /api/v1/staff/:id/assignments
router.post('/:id/assignments', requirePermission('core.staff_assignments.manage'), ctrl.createAssignment);

// DELETE /api/v1/staff/assignments/:assignmentId
router.delete('/assignments/:assignmentId', requirePermission('core.staff_assignments.manage'), ctrl.deleteAssignment);

module.exports = router;
