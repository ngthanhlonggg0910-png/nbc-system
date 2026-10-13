import pool from "../../config/db.js";

export async function findEmployeeProfile(staffId, client = pool) {
    const { rows } = await client.query(
        `
    SELECT
      e.staff_id,
      e.first_name,
      e.last_name,
      e.avatar_url,
      d.name AS department,
      j.name AS position
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN job_titles j ON j.id = e.job_title_id
    WHERE e.staff_id = $1
    LIMIT 1;
    `,
        [staffId]
    );
    return rows[0] ?? null;
}

export async function findDocumentCount(staffId, year, client = pool) {
    const { rows } = await client.query(
        `
    SELECT COUNT(*)::INTEGER AS total
    FROM document_requests
    WHERE staff_id = $1
      AND EXTRACT(YEAR FROM created_at) = $2;
    `,
        [staffId, year]
    );
    return rows[0]?.total ?? 0;
}

export async function findTodayAttendance(staffId, dateStr, client = pool) {
    const { rows } = await client.query(
        `
    SELECT
      entry.id,
      entry.staff_id,
      entry.date,
      entry.check_in,
      entry.check_out,
      entry.status,
      entry.hours,
      shift.name AS shift_name,
      shift.start_time,
      shift.end_time,
      shift.break_minutes
    FROM attendance_entries AS entry
    LEFT JOIN work_shifts AS shift
      ON shift.id = entry.shift_id
    WHERE entry.staff_id = $1
      AND entry.date = $2::DATE
    LIMIT 1;
    `,
        [staffId, dateStr]
    );
    return rows[0] ?? null;
}

export async function findMonthlyAttendanceEntries(staffId, monthStr, client = pool) {
    const { rows } = await client.query(
        `
    SELECT
      id,
      staff_id,
      date,
      check_in,
      check_out,
      status,
      hours
    FROM attendance_entries
    WHERE staff_id = $1
      AND TO_CHAR(date, 'YYYY-MM') = $2
    ORDER BY date ASC;
    `,
        [staffId, monthStr]
    );
    return rows;
}

export async function findLatestPayslip(staffId, client = pool) {
    const { rows } = await client.query(
        `
    SELECT
      payslip.id,
      payslip.staff_id,
      payslip.net_salary,
      payslip.paid_at,
      period.period_code
    FROM employee_payslips AS payslip
    INNER JOIN payroll_periods AS period
      ON period.id = payslip.payroll_period_id
    WHERE payslip.staff_id = $1
      AND payslip.status <> 'draft'
    ORDER BY period.period_code DESC, payslip.id DESC
    LIMIT 1;
    `,
        [staffId]
    );
    return rows[0] ?? null;
}
