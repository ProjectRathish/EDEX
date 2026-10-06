'use strict';

const mysql = require('mysql2/promise');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');

const SCHOOL_ID = 'f7447ab3-1c67-408b-8197-750787f982ad';
const ACADEMIC_YEAR_ID = '7120cd8b-532b-4a7a-840f-1f658ab20451';
const ADMIN_USER_ID = 'a3f619cd-2d76-4f13-bf3f-421e45cbc5d9';

const STOP_ALIASES = {
  'PATTAMBI ROAD JN/DR. NAYANTHARA': 'Pattambi Road',
  'PULAMANTHOLE JN': 'Pulamanthole-Junction',
  'PULAMANTOLE BRIDGE': 'Pulamanthole-Bridge',
  'UP-PULAMANTHOLE': 'Pulamanthole',
  'PATHAIKKARA PALLI ROAD': 'Pathaikkara Palli',
  'KUNNAPPALLY -VAYANASALA': 'Kunnappally-Vayanashala',
  'KUNNAPPALY- VALAYAMOOCHI': 'Valayammoochi',
  'MAMBRA PADI': 'Mambrapadi',
  'ALUMKOOTTAM -PANICKER VEEDU': 'Alumkoottam',
  'NATTIYAMANGALAM': 'Nattyamangam',
};

function norm(str) {
  return (str || '')
    .toUpperCase()
    .replace(/[\s\/()\-\.,_]+/g, ' ')
    .trim();
}

async function runImport() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'edex_db',
  });

  console.log('Fetching stops and core students...');

  // 1. Fetch stops
  const [dbStops] = await conn.execute(
    'SELECT bs.stop_id, bs.stop_name, bs.route_id, br.route_code, br.route_name ' +
    'FROM bus_stops bs JOIN bus_routes br ON br.route_id = bs.route_id ' +
    'WHERE br.school_id = ? AND br.deleted_at IS NULL',
    [SCHOOL_ID]
  );

  const stopMap = new Map();
  for (const s of dbStops) {
    const raw = s.stop_name.trim().toUpperCase();
    const clean = norm(s.stop_name);
    if (!stopMap.has(raw)) stopMap.set(raw, s);
    if (!stopMap.has(clean)) stopMap.set(clean, s);
  }

  for (const [from, to] of Object.entries(STOP_ALIASES)) {
    const target = stopMap.get(to.toUpperCase()) || stopMap.get(norm(to));
    if (target) {
      stopMap.set(from.toUpperCase(), target);
      stopMap.set(norm(from), target);
    }
  }

  // 2. Fetch core students
  const [coreStudents] = await conn.execute(
    'SELECT student_id, admission_number, first_name, last_name FROM core_students WHERE school_id = ?',
    [SCHOOL_ID]
  );
  const studentMap = new Map();
  for (const cs of coreStudents) {
    if (cs.admission_number) {
      studentMap.set(cs.admission_number.trim().toUpperCase(), cs);
    }
  }

  // 3. Read Excel
  const excelPath = 'D:/edex/Bus students.xls';
  console.log(`Reading Excel file from ${excelPath}...`);
  const wb = xlsx.readFile(excelPath);
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`Processing ${rows.length} rows from Bus students.xls...`);

  await conn.beginTransaction();

  let assignedCount = 0;
  let updatedCount = 0;
  const missingCoreStudents = [];
  const pallikuthBoleroStudents = [];
  const otherMissingStopStudents = [];

  try {
    for (const r of rows) {
      const adm = String(r['Adm.No'] || '').trim().toUpperCase();
      const rawStop = String(r['Bus Stop'] || '').trim();
      const feeAmount = r.Amount ? parseFloat(r.Amount) : null;

      const student = studentMap.get(adm);
      if (!student) {
        missingCoreStudents.push({
          'Adm.No': adm,
          'Bus Stop': rawStop,
          Amount: r.Amount || '',
          Reason: 'Admission Number not found in core_students'
        });
        continue;
      }

      let s = stopMap.get(rawStop.toUpperCase()) || stopMap.get(norm(rawStop));
      if (!s) {
        for (const [key, dbStop] of stopMap.entries()) {
          if (norm(rawStop).length > 4 && key.includes(norm(rawStop))) {
            s = dbStop;
            break;
          }
        }
      }

      if (!s) {
        if (norm(rawStop) === 'PALLIKUTH') {
          pallikuthBoleroStudents.push({
            'Adm.No': adm,
            'Student Name': `${student.first_name} ${student.last_name || ''}`.trim(),
            'Bus Stop': rawStop,
            Amount: r.Amount || '',
            Reason: 'Stop PALLIKUTH belongs to Bolero van'
          });
        } else {
          otherMissingStopStudents.push({
            'Adm.No': adm,
            'Student Name': `${student.first_name} ${student.last_name || ''}`.trim(),
            'Bus Stop': rawStop,
            Amount: r.Amount || '',
            Reason: 'Bus stop not found in system'
          });
        }
        continue;
      }

      // Check if assignment exists
      const [existing] = await conn.execute(
        'SELECT assignment_id FROM bus_student_assignments WHERE academic_year_id = ? AND student_id = ? AND direction = ?',
        [ACADEMIC_YEAR_ID, student.student_id, 'both']
      );

      if (existing.length > 0) {
        await conn.execute(
          `UPDATE bus_student_assignments SET
             route_id = ?,
             stop_id = ?,
             fee_amount = ?,
             fee_type = 'monthly',
             status = 'active',
             updated_at = NOW()
           WHERE assignment_id = ?`,
          [s.route_id, s.stop_id, feeAmount, existing[0].assignment_id]
        );
        updatedCount++;
      } else {
        const assignmentId = uuidv4();
        await conn.execute(
          `INSERT INTO bus_student_assignments
             (assignment_id, school_id, academic_year_id, student_id, route_id, stop_id,
              direction, fee_amount, fee_type, status, is_free, assigned_by, assigned_at)
           VALUES (?, ?, ?, ?, ?, ?, 'both', ?, 'monthly', 'active', 0, ?, NOW())`,
          [assignmentId, SCHOOL_ID, ACADEMIC_YEAR_ID, student.student_id, s.route_id, s.stop_id, feeAmount, ADMIN_USER_ID]
        );
        assignedCount++;
      }
    }

    await conn.commit();
    console.log('✅ Student bus assignments successfully completed!');
    console.log(`  New assignments created: ${assignedCount}`);
    console.log(`  Existing assignments updated: ${updatedCount}`);
    console.log(`  Total active assignments processed: ${assignedCount + updatedCount}`);
    console.log(`  Students skipped (Adm.No not in core_students): ${missingCoreStudents.length}`);
    console.log(`  Students skipped (Pallikuth Bolero van): ${pallikuthBoleroStudents.length}`);
    console.log(`  Students skipped (Other unknown stops): ${otherMissingStopStudents.length}`);

    // Update unmatched_bus_students.xlsx
    const outWb = xlsx.utils.book_new();
    const wsMissing = xlsx.utils.json_to_sheet(missingCoreStudents);
    const wsPallikuth = xlsx.utils.json_to_sheet(pallikuthBoleroStudents);
    xlsx.utils.book_append_sheet(outWb, wsMissing, 'Missing In Core');
    xlsx.utils.book_append_sheet(outWb, wsPallikuth, 'Pallikuth Bolero');
    if (otherMissingStopStudents.length > 0) {
      const wsOther = xlsx.utils.json_to_sheet(otherMissingStopStudents);
      xlsx.utils.book_append_sheet(outWb, wsOther, 'Other Missing Stops');
    }
    const unmatchedPath = 'D:/edex/unmatched_bus_students.xlsx';
    xlsx.writeFile(outWb, unmatchedPath);
    console.log(`  📄 Updated unmatched file written to ${unmatchedPath}`);
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error during assignment, rolled back:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

runImport().catch(err => {
  console.error(err);
  process.exit(1);
});
