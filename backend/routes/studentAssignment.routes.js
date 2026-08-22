'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentAssignment.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// GET /api/v1/student-assignments
router.get('/', requirePermission('core.student_assignments.read'), ctrl.list);

// POST /api/v1/student-assignments
router.post('/', requirePermission('core.student_assignments.manage'), ctrl.create);

// POST /api/v1/student-assignments/bulk
router.post('/bulk', requirePermission('core.student_assignments.manage'), ctrl.bulkAssign);

module.exports = router;
