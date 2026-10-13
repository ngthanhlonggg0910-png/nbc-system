import React, { useState, useRef, useEffect } from "react";
import {
  BadgeCheck,
  Cake,
  UserRound,
  Mail,
  Phone,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  Coffee,
  ShieldCheck,
  X,
  KeyRound,
  Fingerprint,
  QrCode,
} from "lucide-react";
import { PageTitle } from "@/components/common/PageTitle";
import { Avatar } from "@/components/common/Avatar";
import { ScanLoginQr } from "../../components/auth/ScanLoginQr";

export function ProfilePage({
  avatarUrl,
  user,
  onAvatarChange,
  onUpdateProfile,
  onNotifications,
  unreadCount,
  onChangePassword,
  biometricSupported,
  hasBiometricRegistered,
  onRegisterBiometric,
  canEdit = false,
  canUpdatePassword = false,
}) {
  const [editing, setEditing] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [scanQrOpen, setScanQrOpen] = useState(false);
  const fileInput = useRef(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGender, setFormGender] = useState(true);
  const [formBirthDate, setFormBirthDate] = useState("");

  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Initialize form states when user changes or editing starts
  useEffect(() => {
    if (user) {
      setFormName(user.name || "");
      setFormEmail(user.email || "");
      setFormPhone(user.phone || "");
      setFormGender(user.gender !== undefined ? user.gender : true);
      setFormBirthDate(user.birthDate || "");
    }
  }, [user, editing]);

  const getSeniority = (joinDateStr) => {
    if (!joinDateStr) return { text: "—", subtext: "—" };
    const joinDate = new Date(joinDateStr);
    const now = new Date();
    let years = now.getFullYear() - joinDate.getFullYear();
    let months = now.getMonth() - joinDate.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    const formattedDate = joinDate.toLocaleDateString("vi-VN");
    let text = "";
    if (years > 0) text += `${years} năm `;
    if (months > 0) text += `${months} tháng`;
    if (!text) text = "Mới vào";
    return {
      text,
      subtext: `Từ ${formattedDate}`,
    };
  };

  const handleAvatarClick = () => {
    if (!canEdit) return;
    const allowed = window.confirm(
      "Ứng dụng muốn truy cập vào Thư viện ảnh của bạn để tải ảnh đại diện lên. Cho phép truy cập?",
    );
    if (allowed) {
      fileInput.current?.click();
    }
  };

  async function changeAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Vui lòng chọn đúng định dạng hình ảnh.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("Ảnh đại diện không được vượt quá 3 MB.");
      return;
    }

    setAvatarLoading(true);
    setAvatarError("");
    try {
      await onAvatarChange(file);
    } catch (err) {
      setAvatarError(err.message || "Không thể cập nhật ảnh đại diện.");
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleSave() {
    if (!formName.trim() || !formEmail.trim() || !formPhone.trim()) {
      setErrorMessage("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    setUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await onUpdateProfile({
        name: formName,
        email: formEmail,
        phone: formPhone,
        gender: formGender,
        birth_date: formBirthDate,
      });
      if (res && res.success) {
        setSuccessMessage(res.message || "Cập nhật thông tin thành công!");
        setEditing(false);
      }
    } catch (err) {
      setErrorMessage(err.message || "Cập nhật thông tin thất bại.");
    } finally {
      setUpdating(false);
    }
  }

  const profileRows = [
    { icon: BadgeCheck, label: "Mã nhân viên", value: user?.staffId },
    {
      icon: Cake,
      label: "Ngày sinh",
      value: user?.birthDate
        ? new Date(user?.birthDate).toLocaleDateString("vi-VN")
        : "—",
    },
    { icon: UserRound, label: "Giới tính", value: user?.gender ? "Nam" : "Nữ" },
    { icon: Mail, label: "Email", value: user?.email },
    { icon: Phone, label: "Số điện thoại", value: user?.phone },
    { icon: Building2, label: "Phòng ban", value: user?.department },
    {
      icon: BriefcaseBusiness,
      label: "Vị trí công việc",
      value: user?.position,
    },
    {
      icon: CalendarDays,
      label: "Ngày vào công ty",
      value: user?.joinDate
        ? new Date(user?.joinDate).toLocaleDateString("vi-VN")
        : "—",
    },
    { icon: MapPin, label: "Nơi làm việc", value: user?.workplace },
  ];

  return (
    <div className="page">
      <PageTitle
        title="Hồ sơ cá nhân"
        subtitle="Thông tin nhân sự NBC"
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      <section className="profile-hero">
        <div className="profile-hero-pattern" />
        <button
          className="avatar-upload"
          onClick={handleAvatarClick}
          aria-label="Đổi ảnh đại diện"
          disabled={avatarLoading}
        >
          {avatarLoading ? (
            <div
              className="avatar-loading-spinner"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="animate-spin"
                style={{
                  border: "4px solid rgba(255,255,255,0.3)",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  borderLeftColor: "#fff",
                }}
              ></div>
            </div>
          ) : (
            <Avatar large name={user?.name} src={user?.avatarUrl} />
          )}
        </button>
        <input
          ref={fileInput}
          className="avatar-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={changeAvatar}
        />

        <div className="profile-heading">
          {editing ? (
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="profile-name-input"
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                background: "#fff",
                color: "#000",
                marginBottom: "4px",
              }}
              placeholder="Nhập họ và tên"
              disabled={updating}
            />
          ) : (
            <h2>{user?.name}</h2>
          )}
          <p>{user?.position}</p>
          <span>
            <i /> Đang làm việc
          </span>
        </div>
        <ShieldCheck className="profile-shield" size={42} />
      </section>

      {avatarError && (
        <div
          className="avatar-error"
          style={{
            color: "#ef4444",
            padding: "8px 16px",
            marginTop: "8px",
            background: "#fef2f2",
            borderRadius: "4px",
          }}
        >
          {avatarError}
        </div>
      )}

      {successMessage && (
        <div
          className="profile-alert success"
          style={{
            color: "#15803d",
            padding: "12px 16px",
            marginTop: "16px",
            background: "#f0fdf4",
            borderRadius: "6px",
            border: "1px solid #bbf7d0",
          }}
        >
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div
          className="profile-alert error"
          style={{
            color: "#b91c1c",
            padding: "12px 16px",
            marginTop: "16px",
            background: "#fef2f2",
            borderRadius: "6px",
            border: "1px solid #fca5a5",
          }}
        >
          {errorMessage}
        </div>
      )}

      <section className="profile-layout">
        <div className="section-block profile-details">
          <div className="section-heading compact">
            <div>
              <span className="section-kicker">THÔNG TIN</span>
              <h2>Thông tin cá nhân</h2>
            </div>
            <span className="verified">
              <CircleCheckIcon /> Đã xác thực
            </span>
          </div>

          <div className="profile-grid">
            {profileRows.map((row) => {
              const isEditable = [
                "Ngày sinh",
                "Giới tính",
                "Email",
                "Số điện thoại",
              ].includes(row.label);
              return (
                <div className="profile-row" key={row.label}>
                  <span className="row-icon">
                    <row.icon size={18} />
                  </span>
                  <div>
                    <label>{row.label}</label>
                    {editing && isEditable ? (
                      row.label === "Email" ? (
                        <input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                          }}
                          disabled={updating}
                        />
                      ) : row.label === "Số điện thoại" ? (
                        <input
                          type="text"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                          }}
                          disabled={updating}
                        />
                      ) : row.label === "Giới tính" ? (
                        <select
                          value={formGender ? "true" : "false"}
                          onChange={(e) =>
                            setFormGender(e.target.value === "true")
                          }
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            background: "#fff",
                          }}
                          disabled={updating}
                        >
                          <option value="true">Nam</option>
                          <option value="false">Nữ</option>
                        </select>
                      ) : row.label === "Ngày sinh" ? (
                        <input
                          type="date"
                          value={formBirthDate}
                          onChange={(e) => setFormBirthDate(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                          }}
                          disabled={updating}
                        />
                      ) : null
                    ) : (
                      <strong>{row.value}</strong>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            {editing ? (
              <>
                {canEdit && <button
                  className="primary-button"
                  onClick={handleSave}
                  disabled={updating}
                  style={{ margin: 0 }}
                >
                  {updating ? (
                    <div
                      className="animate-spin"
                      style={{
                        border: "2px solid rgba(255,255,255,0.3)",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        borderLeftColor: "#fff",
                      }}
                    ></div>
                  ) : (
                    <CheckIcon />
                  )}
                  {updating ? "Đang lưu..." : "Lưu thông tin"}
                </button>}
                {canUpdatePassword && <button
                  className="secondary-button"
                  onClick={() => setEditing(false)}
                  disabled={updating}
                >
                  Hủy bỏ
                </button>}
              </>
            ) : (
              <>
                <button
                  className="primary-button"
                  onClick={() => setEditing(true)}
                  style={{ margin: 0 }}
                >
                  <UserRound size={18} />
                  Chỉnh sửa thông tin
                </button>
                <button
                  className="secondary-button"
                  onClick={onChangePassword}
                  disabled={updating}
                >
                  <KeyRound size={18} />
                  Đổi mật khẩu
                </button>
                {biometricSupported && (
                  <button
                    className="secondary-button"
                    onClick={onRegisterBiometric}
                    disabled={updating}
                  >
                    <Fingerprint size={18} />
                    {hasBiometricRegistered(user.staffId)
                      ? "Vân tay/FaceID (Đã ĐK)"
                      : "Đăng ký Vân tay/FaceID"}
                  </button>
                )}
                <button
                  className="secondary-button"
                  onClick={() => setScanQrOpen(true)}
                  disabled={updating}
                >
                  <QrCode size={18} />
                  Đăng nhập thiết bị khác
                </button>
              </>
            )}
          </div>
        </div>

        <aside className="profile-aside">
          <div className="mini-panel">
            <span className="mini-icon">
              <BriefcaseBusiness />
            </span>
            <div>
              <small>THÂM NIÊN</small>
              <strong>{getSeniority(user?.joinDate).text}</strong>
              <p>{getSeniority(user?.joinDate).subtext}</p>
            </div>
          </div>
          <div className="mini-panel">
            <span className="mini-icon green">
              <Coffee />
            </span>
            <div>
              <small>PHÉP NĂM CÒN LẠI</small>
              <strong>8 ngày</strong>
              <p>Đã sử dụng 4/12 ngày</p>
            </div>
          </div>
          <div className="mini-panel">
            <span className="mini-icon orange">
              <ShieldCheck />
            </span>
            <div>
              <small>HỢP ĐỒNG</small>
              <strong>Không xác định thời hạn</strong>
              <p>Hiệu lực từ 08/2022</p>
            </div>
          </div>
        </aside>
      </section>
      {scanQrOpen && <ScanLoginQr onClose={() => setScanQrOpen(false)} />}
    </div>
  );
}

function CircleCheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-circle-check"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-check"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
