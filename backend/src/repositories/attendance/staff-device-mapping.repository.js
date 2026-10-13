import pool from "../../config/db.js";

export async function findAttendanceContextByDeviceStaffId(
  staffIdDevice,
  client = pool,
) {
  const { rows } = await client.query(
    `
      SELECT
        employee.staff_id,
        mapping.staff_id_device,
        shift.*
      FROM attendance_staff_device_mappings AS mapping
      JOIN employees AS employee
        ON employee.staff_id = mapping.staff_id
      JOIN work_shifts AS shift
        ON shift.id = employee.shift_id
      WHERE mapping.staff_id_device = $1
      LIMIT 1
    `,
    [String(staffIdDevice)],
  );

  return rows[0] ?? null;
}

export async function findAttendanceContextByStaffId(
  staffId,
  client = pool,
) {
  const { rows } = await client.query(
    `
      SELECT
        employee.staff_id,
        mapping.staff_id_device,
        shift.*
      FROM attendance_staff_device_mappings AS mapping
      JOIN employees AS employee
        ON employee.staff_id = mapping.staff_id
      JOIN work_shifts AS shift
        ON shift.id = employee.shift_id
      WHERE mapping.staff_id = $1
      LIMIT 1
    `,
    [String(staffId)],
  );

  return rows[0] ?? null;
}
