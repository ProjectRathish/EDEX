'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/student.controller');
const { authenticate }      = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// GET    /api/v1/students              → list students for authenticated school
router.get('/',           requirePermission('core.students.read'),   ctrl.list);

// POST   /api/v1/students/bulk-upload  → bulk import student list with class/section resolution
router.post('/bulk-upload', requirePermission('core.students.create'), ctrl.bulkUpload);

// GET    /api/v1/students/:id          → get one student
router.get('/:id',        requirePermission('core.students.read'),   ctrl.getOne);

// POST   /api/v1/students              → enrol new single student
router.post('/',          requirePermission('core.students.create'), ctrl.create);

// PUT    /api/v1/students/:id          → update student profile
router.put('/:id',         requirePermission('core.students.update'), ctrl.update);

// POST   /api/v1/students/bulk-delete  → bulk soft delete students
router.post('/bulk-delete', requirePermission('core.students.delete'), ctrl.bulkDelete);

// DELETE /api/v1/students/:id          → soft delete student
router.delete('/:id',      requirePermission('core.students.delete'), ctrl.deleteStudent);

module.exports = router;
