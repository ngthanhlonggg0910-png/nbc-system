import React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const toastIcons = { success: CheckCircle2, error: AlertTriangle, info: Info };

export function AppToast({ toast, onClose }) {
  if (!toast) return null;
  const Icon = toastIcons[toast.tone] || Info;
  return <aside className={`app-toast ${toast.tone || "info"}`} role={toast.tone === "error" ? "alert" : "status"} aria-live="polite">
    <span className="app-toast-icon"><Icon /></span>
    <div><small>{toast.tone === "error" ? "KHÔNG THỂ THỰC HIỆN" : toast.tone === "success" ? "THÀNH CÔNG" : "THÔNG BÁO"}</small><strong>{toast.title}</strong>{toast.message && <p>{toast.message}</p>}</div>
    <button type="button" onClick={onClose} aria-label="Đóng thông báo"><X /></button>
    <i aria-hidden="true" />
  </aside>;
}
