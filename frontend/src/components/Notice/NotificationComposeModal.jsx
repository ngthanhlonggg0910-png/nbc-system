import React, { useState } from "react";
import { Send, X } from "lucide-react";
import { createNotification, uploadNotificationAttachment } from "@/utils/notification-api";

const initialForm = {
  title: "",
  description: "",
  staff_id: "",
  notification_type: "general",
  tone: "blue",
  target_tab: "home",
  is_urgent: false,
  allow_reply: true,
};

export function NotificationComposeModal({ token, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const notification = await createNotification(form, token);
      if (file) await uploadNotificationAttachment(notification.id, file, token);
      onCreated(notification);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="notification-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="notification-detail-modal notification-compose-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><span>QUẢN TRỊ THÔNG BÁO</span><h2>Tạo thông báo mới</h2></div>
          <button type="button" onClick={onClose} aria-label="Đóng"><X /></button>
        </header>
        <div className="notification-compose-fields">
          <label><span>Người nhận</span><input value={form.staff_id} onChange={(event) => update("staff_id", event.target.value)} maxLength={30} placeholder="Ví dụ: NV002" required /></label>
          <label><span>Tiêu đề</span><input value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={255} required /></label>
          <label className="notification-compose-wide"><span>Nội dung</span><textarea value={form.description} onChange={(event) => update("description", event.target.value)} required /></label>
          <label><span>Loại</span><select value={form.notification_type} onChange={(event) => update("notification_type", event.target.value)}><option value="general">Chung</option><option value="attendance">Chấm công</option><option value="payroll">Lương</option><option value="document">Văn bản</option><option value="system">Hệ thống</option><option value="urgent">Khẩn cấp</option><option value="article">Bài viết</option></select></label>
          <label><span>Màn hình đích</span><select value={form.target_tab} onChange={(event) => update("target_tab", event.target.value)}><option value="home">Trang chủ</option><option value="attendance">Chấm công</option><option value="payroll">Phiếu lương</option><option value="documents">Văn bản</option><option value="news">Tin tức</option><option value="profile">Cá nhân</option></select></label>
          <label><span>Màu sắc</span><select value={form.tone} onChange={(event) => update("tone", event.target.value)}><option value="blue">Xanh dương</option><option value="green">Xanh lá</option><option value="orange">Cam</option><option value="red">Đỏ</option></select></label>
          <div className="notification-compose-checks">
            <label><input type="checkbox" checked={form.is_urgent} onChange={(event) => update("is_urgent", event.target.checked)} /> Ưu tiên</label>
            <label><input type="checkbox" checked={form.allow_reply} onChange={(event) => update("allow_reply", event.target.checked)} /> Cho phép phản hồi</label>
          </div>
          <label className="notification-compose-wide"><span>Tệp đính kèm (PNG, JPG, PDF, DOCX, XLSX; tối đa 10 MB)</span><input type="file" accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
          {error && <p className="notification-detail-error notification-compose-wide">{error}</p>}
        </div>
        <footer><button type="button" className="notification-archive-button" onClick={onClose}>Hủy</button><button type="submit" disabled={submitting}><Send /> {submitting ? "Đang gửi..." : "Gửi thông báo"}</button></footer>
      </form>
    </div>
  );
}
