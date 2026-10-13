export async function findEmployeeShift(staffId, client) {
  const query = `
    SELECT
      ws.*
    FROM employees e
    JOIN work_shifts ws
      ON ws.id = e.shift_id
    WHERE e.staff_id = $1
    LIMIT 1
  `;

  const { rows } = await client.query(query, [staffId]);

  return rows[0] ?? null;
}
