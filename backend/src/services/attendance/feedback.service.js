import * as repository from "../../repositories/attendance/feedback.repository.js";
import pool from "../../config/db.js";
import { applyManualAttendanceAdjustment } from "./entry.service.js";

function toDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  }
  const text = String(value || "").trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text.slice(0, 10);
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value));
}

function mapRow(row) {
  return {
    id: Number(row.id),
    staffId: row.staff_id,
    employee: row.employee_name || row.staff_id,
    date: formatDate(row.attendance_date),
    message: row.message,
    status: row.status,
    reply: row.hr_reply || "",
    internalNote: row.internal_note || "",
    adjustedCheckIn: row.adjusted_check_in?.slice?.(0, 5) || "",
    adjustedCheckOut: row.adjusted_check_out?.slice?.(0, 5) || "",
    messages: Array.isArray(row.messages) ? row.messages : [],
    requestType: row.request_type === "conversation" ? "conversation" : "adjustment",
    initiatedBy: row.initiated_by || "employee",
    handledBy: row.handled_by,
    processedAt: formatDateTime(row.processed_at),
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at),
  };
}

export async function listFeedbacks(user) {
  const canManage = ["hr", "admin"].includes(user.role);
  const rows = await repository.findAll(canManage ? {} : { staffId: user.staff_id });
  return rows.map(mapRow);
}

export async function getFeedback(id, user) {
  const row = await repository.findById(id);
  if (!row) throw new Error("Không tìm thấy phản hồi chấm công");
  if (!["hr", "admin"].includes(user.role) && row.staff_id !== user.staff_id) {
    const error = new Error("Bạn không có quyền xem phản hồi này");
    error.statusCode = 403;
    throw error;
  }
  return mapRow(row);
}

export async function createFeedback(data, user) {
  const date = toDateValue(data.date);
  const message = String(data.message || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ngày chấm công không hợp lệ");
  if (!message) throw new Error("Nội dung phản hồi là bắt buộc");
  if (message.length > 2000) throw new Error("Nội dung phản hồi tối đa 2000 ký tự");
  const isHr = ["hr", "admin"].includes(user.role);
  const conversation = data.requestType === "conversation";
  if (conversation && !isHr) throw new Error("Chỉ HR mới được chủ động tạo cuộc trò chuyện");
  const staffId = conversation ? String(data.staffId || "").trim() : user.staff_id;
  if (!staffId) throw new Error("Nhân viên nhận tin nhắn là bắt buộc");
  return mapRow(await repository.create({
    staffId,
    date,
    message,
    requestType: conversation ? "conversation" : "adjustment",
    initiatedBy: conversation ? "hr" : "employee",
    status: conversation ? "reviewing" : "pending",
  }));
}

export async function resolveFeedback(id, data, user) {
  if (!["hr", "admin"].includes(user.role)) {
    const error = new Error("Chỉ HR mới được xử lý phản hồi");
    error.statusCode = 403;
    throw error;
  }
  const status = String(data.status || "");
  if (!["reviewing", "approved", "rejected"].includes(status)) throw new Error("Trạng thái xử lý không hợp lệ");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await repository.findById(id, client);
    if (!existing) throw new Error("Không tìm thấy phản hồi chấm công");
    const lastHrMessage = [...(existing.messages || [])].reverse().find((message) => message.sender === "hr");
    const appendReply = Boolean(data.reply) && lastHrMessage?.text !== data.reply;
    if (status === "approved") {
      const checkIn = String(data.adjustedCheckIn || "").slice(0, 5);
      const checkOut = String(data.adjustedCheckOut || "").slice(0, 5);
      if (!checkIn || !checkOut) throw new Error("Vui lòng nhập đầy đủ giờ check-in và check-out");
      await applyManualAttendanceAdjustment({
        staffId: existing.staff_id,
        date: toDateValue(existing.attendance_date),
        checkIn,
        checkOut,
        note: data.reply,
      }, client);
    }
    const updated = await repository.resolve(id, { ...data, status, appendReply }, user.staff_id, client);
    await client.query("COMMIT");
    return mapRow(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
