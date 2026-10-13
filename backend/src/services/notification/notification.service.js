import * as repository from
  "../../repositories/notification/notification.repository.js";
import { notificationError } from "./notification.error.js";
import { pushNotificationToStaffIds } from "./notification-push.service.js";

function parseNotificationId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw notificationError("notification_id không hợp lệ", 400, "INVALID_NOTIFICATION_ID");
  }
  return id;
}

function parseOptionalDate(value, fieldName) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw notificationError(`${fieldName} không hợp lệ`, 400, "INVALID_NOTIFICATION_DATE");
  }
  return date;
}

export async function createNotification(payload = {}, admin) {
  const title = payload.title?.trim();
  const description = payload.description?.trim();
  const staffId = payload.staff_id?.trim() || null;
  const audience = payload.audience?.trim() || "employee";
  const departmentId = payload.department_id ? Number(payload.department_id) : null;

  if (!title || title.length > 255) throw notificationError("Tiêu đề phải có từ 1 đến 255 ký tự", 400, "INVALID_NOTIFICATION_TITLE");
  if (!description) throw notificationError("Nội dung thông báo không được để trống", 400, "INVALID_NOTIFICATION_DESCRIPTION");
  if (!["employee", "department", "all"].includes(audience)) throw notificationError("Đối tượng nhận không hợp lệ", 400, "UNSUPPORTED_NOTIFICATION_AUDIENCE");
  if (audience === "employee" && !staffId) throw notificationError("Thiếu mã nhân viên người nhận", 400, "MISSING_NOTIFICATION_RECIPIENT");
  if (audience === "department" && (!Number.isSafeInteger(departmentId) || departmentId <= 0)) throw notificationError("Thiếu phòng ban nhận thông báo", 400, "MISSING_NOTIFICATION_DEPARTMENT");

  const publishedAt = parseOptionalDate(payload.published_at, "published_at") ?? new Date();
  const expiresAt = parseOptionalDate(payload.expires_at, "expires_at");
  if (publishedAt.getTime() < Date.now() - 60_000) throw notificationError("Thời gian gửi không được ở quá khứ", 400, "INVALID_NOTIFICATION_PUBLISH_TIME");
  if (expiresAt && expiresAt.getTime() <= publishedAt.getTime()) throw notificationError("Thời gian hết hạn phải sau thời gian gửi", 400, "INVALID_NOTIFICATION_EXPIRY");

  const client = await repository.pool.connect();
  try {
    await client.query("BEGIN");
    const recipientIds = await repository.findActiveRecipients({ audience, staffId, departmentId }, client);
    if (!recipientIds.length) throw notificationError("Không tìm thấy nhân viên đang hoạt động phù hợp", 404, "NOTIFICATION_RECIPIENT_NOT_FOUND");

    const notification = await repository.insertNotification({
      title, description,
      notificationType: payload.notification_type ?? "general",
      tone: payload.tone ?? "blue",
      icon: payload.icon ?? null,
      audience,
      staffId: audience === "employee" ? staffId : null,
      targetTab: payload.target_tab ?? "home",
      actionUrl: payload.action_url ?? null,
      imageUrl: payload.image_url ?? null,
      isUrgent: payload.is_urgent ?? false,
      allowReply: payload.allow_reply ?? false,
      createdBy: admin.staff_id,
      publishedAt,
      expiresAt,
    }, client);
    await repository.insertRecipients(notification.id, recipientIds, client);
    await client.query("COMMIT");

    if (publishedAt.getTime() <= Date.now()) {
      try {
        const result = await pushNotificationToStaffIds(notification, recipientIds);
        if (!result.skipped) await Promise.all(recipientIds.map((recipientId) => repository.recordPushSent(notification.id, recipientId)));
      } catch (pushError) {
        console.error("[Notification Push]", pushError.message);
      }
    }
    return { ...notification, recipient_count: recipientIds.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getMyNotifications(staffId, query = {}) {
  const { limit = 20, offset = 0, unreadOnly = false } = query;
  const [items, unreadCount, total] = await Promise.all([
    repository.findNotificationsByStaffId(staffId, { limit, offset, unreadOnly }),
    repository.countUnreadNotifications(staffId),
    repository.countNotifications(staffId, { unreadOnly }),
  ]);

  if (items.length > 0) {
    await repository.markNotificationsDelivered(
      staffId,
      items.map((item) => item.id),
    );
  }

  return {
    items: items.map((item) => ({
      ...item,
      delivered_at: item.delivered_at ?? new Date(),
    })),
    unread_count: unreadCount,
    pagination: {
      limit,
      offset,
      total,
      has_more: offset + items.length < total,
    },
  };
}

export async function getNotificationAudiences() {
  return { departments: await repository.findDepartments() };
}

export async function getNotificationDetail(notificationIdValue, staffId) {
  const notificationId = parseNotificationId(notificationIdValue);
  const notification = await repository.findAccessibleNotification(notificationId, staffId);
  if (!notification) {
    throw notificationError("Không tìm thấy thông báo", 404, "NOTIFICATION_NOT_FOUND");
  }
  const [responses, attachments] = await Promise.all([
    repository.findResponses(notificationId),
    repository.findAttachments(notificationId),
  ]);
  return { notification, responses, attachments };
}

export async function markAsRead(notificationIdValue, staffId) {
  const notificationId = parseNotificationId(notificationIdValue);
  const recipient = await repository.markNotificationRead(notificationId, staffId);
  if (!recipient) {
    throw notificationError("Không tìm thấy thông báo của người dùng", 404, "NOTIFICATION_NOT_FOUND");
  }
  return recipient;
}

export async function getSentNotifications(staffId, query = {}) {
  const { limit = 20, offset = 0 } = query;
  const [items, total] = await Promise.all([
    repository.findSentNotifications(staffId, { limit, offset }),
    repository.countSentNotifications(staffId),
  ]);

  return {
    items,
    pagination: {
      limit,
      offset,
      total,
      has_more: offset + items.length < total,
    },
  };
}

export async function getResponseInbox(staffId) {
  const rows = await repository.findResponseInbox(staffId);
  const conversations = new Map();
  for (const row of rows) {
    const key = String(row.notification_id);
    if (!conversations.has(key)) {
      conversations.set(key, {
        notification_id: row.notification_id,
        title: row.notification_title,
        description: row.notification_description,
        tone: row.tone,
        notification_type: row.notification_type,
        allow_reply: row.allow_reply,
        responses: [],
      });
    }
    conversations.get(key).responses.push({
      id: row.id,
      notification_id: row.notification_id,
      sender_staff_id: row.sender_staff_id,
      message: row.message,
      created_at: row.created_at,
      updated_at: row.updated_at,
      first_name: row.first_name,
      last_name: row.last_name,
    });
  }
  return [...conversations.values()].map((conversation) => {
    const latest = conversation.responses.at(-1);
    return {
      ...conversation,
      latest_response: latest,
      response_count: conversation.responses.length,
      pending: latest?.sender_staff_id !== staffId,
    };
  }).sort((a, b) => new Date(b.latest_response.created_at) - new Date(a.latest_response.created_at));
}

export async function markAllAsRead(staffId) {
  const updatedCount = await repository.markAllNotificationsRead(staffId);
  return { updated_count: updatedCount };
}

export async function setArchived(notificationIdValue, staffId, isArchived) {
  const notificationId = parseNotificationId(notificationIdValue);
  const recipient = await repository.setNotificationArchived(
    notificationId,
    staffId,
    isArchived,
  );
  if (!recipient) {
    throw notificationError(
      "Không tìm thấy thông báo của người dùng",
      404,
      "NOTIFICATION_NOT_FOUND",
    );
  }
  return recipient;
}

export async function replyToNotification(notificationIdValue, staffId, payload = {}) {
  const notificationId = parseNotificationId(notificationIdValue);
  const message = payload.message?.trim();
  if (!message || message.length > 5000) {
    throw notificationError("Nội dung phản hồi phải có từ 1 đến 5000 ký tự", 400, "INVALID_NOTIFICATION_REPLY");
  }

  const notification = await repository.findAccessibleNotification(notificationId, staffId);
  if (!notification) {
    throw notificationError("Bạn không có quyền truy cập thông báo", 404, "NOTIFICATION_NOT_FOUND");
  }
  if (!notification.allow_reply) {
    throw notificationError("Thông báo không cho phép phản hồi", 400, "NOTIFICATION_REPLY_DISABLED");
  }

  return repository.insertResponse({ notificationId, senderStaffId: staffId, message });
}
