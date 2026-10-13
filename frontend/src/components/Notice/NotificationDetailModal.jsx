import React, { useEffect, useState } from "react";
import {
  Archive,
  BellRing,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  MessageSquareReply,
  Send,
  ShieldAlert,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  archiveNotification,
  downloadNotificationAttachment,
  fetchNotificationDetail,
  getNotificationAttachmentObjectUrl,
  replyToNotification,
} from "@/utils/notification-api";

const typeLabels = {
  urgent: "Thông báo ưu tiên",
  system: "Thông báo hệ thống",
  attendance: "Chấm công",
  payroll: "Tiền lương",
  document: "Văn bản",
  article: "Tin nội bộ",
  general: "Thông báo nội bộ",
};

function formatDate(value) {
  if (!value) return "Chưa xác định";
  return new Date(value).toLocaleString("vi-VN");
}

function ProtectedNotificationImage({ attachment, token }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    getNotificationAttachmentObjectUrl(attachment, token).then((value) => {
      objectUrl = value;
      if (active) setUrl(value);
      else URL.revokeObjectURL(value);
    }).catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, token]);
  return url ? <img className="notification-detail-image" src={url} alt={attachment.original_name} /> : null;
}

export function NotificationDetailModal({ notice, token, onClose, onArchived, canArchive = true }) {
  const [detail, setDetail] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchNotificationDetail(notice.id, token)
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [notice.id, token]);

  const submitReply = async (event) => {
    event.preventDefault();
    const value = message.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await replyToNotification(notice.id, value, token);
      setDetail((current) => ({ ...current, responses: [...(current?.responses ?? []), response] }));
      setMessage("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const archive = async () => {
    setSubmitting(true);
    setError("");
    try {
      await archiveNotification(notice.id, true, token);
      onArchived(notice.id);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const notification = detail?.notification ?? notice;
  const responses = detail?.responses ?? [];
  const attachments = detail?.attachments ?? [];
  const uploadedImage = attachments.find((attachment) => attachment.mime_type?.startsWith("image/"));
  const canReply = Boolean(notification.allow_reply ?? notice.allowReply);
  const isUrgent = Boolean(notification.is_urgent || notification.notification_type === "urgent");
  const recipient = notification.staff_id || notification.target_staff_id || "Tất cả nhân viên";

  return (
    <div className="notification-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`notification-detail-modal notification-detail-redesign${isUrgent ? " urgent" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="notification-detail-hero">
          <span className="notification-detail-hero-icon">
            {isUrgent ? <ShieldAlert /> : <BellRing />}
          </span>
          <div className="notification-detail-hero-content">
            <span className="notification-detail-badge">
              {typeLabels[notification.notification_type] || "Chi tiết thông báo"}
            </span>
            <h2 id="notification-detail-title">{notification.title}</h2>
            <p>{isUrgent ? "Nội dung ưu tiên khẩn cấp" : "Thông tin đã gửi đến nhân viên"}</p>
          </div>
          <button type="button" className="notification-detail-hero-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>

        <div className="notification-detail-body">
          {loading ? (
            <div className="notification-detail-loading">
              <LoaderCircle /> Đang tải chi tiết...
            </div>
          ) : (
            <>
              {/* Meta Cards */}
              <div className="notification-detail-meta">
                <span>
                  <div className="meta-icon-wrapper blue"><UserRound size={18} /></div>
                  <div className="meta-info-text">
                    <small>Người gửi</small>
                    <strong>{notification.created_by || "Hệ thống"}</strong>
                  </div>
                </span>
                <span>
                  <div className="meta-icon-wrapper teal"><UsersRound size={18} /></div>
                  <div className="meta-info-text">
                    <small>Người nhận</small>
                    <strong>{recipient}</strong>
                  </div>
                </span>
                <span>
                  <div className="meta-icon-wrapper indigo"><CalendarDays size={18} /></div>
                  <div className="meta-info-text">
                    <small>Thời gian gửi</small>
                    <strong>{formatDate(notification.published_at || notification.created_at)}</strong>
                  </div>
                </span>
                <span>
                  <div className="meta-icon-wrapper amber"><MessageSquareReply size={18} /></div>
                  <div className="meta-info-text">
                    <small>Trao đổi</small>
                    <strong>{responses.length} tin nhắn</strong>
                  </div>
                </span>
              </div>

              {/* Content Card */}
              <section className="notification-content-card">
                <div className="notification-content-heading">
                  <FileText />
                  <div>
                    <span>NỘI DUNG THÔNG BÁO</span>
                    <strong>{notification.title}</strong>
                  </div>
                </div>
                <p className="notification-detail-description">{notification.description}</p>
                {notification.image_url && (
                  <img className="notification-detail-image" src={notification.image_url} alt="Ảnh đính kèm thông báo" />
                )}
                {!notification.image_url && uploadedImage && (
                  <ProtectedNotificationImage attachment={uploadedImage} token={token} />
                )}
                {notification.action_url && (
                  <a className="notification-detail-action" href={notification.action_url} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} /> Mở nội dung liên quan
                  </a>
                )}
              </section>

              {/* Attachments */}
              {attachments.length > 0 && (
                <section className="notification-attachments">
                  <h3>
                    <FileText /> Tệp đính kèm <i>{attachments.length}</i>
                  </h3>
                  {attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      type="button"
                      onClick={() =>
                        downloadNotificationAttachment(attachment, token).catch((requestError) =>
                          setError(requestError.message)
                        )
                      }
                    >
                      <span>
                        <FileText />
                        <b>{attachment.original_name}</b>
                      </span>
                      <small>
                        {Math.ceil(Number(attachment.size_bytes) / 1024)} KB <Download />
                      </small>
                    </button>
                  ))}
                </section>
              )}

              {/* Feedback/Replies */}
              <section className="notification-responses">
                <div className="notification-response-heading">
                  <div>
                    <MessageSquareReply />
                    <span>
                      <strong>Phản hồi</strong>
                      <small>Trao đổi giữa người gửi và nhân viên</small>
                    </span>
                  </div>
                  <i>{responses.length}</i>
                </div>
                {responses.length === 0 ? (
                  <div className="notification-response-empty">
                    <MessageSquareReply />
                    <strong>Chưa có phản hồi</strong>
                    <span>Cuộc hội thoại sẽ xuất hiện tại đây khi có tin nhắn mới.</span>
                  </div>
                ) : (
                  <div className="notification-response-thread">
                    {responses.map((response) => {
                      const isSender = response.sender_staff_id === notification.created_by;
                      const name =
                        [response.last_name, response.first_name].filter(Boolean).join(" ") ||
                        response.sender_staff_id;
                      return (
                        <article key={response.id} className={isSender ? "from-admin" : "from-employee"}>
                          <div>
                            <strong>{isSender ? "Bạn" : name}</strong>
                            <span>{response.sender_staff_id}</span>
                          </div>
                          <p>{response.message}</p>
                          <time>{formatDate(response.created_at)}</time>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
          {error && <p className="notification-detail-error">{error}</p>}
        </div>

        <footer>
          {canArchive && (
            <button type="button" className="notification-archive-button" onClick={archive} disabled={submitting}>
              <Archive size={15} /> Lưu trữ
            </button>
          )}
          {canReply && (
            <form onSubmit={submitReply}>
              <div className="notification-reply-input-wrap">
                <span>Trả lời thông báo</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={5000}
                  placeholder="Nhập nội dung phản hồi..."
                />
              </div>
              <button type="submit" disabled={!message.trim() || submitting}>
                <Send size={15} /> {submitting ? "Đang gửi..." : "Gửi"}
              </button>
            </form>
          )}
        </footer>
      </section>
    </div>
  );
}
