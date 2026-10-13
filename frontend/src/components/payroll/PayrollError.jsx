import React from "react";

import {
  AlertCircle,
  LockKeyhole,
  RefreshCw,
  ServerCrash,
  WalletCards,
} from "lucide-react";

function resolveError(error) {
  if (!error) {
    return {
      status: null,
      message:
        "Đã xảy ra lỗi không xác định.",
    };
  }

  if (typeof error === "string") {
    return {
      status: null,
      message: error,
    };
  }

  return {
    status:
      error.status ??
      error.statusCode ??
      error.response?.status ??
      null,

    message:
      error.message ??
      error.data?.message ??
      error.response?.data?.message ??
      "Không thể xử lý yêu cầu.",
  };
}

function getErrorContent(status) {
  if (status === 401) {
    return {
      icon: LockKeyhole,
      title: "Phiên đăng nhập đã hết hạn",
      fallbackMessage:
        "Vui lòng đăng nhập lại để tiếp tục xem thông tin lương.",
    };
  }

  if (status === 403) {
    return {
      icon: LockKeyhole,
      title: "Không có quyền truy cập",
      fallbackMessage:
        "Tài khoản hiện tại không được phép xem dữ liệu này.",
    };
  }

  if (status === 404) {
    return {
      icon: WalletCards,
      title: "Không tìm thấy dữ liệu",
      fallbackMessage:
        "Phiếu lương có thể chưa được phát hành hoặc không còn tồn tại.",
    };
  }

  if (status >= 500) {
    return {
      icon: ServerCrash,
      title: "Máy chủ đang gặp sự cố",
      fallbackMessage:
        "Không thể kết nối tới hệ thống lương. Vui lòng thử lại sau.",
    };
  }

  return {
    icon: AlertCircle,
    title: "Không thể tải dữ liệu",
    fallbackMessage:
      "Đã xảy ra lỗi khi xử lý dữ liệu lương.",
  };
}

/**
 * variant:
 * - "page": lỗi toàn trang
 * - "card": lỗi trong một khối nội dung
 * - "inline": lỗi nhỏ bên dưới input/nút
 */
export default function PayrollError({
  error,
  variant = "card",
  title,
  message,
  onRetry,
  onLogin,
  onDismiss,
}) {
  const normalizedError =
    resolveError(error);

  const content = getErrorContent(
    normalizedError.status,
  );

  const Icon = content.icon;

  const displayTitle =
    title || content.title;

  const displayMessage =
    message ||
    normalizedError.message ||
    content.fallbackMessage;

  if (variant === "inline") {
    return (
      <div
        className="payroll-inline-error"
        role="alert"
      >
        <AlertCircle size={17} />

        <span>{displayMessage}</span>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
          >
            Thử lại
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
          >
            Đóng
          </button>
        )}
      </div>
    );
  }

  const isAuthenticationError =
    normalizedError.status === 401;

  return (
    <div
      className={[
        "payroll-error-state",
        `payroll-error-${variant}`,
      ].join(" ")}
      role="alert"
      aria-live="assertive"
    >
      <div className="payroll-error-icon">
        <Icon />
      </div>

      <div className="payroll-error-content">
        <strong>{displayTitle}</strong>

        <p>{displayMessage}</p>

        {normalizedError.status && (
          <small>
            Mã lỗi:{" "}
            {normalizedError.status}
          </small>
        )}
      </div>

      <div className="payroll-error-actions">
        {isAuthenticationError &&
          onLogin && (
            <button
              type="button"
              className="primary-button"
              onClick={onLogin}
            >
              <LockKeyhole size={17} />
              Đăng nhập lại
            </button>
          )}

        {!isAuthenticationError &&
          onRetry && (
            <button
              type="button"
              className="primary-button"
              onClick={onRetry}
            >
              <RefreshCw size={17} />
              Thử lại
            </button>
          )}

        {onDismiss && (
          <button
            type="button"
            className="secondary-button"
            onClick={onDismiss}
          >
            Đóng
          </button>
        )}
      </div>
    </div>
  );
}