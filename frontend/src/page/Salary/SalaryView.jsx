import React, { useMemo } from "react";
import { ChevronDown } from "lucide-react";

import { PageTitle } from "@/components/common/PageTitle";
import Payroll12MonthReport from "@/components/payroll/Payroll12MonthReport";
import PayrollList from "@/components/payroll/PayrollList";
import PayrollLoading from "@/components/payroll/PayrollLoading";
import PayrollSummary from "@/components/payroll/PayrollSummary";
import PayslipDetail from "./PayslipDetail";

export function PayrollPage({
  onNotifications,
  unreadCount,
  user,
  avatarUrl,
  systemConfig,
  payrollRows = [],
  selectedPayslip,
  selectedPayslipId,
  selectedYear,
  report12Month,
  listLoading = false,
  detailLoading = false,
  reportLoading = false,
  confirmLoading = false,
  listError = null,
  detailError = null,
  reportError = null,
  confirmError = null,
  confirmMessage = null,
  feedbackLoading = false,
  feedbackError = null,
  feedbackMessage = null,
  thirteenthMonthCoefficient = null,
  onSelectYear,
  onSelectPayslip,
  onConfirmPayslip,
  onSubmitFeedback,
  onRefresh,
}) {
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const result = new Set([currentYear, currentYear - 1, currentYear - 2, Number(selectedYear)]);

    payrollRows.forEach((row) => {
      const year = Number(String(row.periodCode ?? "").slice(0, 4));
      if (year) result.add(year);
    });

    return [...result].filter(Boolean).sort((a, b) => b - a);
  }, [payrollRows, selectedYear]);

  if (selectedPayslipId && detailLoading && !selectedPayslip) {
    return <PayrollLoading variant="detail" />;
  }

  if (selectedPayslipId && selectedPayslip) {
    return (
      <PayslipDetail
        payroll={selectedPayslip}
        user={user}
        avatarUrl={avatarUrl}
        systemConfig={systemConfig}
        onBack={() => onSelectPayslip(null)}
        onConfirm={onConfirmPayslip}
        confirmLoading={confirmLoading}
        confirmMessage={confirmMessage}
        confirmError={confirmError}
        feedbackLoading={feedbackLoading}
        feedbackError={feedbackError}
        feedbackMessage={feedbackMessage}
        onFeedback={onSubmitFeedback}
      />
    );
  }

  return (
    <div className="page">
      <PageTitle
        title="Phiếu lương"
        subtitle="Theo dõi thu nhập và lịch sử thanh toán"
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      <div className="payroll-layout">
        <section className="section-block payroll-list">
          <div className="section-heading compact">
            <div>
              <span className="section-kicker">LỊCH SỬ</span>
              <h2>Phiếu lương năm {selectedYear}</h2>
            </div>

            <label className="select-button payroll-year-select">
              <select
                aria-label="Chọn năm phiếu lương"
                value={selectedYear}
                onChange={(event) => onSelectYear(Number(event.target.value))}
              >
                {years.map((year) => (
                  <option key={year} value={year}>Năm {year}</option>
                ))}
              </select>
              <ChevronDown size={16} />
            </label>
          </div>

          <PayrollList
            payrollRows={payrollRows}
            selectedYear={selectedYear}
            loading={listLoading}
            error={listError}
            onSelectPayslip={onSelectPayslip}
            onRetry={onRefresh}
          />
        </section>

        <PayrollSummary
          report12Month={report12Month}
          payrollRows={payrollRows}
          loading={reportLoading}
        />
      </div>

      <Payroll12MonthReport
        report={report12Month}
        loading={reportLoading}
        error={reportError}
        thirteenthMonthCoefficient={thirteenthMonthCoefficient}
        onRetry={onRefresh}
      />

      {selectedPayslipId && detailError && (
        <p className="payroll-inline-error">{detailError}</p>
      )}
    </div>
  );
}
