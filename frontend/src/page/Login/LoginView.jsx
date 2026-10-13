import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  KeyRound,
  LogIn,
  UserRound,
  QrCode,
  ScanLine,
  EyeOff,
  Eye,
  Check,
  ShieldCheck,
  Fingerprint,
  Loader2,
} from "lucide-react";
import { Brand } from "@/components/common/Brand";
import { QrLoginModal } from "@/components/auth/QrLoginModal";
import { useBiometricLogin } from "@/hooks/useBiometricLogin";
import { QrCrossDeviceLogin } from "@/components/auth/QrCrossDeviceLogin";
import { postData } from "@/utils/api";
import {
  hasLoginCredentials,
  prepareLoginCredentials,
} from "./loginCredentials";

export function LoginPage({ onLogin, onForgot }) {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const passwordInput = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [loginMethod, setLoginMethod] = useState("password");
  const [biometricSupported, setBiometricSupported] = useState(false);
  const { hasBiometricRegistered, loginWithBiometric } = useBiometricLogin();

  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
        setBiometricSupported,
      );
    }
  }, []);

  const handleBiometricLogin = async () => {
    setError("");
    try {
      const result = await loginWithBiometric(staffId.trim().toUpperCase());
      if (result) {
        onLogin(result.user.staff_id, remember, null, result.user.role);
      }
    } catch (err) {
      setError(err.message || "Đăng nhập sinh trắc học thất bại");
    }
  };

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    if (!hasLoginCredentials(staffId, password)) {
      setError("Vui lòng nhập đầy đủ mã nhân viên và mật khẩu.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const credentials = prepareLoginCredentials(staffId, password);
      await onLogin(credentials.staffId, remember, credentials.password);
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }
  const handleForgot = async () => {
    const normalizedStaffId = staffId.trim().toUpperCase();

    setForgotError("");
    setForgotSuccess("");

    if (!normalizedStaffId) {
      setForgotError("Vui lòng nhập mã nhân viên.");
      return;
    }

    try {
      setLoading(true);

      const res = await postData("/api/user/forgot-password", {
        staff_id: normalizedStaffId,
      });

      if (!res?.data?.success) {
        throw new Error(res?.data?.message || "Gửi yêu cầu thất bại!");
      }

      setForgotSuccess(
        "Yêu cầu khôi phục mật khẩu đã được gửi thành công. Quản trị viên sẽ xử lý trong thời gian sớm nhất.",
      );
      setForgotSent(true);
      setStaffId("");
    } catch (err) {
      setForgotError(err.response?.data?.message || "Gửi yêu cầu thất bại!");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login-page">
      <div className="login-topline" />
      <section className="login-card">
        {/* Header brand */}
        <div className="login-brand">
          <Brand />
          <span>CỔNG THÔNG TIN NHÂN VIÊN</span>
        </div>

        {!forgot ? (
          <div className="login-form">
            <div className="login-heading">
              <span>CHÀO MỪNG TRỞ LẠI</span>
              <h1>Đăng nhập</h1>
              <p>Truy cập thông tin công việc của bạn tại NBC</p>
            </div>

            {/* Tab selector */}
            <div className="login-tabs">
              <button
                type="button"
                className={`tab-button ${loginMethod === "password" ? "active" : ""}`}
                onClick={() => setLoginMethod("password")}
              >
                Mật khẩu
              </button>
              <button
                type="button"
                className={`tab-button ${loginMethod === "qr" ? "active" : ""}`}
                onClick={() => setLoginMethod("qr")}
              >
                Đăng nhập QR
              </button>
            </div>

            {error && <div className="form-alert">{error}</div>}

            {loginMethod === "password" ? (
              <form className="" onSubmit={submit}>
                <label>
                  Mã nhân viên
                  <div className={`input-wrap ${qrScanned ? "qr-filled" : ""}`}>
                    <UserRound />
                    <input
                      value={staffId}
                      onChange={(e) => {
                        setStaffId(e.target.value);
                        if (qrScanned) setQrScanned(false);
                      }}
                      placeholder="Nhập mã nhân viên"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                    {qrScanned && (
                      <button
                        type="button"
                        aria-label="Đổi mã nhân viên"
                        onClick={() => {
                          setQrScanned(false);
                          setStaffId("");
                        }}
                      >
                        <XIcon />
                      </button>
                    )}
                    {!qrScanned &&
                      biometricSupported &&
                      hasBiometricRegistered(staffId) && (
                        <button
                          type="button"
                          onClick={handleBiometricLogin}
                          aria-label="Đăng nhập bằng vân tay/FaceID"
                          style={{
                            border: "none",
                            background: "none",
                            padding: "0 10px",
                            cursor: "pointer",
                            color: "#075bae",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Fingerprint size={20} />
                        </button>
                      )}
                  </div>
                </label>

                <button
                  className="qr-login-button"
                  type="button"
                  onClick={() => setQrOpen(true)}
                >
                  <QrCode />
                  <span>
                    <strong>Quét mã QR nhân viên</strong>
                    <small>Tự động điền mã từ thẻ nhân viên</small>
                  </span>
                  <ScanLine />
                </button>

                {qrScanned && (
                  <div className="qr-login-success">
                    <CheckCheckIcon /> Đã nhận diện mã {staffId}. Vui lòng nhập
                    mật khẩu.
                  </div>
                )}

                <label>
                  Mật khẩu
                  <div className="input-wrap">
                    <KeyRound />
                    <input
                      ref={passwordInput}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                      }
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </label>

                <div className="login-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>
                      <Check />
                    </span>
                    Ghi nhớ đăng nhập
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgot(true);
                      setForgotError("");
                      setForgotSuccess("");
                      setForgotSent(false);
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <button
                  className="primary-button login-submit"
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="spin" size={19} /> Đang xử lý...
                    </>
                  ) : (
                    <>
                      <LogIn size={19} /> Đăng nhập
                    </>
                  )}
                </button>

                <div className="login-security">
                  <ShieldCheck />
                  <span>
                    Kết nối được bảo mật
                    <br />
                    <small>
                      Không chia sẻ thông tin đăng nhập với người khác
                    </small>
                  </span>
                </div>
              </form>
            ) : (
              <div className="login-form">
                <QrCrossDeviceLogin onLogin={onLogin} remember={remember} />
              </div>
            )}
          </div>
        ) : (
          <div className="forgot-panel">
            <span className="forgot-icon">
              <KeyRound />
            </span>
            <h1>Khôi phục mật khẩu</h1>
            <p>
              Nhập mã nhân viên. Hệ thống sẽ tạo yêu cầu gửi đến quản trị viên
              để cấp lại mật khẩu.
            </p>
            {forgotError && <div className="form-alert">{forgotError}</div>}
            {forgotSuccess && (
              <div className="forgot-success">{forgotSuccess}</div>
            )}
            {forgotSent ? (
              <div className="forgot-success">
                <CheckCheckIcon />
                <div>
                  <strong>Đã gửi yêu cầu</strong>
                  <span>
                    Quản trị viên sẽ xử lý và phản hồi qua thông báo hệ thống.
                  </span>
                </div>
              </div>
            ) : (
              <>
                <label>
                  Mã nhân viên
                  <div className="input-wrap">
                    <UserRound />
                    <input
                      type="text"
                      value={staffId}
                      name="staffId"
                      onChange={(e) => setStaffId(e.target.value)}
                      placeholder="Nhập mã nhân viên"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  </div>
                </label>
                <button
                  className="primary-button"
                  onClick={handleForgot}
                  disabled={loading}
                >
                  <SendIcon />
                  {loading ? "Đang gửi..." : "Gửi yêu cầu"}
                </button>
              </>
            )}
            <button
              className="back-login"
              onClick={() => {
                setForgot(false);
                setForgotError("");
                setForgotSuccess("");
                setForgotSent(false);
              }}
            >
              <ArrowLeft /> Quay lại đăng nhập
            </button>
          </div>
        )}
      </section>

      <div className="login-caption">
        <strong>NHABE CORPORATION</strong>
        <span>Cùng nhau kiến tạo tương lai xanh và bền vững</span>
      </div>

      {qrOpen && (
        <QrLoginModal
          onClose={() => setQrOpen(false)}
          onDetected={(value) => {
            setStaffId(value);
            setPassword("");
            setQrScanned(true);
            setQrOpen(false);
            requestAnimationFrame(() => passwordInput.current?.focus());
          }}
        />
      )}
    </main>
  );
}

function XIcon() {
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
      className="lucide lucide-x"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CheckCheckIcon() {
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
      className="lucide lucide-check-check"
    >
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7.5 7.5L13 16" />
    </svg>
  );
}

function SendIcon() {
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
      className="lucide lucide-send"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
