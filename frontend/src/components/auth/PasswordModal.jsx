import React, { useState } from "react";
import { KeyRound, X, EyeOff, Eye, Check, ShieldCheck } from "lucide-react";
import { changePassword } from "../../api/profile.api";

const ENABLE_API = import.meta.env.VITE_ENABLE_API === "true";

export function PasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLong = newPassword.length >= 6;
  const canSave = Boolean(currentPassword) && isLong && newPassword === confirmPassword;

  async function submit(event) {
    event.preventDefault();
    if (!canSave) return;

    setLoading(true);
    setError("");

    if (!ENABLE_API) {
      // Fallback/demo mode
      setTimeout(() => {
        setSaved(true);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (res.success) {
        setSaved(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="password-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} disabled={loading}><X /></button>
        {saved ? (
          <div className="password-success">
            <span><CheckCheckIcon /></span>
            <h2>Đổi mật khẩu thành công</h2>
            <p>Mật khẩu mới đã được cập nhật. Vui lòng sử dụng mật khẩu này trong lần đăng nhập tiếp theo.</p>
            <button className="primary-button" type="button" onClick={onClose}>Hoàn tất</button>
          </div>
        ) : (
          <>
            <span className="modal-icon"><KeyRound /></span>
            <h2>Đổi mật khẩu</h2>
            <p className="modal-description">Sử dụng mật khẩu mạnh và không dùng lại mật khẩu cũ.</p>

            {error && <div className="field-error" style={{ marginBottom: "12px", color: "#ef4444" }}>{error}</div>}

            <label>Mật khẩu hiện tại
              <div className="input-wrap">
                <KeyRound />
                <input
                  type={show ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </label>
            <label>Mật khẩu mới
              <div className="input-wrap">
                <KeyRound />
                <input
                  type={show ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShow(!show)} disabled={loading}>{show ? <EyeOff /> : <Eye />}</button>
              </div>
              <span className="input-helper" style={{ fontSize: "10px", color: isLong ? "#16a34a" : "#8e99a6", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Check size={12} /> Ít nhất 6 ký tự
              </span>
            </label>
            <label>Xác nhận mật khẩu mới
              <div className="input-wrap">
                <ShieldCheck />
                <input
                  type={show ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </label>
            {confirmPassword && newPassword !== confirmPassword && <div className="field-error">Mật khẩu xác nhận chưa khớp.</div>}
            <button className="primary-button" type="submit" disabled={!canSave || loading}>
              {loading ? (
                <div className="animate-spin" style={{ border: "2px solid rgba(255,255,255,0.3)", width: "16px", height: "16px", borderRadius: "50%", borderLeftColor: "#fff" }}></div>
              ) : (
                <KeyRound />
              )}
              {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function CheckCheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-check">
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7.5 7.5L13 16" />
    </svg>
  );
}
