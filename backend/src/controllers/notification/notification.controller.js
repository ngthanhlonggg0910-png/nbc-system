import * as notificationService from
  "../../services/notification/notification.service.js";
import { getAttachmentDownload, saveNotificationAttachment } from
  "../../services/notification/notification-attachment.service.js";

function sendError(res, error) {
  console.error("[Notification API]", error);

  return res.status(error.statusCode ?? 500).json({
    success: false,
    message: error.statusCode ? error.message : "Lỗi hệ thống",
    code: error.code ?? "INTERNAL_SERVER_ERROR",
  });
}

export async function createNotification(req, res) {
  try {
    const data = await notificationService.createNotification(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: "Đã tạo thông báo",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getMyNotifications(req, res) {
  try {
    const data = await notificationService.getMyNotifications(
      req.user.staff_id,
      req.notificationQuery,
    );
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getNotificationAudiences(req, res) {
  try {
    return res.json({ success: true, data: await notificationService.getNotificationAudiences() });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getNotificationDetail(req, res) {
  try {
    const data = await notificationService.getNotificationDetail(
      req.params.id,
      req.user.staff_id,
    );
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function markNotificationRead(req, res) {
  try {
    const data = await notificationService.markAsRead(
      req.params.id,
      req.user.staff_id,
    );
    return res.json({
      success: true,
      message: "Đã đánh dấu thông báo là đã đọc",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getSentNotifications(req, res) {
  try {
    const data = await notificationService.getSentNotifications(
      req.user.staff_id,
      req.notificationQuery,
    );
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getNotificationResponses(req, res) {
  try {
    const data = await notificationService.getResponseInbox(req.user.staff_id);
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    const data = await notificationService.markAllAsRead(req.user.staff_id);
    return res.json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function setNotificationArchived(req, res) {
  try {
    const data = await notificationService.setArchived(
      req.params.id,
      req.user.staff_id,
      req.body.is_archived,
    );
    return res.json({
      success: true,
      message: data.is_archived
        ? "Đã lưu trữ thông báo"
        : "Đã bỏ lưu trữ thông báo",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function replyNotification(req, res) {
  try {
    const data = await notificationService.replyToNotification(
      req.params.id,
      req.user.staff_id,
      req.body,
    );
    return res.status(201).json({
      success: true,
      message: "Đã gửi phản hồi",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function uploadAttachment(req, res) {
  try {
    const data = await saveNotificationAttachment(req.params.id, req.user, req.file);
    return res.status(201).json({
      success: true,
      message: "Đã tải tệp đính kèm",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function downloadAttachment(req, res) {
  try {
    const data = await getAttachmentDownload(req.params.attachmentId, req.user.staff_id);
    return res.download(data.path, data.attachment.original_name, (error) => {
      if (error && !res.headersSent) sendError(res, error);
    });
  } catch (error) {
    return sendError(res, error);
  }
}
