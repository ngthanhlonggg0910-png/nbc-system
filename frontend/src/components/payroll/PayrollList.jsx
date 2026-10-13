import React, { useState } from "react";

import {
  CalendarDays,
  ChevronRight,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import { SensitiveAmount } from "@/components/common/SensitiveAmount";
import PayrollError from "./PayrollError";
import PayrollLoading from "./PayrollLoading";

import {
  formatPayrollDate,
  formatPayrollMoney,
  formatPayrollMonth,
  getPayrollStatusLabel,
  getPayrollStatusTone,
} from "@/page/Salary/payroll.mapper";

function PayrollEmpty({ year }) {
  return (
    <div className="payroll-empty-state">
      <WalletCards />

      <strong>
        Chưa có phiếu lương
      </strong>

      <p>
        Chưa có phiếu lương nào được phát hành
        trong năm {year}.
      </p>
    </div>
  );
}

export default function PayrollList({
  payrollRows = [],
  selectedYear,
  loading = false,
  error = null,
  onSelectPayslip,
  onRetry,
}) {
  const [visiblePayslips, setVisiblePayslips] =
    useState([]);

  const toggleVisible = (payslipId) => {
    setVisiblePayslips((current) =>
      current.includes(payslipId)
        ? current.filter(
            (id) => id !== payslipId,
          )
        : [...current, payslipId],
    );
  };

  if (loading && payrollRows.length === 0) {
    return <PayrollLoading variant="list" />;
  }

  if (error && payrollRows.length === 0) {
    return (
      <PayrollError
        error={error}
        onRetry={onRetry}
      />
    );
  }

  if (payrollRows.length === 0) {
    return (
      <PayrollEmpty year={selectedYear} />
    );
  }

  return (
    <div className="payroll-items">
      {payrollRows.map((payslip, index) => {
        const payslipId =
          payslip.id ??
          payslip.payslipId;

        const periodCode =
          payslip.periodCode;

        const netSalary =
          payslip.salary?.netSalary ?? 0;

        const paymentDate =
          payslip.paidAt ??
          payslip.paymentDate;

        const statusTone =
          payslip.statusTone ??
          getPayrollStatusTone(
            payslip.status,
          );

        const statusLabel =
          payslip.statusLabel ??
          getPayrollStatusLabel(
            payslip.status,
          );

        const visible =
          visiblePayslips.includes(
            payslipId,
          );

        return (
          <article
            key={payslipId}
            className={[
              "payroll-item",
              index === 0
                ? "featured"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            tabIndex={0}
            role="button"
            onClick={() =>
              onSelectPayslip?.(
                payslipId,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();

                onSelectPayslip?.(
                  payslipId,
                );
              }
            }}
          >
            <div className="month-mark">
              <CalendarDays />

              <span>
                {formatPayrollMonth(
                  periodCode,
                )}
              </span>
            </div>

            <div className="payroll-meta">
              <strong>
                Kỳ lương{" "}
                {formatPayrollMonth(
                  periodCode,
                )}
              </strong>

              <p>
                {payslip.employee
                  ?.department ||
                  "Chưa cập nhật bộ phận"}
              </p>

              <small>
                Thanh toán:{" "}
                {formatPayrollDate(
                  paymentDate,
                )}
              </small>
            </div>

            <div className="payroll-amount">
              <strong>
                <SensitiveAmount
                  value={formatPayrollMoney(
                    netSalary,
                  )}
                  visible={visible}
                  onToggle={() => toggleVisible(payslipId)}
                  label={`lương tháng ${formatPayrollMonth(
                    periodCode,
                  )}`}
                />

                <small> VND</small>
              </strong>

              <span
                className={[
                  "payroll-status",
                  `payroll-status-${statusTone}`,
                  statusTone === "success"
                    ? "success-badge light"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {statusLabel}
              </span>
            </div>

            <button
              type="button"
              className="payroll-open-button"
              aria-label={`Xem phiếu lương tháng ${formatPayrollMonth(
                periodCode,
              )}`}
              onClick={(event) => {
                event.stopPropagation();

                onSelectPayslip?.(
                  payslipId,
                );
              }}
            >
              <ChevronRight size={20} />
            </button>
          </article>
        );
      })}

      {loading && (
        <div className="payroll-inline-loading">
          <RefreshCw
            className="spin"
            size={17}
          />

          <span>
            Đang cập nhật danh sách...
          </span>
        </div>
      )}

      {error && (
        <div className="payroll-inline-error">
          <span>{error}</span>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
            >
              Thử lại
            </button>
          )}
        </div>
      )}
    </div>
  );
}
