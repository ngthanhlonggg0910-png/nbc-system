import pool from "../../config/db.js";

export async function calculateOvertime(
  { staff_id, date, start_time, end_time },
  client = pool,
) {
  const query = `
    UPDATE attendance_entries
    SET
      overtime_minutes = GREATEST(
        0,
        FLOOR(
          EXTRACT(
            EPOCH FROM (
              LEAST(
                check_out,
                (($2::date + $4::time)
                  AT TIME ZONE 'Asia/Ho_Chi_Minh')
              )
              -
              (($2::date + $3::time)
                AT TIME ZONE 'Asia/Ho_Chi_Minh')
            )
          ) / 60
        )
      )::INTEGER,

      overtime_start =
        (($2::date + $3::time)
          AT TIME ZONE 'Asia/Ho_Chi_Minh'),

      overtime_end =
        LEAST(
          check_out,
          (($2::date + $4::time)
            AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ),

      overtime_hours =
        ROUND(
          (
            GREATEST(
              0,
              FLOOR(
                EXTRACT(
                  EPOCH FROM (
                    LEAST(
                      check_out,
                      (($2::date + $4::time)
                        AT TIME ZONE 'Asia/Ho_Chi_Minh')
                    )
                    -
                    (($2::date + $3::time)
                      AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  )
                ) / 60
              )
            )
          ) / 60,
          2
        ),

      status =
        CASE
          WHEN
            LEAST(
              check_out,
              (($2::date + $4::time)
                AT TIME ZONE 'Asia/Ho_Chi_Minh')
            )
            >
            (($2::date + $3::time)
              AT TIME ZONE 'Asia/Ho_Chi_Minh')
          THEN
            CASE
              WHEN NOT ('overtime' = ANY(status))
              THEN array_append(status, 'overtime')
              ELSE status
            END
          ELSE
            array_remove(status, 'overtime')
        END,

      updated_at = CURRENT_TIMESTAMP

    WHERE staff_id = $1
      AND date = $2::date
      AND check_out IS NOT NULL

    RETURNING *;
  `;

  const { rows } = await client.query(query, [
    staff_id,
    date,
    start_time,
    end_time,
  ]);

  return rows[0] ?? null;
}

export async function findApprovedOvertimeRequest(
  staff_id,
  date,
  client = pool,
) {
  const query = `
    SELECT *
    FROM document_requests
    WHERE staff_id = $1
      AND type = 'Làm thêm giờ'
      AND status = 'Đã duyệt'
      AND $2::date BETWEEN start_date AND end_date
    ORDER BY id DESC
    LIMIT 1;
  `;

  const { rows } = await client.query(query, [staff_id, date]);

  return rows[0] ?? null;
}
