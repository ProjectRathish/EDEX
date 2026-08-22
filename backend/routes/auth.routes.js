'use strict';

const express = require('express');
const router  = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// POST /api/v1/auth/login
router.post('/login', authController.login);

// GET  /api/v1/auth/me     (requires token)
router.get('/me', authenticate, authController.me);

// POST /api/v1/auth/logout  (requires token)
router.post('/logout', authenticate, authController.logout);

// POST /api/v1/auth/change-password (requires token)
router.post('/change-password', authenticate, authController.changePassword);

// PUT  /api/v1/auth/profile         (requires token)
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;
