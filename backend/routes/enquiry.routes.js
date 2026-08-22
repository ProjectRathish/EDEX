'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/enquiry.controller');
const { authenticate }      = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

// POST /api/v1/enquiries           → Public registration enquiry submission
router.post('/', ctrl.createPublic);

// Super Admin protected routes
router.use(authenticate);

// GET  /api/v1/enquiries           → List & filter enquiries
router.get('/', requirePermission('core.schools.manage'), ctrl.list);

// POST /api/v1/enquiries/:id/approve → 1-Click approve & auto-provision school
router.post('/:id/approve', requirePermission('core.schools.manage'), ctrl.approve);

// POST /api/v1/enquiries/:id/reject  → Reject enquiry
router.post('/:id/reject', requirePermission('core.schools.manage'), ctrl.reject);

module.exports = router;
