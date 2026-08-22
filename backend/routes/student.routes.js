'use strict';

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/student.controller');
const { authenticate }       = require('../middleware/auth');
const { requirePermission }  = require('../middleware/permission');

router.use(authenticate);

// GET    /api/v1/students         → list students for authenticated school
router.get('/',    requirePermission('core.students.read'),   ctrl.list);

// GET    /api/v1/students/:id     → get one student
router.get('/:id', requirePermission('core.students.read'),   ctrl.getOne);

// POST   /api/v1/students         → enrol new student
router.post('/',   requirePermission('core.students.create'), ctrl.create);

// PUT    /api/v1/students/:id     → update student
router.put('/:id', requirePermission('core.students.update'), ctrl.update);

module.exports = router;
