import React, { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { fetchSentNotifications } from "@/utils/notification-api";

export function NotificationSentModal({ token, onClose, onOpen }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSentNotifications({ token })
      .then((data) => setItems(data.items ?? []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="notification-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="notification-detail-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>QUẢN TRỊ THÔNG BÁO</span><h2>Thông báo đã gửi</h2></div><button type="button" onClick={onClose}><X /></button></header>
        <div className="notification-sent-list">
          {loading && <div className="notification-detail-loading"><LoaderCircle /> Đang tải...</div>}
          {error && <p className="notification-detail-error">{error}</p>}
          {!loading && !error && items.length === 0 && <p className="notification-response-empty">Chưa có thông báo đã gửi.</p>}
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpen(item)}>
              <span><strong>{item.title}</strong><small>{new Date(item.created_at).toLocaleString("vi-VN")}</small></span>
              <span>{item.read_count}/{item.recipient_count} đã đọc · {item.response_count} phản hồi</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
