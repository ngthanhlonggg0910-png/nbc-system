import pool from "../../config/db.js";

export async function findEmployeeByStaffId(
    staffId,
    client = pool,
) {
    const { rows } = await client.query(
        `
      SELECT
        staff_id,
        first_name,
        last_name,
        role_id,
        is_active_staff
      FROM employees
      WHERE staff_id = $1
      LIMIT 1;
    `,
        [staffId],
    );

    return rows[0] ?? null;
}

export async function findActiveRecipients({ audience, staffId, departmentId }, client = pool) {
    const conditions = ["is_active_staff = TRUE"];
    const values = [];
    if (audience === "employee") {
        values.push(staffId);
        conditions.push(`staff_id = $${values.length}`);
    } else if (audience === "department") {
        values.push(departmentId);
        conditions.push(`department_id = $${values.length}`);
    }
    const { rows } = await client.query(
        `SELECT staff_id FROM employees WHERE ${conditions.join(" AND ")} ORDER BY staff_id`,
        values,
    );
    return rows.map((row) => row.staff_id);
}

export async function findDepartments(client = pool) {
    const { rows } = await client.query(`SELECT id, name FROM departments ORDER BY name`);
    return rows;
}

export async function insertNotification(
    data,
    client = pool,
) {
    const { rows } = await client.query(
        `
      INSERT INTO notifications (
        title,
        description,
        notification_type,
        tone,
        icon,
        audience,
        staff_id,
        target_tab,
        action_url,
        image_url,
        is_urgent,
        allow_reply,
        created_by,
        published_at,
        expires_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14,
        $15
      )
      RETURNING *;
    `,
        [
            data.title,
            data.description,
            data.notificationType,
            data.tone,
            data.icon,
            data.audience,
            data.staffId,
            data.targetTab,
            data.actionUrl,
            data.imageUrl,
            data.isUrgent,
            data.allowReply,
            data.createdBy,
            data.publishedAt,
            data.expiresAt,
        ],
    );

    return rows[0];
}

export async function insertRecipients(notificationId, staffIds, client = pool) {
    if (!staffIds.length) return [];
    const { rows } = await client.query(
        `INSERT INTO notification_recipients (notification_id, staff_id)
         SELECT $1, recipient.staff_id
         FROM UNNEST($2::VARCHAR[]) AS recipient(staff_id)
         ON CONFLICT (notification_id, staff_id) DO NOTHING
         RETURNING *`,
        [notificationId, staffIds],
    );
    return rows;
}

export async function findDuePushRecipients(client = pool) {
    const { rows } = await client.query(`
      SELECT n.*, nr.staff_id
      FROM notifications n
      JOIN notification_recipients nr ON nr.notification_id = n.id
      WHERE n.published_at IS NOT NULL
        AND n.published_at <= CURRENT_TIMESTAMP
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
        AND nr.push_count = 0
      ORDER BY n.published_at, n.id
      LIMIT 500;
    `);
    return rows;
}

export async function insertRecipient(
    notificationId,
    staffId,
    client = pool,
) {
    const { rows } = await client.query(
        `
      INSERT INTO notification_recipients (
        notification_id,
        staff_id
      )
      VALUES (
        $1,
        $2
      )
      ON CONFLICT (
        notification_id,
        staff_id
      )
      DO NOTHING
      RETURNING *;
    `,
        [notificationId, staffId],
    );

    return rows[0] ?? null;
}

export async function findNotificationsByStaffId(
    staffId,
    {
        limit = 20,
        offset = 0,
        unreadOnly = false,
    } = {},
    client = pool,
) {
    const { rows } = await client.query(
        `
      SELECT
        n.id,
        n.title,
        n.description,
        n.notification_type,
        n.tone,
        n.icon,
        n.target_tab,
        n.attendance_date,
        n.article_id,
        n.action_url,
        n.image_url,
        n.is_urgent,
        n.allow_reply,
        n.created_by,
        n.published_at,
        n.expires_at,
        n.created_at,

        nr.delivered_at,
        nr.read_at,
        nr.is_archived,

        (nr.read_at IS NOT NULL) AS is_read

      FROM notification_recipients nr

      JOIN notifications n
        ON n.id = nr.notification_id

      WHERE nr.staff_id = $1
        AND nr.is_archived = FALSE
        AND n.published_at IS NOT NULL
        AND n.published_at
          <= CURRENT_TIMESTAMP
        AND (
          n.expires_at IS NULL
          OR n.expires_at
            > CURRENT_TIMESTAMP
        )
        AND (
          $2::BOOLEAN = FALSE
          OR nr.read_at IS NULL
        )

      ORDER BY
        n.is_urgent DESC,
        n.published_at DESC,
        n.id DESC

      LIMIT $3
      OFFSET $4;
    `,
        [
            staffId,
            unreadOnly,
            limit,
            offset,
        ],
    );

    return rows;
}

export async function countUnreadNotifications(
    staffId,
    client = pool,
) {
    const { rows } = await client.query(
        `
      SELECT COUNT(*)::INTEGER AS total
      FROM notification_recipients nr
      JOIN notifications n
        ON n.id = nr.notification_id
      WHERE nr.staff_id = $1
        AND nr.read_at IS NULL
        AND nr.is_archived = FALSE
        AND n.published_at IS NOT NULL
        AND n.published_at
          <= CURRENT_TIMESTAMP
        AND (
          n.expires_at IS NULL
          OR n.expires_at
            > CURRENT_TIMESTAMP
        );
    `,
        [staffId],
    );

    return rows[0].total;
}

export async function findSentNotifications(
    staffId,
    { limit = 20, offset = 0 } = {},
    client = pool,
) {
    const { rows } = await client.query(
        `
      SELECT
        n.*,
        (SELECT COUNT(*)::INTEGER
          FROM notification_recipients nr
          WHERE nr.notification_id = n.id) AS recipient_count,
        (SELECT COUNT(*)::INTEGER
          FROM notification_recipients nr
          WHERE nr.notification_id = n.id
            AND nr.read_at IS NOT NULL) AS read_count,
        (SELECT COUNT(*)::INTEGER
          FROM notification_responses response
          WHERE response.notification_id = n.id) AS response_count
      FROM notifications n
      WHERE n.created_by = $1
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT $2 OFFSET $3;
    `,
        [staffId, limit, offset],
    );

    return rows;
}

export async function countSentNotifications(staffId, client = pool) {
    const { rows } = await client.query(
        `SELECT COUNT(*)::INTEGER AS total FROM notifications WHERE created_by = $1;`,
        [staffId],
    );
    return rows[0].total;
}

export async function countNotifications(
    staffId,
    { unreadOnly = false } = {},
    client = pool,
) {
    const { rows } = await client.query(
        `
      SELECT COUNT(*)::INTEGER AS total
      FROM notification_recipients nr
      JOIN notifications n
        ON n.id = nr.notification_id
      WHERE nr.staff_id = $1
        AND nr.is_archived = FALSE
        AND n.published_at IS NOT NULL
        AND n.published_at <= CURRENT_TIMESTAMP
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
        AND ($2::BOOLEAN = FALSE OR nr.read_at IS NULL);
    `,
        [staffId, unreadOnly],
    );

    return rows[0].total;
}

export async function markNotificationsDelivered(
    staffId,
    notificationIds,
    client = pool,
) {
    if (notificationIds.length === 0) return 0;

    const { rowCount } = await client.query(
        `
      UPDATE notification_recipients
      SET delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
      WHERE staff_id = $1
        AND notification_id = ANY($2::BIGINT[])
        AND delivered_at IS NULL;
    `,
        [staffId, notificationIds],
    );

    return rowCount;
}

export async function findAccessibleNotification(
    notificationId,
    staffId,
    client = pool,
) {
    const { rows } = await client.query(
        `
      SELECT DISTINCT
        n.*,
        nr.delivered_at,
        nr.read_at,
        nr.is_archived,
        (nr.read_at IS NOT NULL) AS recipient_is_read

      FROM notifications n

      LEFT JOIN notification_recipients nr
        ON nr.notification_id = n.id
        AND nr.staff_id = $2

      WHERE n.id = $1
        AND (
          nr.staff_id = $2
          OR n.created_by = $2
        )

      LIMIT 1;
    `,
        [notificationId, staffId],
    );

    return rows[0] ?? null;
}

export async function markNotificationRead(
    notificationId,
    staffId,
    client = pool,
) {
    const { rows } = await client.query(
        `
      UPDATE notification_recipients
      SET read_at = COALESCE(
        read_at,
        CURRENT_TIMESTAMP
      )
      WHERE notification_id = $1
        AND staff_id = $2
      RETURNING *;
    `,
        [notificationId, staffId],
    );

    return rows[0] ?? null;
}

export async function markAllNotificationsRead(
    staffId,
    client = pool,
) {
    const { rowCount } = await client.query(
        `
      UPDATE notification_recipients nr
      SET
        delivered_at = COALESCE(nr.delivered_at, CURRENT_TIMESTAMP),
        read_at = CURRENT_TIMESTAMP
      FROM notifications n
      WHERE nr.notification_id = n.id
        AND nr.staff_id = $1
        AND nr.read_at IS NULL
        AND nr.is_archived = FALSE
        AND n.published_at IS NOT NULL
        AND n.published_at <= CURRENT_TIMESTAMP
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP);
    `,
        [staffId],
    );

    return rowCount;
}

export async function setNotificationArchived(
    notificationId,
    staffId,
    isArchived,
    client = pool,
) {
    const { rows } = await client.query(
        `
      UPDATE notification_recipients
      SET is_archived = $3
      WHERE notification_id = $1
        AND staff_id = $2
      RETURNING *;
    `,
        [notificationId, staffId, isArchived],
    );

    return rows[0] ?? null;
}

export async function recordPushSent(notificationId, staffId, client = pool) {
    const { rows } = await client.query(
        `
      UPDATE notification_recipients
      SET
        first_push_at = COALESCE(first_push_at, CURRENT_TIMESTAMP),
        last_push_at = CURRENT_TIMESTAMP,
        push_count = push_count + 1
      WHERE notification_id = $1
        AND staff_id = $2
      RETURNING *;
    `,
        [notificationId, staffId],
    );
    return rows[0] ?? null;
}

export async function insertResponse(
    data,
    client = pool,
) {
    const { rows } = await client.query(
        `
      INSERT INTO notification_responses (
        notification_id,
        sender_staff_id,
        message
      )
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
        [
            data.notificationId,
            data.senderStaffId,
            data.message,
        ],
    );

    return rows[0];
}

export async function findResponses(
    notificationId,
    client = pool,
) {
    const { rows } = await client.query(
        `
      SELECT
        response.id,
        response.notification_id,
        response.sender_staff_id,
        response.message,
        response.created_at,
        response.updated_at,

        employee.first_name,
        employee.last_name

      FROM notification_responses response

      JOIN employees employee
        ON employee.staff_id =
          response.sender_staff_id

      WHERE response.notification_id = $1

      ORDER BY
        response.created_at ASC,
        response.id ASC;
    `,
        [notificationId],
    );

    return rows;
}

export async function findResponseInbox(createdBy, client = pool) {
  const { rows } = await client.query(`
    SELECT
      response.id, response.notification_id, response.sender_staff_id,
      response.message, response.created_at, response.updated_at,
      n.title AS notification_title, n.description AS notification_description,
      n.allow_reply, n.tone, n.notification_type,
      employee.first_name, employee.last_name
    FROM notification_responses response
    JOIN notifications n ON n.id = response.notification_id
    JOIN employees employee ON employee.staff_id = response.sender_staff_id
    WHERE n.created_by = $1
    ORDER BY response.notification_id, response.created_at ASC, response.id ASC
  `, [createdBy]);
  return rows;
}

export async function insertAttachment(data, client = pool) {
    const { rows: insertedRows } = await client.query(
        `
      INSERT INTO notification_attachments (
        notification_id, uploaded_by, original_name, stored_name,
        mime_type, size_bytes, file_url
      ) VALUES ($1, $2, $3, $4, $5, $6, '')
      RETURNING id;
    `,
        [data.notificationId, data.uploadedBy, data.originalName, data.storedName,
            data.mimeType, data.sizeBytes],
    );
    const attachmentId = insertedRows[0]?.id;
    if (!attachmentId) return null;

    const { rows } = await client.query(
        `
      UPDATE notification_attachments attachment
      SET file_url = '/api/notifications/attachments/' || attachment.id || '/download'
      WHERE attachment.id = $1
      RETURNING attachment.*;
    `,
        [attachmentId],
    );
    return rows[0];
}

export async function findAccessibleAttachment(attachmentId, staffId, client = pool) {
    const { rows } = await client.query(
        `
      SELECT attachment.*
      FROM notification_attachments attachment
      JOIN notifications notification
        ON notification.id = attachment.notification_id
      LEFT JOIN notification_recipients recipient
        ON recipient.notification_id = notification.id
        AND recipient.staff_id = $2
      WHERE attachment.id = $1
        AND (recipient.staff_id = $2 OR notification.created_by = $2)
      LIMIT 1;
    `,
        [attachmentId, staffId],
    );
    return rows[0] ?? null;
}

export async function findAttachments(notificationId, client = pool) {
    const { rows } = await client.query(
        `
      SELECT id, notification_id, uploaded_by, original_name, mime_type,
        size_bytes, file_url, created_at
      FROM notification_attachments
      WHERE notification_id = $1
      ORDER BY created_at ASC, id ASC;
    `,
        [notificationId],
    );
    return rows;
}

export { pool };
