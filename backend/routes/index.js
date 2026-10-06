'use strict';

const express = require('express');
const router = express.Router();

// ── Import route groups ───────────────────────────────────────────────────────
const authRoutes              = require('./auth.routes');
const schoolRoutes            = require('./school.routes');
const academicYearRoutes      = require('./academicYear.routes');
const classRoutes             = require('./class.routes');
const studentRoutes           = require('./student.routes');
const studentAssignmentRoutes = require('./studentAssignment.routes');
const guardianRoutes          = require('./guardian.routes');
const staffRoutes             = require('./staff.routes');
const userRoutes              = require('./user.routes');
const roleRoutes              = require('./role.routes');
const moduleRoutes            = require('./module.routes');
const enquiryRoutes           = require('./enquiry.routes');
const busRoutes               = require('./bus.routes');

// ── Mount routes ──────────────────────────────────────────────────────────────
router.use('/auth',                authRoutes);
router.use('/schools',             schoolRoutes);
router.use('/academic-years',      academicYearRoutes);
router.use('/classes',             classRoutes);
router.use('/students',            studentRoutes);
router.use('/student-assignments', studentAssignmentRoutes);
router.use('/guardians',           guardianRoutes);
router.use('/staff',               staffRoutes);
router.use('/users',               userRoutes);
router.use('/roles',               roleRoutes);
router.use('/modules',             moduleRoutes);
router.use('/enquiries',           enquiryRoutes);
router.use('/bus',                 busRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'EDEX API is running',
    version: process.env.API_VERSION || 'v1',
    modules_ready: ['core'],
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
