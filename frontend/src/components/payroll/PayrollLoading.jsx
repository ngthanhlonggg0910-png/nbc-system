import React from "react";

import {
  RefreshCw,
  WalletCards,
} from "lucide-react";

/**
 * variant:
 * - "page": tải toàn trang lương
 * - "list": tải danh sách phiếu lương
 * - "detail": tải chi tiết phiếu lương
 * - "report": tải báo cáo 12 tháng
 * - "inline": trạng thái tải nhỏ
 */
export default function PayrollLoading({
  variant = "page",
  message,
  rows = 3,
}) {
  const defaultMessages = {
    page: "Đang tải dữ liệu lương...",
    list: "Đang tải danh sách phiếu lương...",
    detail: "Đang tải chi tiết phiếu lương...",
    report: "Đang tải báo cáo lương 12 tháng...",
    inline: "Đang xử lý...",
  };

  const loadingMessage =
    message ||
    defaultMessages[variant] ||
    defaultMessages.page;

  if (variant === "inline") {
    return (
      <span
        className="payroll-inline-loading"
        role="status"
        aria-live="polite"
      >
        <RefreshCw
          className="spin"
          size={17}
        />

        <span>{loadingMessage}</span>
      </span>
    );
  }

  if (variant === "list") {
    return (
      <div
        className="payroll-loading-list"
        role="status"
        aria-live="polite"
        aria-label={loadingMessage}
      >
        <div className="payroll-loading-heading">
          <RefreshCw
            className="spin"
            size={18}
          />

          <span>{loadingMessage}</span>
        </div>

        {Array.from({
          length: rows,
        }).map((_, index) => (
          <div
            className="payroll-loading-item"
            key={index}
            aria-hidden="true"
          >
            <div className="payroll-skeleton payroll-skeleton-month" />

            <div className="payroll-loading-info">
              <div className="payroll-skeleton payroll-skeleton-title" />
              <div className="payroll-skeleton payroll-skeleton-text" />
              <div className="payroll-skeleton payroll-skeleton-small" />
            </div>

            <div className="payroll-loading-value">
              <div className="payroll-skeleton payroll-skeleton-amount" />
              <div className="payroll-skeleton payroll-skeleton-status" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div
        className="page payslip-detail-page"
        role="status"
        aria-live="polite"
        aria-label={loadingMessage}
      >
        <div className="payslip-sheet payroll-detail-skeleton">
          <div className="payroll-skeleton payroll-skeleton-hero" />

          <div className="payroll-loading-heading">
            <RefreshCw
              className="spin"
              size={19}
            />

            <strong>{loadingMessage}</strong>
          </div>

          <div className="payroll-detail-skeleton-grid">
            <div className="payroll-skeleton payroll-skeleton-card" />
            <div className="payroll-skeleton payroll-skeleton-card" />
            <div className="payroll-skeleton payroll-skeleton-card" />
          </div>

          <div className="payroll-detail-skeleton-columns">
            <div className="payroll-skeleton payroll-skeleton-panel" />
            <div className="payroll-skeleton payroll-skeleton-panel" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "report") {
    return (
      <div
        className="payroll-report-loading"
        role="status"
        aria-live="polite"
        aria-label={loadingMessage}
      >
        <div className="payroll-loading-heading">
          <RefreshCw
            className="spin"
            size={18}
          />

          <span>{loadingMessage}</span>
        </div>

        <div className="employee-payroll-kpis">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <article key={index}>
              <div className="payroll-skeleton payroll-skeleton-icon" />

              <span>
                <div className="payroll-skeleton payroll-skeleton-small" />
                <div className="payroll-skeleton payroll-skeleton-amount" />
              </span>
            </article>
          ))}
        </div>

        <div className="payroll-skeleton payroll-skeleton-chart" />
      </div>
    );
  }

  return (
    <div
      className="payroll-empty-state payroll-page-loading"
      role="status"
      aria-live="polite"
    >
      <div className="payroll-loading-icon">
        <WalletCards />
        <RefreshCw className="spin" />
      </div>

      <strong>{loadingMessage}</strong>

      <p>
        Vui lòng chờ trong giây lát.
      </p>
    </div>
  );
}