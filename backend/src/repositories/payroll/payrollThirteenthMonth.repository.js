import pool from "../../config/db.js";

export async function findPolicyByYear(year, client = pool) {
  const { rows } = await client.query(
    `SELECT *
       FROM payroll_thirteenth_month_policies
      WHERE policy_year = $1`,
    [year],
  );

  return rows[0] ?? null;
}

export async function listEmployeesForPolicy(year, client = pool) {
  const { rows } = await client.query(
    `SELECT
       employee.staff_id,
       CONCAT_WS(' ', NULLIF(TRIM(employee.last_name), ''), NULLIF(TRIM(employee.first_name), '')) AS full_name,
       department.name AS department_name,
       job_title.name AS job_title_name,
       work_location.name AS work_location_name,
       role.code AS role_code,
       override.id AS override_id,
       override.coefficient AS override_coefficient,
       override.reason AS override_reason,
       override.updated_at AS override_updated_at
     FROM employees AS employee
     LEFT JOIN departments AS department ON department.id = employee.department_id
     LEFT JOIN job_titles AS job_title ON job_title.id = employee.job_title_id
     LEFT JOIN work_locations AS work_location ON work_location.id = employee.work_location_id
     LEFT JOIN roles AS role ON role.id = employee.role_id
     LEFT JOIN payroll_thirteenth_month_policies AS policy ON policy.policy_year = $1
     LEFT JOIN payroll_thirteenth_month_overrides AS override
       ON override.policy_id = policy.id
      AND override.staff_id = employee.staff_id
     WHERE employee.is_active_staff = TRUE
     ORDER BY full_name, employee.staff_id`,
    [year],
  );

  return rows;
}

export async function upsertPolicy(
  { year, defaultCoefficient, status, notes, actorStaffId },
  client = pool,
) {
  const { rows } = await client.query(
    `INSERT INTO payroll_thirteenth_month_policies (
       policy_year, default_coefficient, status, notes,
       published_at, created_by, updated_by
     )
     VALUES (
       $1, $2, $3, $4,
       CASE WHEN $3::VARCHAR = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END,
       $5, $5
     )
     ON CONFLICT (policy_year) DO UPDATE SET
       default_coefficient = EXCLUDED.default_coefficient,
       status = EXCLUDED.status,
       notes = EXCLUDED.notes,
       published_at = CASE
         WHEN EXCLUDED.status = 'published'
           THEN COALESCE(payroll_thirteenth_month_policies.published_at, CURRENT_TIMESTAMP)
         ELSE NULL
       END,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [year, defaultCoefficient, status, notes, actorStaffId],
  );

  return rows[0];
}

export async function upsertEmployeeOverride(
  { policyId, staffId, coefficient, reason, actorStaffId },
  client = pool,
) {
  const { rows } = await client.query(
    `INSERT INTO payroll_thirteenth_month_overrides (
       policy_id, staff_id, coefficient, reason, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT (policy_id, staff_id) DO UPDATE SET
       coefficient = EXCLUDED.coefficient,
       reason = EXCLUDED.reason,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [policyId, staffId, coefficient, reason, actorStaffId],
  );

  return rows[0];
}

export async function deleteEmployeeOverride(
  { policyId, staffId },
  client = pool,
) {
  const { rowCount } = await client.query(
    `DELETE FROM payroll_thirteenth_month_overrides
      WHERE policy_id = $1 AND staff_id = $2`,
    [policyId, staffId],
  );

  return rowCount > 0;
}

export async function employeeExists(staffId, client = pool) {
  const { rowCount } = await client.query(
    `SELECT 1 FROM employees WHERE staff_id = $1 AND is_active_staff = TRUE`,
    [staffId],
  );

  return rowCount > 0;
}

export async function findEffectiveEmployeePolicy(
  { year, staffId },
  client = pool,
) {
  const { rows } = await client.query(
    `SELECT
       policy.id AS policy_id,
       policy.policy_year,
       policy.status,
       policy.default_coefficient,
       policy.published_at,
       override.coefficient AS override_coefficient,
       override.reason AS override_reason
     FROM payroll_thirteenth_month_policies AS policy
     LEFT JOIN payroll_thirteenth_month_overrides AS override
       ON override.policy_id = policy.id
      AND override.staff_id = $2
     WHERE policy.policy_year = $1
       AND policy.status = 'published'`,
    [year, staffId],
  );

  return rows[0] ?? null;
}
