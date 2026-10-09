'use strict';

const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const bus = require('../controllers/bus.controller');

// All bus routes require authentication
router.use(authenticate);

// ── Summary / Dashboard ───────────────────────────────────────────────────────
router.get('/summary',                      bus.getSummary);

// ── Vehicles ──────────────────────────────────────────────────────────────────
router.get   ('/vehicles',         bus.listVehicles);
router.post  ('/vehicles',         bus.createVehicle);
router.put   ('/vehicles/:id',     bus.updateVehicle);
router.delete('/vehicles/:id',     bus.deleteVehicle);

// ── Routes ────────────────────────────────────────────────────────────────────
router.get   ('/routes',           bus.listRoutes);
router.post  ('/routes',           bus.createRoute);
router.get   ('/routes/:id',       bus.getRoute);
router.put   ('/routes/:id',       bus.updateRoute);
router.delete('/routes/:id',       bus.deleteRoute);

// ── Stops (nested under route) ────────────────────────────────────────────────
router.get   ('/routes/:routeId/stops',  bus.listStops);
router.post  ('/routes/:routeId/stops',  bus.createStop);
router.put   ('/stops/:stopId',          bus.updateStop);
router.delete('/stops/:stopId',          bus.deleteStop);

// ── Student Assignments ───────────────────────────────────────────────────────
router.get   ('/assignments/students',              bus.listStudentAssignments);
router.get   ('/assignments/students/unassigned',   bus.listUnassignedStudents);
router.post  ('/assignments/students',              bus.assignStudent);
router.post  ('/assignments/students/bulk',         bus.bulkAssignStudents);
router.post  ('/assignments/students/bulk-action',  bus.bulkActionStudentAssignments);
router.patch ('/assignments/students/:id',          bus.updateStudentAssignment);
router.delete('/assignments/students/:id',          bus.unassignStudent);

// ── Staff Assignments (Driver / Conductor) ────────────────────────────────────
router.get   ('/assignments/staff',                      bus.listStaffAssignments);
router.post  ('/assignments/staff',                      bus.assignStaff);
router.delete('/assignments/staff/vehicle/:busId/:role', bus.unassignStaffByVehicle);
router.delete('/assignments/staff/:id',                  bus.unassignStaff);

// ── Route Path — OSRM road-following polyline ────────────────────────────────
// GET  /bus/routes/:id/path          → fetch stored waypoints
// POST /bus/routes/:id/path/generate → call OSRM and save road-following path
// DEL  /bus/routes/:id/path          → clear stored path
router.get   ('/routes/:id/path',          bus.getRoutePath);
router.post  ('/routes/:id/path/generate', bus.generateRoutePath);
router.delete('/routes/:id/path',          bus.deleteRoutePath);

// ── GPS Tracking ──────────────────────────────────────────────────────────────
// POST /bus/tracking/ping                         → driver app sends GPS ping
// GET  /bus/tracking/fleet/live                   → fleet monitoring gets all bus positions
// GET  /bus/tracking/:routeId/live                → parent app gets latest position
// GET  /bus/tracking/:routeId/trip/:tripId        → trip history / replay
router.post('/tracking/ping',                        bus.recordGpsPing);
router.post('/tracking/:routeId/end-trip',           bus.endTripByRoute);
router.get ('/tracking/fleet/live',                  bus.getFleetLivePositions);
router.get ('/tracking/:routeId/live',               bus.getLivePosition);
router.get ('/tracking/:routeId/trip/:tripId',       bus.getTripHistory);

module.exports = router;
