'use strict';

const mysql = require('mysql2/promise');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');

const EXCEL_PATH = 'C:/Users/user/Desktop/Bus stops.xls';
const SCHOOL_ID = 'f7447ab3-1c67-408b-8197-750787f982ad';
const ACADEMIC_YEAR_ID = '7120cd8b-532b-4a7a-840f-1f658ab20451';

function parseTime(val, isEvening = false) {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (!str) return null;
  const match = str.match(/^(\d{1,2})(?:[\.:](\d{1,2}))?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2].padEnd(2, '0').slice(0, 2), 10) : 0;
  if (isEvening && hours < 12) {
    hours += 12;
  }
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

async function runImport() {
  console.log('Reading Excel file from:', EXCEL_PATH);
  const wb = xlsx.readFile(EXCEL_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  // Group by route
  const routesMap = {};
  for (const r of rows) {
    const code = (r.ROUTE || '').trim().toUpperCase();
    if (!code) continue;
    if (!routesMap[code]) routesMap[code] = [];
    routesMap[code].push({
      order: parseInt(r.ORDER, 10) || (routesMap[code].length + 1),
      stopName: String(r.Stops || '').trim(),
      morningTime: parseTime(r['Morning Time'], false),
      eveningTime: parseTime(r['Evening Time'], true),
    });
  }

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'edex_db',
  });

  console.log('Connected to edex_db. Starting transaction...');
  await conn.beginTransaction();

  try {
    for (const [routeCode, stops] of Object.entries(routesMap)) {
      if (stops.length === 0) continue;

      const firstStop = stops[0].stopName;
      const lastStop = stops[stops.length - 1].stopName;
      const morningStartTime = stops[0].morningTime || null;
      const eveningStartTime = stops[stops.length - 1].eveningTime || stops[0].eveningTime || null;

      const routeName = firstStop;

      // Check if route exists (including soft-deleted)
      const [existingRoutes] = await conn.execute(
        `SELECT route_id FROM bus_routes WHERE school_id = ? AND academic_year_id = ? AND route_code = ?`,
        [SCHOOL_ID, ACADEMIC_YEAR_ID, routeCode]
      );

      let routeId;
      if (existingRoutes.length > 0) {
        routeId = existingRoutes[0].route_id;
        console.log(`Reactivating / updating route: ${routeCode} (${routeName})`);
        await conn.execute(
          `UPDATE bus_routes SET
             route_name = ?,
             start_point = ?,
             end_point = ?,
             morning_start_time = COALESCE(?, morning_start_time),
             evening_start_time = COALESCE(?, evening_start_time),
             status = 'active',
             deleted_at = NULL,
             updated_at = NOW()
           WHERE route_id = ?`,
          [routeName, firstStop, lastStop, morningStartTime, eveningStartTime, routeId]
        );

        // Delete old stops to refresh with full list from Excel
        await conn.execute(`DELETE FROM bus_stops WHERE route_id = ?`, [routeId]);
      } else {
        routeId = uuidv4();
        console.log(`Creating new route: ${routeCode} (${routeName})`);
        await conn.execute(
          `INSERT INTO bus_routes
             (route_id, school_id, academic_year_id, route_name, route_code,
              description, start_point, end_point, morning_start_time, evening_start_time, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [routeId, SCHOOL_ID, ACADEMIC_YEAR_ID, routeName, routeCode,
           `Route from ${firstStop} to ${lastStop}`, firstStop, lastStop, morningStartTime, eveningStartTime]
        );
      }

      // Insert stops
      for (const stop of stops) {
        const stopId = uuidv4();
        const isSchoolStop = stop.stopName.toUpperCase().includes('ISS SCHOOL') ? 1 : 0;
        await conn.execute(
          `INSERT INTO bus_stops
             (stop_id, route_id, stop_name, sequence_order, morning_time, evening_time, is_school_stop)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [stopId, routeId, stop.stopName, stop.order, stop.morningTime, stop.eveningTime, isSchoolStop]
        );
      }

      console.log(`  -> Inserted ${stops.length} stops for route ${routeCode}`);
    }

    await conn.commit();
    console.log('✅ Successfully imported all routes and stops!');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error during import, rolled back:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

runImport().catch(err => {
  console.error(err);
  process.exit(1);
});
