import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import * as repository from "../../repositories/notification/notification.repository.js";
import { notificationError } from "./notification.error.js";

const allowed = new Map([
  ["image/png", ["png"]],
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/webp", ["webp"]],
  ["application/pdf", ["pdf"]],
  ["application/zip", ["docx", "xlsx", "pptx"]],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ["docx"]],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ["xlsx"]],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", ["pptx"]],
]);

export async function saveNotificationAttachment(notificationId, user, file) {
  if (!file?.buffer?.length) {
    throw notificationError("Thiếu tệp đính kèm", 400, "MISSING_NOTIFICATION_ATTACHMENT");
  }

  const notification = await repository.findAccessibleNotification(notificationId, user.staff_id);
  if (!notification || notification.created_by !== user.staff_id) {
    throw notificationError("Không có quyền đính kèm tệp", 403, "NOTIFICATION_ATTACHMENT_FORBIDDEN");
  }

  const detected = await fileTypeFromBuffer(file.buffer);
  const extension = path.extname(file.originalname).slice(1).toLowerCase();
  if (!detected || !allowed.get(detected.mime)?.includes(extension)) {
    throw notificationError(
      "Chỉ hỗ trợ PNG, JPG, WEBP, PDF, DOCX, XLSX hoặc PPTX hợp lệ",
      400,
      "UNSUPPORTED_NOTIFICATION_ATTACHMENT",
    );
  }

  const storedName = `${randomUUID()}.${extension}`;
  const directory = path.resolve("uploads", "notifications");
  const target = path.join(directory, storedName);
  await mkdir(directory, { recursive: true });
  await writeFile(target, file.buffer, { flag: "wx" });

  try {
    return await repository.insertAttachment({
      notificationId,
      uploadedBy: user.staff_id,
      originalName: path.basename(file.originalname).slice(0, 255),
      storedName,
      mimeType: detected.mime,
      sizeBytes: file.size,
    });
  } catch (error) {
    await unlink(target).catch(() => undefined);
    throw error;
  }
}

export async function getAttachmentDownload(attachmentId, staffId) {
  const id = Number(attachmentId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw notificationError("attachment_id không hợp lệ", 400, "INVALID_ATTACHMENT_ID");
  }
  const attachment = await repository.findAccessibleAttachment(id, staffId);
  if (!attachment) {
    throw notificationError("Không tìm thấy tệp đính kèm", 404, "ATTACHMENT_NOT_FOUND");
  }
  return {
    attachment,
    path: path.resolve("uploads", "notifications", attachment.stored_name),
  };
}
