'use strict';

const { pool }                                    = require('../config/db');
const { generateUUID, parsePagination, paginationMeta } = require('../utils/helpers');
const {
  sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendConflict,
} = require('../utils/response');

// ─────────────────────────────────────────────────────────────────────────────
// VEHICLES
// ─────────────────────────────────────────────────────────────────────────────

/** GET /bus/vehicles */
const listVehicles = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { status } = req.query;

    let sql = `
      SELECT
        bv.*,
        -- Assigned route info
        br_assigned.route_id,
        br_assigned.route_name,
        br_assigned.route_code,
        -- Active driver info (from core_staff — zero duplication)
        dsa.id        AS driver_assignment_id,
        ds.staff_id   AS driver_id,
        ds.first_name AS driver_first_name,
        ds.last_name  AS driver_last_name,
        ds.phone      AS driver_phone,
        -- Active conductor info
        csa.id        AS conductor_assignment_id,
        cs.staff_id   AS conductor_id,
        cs.first_name AS conductor_first_name,
        cs.last_name  AS conductor_last_name,
        cs.phone      AS conductor_phone,
        -- Student count on this vehicle
        (
          SELECT COUNT(DISTINCT bsa.assignment_id)
          FROM bus_student_assignments bsa
          JOIN bus_routes br ON bsa.route_id = br.route_id
          WHERE br.assigned_bus_id = bv.bus_id
            AND bsa.status = 'active'
        ) AS assigned_students
      FROM bus_vehicles bv
      -- Join assigned route
      LEFT JOIN bus_routes br_assigned
        ON br_assigned.assigned_bus_id = bv.bus_id AND br_assigned.deleted_at IS NULL
      -- Join active driver
      LEFT JOIN bus_staff_assignments dsa
        ON dsa.bus_id = bv.bus_id AND dsa.role = 'driver' AND dsa.is_active = 1
      LEFT JOIN core_staff ds ON ds.staff_id = dsa.staff_id
      -- Join active conductor
      LEFT JOIN bus_staff_assignments csa
        ON csa.bus_id = bv.bus_id AND csa.role = 'conductor' AND csa.is_active = 1
      LEFT JOIN core_staff cs ON cs.staff_id = csa.staff_id
      WHERE bv.school_id = ? AND bv.deleted_at IS NULL
    `;
    const params = [schoolId];
    if (status) { sql += ' AND bv.status = ?'; params.push(status); }
    sql += ' ORDER BY bv.created_at DESC';

    const [rows] = await pool.execute(sql, params);
    return sendSuccess(res, rows, 'Vehicles fetched');
  } catch (err) { next(err); }
};

/** POST /bus/vehicles */
const createVehicle = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const {
      vehicle_number, vehicle_name, vehicle_type = 'large_bus',
      capacity = 40, make_model, manufacture_year,
      gps_device_id, insurance_expiry, fitness_expiry,
      permit_expiry, notes, route_id,
    } = req.body;

    if (!vehicle_number) return sendBadRequest(res, 'vehicle_number is required');

    const id = generateUUID();
    await pool.execute(
      `INSERT INTO bus_vehicles
        (bus_id, school_id, vehicle_number, vehicle_name, vehicle_type, capacity,
         make_model, manufacture_year, gps_device_id, insurance_expiry,
         fitness_expiry, permit_expiry, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, schoolId, vehicle_number.toUpperCase(), vehicle_name || null, vehicle_type,
       capacity, make_model || null, manufacture_year || null, gps_device_id || null,
       insurance_expiry || null, fitness_expiry || null, permit_expiry || null, notes || null],
    );

    // If a defined route was assigned to this vehicle
    if (route_id) {
      const [[existingRoute]] = await pool.execute(
        `SELECT br.route_id, br.route_code, br.route_name, bv.vehicle_number
         FROM bus_routes br
         JOIN bus_vehicles bv ON bv.bus_id = br.assigned_bus_id AND bv.deleted_at IS NULL
         WHERE br.route_id = ? AND br.school_id = ? AND br.deleted_at IS NULL`,
        [route_id, schoolId],
      );
      if (existingRoute) {
        return sendConflict(
          res,
          `Route [${existingRoute.route_code}] "${existingRoute.route_name}" is already assigned to Bus ${existingRoute.vehicle_number}. A route cannot be assigned to multiple buses.`,
        );
      }
      await pool.execute(
        'UPDATE bus_routes SET assigned_bus_id = ? WHERE route_id = ? AND school_id = ?',
        [id, route_id, schoolId],
      );
    }

    const [[vehicle]] = await pool.execute('SELECT * FROM bus_vehicles WHERE bus_id = ?', [id]);
    return sendCreated(res, vehicle, 'Vehicle created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return sendConflict(res, 'Vehicle number already exists for this school');
    next(err);
  }
};

/** PUT /bus/vehicles/:id */
const updateVehicle = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;
    const {
      vehicle_number, vehicle_name, vehicle_type, capacity, make_model,
      manufacture_year, gps_device_id, insurance_expiry, fitness_expiry,
      permit_expiry, status, notes, route_id,
    } = req.body;

    const [[existing]] = await pool.execute(
      'SELECT bus_id FROM bus_vehicles WHERE bus_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, schoolId],
    );
    if (!existing) return sendNotFound(res, 'Vehicle not found');

    await pool.execute(
      `UPDATE bus_vehicles SET
        vehicle_number = COALESCE(?, vehicle_number),
        vehicle_name   = COALESCE(?, vehicle_name),
        vehicle_type   = COALESCE(?, vehicle_type),
        capacity       = COALESCE(?, capacity),
        make_model     = COALESCE(?, make_model),
        manufacture_year = COALESCE(?, manufacture_year),
        gps_device_id  = COALESCE(?, gps_device_id),
        insurance_expiry = COALESCE(?, insurance_expiry),
        fitness_expiry = COALESCE(?, fitness_expiry),
        permit_expiry  = COALESCE(?, permit_expiry),
        status         = COALESCE(?, status),
        notes          = COALESCE(?, notes)
       WHERE bus_id = ? AND school_id = ?`,
      [
        vehicle_number ? vehicle_number.toUpperCase() : null,
        vehicle_name ?? null,
        vehicle_type ?? null,
        capacity ?? null,
        make_model ?? null,
        manufacture_year ?? null,
        gps_device_id ?? null,
        insurance_expiry ?? null,
        fitness_expiry ?? null,
        permit_expiry ?? null,
        status ?? null,
        notes ?? null,
        id,
        schoolId
      ],
    );

    // If route_id is provided in the update payload, sync route assignment
    if (route_id !== undefined) {
      if (route_id) {
        const [[existingRoute]] = await pool.execute(
          `SELECT br.route_id, br.route_code, br.route_name, bv.vehicle_number
           FROM bus_routes br
           JOIN bus_vehicles bv ON bv.bus_id = br.assigned_bus_id AND bv.deleted_at IS NULL
           WHERE br.route_id = ? AND br.assigned_bus_id != ? AND br.school_id = ? AND br.deleted_at IS NULL`,
          [route_id, id, schoolId],
        );
        if (existingRoute) {
          return sendConflict(
            res,
            `Route [${existingRoute.route_code}] "${existingRoute.route_name}" is already assigned to Bus ${existingRoute.vehicle_number}. A route cannot be assigned to multiple buses.`,
          );
        }
      }
      await pool.execute(
        'UPDATE bus_routes SET assigned_bus_id = NULL WHERE assigned_bus_id = ? AND school_id = ?',
        [id, schoolId],
      );
      if (route_id) {
        await pool.execute(
          'UPDATE bus_routes SET assigned_bus_id = ? WHERE route_id = ? AND school_id = ?',
          [id, route_id, schoolId],
        );
      }
    }

    const [[updated]] = await pool.execute('SELECT * FROM bus_vehicles WHERE bus_id = ?', [id]);
    return sendSuccess(res, updated, 'Vehicle updated');
  } catch (err) { next(err); }
};

/** DELETE /bus/vehicles/:id */
const deleteVehicle = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;
    const [[existing]] = await pool.execute(
      'SELECT bus_id FROM bus_vehicles WHERE bus_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, schoolId],
    );
    if (!existing) return sendNotFound(res, 'Vehicle not found');

    // Unassign any route pointing to this vehicle
    await pool.execute(
      'UPDATE bus_routes SET assigned_bus_id = NULL WHERE assigned_bus_id = ? AND school_id = ?',
      [id, schoolId],
    );

    await pool.execute(
      'UPDATE bus_vehicles SET deleted_at = NOW(), status = ? WHERE bus_id = ?',
      ['inactive', id],
    );
    return sendSuccess(res, null, 'Vehicle deleted');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/** GET /bus/routes */
const listRoutes = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id, status } = req.query;

    let sql = `
      SELECT
        br.*,
        -- Vehicle info
        bv.vehicle_number, bv.vehicle_name, bv.vehicle_type, bv.capacity,
        -- Driver
        ds.staff_id   AS driver_id,
        ds.first_name AS driver_first_name,
        ds.last_name  AS driver_last_name,
        -- Conductor
        cs.staff_id   AS conductor_id,
        cs.first_name AS conductor_first_name,
        cs.last_name  AS conductor_last_name,
        -- Aggregates
        (SELECT COUNT(*) FROM bus_stops bs WHERE bs.route_id = br.route_id) AS stop_count,
        (SELECT COUNT(*) FROM bus_student_assignments bsa
          WHERE bsa.route_id = br.route_id AND bsa.status = 'active') AS student_count
      FROM bus_routes br
      LEFT JOIN bus_vehicles bv ON bv.bus_id = br.assigned_bus_id
      LEFT JOIN bus_staff_assignments dsa ON dsa.bus_id = br.assigned_bus_id AND dsa.role = 'driver' AND dsa.is_active = 1
      LEFT JOIN core_staff ds ON ds.staff_id = dsa.staff_id
      LEFT JOIN bus_staff_assignments csa ON csa.bus_id = br.assigned_bus_id AND csa.role = 'conductor' AND csa.is_active = 1
      LEFT JOIN core_staff cs ON cs.staff_id = csa.staff_id
      WHERE br.school_id = ? AND br.deleted_at IS NULL
    `;
    const params = [schoolId];
    if (academic_year_id) { sql += ' AND br.academic_year_id = ?'; params.push(academic_year_id); }
    if (status)           { sql += ' AND br.status = ?';           params.push(status); }
    sql += ' ORDER BY br.route_code ASC';

    const [rows] = await pool.execute(sql, params);
    return sendSuccess(res, rows, 'Routes fetched');
  } catch (err) { next(err); }
};

/** POST /bus/routes */
const createRoute = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const {
      academic_year_id, route_name, route_code, description,
      assigned_bus_id, start_point, end_point,
      morning_start_time, evening_start_time,
      total_distance_km, monthly_fee, annual_fee,
    } = req.body;

    if (!academic_year_id) return sendBadRequest(res, 'academic_year_id is required');
    if (!route_name)       return sendBadRequest(res, 'route_name is required');
    if (!route_code)       return sendBadRequest(res, 'route_code is required');

    // Strict 1-to-1: check if bus is already assigned to another route in this academic year
    if (assigned_bus_id) {
      const [[existingRouteWithBus]] = await pool.execute(
        `SELECT br.route_id, br.route_code, br.route_name, bv.vehicle_number
         FROM bus_routes br
         LEFT JOIN bus_vehicles bv ON bv.bus_id = br.assigned_bus_id
         WHERE br.assigned_bus_id = ? AND br.academic_year_id = ? AND br.school_id = ? AND br.deleted_at IS NULL`,
        [assigned_bus_id, academic_year_id, schoolId],
      );
      if (existingRouteWithBus) {
        return sendConflict(
          res,
          `Bus ${existingRouteWithBus.vehicle_number || ''} is already assigned to Route [${existingRouteWithBus.route_code}] "${existingRouteWithBus.route_name}". A bus can only be assigned to one route.`,
        );
      }
    }

    const id = generateUUID();
    await pool.execute(
      `INSERT INTO bus_routes
        (route_id, school_id, academic_year_id, route_name, route_code, description,
         assigned_bus_id, start_point, end_point, morning_start_time,
         evening_start_time, total_distance_km, monthly_fee, annual_fee)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, schoolId, academic_year_id, route_name, route_code.toUpperCase(),
       description || null, assigned_bus_id || null, start_point || null,
       end_point || null, morning_start_time || null, evening_start_time || null,
       total_distance_km || null, monthly_fee || null, annual_fee || null],
    );
    const [[route]] = await pool.execute('SELECT * FROM bus_routes WHERE route_id = ?', [id]);
    return sendCreated(res, route, 'Route created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return sendConflict(res, 'A route with this code or assigned bus already exists for this academic year');
    }
    next(err);
  }
};

/** GET /bus/routes/:id */
const getRoute = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;

    const [[route]] = await pool.execute(
      `SELECT br.*, bv.vehicle_number, bv.vehicle_name
       FROM bus_routes br
       LEFT JOIN bus_vehicles bv ON bv.bus_id = br.assigned_bus_id
       WHERE br.route_id = ? AND br.school_id = ? AND br.deleted_at IS NULL`,
      [id, schoolId],
    );
    if (!route) return sendNotFound(res, 'Route not found');

    const [stops] = await pool.execute(
      'SELECT * FROM bus_stops WHERE route_id = ? ORDER BY sequence_order ASC',
      [id],
    );
    return sendSuccess(res, { ...route, stops }, 'Route fetched');
  } catch (err) { next(err); }
};

/** PUT /bus/routes/:id */
const updateRoute = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;
    const {
      route_name, route_code, description, assigned_bus_id,
      start_point, end_point, morning_start_time, evening_start_time,
      total_distance_km, monthly_fee, annual_fee, status,
    } = req.body;

    const [[existing]] = await pool.execute(
      'SELECT route_id, academic_year_id, assigned_bus_id FROM bus_routes WHERE route_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, schoolId],
    );
    if (!existing) return sendNotFound(res, 'Route not found');

    // Strict 1-to-1: if assigning a bus, check if it's already assigned to a different route
    if (assigned_bus_id) {
      const [[otherRoute]] = await pool.execute(
        `SELECT br.route_id, br.route_code, br.route_name, bv.vehicle_number
         FROM bus_routes br
         LEFT JOIN bus_vehicles bv ON bv.bus_id = br.assigned_bus_id
         WHERE br.assigned_bus_id = ? AND br.route_id != ? AND br.academic_year_id = ? AND br.school_id = ? AND br.deleted_at IS NULL`,
        [assigned_bus_id, id, existing.academic_year_id, schoolId],
      );
      if (otherRoute) {
        return sendConflict(
          res,
          `Bus ${otherRoute.vehicle_number || ''} is already assigned to Route [${otherRoute.route_code}] "${otherRoute.route_name}". A bus can only be assigned to one route.`,
        );
      }
    }

    const resolvedAssignedBusId = assigned_bus_id !== undefined
      ? (assigned_bus_id || null)
      : existing.assigned_bus_id;

    await pool.execute(
      `UPDATE bus_routes SET
        route_name          = COALESCE(?, route_name),
        route_code          = COALESCE(?, route_code),
        description         = COALESCE(?, description),
        assigned_bus_id     = ?,
        start_point         = COALESCE(?, start_point),
        end_point           = COALESCE(?, end_point),
        morning_start_time  = COALESCE(?, morning_start_time),
        evening_start_time  = COALESCE(?, evening_start_time),
        total_distance_km   = COALESCE(?, total_distance_km),
        monthly_fee         = COALESCE(?, monthly_fee),
        annual_fee          = COALESCE(?, annual_fee),
        status              = COALESCE(?, status)
       WHERE route_id = ? AND school_id = ?`,
      [route_name, route_code ? route_code.toUpperCase() : null, description,
       resolvedAssignedBusId, start_point, end_point, morning_start_time,
       evening_start_time, total_distance_km, monthly_fee, annual_fee,
       status, id, schoolId],
    );
    const [[updated]] = await pool.execute('SELECT * FROM bus_routes WHERE route_id = ?', [id]);
    return sendSuccess(res, updated, 'Route updated');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return sendConflict(res, 'A route with this code or assigned bus already exists for this academic year');
    }
    next(err);
  }
};

/** DELETE /bus/routes/:id */
const deleteRoute = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;

    // Check for active student assignments
    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM bus_student_assignments
       WHERE route_id = ? AND status = 'active'`,
      [id],
    );
    if (count > 0) {
      return sendBadRequest(res, `Cannot delete route with ${count} active student assignments. Unassign students first.`);
    }

    await pool.execute(
      'UPDATE bus_routes SET deleted_at = NOW(), status = ?, assigned_bus_id = NULL WHERE route_id = ? AND school_id = ?',
      ['inactive', id, schoolId],
    );
    return sendSuccess(res, null, 'Route deleted');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STOPS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /bus/routes/:routeId/stops */
const listStops = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { routeId } = req.params;

    // Verify route belongs to school
    const [[route]] = await pool.execute(
      'SELECT route_id FROM bus_routes WHERE route_id = ? AND school_id = ? AND deleted_at IS NULL',
      [routeId, schoolId],
    );
    if (!route) return sendNotFound(res, 'Route not found');

    const [stops] = await pool.execute(
      `SELECT bs.*,
        (SELECT COUNT(*) FROM bus_student_assignments WHERE stop_id = bs.stop_id AND status = 'active') AS student_count
       FROM bus_stops bs
       WHERE bs.route_id = ? ORDER BY bs.sequence_order ASC`,
      [routeId],
    );
    return sendSuccess(res, stops, 'Stops fetched');
  } catch (err) { next(err); }
};

/** POST /bus/routes/:routeId/stops */
const createStop = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { routeId } = req.params;
    const {
      stop_name, stop_address, sequence_order,
      morning_time, evening_time, latitude, longitude,
      landmark, is_school_stop = false,
    } = req.body;

    if (!stop_name) return sendBadRequest(res, 'stop_name is required');

    const [[route]] = await pool.execute(
      'SELECT route_id FROM bus_routes WHERE route_id = ? AND school_id = ? AND deleted_at IS NULL',
      [routeId, schoolId],
    );
    if (!route) return sendNotFound(res, 'Route not found');

    // Auto-assign next sequence if not provided
    let seq = sequence_order;
    if (!seq) {
      const [[{ maxSeq }]] = await pool.execute(
        'SELECT COALESCE(MAX(sequence_order), 0) AS maxSeq FROM bus_stops WHERE route_id = ?',
        [routeId],
      );
      seq = maxSeq + 1;
    }

    const id = generateUUID();
    await pool.execute(
      `INSERT INTO bus_stops
        (stop_id, route_id, stop_name, stop_address, sequence_order,
         morning_time, evening_time, latitude, longitude, landmark, is_school_stop)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, routeId, stop_name, stop_address || null, seq,
       morning_time || null, evening_time || null,
       latitude || null, longitude || null,
       landmark || null, is_school_stop ? 1 : 0],
    );
    const [[stop]] = await pool.execute('SELECT * FROM bus_stops WHERE stop_id = ?', [id]);
    return sendCreated(res, stop, 'Stop created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return sendConflict(res, 'A stop with this sequence order already exists on this route');
    next(err);
  }
};

/** PUT /bus/stops/:stopId */
const updateStop = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { stopId } = req.params;
    const {
      stop_name, stop_address, sequence_order,
      morning_time, evening_time, latitude, longitude,
      landmark, is_school_stop,
    } = req.body;

    // Verify via route → school boundary
    const [[existing]] = await pool.execute(
      `SELECT bs.stop_id FROM bus_stops bs
       JOIN bus_routes br ON br.route_id = bs.route_id
       WHERE bs.stop_id = ? AND br.school_id = ?`,
      [stopId, schoolId],
    );
    if (!existing) return sendNotFound(res, 'Stop not found');

    const updates = [];
    const params = [];

    if (stop_name !== undefined) {
      updates.push('stop_name = ?');
      params.push(stop_name ? String(stop_name).trim() : null);
    }
    if (stop_address !== undefined) {
      updates.push('stop_address = ?');
      params.push(stop_address ? String(stop_address).trim() : null);
    }
    if (sequence_order !== undefined) {
      updates.push('sequence_order = ?');
      params.push(parseInt(sequence_order, 10) || 1);
    }
    if (morning_time !== undefined) {
      updates.push('morning_time = ?');
      params.push(morning_time && String(morning_time).trim() ? String(morning_time).trim() : null);
    }
    if (evening_time !== undefined) {
      updates.push('evening_time = ?');
      params.push(evening_time && String(evening_time).trim() ? String(evening_time).trim() : null);
    }
    if (latitude !== undefined) {
      updates.push('latitude = ?');
      params.push(latitude !== null && latitude !== '' && !isNaN(latitude) ? Number(latitude) : null);
    }
    if (longitude !== undefined) {
      updates.push('longitude = ?');
      params.push(longitude !== null && longitude !== '' && !isNaN(longitude) ? Number(longitude) : null);
    }
    if (landmark !== undefined) {
      updates.push('landmark = ?');
      params.push(landmark ? String(landmark).trim() : null);
    }
    if (is_school_stop !== undefined) {
      updates.push('is_school_stop = ?');
      params.push(is_school_stop ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(stopId);
      await pool.execute(
        `UPDATE bus_stops SET ${updates.join(', ')} WHERE stop_id = ?`,
        params,
      );
    }

    const [[updated]] = await pool.execute('SELECT * FROM bus_stops WHERE stop_id = ?', [stopId]);
    return sendSuccess(res, updated, 'Stop updated');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return sendConflict(res, 'A stop with this sequence order already exists on this route');
    }
    next(err);
  }
};

/** DELETE /bus/stops/:stopId */
const deleteStop = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { stopId } = req.params;

    const [[existing]] = await pool.execute(
      `SELECT bs.stop_id FROM bus_stops bs
       JOIN bus_routes br ON br.route_id = bs.route_id
       WHERE bs.stop_id = ? AND br.school_id = ?`,
      [stopId, schoolId],
    );
    if (!existing) return sendNotFound(res, 'Stop not found');

    // Block delete if students are assigned here
    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM bus_student_assignments WHERE stop_id = ? AND status = 'active'`,
      [stopId],
    );
    if (count > 0) {
      return sendBadRequest(res, `Cannot delete stop — ${count} students are assigned to it. Reassign them first.`);
    }

    await pool.execute('DELETE FROM bus_stops WHERE stop_id = ?', [stopId]);
    return sendSuccess(res, null, 'Stop deleted');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /bus/assignments/students */
const listStudentAssignments = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id, route_id, stop_id, status, search } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let countSql = `
      SELECT COUNT(*) AS total
      FROM bus_student_assignments bsa
      JOIN core_students s ON s.student_id = bsa.student_id
      LEFT JOIN core_student_academic_assignments saa
        ON saa.student_id = s.student_id AND saa.academic_year_id = bsa.academic_year_id
      LEFT JOIN core_classes cl ON cl.class_id = saa.class_id
      LEFT JOIN core_sections sec ON sec.section_id = saa.section_id
      WHERE bsa.school_id = ?
    `;
    let dataSql = `
      SELECT
        bsa.*,
        -- Student identity from core (zero duplication)
        s.first_name, s.last_name, s.admission_number, s.gender, s.photo_url,
        s.phone, s.father_name, s.guardian_relation, s.guardian_phone, s.address, s.area, s.blood_group,
        -- Class placement
        cl.name AS class_name, sec.name AS section_name,
        -- Route info
        br.route_name, br.route_code,
        -- Stop info
        bs.stop_name, bs.sequence_order AS stop_sequence,
        bs.morning_time, bs.evening_time, bs.landmark, bs.stop_address,
        -- Vehicle & Driver Info
        bv.vehicle_number, bv.vehicle_name, bv.vehicle_type,
        drv.first_name AS driver_first_name, drv.last_name AS driver_last_name, drv.phone AS driver_phone
      FROM bus_student_assignments bsa
      JOIN core_students s ON s.student_id = bsa.student_id
      LEFT JOIN core_student_academic_assignments saa
        ON saa.student_id = s.student_id AND saa.academic_year_id = bsa.academic_year_id
      LEFT JOIN core_classes cl ON cl.class_id = saa.class_id
      LEFT JOIN core_sections sec ON sec.section_id = saa.section_id
      LEFT JOIN bus_routes br ON br.route_id = bsa.route_id
      LEFT JOIN bus_stops bs ON bs.stop_id = bsa.stop_id
      LEFT JOIN bus_vehicles bv ON bv.bus_id = br.assigned_bus_id
      LEFT JOIN bus_staff_assignments bstaff ON bstaff.bus_id = bv.bus_id AND bstaff.role = 'driver' AND bstaff.is_active = 1
      LEFT JOIN core_staff drv ON drv.staff_id = bstaff.staff_id
      WHERE bsa.school_id = ?
    `;

    const params = [schoolId];
    const countParams = [schoolId];

    const addFilter = (clause, ...vals) => {
      dataSql  += ` ${clause}`;
      countSql += ` ${clause}`;
      params.push(...vals);
      countParams.push(...vals);
    };

    const { direction, class_id, is_free } = req.query;

    if (academic_year_id) addFilter('AND bsa.academic_year_id = ?', academic_year_id);
    if (route_id)         addFilter('AND bsa.route_id = ?', route_id);
    if (stop_id)          addFilter('AND bsa.stop_id = ?', stop_id);
    if (direction)        addFilter('AND bsa.direction = ?', direction);
    if (status)           addFilter('AND bsa.status = ?', status);
    if (class_id)         addFilter('AND cl.class_id = ?', class_id);
    if (is_free !== undefined && is_free !== '') {
      addFilter('AND bsa.is_free = ?', is_free === 'true' || is_free === '1' ? 1 : 0);
    }
    if (search) {
      addFilter(
        `AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ? OR s.phone LIKE ? OR s.guardian_phone LIKE ? OR s.father_name LIKE ?)`,
        `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`,
      );
    }

    dataSql += ` ORDER BY cl.name ASC, sec.name ASC, s.last_name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [[{ total }]]  = await pool.execute(countSql, countParams);
    const [assignments]  = await pool.execute(dataSql, params);

    return sendSuccess(res, {
      assignments,
      pagination: paginationMeta(total, page, limit),
    }, 'Student assignments fetched');
  } catch (err) { next(err); }
};

/** GET /bus/assignments/students/unassigned */
const listUnassignedStudents = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id } = req.query;
    if (!academic_year_id) return sendBadRequest(res, 'academic_year_id is required');

    const [students] = await pool.execute(
      `SELECT s.student_id, s.first_name, s.last_name, s.admission_number, s.gender,
              s.phone, s.father_name, s.guardian_phone,
              cl.name AS class_name, sec.name AS section_name
       FROM core_students s
       LEFT JOIN core_student_academic_assignments saa
         ON saa.student_id = s.student_id AND saa.academic_year_id = ?
       LEFT JOIN core_classes cl ON cl.class_id = saa.class_id
       LEFT JOIN core_sections sec ON sec.section_id = saa.section_id
       WHERE s.school_id = ? AND s.status = 'active' AND s.deleted_at IS NULL
         AND s.student_id NOT IN (
           SELECT student_id FROM bus_student_assignments
           WHERE school_id = ? AND academic_year_id = ? AND status = 'active'
             AND direction IN ('both','morning')
         )
       ORDER BY cl.name ASC, s.last_name ASC`,
      [academic_year_id, schoolId, schoolId, academic_year_id],
    );
    return sendSuccess(res, students, 'Unassigned students fetched');
  } catch (err) { next(err); }
};

/** POST /bus/assignments/students */
const assignStudent = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const {
      academic_year_id, student_id, route_id, stop_id,
      direction = 'both', fee_amount, fee_type, is_free = false, notes,
    } = req.body;

    if (!academic_year_id) return sendBadRequest(res, 'academic_year_id is required');
    if (!student_id)       return sendBadRequest(res, 'student_id is required');
    if (!route_id)         return sendBadRequest(res, 'route_id is required');
    if (!stop_id)          return sendBadRequest(res, 'stop_id is required');

    const id = generateUUID();
    await pool.execute(
      `INSERT INTO bus_student_assignments
        (assignment_id, school_id, academic_year_id, student_id, route_id, stop_id,
         direction, fee_amount, fee_type, is_free, notes, assigned_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, schoolId, academic_year_id, student_id, route_id, stop_id,
       direction, fee_amount || null, fee_type || null,
       is_free ? 1 : 0, notes || null, req.user.user_id || null],
    );
    const [[assignment]] = await pool.execute(
      `SELECT bsa.*, s.first_name, s.last_name, s.admission_number,
              br.route_name, bs.stop_name
       FROM bus_student_assignments bsa
       JOIN core_students s ON s.student_id = bsa.student_id
       JOIN bus_routes br ON br.route_id = bsa.route_id
       JOIN bus_stops bs ON bs.stop_id = bsa.stop_id
       WHERE bsa.assignment_id = ?`,
      [id],
    );
    return sendCreated(res, assignment, 'Student assigned to bus route');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return sendConflict(res, 'Student already has a bus assignment for this direction in this academic year');
    }
    next(err);
  }
};

/** POST /bus/assignments/students/bulk */
const bulkAssignStudents = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id, assignments = [] } = req.body;

    if (!academic_year_id) return sendBadRequest(res, 'academic_year_id is required');
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return sendBadRequest(res, 'assignments array is required');
    }

    await connection.beginTransaction();

    let insertedCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (let i = 0; i < assignments.length; i++) {
      const item = assignments[i];
      let {
        student_id, admission_number,
        route_id, route_code,
        stop_id, stop_name,
        direction = 'both',
        fee_amount, fee_type, is_free = false, notes
      } = item;

      // Lookup student if admission_number provided
      if (!student_id && admission_number) {
        const [[s]] = await connection.execute(
          'SELECT student_id FROM core_students WHERE admission_number = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
          [String(admission_number).trim(), schoolId]
        );
        if (s) student_id = s.student_id;
      }

      // Lookup route if route_code provided
      if (!route_id && route_code) {
        const [[r]] = await connection.execute(
          'SELECT route_id FROM bus_routes WHERE route_code = ? AND school_id = ? AND academic_year_id = ? AND deleted_at IS NULL LIMIT 1',
          [String(route_code).trim(), schoolId, academic_year_id]
        );
        if (r) route_id = r.route_id;
      }

      // Lookup stop if stop_name provided
      if (!stop_id && stop_name && route_id) {
        const [[st]] = await connection.execute(
          'SELECT stop_id FROM bus_stops WHERE (stop_name = ? OR stop_name LIKE ?) AND route_id = ? LIMIT 1',
          [String(stop_name).trim(), `%${String(stop_name).trim()}%`, route_id]
        );
        if (st) stop_id = st.stop_id;
      }

      if (!student_id || !route_id || !stop_id) {
        errors.push({
          row: i + 1,
          admission_number: admission_number || null,
          error: !student_id ? 'Student not found' : !route_id ? 'Route not found' : 'Stop not found'
        });
        continue;
      }

      const validDir = ['morning', 'evening', 'both'].includes(direction) ? direction : 'both';
      const isFreeVal = (is_free === true || is_free === 'true' || is_free === 1 || is_free === '1') ? 1 : 0;

      // Check if assignment exists
      const [[existing]] = await connection.execute(
        'SELECT assignment_id FROM bus_student_assignments WHERE school_id = ? AND academic_year_id = ? AND student_id = ? AND direction = ?',
        [schoolId, academic_year_id, student_id, validDir]
      );

      if (existing) {
        await connection.execute(
          `UPDATE bus_student_assignments SET
             route_id = ?, stop_id = ?, fee_amount = ?, fee_type = ?, is_free = ?, status = 'active', notes = COALESCE(?, notes)
           WHERE assignment_id = ?`,
          [route_id, stop_id, fee_amount || null, fee_type || null, isFreeVal, notes || null, existing.assignment_id]
        );
        updatedCount++;
      } else {
        const newId = generateUUID();
        await connection.execute(
          `INSERT INTO bus_student_assignments
            (assignment_id, school_id, academic_year_id, student_id, route_id, stop_id, direction, fee_amount, fee_type, is_free, status, notes, assigned_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          [newId, schoolId, academic_year_id, student_id, route_id, stop_id, validDir, fee_amount || null, fee_type || null, isFreeVal, notes || null, req.user.user_id || null]
        );
        insertedCount++;
      }
    }

    await connection.commit();
    return sendSuccess(res, { insertedCount, updatedCount, errors }, `Processed ${insertedCount + updatedCount} assignments (${insertedCount} new, ${updatedCount} updated, ${errors.length} failed)`);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

/** POST /bus/assignments/students/bulk-action */
const bulkActionStudentAssignments = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { action, assignment_ids = [], data = {} } = req.body;

    if (!Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return sendBadRequest(res, 'assignment_ids must be a non-empty array');
    }

    const placeholders = assignment_ids.map(() => '?').join(',');

    if (action === 'change_status') {
      const { status } = data;
      if (!['active', 'inactive', 'on_leave'].includes(status)) {
        return sendBadRequest(res, 'Invalid status');
      }
      await pool.execute(
        `UPDATE bus_student_assignments SET status = ? WHERE assignment_id IN (${placeholders}) AND school_id = ?`,
        [status, ...assignment_ids, schoolId]
      );
      return sendSuccess(res, null, `Updated status to ${status} for ${assignment_ids.length} student(s)`);
    }

    if (action === 'change_route_stop') {
      const { route_id, stop_id } = data;
      if (!route_id || !stop_id) {
        return sendBadRequest(res, 'route_id and stop_id are required');
      }
      await pool.execute(
        `UPDATE bus_student_assignments SET route_id = ?, stop_id = ? WHERE assignment_id IN (${placeholders}) AND school_id = ?`,
        [route_id, stop_id, ...assignment_ids, schoolId]
      );
      return sendSuccess(res, null, `Updated route & stop for ${assignment_ids.length} student(s)`);
    }

    if (action === 'unassign') {
      await pool.execute(
        `UPDATE bus_student_assignments SET status = 'inactive' WHERE assignment_id IN (${placeholders}) AND school_id = ?`,
        [...assignment_ids, schoolId]
      );
      return sendSuccess(res, null, `Unassigned ${assignment_ids.length} student(s)`);
    }

    if (action === 'delete_permanent') {
      await pool.execute(
        `DELETE FROM bus_student_assignments WHERE assignment_id IN (${placeholders}) AND school_id = ?`,
        [...assignment_ids, schoolId]
      );
      return sendSuccess(res, null, `Permanently removed ${assignment_ids.length} assignment(s)`);
    }

    return sendBadRequest(res, 'Unsupported action');
  } catch (err) { next(err); }
};

/** PATCH /bus/assignments/students/:id */
const updateStudentAssignment = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;
    const { route_id, stop_id, direction, fee_amount, fee_type, is_free, status, notes } = req.body;

    const [[existing]] = await pool.execute(
      'SELECT assignment_id FROM bus_student_assignments WHERE assignment_id = ? AND school_id = ?',
      [id, schoolId],
    );
    if (!existing) return sendNotFound(res, 'Assignment not found');

    await pool.execute(
      `UPDATE bus_student_assignments SET
        route_id   = COALESCE(?, route_id),
        stop_id    = COALESCE(?, stop_id),
        direction  = COALESCE(?, direction),
        fee_amount = COALESCE(?, fee_amount),
        fee_type   = COALESCE(?, fee_type),
        is_free    = COALESCE(?, is_free),
        status     = COALESCE(?, status),
        notes      = COALESCE(?, notes)
       WHERE assignment_id = ?`,
      [route_id, stop_id, direction,
       fee_amount, fee_type,
       is_free != null ? (is_free ? 1 : 0) : null,
       status, notes, id],
    );
    return sendSuccess(res, null, 'Assignment updated');
  } catch (err) { next(err); }
};

/** DELETE /bus/assignments/students/:id */
const unassignStudent = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;
    const { permanent } = req.query;

    const [[existing]] = await pool.execute(
      'SELECT assignment_id FROM bus_student_assignments WHERE assignment_id = ? AND school_id = ?',
      [id, schoolId],
    );
    if (!existing) return sendNotFound(res, 'Assignment not found');

    if (permanent === 'true' || permanent === true) {
      await pool.execute('DELETE FROM bus_student_assignments WHERE assignment_id = ? AND school_id = ?', [id, schoolId]);
      return sendSuccess(res, null, 'Assignment removed permanently');
    }

    await pool.execute(
      "UPDATE bus_student_assignments SET status = 'inactive' WHERE assignment_id = ?",
      [id],
    );
    return sendSuccess(res, null, 'Student unassigned from bus route');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STAFF ASSIGNMENTS (Driver / Conductor)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /bus/assignments/staff */
const listStaffAssignments = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { bus_id, academic_year_id } = req.query;

    let sql = `
      SELECT
        bsa.*,
        -- Staff identity from core (zero duplication)
        st.first_name, st.last_name, st.designation, st.phone, st.photo_url,
        -- Vehicle info
        bv.vehicle_number, bv.vehicle_name
      FROM bus_staff_assignments bsa
      JOIN core_staff st ON st.staff_id = bsa.staff_id
      JOIN bus_vehicles bv ON bv.bus_id = bsa.bus_id
      WHERE bsa.school_id = ?
    `;
    const params = [schoolId];
    if (bus_id)           { sql += ' AND bsa.bus_id = ?';           params.push(bus_id); }
    if (academic_year_id) { sql += ' AND bsa.academic_year_id = ?'; params.push(academic_year_id); }
    sql += ' ORDER BY bv.vehicle_number, bsa.role';

    const [rows] = await pool.execute(sql, params);
    return sendSuccess(res, rows, 'Staff assignments fetched');
  } catch (err) { next(err); }
};

/** POST /bus/assignments/staff */
const assignStaff = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { bus_id, staff_id, role, academic_year_id, effective_from, notes } = req.body;

    if (!bus_id)           return sendBadRequest(res, 'bus_id is required');
    if (!staff_id)         return sendBadRequest(res, 'staff_id is required');
    if (!role)             return sendBadRequest(res, 'role (driver|conductor) is required');
    if (!academic_year_id) return sendBadRequest(res, 'academic_year_id is required');

    // 1. DUPLICATE CHECK: Verify this staff member is not already actively assigned to ANY other vehicle
    const [existingOther] = await pool.execute(
      `SELECT bsa.id, bsa.bus_id, bsa.role, bv.vehicle_number, bv.vehicle_name, st.first_name, st.last_name
       FROM bus_staff_assignments bsa
       JOIN bus_vehicles bv ON bv.bus_id = bsa.bus_id
       JOIN core_staff st ON st.staff_id = bsa.staff_id
       WHERE bsa.staff_id = ? AND bsa.academic_year_id = ? AND bsa.is_active = 1 AND bsa.bus_id != ?`,
      [staff_id, academic_year_id, bus_id]
    );

    if (existingOther.length > 0) {
      const current = existingOther[0];
      const staffName = `${current.first_name} ${current.last_name || ''}`.trim();
      const busInfo = current.vehicle_number + (current.vehicle_name ? ` (${current.vehicle_name})` : '');
      const roleName = current.role === 'conductor' ? 'Attender' : 'Driver';
      return sendBadRequest(
        res,
        `${staffName} is already assigned as ${roleName} to ${busInfo}. Duplicate bus crew assignment is not allowed. Please unassign them from ${busInfo} first.`
      );
    }

    // 2. Clear any existing assignment for same bus+role+year
    await pool.execute(
      `DELETE FROM bus_staff_assignments
       WHERE bus_id = ? AND role = ? AND academic_year_id = ?`,
      [bus_id, role, academic_year_id],
    );

    const id = generateUUID();
    await pool.execute(
      `INSERT INTO bus_staff_assignments
        (id, school_id, bus_id, staff_id, role, academic_year_id, effective_from, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, schoolId, bus_id, staff_id, role, academic_year_id,
       effective_from || new Date().toISOString().split('T')[0], notes || null],
    );

    const [[assignment]] = await pool.execute(
      `SELECT bsa.*, st.first_name, st.last_name, st.designation
       FROM bus_staff_assignments bsa
       JOIN core_staff st ON st.staff_id = bsa.staff_id
       WHERE bsa.id = ?`,
      [id],
    );
    return sendCreated(res, assignment, `${role} assigned to vehicle`);
  } catch (err) { next(err); }
};

/** DELETE /bus/assignments/staff/vehicle/:busId/:role */
const unassignStaffByVehicle = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { busId, role } = req.params;
    await pool.execute(
      `DELETE FROM bus_staff_assignments
       WHERE school_id = ? AND bus_id = ? AND role = ?`,
      [schoolId, busId, role],
    );
    return sendSuccess(res, null, `${role === 'conductor' ? 'Attender' : 'Driver'} unassigned from vehicle`);
  } catch (err) { next(err); }
};

/** DELETE /bus/assignments/staff/:id */
const unassignStaff = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;
    const [[existing]] = await pool.execute(
      'SELECT id FROM bus_staff_assignments WHERE id = ? AND school_id = ?',
      [id, schoolId],
    );
    if (!existing) return sendNotFound(res, 'Staff assignment not found');
    await pool.execute(
      'DELETE FROM bus_staff_assignments WHERE id = ?',
      [id],
    );
    return sendSuccess(res, null, 'Staff assignment removed');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY / DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /bus/summary */
const getSummary = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id } = req.query;

    const [[{ total_routes }]] = await pool.execute(
      `SELECT COUNT(*) AS total_routes FROM bus_routes
       WHERE school_id = ? AND status = 'active' AND deleted_at IS NULL
       ${academic_year_id ? 'AND academic_year_id = ?' : ''}`,
      academic_year_id ? [schoolId, academic_year_id] : [schoolId],
    );

    const [[{ total_vehicles }]] = await pool.execute(
      `SELECT COUNT(*) AS total_vehicles FROM bus_vehicles
       WHERE school_id = ? AND status = 'active' AND deleted_at IS NULL`,
      [schoolId],
    );

    const [[{ total_assigned }]] = await pool.execute(
      `SELECT COUNT(*) AS total_assigned FROM bus_student_assignments
       WHERE school_id = ? AND status = 'active'
       ${academic_year_id ? 'AND academic_year_id = ?' : ''}`,
      academic_year_id ? [schoolId, academic_year_id] : [schoolId],
    );

    // Vehicles with expiring documents (within 30 days)
    const [[{ expiring_soon }]] = await pool.execute(
      `SELECT COUNT(*) AS expiring_soon FROM bus_vehicles
       WHERE school_id = ? AND deleted_at IS NULL
         AND (
           (insurance_expiry IS NOT NULL AND insurance_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY))
           OR
           (fitness_expiry IS NOT NULL AND fitness_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY))
         )`,
      [schoolId],
    );

    return sendSuccess(res, {
      total_routes,
      total_vehicles,
      total_assigned,
      expiring_soon,
    }, 'Bus module summary');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE PATH — OSRM road-following polyline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal helper: decode OSRM encoded polyline to [{lat,lng}] array.
 * OSRM returns a standard Google-encoded polyline string.
 */
function decodePolyline(encoded) {
  let index = 0, lat = 0, lng = 0;
  const coords = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

/** GET /bus/routes/:id/path — fetch stored road-following polyline */
const getRoutePath = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;

    // Verify route belongs to school
    const [[route]] = await pool.execute(
      'SELECT route_id FROM bus_routes WHERE route_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, schoolId],
    );
    if (!route) return sendNotFound(res, 'Route not found');

    const [waypoints] = await pool.execute(
      `SELECT latitude, longitude, is_stop, stop_id
       FROM bus_route_paths
       WHERE route_id = ?
       ORDER BY sequence_order ASC`,
      [id],
    );
    return sendSuccess(res, { route_id: id, waypoints }, 'Route path fetched');
  } catch (err) { next(err); }
};

/**
 * POST /bus/routes/:id/path/generate
 * Calls the free public OSRM API (router.project-osrm.org) with ordered
 * stop coordinates, decodes the road-following polyline, and saves it
 * to bus_route_paths.
 *
 * No API key required — OSRM is free and open-source.
 *
 * Request body: { stops: [{lat, lng, stop_id}] }  — optional override.
 * If no body stops provided, loads from bus_stops table automatically.
 */
const generateRoutePath = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;

    // Verify route belongs to school
    const [[route]] = await pool.execute(
      'SELECT route_id FROM bus_routes WHERE route_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, schoolId],
    );
    if (!route) return sendNotFound(res, 'Route not found');

    // Load stops (ordered) from DB
    const [stops] = await pool.execute(
      `SELECT stop_id, latitude, longitude, sequence_order, stop_name
       FROM bus_stops
       WHERE route_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY sequence_order ASC`,
      [id],
    );

    if (stops.length < 2) {
      return sendBadRequest(res,
        `Need at least 2 stops with coordinates to generate a path. Currently ${stops.length} stop(s) have lat/lng set.`);
    }

    // Build OSRM request URL
    // Format: lng,lat pairs separated by ; (OSRM uses lng,lat order!)
    const coordStr = stops.map(s => `${s.longitude},${s.latitude}`).join(';');
    const osrmUrl  = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=polyline&steps=false`;

    // Fetch from OSRM (using built-in fetch, Node 18+)
    let osrmData;
    try {
      const response = await fetch(osrmUrl, {
        headers: { 'User-Agent': 'SAARTHI-School-Management/1.0' },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });
      if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
      osrmData = await response.json();
    } catch (fetchErr) {
      return sendBadRequest(res, `Could not reach OSRM routing service: ${fetchErr.message}. Check internet connectivity.`);
    }

    if (osrmData.code !== 'Ok' || !osrmData.routes?.length) {
      return sendBadRequest(res, `OSRM could not find a route: ${osrmData.code}`);
    }

    // Decode the encoded polyline into {lat, lng} array
    const geometry  = osrmData.routes[0].geometry;
    const waypoints = decodePolyline(geometry); // [{lat, lng}, ...]

    // Build a set of stop positions for is_stop flagging
    // We'll mark OSRM waypoints that are closest to each stop
    const stopPositions = stops.map(s => ({
      lat: parseFloat(s.latitude),
      lng: parseFloat(s.longitude),
      stop_id: s.stop_id,
    }));

    // Helper: find closest waypoint index to a given lat/lng
    const closestIdx = (targetLat, targetLng) => {
      let minDist = Infinity, bestIdx = 0;
      waypoints.forEach((wp, i) => {
        const d = Math.hypot(wp.lat - targetLat, wp.lng - targetLng);
        if (d < minDist) { minDist = d; bestIdx = i; }
      });
      return bestIdx;
    };

    // Mark stop waypoints
    const stopWaypointMap = {}; // waypointIndex -> stop_id
    stopPositions.forEach(sp => {
      const idx = closestIdx(sp.lat, sp.lng);
      stopWaypointMap[idx] = sp.stop_id;
    });

    // Delete existing path for this route
    await pool.execute('DELETE FROM bus_route_paths WHERE route_id = ?', [id]);

    // Bulk insert new waypoints
    if (waypoints.length > 0) {
      const values   = waypoints.map((wp, i) => [
        generateUUID(), id, i + 1,
        wp.lat, wp.lng,
        stopWaypointMap[i] ? 1 : 0,
        stopWaypointMap[i] || null,
        'osrm',
      ]);
      // Insert in chunks of 500 to avoid query size limits
      const chunkSize = 500;
      for (let c = 0; c < values.length; c += chunkSize) {
        const chunk = values.slice(c, c + chunkSize);
        const placeholders = chunk.map(() => '(?,?,?,?,?,?,?,?)').join(',');
        await pool.execute(
          `INSERT INTO bus_route_paths
             (waypoint_id, route_id, sequence_order, latitude, longitude, is_stop, stop_id, source)
           VALUES ${placeholders}`,
          chunk.flat(),
        );
      }
    }

    // Automatically update route total_distance_km with OSRM calculated distance
    const totalDistKm = Number((osrmData.routes[0].distance / 1000).toFixed(2));
    await pool.execute(
      'UPDATE bus_routes SET total_distance_km = ? WHERE route_id = ? AND school_id = ?',
      [totalDistKm, id, schoolId]
    );

    return sendSuccess(res, {
      route_id: id,
      waypoint_count: waypoints.length,
      stop_count: stops.length,
      distance_m: Math.round(osrmData.routes[0].distance),
      duration_s: Math.round(osrmData.routes[0].duration),
    }, `Route path generated: ${waypoints.length} waypoints via OSRM`);
  } catch (err) { next(err); }
};

/** DELETE /bus/routes/:id/path — clear stored path */
const deleteRoutePath = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id }   = req.params;
    const [[route]] = await pool.execute(
      'SELECT route_id FROM bus_routes WHERE route_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, schoolId],
    );
    if (!route) return sendNotFound(res, 'Route not found');
    const [result] = await pool.execute('DELETE FROM bus_route_paths WHERE route_id = ?', [id]);
    return sendSuccess(res, { deleted: result.affectedRows }, 'Route path cleared');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GPS TRACKING (Driver mobile app → Server → Parent mobile app)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /bus/tracking/ping
 * Called by the driver mobile app every ~10 seconds.
 * Body: { bus_id, route_id, trip_id, latitude, longitude,
 *         speed_kmh, heading_degrees, accuracy_meters, recorded_at }
 */
const recordGpsPing = async (req, res, next) => {
  try {
    const {
      bus_id, route_id, trip_id,
      latitude, longitude,
      speed_kmh, heading_degrees, accuracy_meters, altitude_m,
      is_trip_active = 1,
      recorded_at,
    } = req.body;

    if (!bus_id)    return sendBadRequest(res, 'bus_id is required');
    if (!latitude)  return sendBadRequest(res, 'latitude is required');
    if (!longitude) return sendBadRequest(res, 'longitude is required');

    // Validate bus belongs to this school
    const schoolId = req.user.school_id;
    const [[vehicle]] = await pool.execute(
      'SELECT bus_id FROM bus_vehicles WHERE bus_id = ? AND school_id = ? AND deleted_at IS NULL',
      [bus_id, schoolId],
    );
    if (!vehicle) return sendNotFound(res, 'Vehicle not found');

    const id = generateUUID();
    await pool.execute(
      `INSERT INTO bus_gps_pings
         (ping_id, bus_id, route_id, trip_id, latitude, longitude,
          speed_kmh, heading_degrees, accuracy_meters, altitude_m,
          is_trip_active, recorded_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, bus_id, route_id || null, trip_id || null,
        latitude, longitude,
        speed_kmh ?? null, heading_degrees ?? null,
        accuracy_meters ?? null, altitude_m ?? null,
        is_trip_active ? 1 : 0,
        recorded_at ? new Date(recorded_at) : new Date(),
      ],
    );

    return sendSuccess(res, { ping_id: id }, 'GPS ping recorded');
  } catch (err) { next(err); }
};

/**
 * GET /bus/tracking/:routeId/live
 * Called by parent/student mobile app to get the latest bus position.
 * Returns the most recent GPS ping for the vehicle assigned to this route.
 */
const getLivePosition = async (req, res, next) => {
  try {
    const schoolId  = req.user.school_id;
    const { routeId } = req.params;

    // Get the route + its assigned vehicle
    const [[route]] = await pool.execute(
      `SELECT br.route_id, br.route_name, br.route_code,
              br.assigned_bus_id, bv.vehicle_number, bv.vehicle_name,
              ds.first_name AS driver_first_name, ds.last_name AS driver_last_name,
              ds.phone AS driver_phone
       FROM bus_routes br
       LEFT JOIN bus_vehicles bv ON bv.bus_id = br.assigned_bus_id
       LEFT JOIN bus_staff_assignments dsa
         ON dsa.bus_id = br.assigned_bus_id AND dsa.role = 'driver' AND dsa.is_active = 1
       LEFT JOIN core_staff ds ON ds.staff_id = dsa.staff_id
       WHERE br.route_id = ? AND br.school_id = ? AND br.deleted_at IS NULL`,
      [routeId, schoolId],
    );
    if (!route) return sendNotFound(res, 'Route not found');
    if (!route.assigned_bus_id) return sendSuccess(res, { route, live: null }, 'No vehicle assigned to this route');

    // Get latest GPS ping for this vehicle
    const [[latestPing]] = await pool.execute(
      `SELECT ping_id, trip_id, latitude, longitude, speed_kmh, heading_degrees,
              accuracy_meters, is_trip_active, recorded_at, received_at
       FROM bus_gps_pings
       WHERE bus_id = ?
       ORDER BY received_at DESC
       LIMIT 1`,
      [route.assigned_bus_id],
    );

    // Calculate staleness — if ping is recent or trip is actively marked live
    let isOnline = false;
    let ageSeconds = null;
    let tripShift = 'morning';

    if (latestPing) {
      const pingTime = new Date(latestPing.received_at || latestPing.recorded_at).getTime();
      const rawAge = Math.round(Math.abs(Date.now() - pingTime) / 1000);
      ageSeconds = isNaN(rawAge) ? 0 : rawAge;
      isOnline = ageSeconds < 300 || latestPing.is_trip_active == 1;

      if (latestPing.trip_id) {
        const tid = String(latestPing.trip_id).toLowerCase();
        if (tid.includes('evening')) {
          tripShift = 'evening';
        } else if (tid.includes('morning')) {
          tripShift = 'morning';
        }
      }
    }

    return sendSuccess(res, {
      route: {
        route_id:      route.route_id,
        route_name:    route.route_name,
        route_code:    route.route_code,
        vehicle_number: route.vehicle_number,
        vehicle_name:   route.vehicle_name,
        driver_name:    route.driver_first_name ? `${route.driver_first_name} ${route.driver_last_name}` : null,
        driver_phone:   route.driver_phone,
      },
      live: latestPing ? {
        ...latestPing,
        shift: tripShift,
        is_online: isOnline,
        age_seconds: ageSeconds,
      } : null,
    }, 'Live position fetched');
  } catch (err) { next(err); }
};

/**
 * GET /bus/tracking/:routeId/trip/:tripId
 * Returns all pings for a specific trip — used for route replay / analytics.
 */
const getTripHistory = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { routeId, tripId } = req.params;

    const [[route]] = await pool.execute(
      'SELECT route_id, assigned_bus_id FROM bus_routes WHERE route_id = ? AND school_id = ? AND deleted_at IS NULL',
      [routeId, schoolId],
    );
    if (!route) return sendNotFound(res, 'Route not found');

    const [pings] = await pool.execute(
      `SELECT latitude, longitude, speed_kmh, heading_degrees, recorded_at
       FROM bus_gps_pings
       WHERE trip_id = ? AND bus_id = ?
       ORDER BY recorded_at ASC`,
      [tripId, route.assigned_bus_id],
    );

    return sendSuccess(res, { trip_id: tripId, route_id: routeId, pings }, 'Trip history fetched');
  } catch (err) { next(err); }
};

/**
 * GET /bus/tracking/fleet/live
 * Returns real-time GPS telemetry, status, route, and driver info for all vehicles in the school.
 */
const getFleetLivePositions = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;

    // Fetch all active vehicles with their assigned route & staff
    const [vehicles] = await pool.execute(
      `SELECT
        bv.bus_id, bv.vehicle_number, bv.vehicle_name, bv.vehicle_type, bv.capacity,
        bv.status AS vehicle_status, bv.gps_device_id, bv.make_model,
        br.route_id, br.route_name, br.route_code,
        ds.staff_id   AS driver_id,
        ds.first_name AS driver_first_name,
        ds.last_name  AS driver_last_name,
        ds.phone      AS driver_phone,
        cs.staff_id   AS conductor_id,
        cs.first_name AS conductor_first_name,
        cs.last_name  AS conductor_last_name,
        cs.phone      AS conductor_phone,
        (SELECT COUNT(*) FROM bus_stops bs WHERE bs.route_id = br.route_id) AS stop_count,
        (SELECT COUNT(*) FROM bus_student_assignments bsa WHERE bsa.route_id = br.route_id AND bsa.status = 'active') AS student_count
       FROM bus_vehicles bv
       LEFT JOIN bus_routes br ON br.assigned_bus_id = bv.bus_id AND br.deleted_at IS NULL
       LEFT JOIN bus_staff_assignments dsa ON dsa.bus_id = bv.bus_id AND dsa.role = 'driver' AND dsa.is_active = 1
       LEFT JOIN core_staff ds ON ds.staff_id = dsa.staff_id
       LEFT JOIN bus_staff_assignments csa ON csa.bus_id = bv.bus_id AND csa.role = 'conductor' AND csa.is_active = 1
       LEFT JOIN core_staff cs ON cs.staff_id = csa.staff_id
       WHERE bv.school_id = ? AND bv.deleted_at IS NULL
       ORDER BY bv.vehicle_number ASC`,
      [schoolId]
    );

    // Fetch latest ping for each bus
    const [latestPings] = await pool.execute(
      `SELECT p1.ping_id, p1.bus_id, p1.route_id, p1.trip_id,
              p1.latitude, p1.longitude, p1.speed_kmh, p1.heading_degrees,
              p1.accuracy_meters, p1.is_trip_active, p1.recorded_at, p1.received_at
       FROM bus_gps_pings p1
       INNER JOIN (
         SELECT bus_id, MAX(received_at) AS max_received
         FROM bus_gps_pings
         GROUP BY bus_id
       ) p2 ON p1.bus_id = p2.bus_id AND p1.received_at = p2.max_received
       WHERE p1.latitude IS NOT NULL AND p1.longitude IS NOT NULL`
    );

    const pingMap = {};
    for (const p of latestPings) {
      const pingTime = new Date(p.received_at || p.recorded_at).getTime();
      const rawAge = Math.round((Date.now() - pingTime) / 1000);
      const ageSeconds = Math.max(0, isNaN(rawAge) ? 9999 : rawAge);

      let shift = 'morning';
      if (p.trip_id && p.trip_id.toLowerCase().includes('evening')) {
        shift = 'evening';
      } else if (p.trip_id && p.trip_id.toLowerCase().includes('morning')) {
        shift = 'morning';
      } else {
        shift = new Date().getHours() >= 12 ? 'evening' : 'morning';
      }

      pingMap[p.bus_id] = {
        ...p,
        shift,
        age_seconds: ageSeconds,
        is_online: p.is_trip_active == 1 && ageSeconds < 300,
      };
    }

    const fleet = vehicles.map(v => {
      const live = pingMap[v.bus_id] || null;
      return {
        ...v,
        driver_name: v.driver_first_name ? `${v.driver_first_name} ${v.driver_last_name || ''}`.trim() : null,
        conductor_name: v.conductor_first_name ? `${v.conductor_first_name} ${v.conductor_last_name || ''}`.trim() : null,
        live: live,
      };
    });

    return sendSuccess(res, fleet, 'Fleet live positions fetched');
  } catch (err) { next(err); }
};

module.exports = {
  // Vehicles
  listVehicles, createVehicle, updateVehicle, deleteVehicle,
  // Routes
  listRoutes, createRoute, getRoute, updateRoute, deleteRoute,
  // Stops
  listStops, createStop, updateStop, deleteStop,
  // Student assignments
  listStudentAssignments, listUnassignedStudents,
  assignStudent, bulkAssignStudents, bulkActionStudentAssignments,
  updateStudentAssignment, unassignStudent,
  // Staff assignments
  listStaffAssignments, assignStaff, unassignStaff, unassignStaffByVehicle,
  // Summary
  getSummary,
  // Route path (OSRM)
  getRoutePath, generateRoutePath, deleteRoutePath,
  // GPS Tracking
  recordGpsPing, getLivePosition, getTripHistory, getFleetLivePositions,
};
