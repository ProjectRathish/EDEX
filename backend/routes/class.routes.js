'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/class.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// ── Classes ──────────────────────────────────────────────────────────────────
// GET /api/v1/classes (supports ?include_sections=true)
router.get('/', requirePermission('core.classes.read'), ctrl.listClasses);

// GET /api/v1/classes/:id
router.get('/:id', requirePermission('core.classes.read'), ctrl.getClass);

// POST /api/v1/classes
router.post('/', requirePermission('core.classes.manage'), ctrl.createClass);

// PUT /api/v1/classes/:id
router.put('/:id', requirePermission('core.classes.manage'), ctrl.updateClass);

// DELETE /api/v1/classes/:id
router.delete('/:id', requirePermission('core.classes.manage'), ctrl.deleteClass);

// ── Sections within a class ──────────────────────────────────────────────────
// GET /api/v1/classes/:classId/sections
router.get('/:classId/sections', requirePermission('core.sections.read'), ctrl.listSections);

// POST /api/v1/classes/:classId/sections
router.post('/:classId/sections', requirePermission('core.sections.manage'), ctrl.createSection);

// PUT /api/v1/classes/:classId/sections/:sectionId
router.put('/:classId/sections/:sectionId', requirePermission('core.sections.manage'), ctrl.updateSection);

// DELETE /api/v1/classes/:classId/sections/:sectionId
router.delete('/:classId/sections/:sectionId', requirePermission('core.sections.manage'), ctrl.deleteSection);

module.exports = router;
