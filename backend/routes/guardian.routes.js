'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/guardian.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

router.use(authenticate);

// ─── Collections & Batch Endpoints (MUST come before /:id) ───────────────────
// GET /api/v1/guardians/stats
router.get('/stats', requirePermission('core.guardians.read'), ctrl.getStats);

// POST /api/v1/guardians/bulk-generate (Bulk create parent accounts)
router.post('/bulk-generate', requirePermission('core.guardians.create'), ctrl.bulkGenerateAccounts);

// POST /api/v1/guardians/bulk-action (Activate, deactivate, reset pw, delete)
router.post('/bulk-action', requirePermission('core.guardians.update'), ctrl.bulkAction);

// GET /api/v1/guardians (List with filters & pagination)
router.get('/', requirePermission('core.guardians.read'), ctrl.list);

// POST /api/v1/guardians (Create single guardian)
router.post('/', requirePermission('core.guardians.create'), ctrl.create);

// ─── Individual Guardian Endpoints ───────────────────────────────────────────
// GET /api/v1/guardians/:id
router.get('/:id', requirePermission('core.guardians.read'), ctrl.getOne);

// PUT /api/v1/guardians/:id (Update guardian details)
router.put('/:id', requirePermission('core.guardians.update'), ctrl.update);

// DELETE /api/v1/guardians/:id (Delete guardian record)
router.delete('/:id', requirePermission('core.guardians.delete'), ctrl.deleteGuardian);

// POST /api/v1/guardians/:id/account (Create user login account)
router.post('/:id/account', requirePermission('core.guardians.update'), ctrl.createAccount);

// POST /api/v1/guardians/:id/reset-password (Reset parent password)
router.post('/:id/reset-password', requirePermission('core.guardians.update'), ctrl.resetPassword);

// PATCH /api/v1/guardians/:id/account-status (Toggle active/inactive)
router.patch('/:id/account-status', requirePermission('core.guardians.update'), ctrl.toggleAccountStatus);

// DELETE /api/v1/guardians/:id/account (Revoke login access)
router.delete('/:id/account', requirePermission('core.guardians.update'), ctrl.deleteAccount);

// POST /api/v1/guardians/:id/students (Link student)
router.post('/:id/students', requirePermission('core.guardians.update'), ctrl.linkStudent);

// DELETE /api/v1/guardians/:id/students/:studentId (Unlink student)
router.delete('/:id/students/:studentId', requirePermission('core.guardians.update'), ctrl.unlinkStudent);

module.exports = router;
