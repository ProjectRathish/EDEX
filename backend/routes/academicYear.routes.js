'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/academicYear.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// GET /api/v1/academic-years
router.get('/', requirePermission('core.academic_years.read'), ctrl.list);

// GET /api/v1/academic-years/current
router.get('/current', requirePermission('core.academic_years.read'), ctrl.getCurrent);

// GET /api/v1/academic-years/:id
router.get('/:id', requirePermission('core.academic_years.read'), ctrl.getOne);

// POST /api/v1/academic-years
router.post('/', requirePermission('core.academic_years.manage'), ctrl.create);

// PATCH /api/v1/academic-years/:id/set-current
router.patch('/:id/set-current', requirePermission('core.academic_years.manage'), ctrl.setCurrent);

module.exports = router;
