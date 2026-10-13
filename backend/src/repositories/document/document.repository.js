import pool from "../../config/db.js";

export async function getDocuments() {
  const query = `
    SELECT
      dr.*,

      e.last_name,
      e.first_name,
      CONCAT_WS(' ', e.last_name, e.first_name) AS employee_name,
      e.email AS employee_email,
      e.phone AS employee_phone,
      e.avatar_url AS employee_avatar,

      COALESCE(
        json_agg(
          json_build_object(
            'id', da.id,
            'name', da.name,
            'type', da.type,
            'size', da.size,
            'url', da.url,
            'uploaded_at', da.uploaded_at
          )
        ) FILTER (WHERE da.id IS NOT NULL),
        '[]'
      ) AS attachments

    FROM document_requests dr

    LEFT JOIN employees e
      ON dr.staff_id = e.staff_id

    LEFT JOIN document_attachments da
      ON da.document_id = dr.id

    GROUP BY
      dr.id,
      e.last_name,
      e.first_name,
      e.email,
      e.phone,
      e.avatar_url

    ORDER BY dr.id DESC
  `;

  const result = await pool.query(query);

  return result.rows;
}

export async function findDocumentById(id, client = pool) {
  const query = `
    SELECT *
    FROM document_requests
    WHERE id = $1
  `;

  const { rows } = await client.query(query, [id]);

  return rows[0] ?? null;
}

export async function updateApprovalState(
  id,
  { status, current_step },
  client = pool,
) {
  const query = `
    UPDATE document_requests
    SET
      status = $1,
      current_step = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;

  const { rows } = await client.query(query, [status, current_step, id]);

  return rows[0] ?? null;
}

export async function hasDirectManager(staffId, client = pool) {
  const { rows } = await client.query(
    `
      SELECT manager_id
      FROM employees
      WHERE staff_id = $1
      LIMIT 1
    `,
    [staffId],
  );

  return Boolean(rows[0]?.manager_id);
}

export async function createDocumentRequest(data, client = pool) {
  const {
    staff_id,
    type,
    reason,
    start_date,
    end_date,
    start_time,
    end_time,
    total_days,
    current_step,
  } = data;

  const query = `
    INSERT INTO document_requests (
      staff_id,
      type,
      reason,
      created_at,
      status,
      start_date,
      end_date,
      start_time,
      end_time,
      total_days,
      current_step,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      CURRENT_TIMESTAMP,
      'Chờ duyệt',
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      CURRENT_TIMESTAMP
    )
    RETURNING *;
  `;

  const values = [
    staff_id,
    type,
    reason,
    start_date ?? null,
    end_date ?? null,
    start_time ?? null,
    end_time ?? null,
    total_days ?? null,
    current_step ?? 1,
  ];

  const result = await client.query(query, values);

  return result.rows[0];
}

export async function rejectDocumentRequest(id) {
  const query = `
    UPDATE document_requests
    SET
      status = 'Từ chối',
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0];
}

export async function createDocumentAttachment(client, data) {
  const query = `
    INSERT INTO document_attachments (
      document_id,
      name,
      type,
      size,
      url
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [data.document_id, data.name, data.type, data.size, data.url];

  const result = await client.query(query, values);

  return result.rows[0];
}

export async function findDocumentAttachmentById(id) {
  const result = await pool.query(
    `
      SELECT *
      FROM document_attachments
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0];
}

export async function isEmployeeManagedBy(
  employeeStaffId,
  managerStaffId,
  client = pool,
) {
  const { rows } = await client.query(
    `
      SELECT 1
      FROM employees
      WHERE staff_id = $1
        AND manager_id = $2
      LIMIT 1
    `,
    [employeeStaffId, managerStaffId],
  );

  return rows.length > 0;
}

export async function getPendingDocumentsForManager(
  managerStaffId,
  client = pool,
) {
  const { rows } = await client.query(
    `
      SELECT
        dr.*,
        e.first_name,
        e.last_name,
        CONCAT_WS(' ', e.last_name, e.first_name) AS employee_name,
        e.email AS employee_email,
        e.phone AS employee_phone,
        e.avatar_url AS employee_avatar
      FROM document_requests dr
      INNER JOIN employees e
        ON e.staff_id = dr.staff_id
      WHERE e.manager_id = $1
        AND dr.status = 'Chờ duyệt'
        AND dr.current_step = 1
      ORDER BY dr.created_at DESC
    `,
    [managerStaffId],
  );

  return rows;
}
