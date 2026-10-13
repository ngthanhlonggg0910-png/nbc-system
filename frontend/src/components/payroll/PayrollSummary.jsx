import React, { useState } from "react";

import {
  BadgeCheck,
  Banknote,
  Leaf,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import { SensitiveAmount } from "@/components/common/SensitiveAmount";

import {
  formatPayrollDate,
  formatPayrollMoney,
  formatPayrollMonth,
  getPayrollStatusLabel,
} from "@/page/Salary/payroll.mapper";

function SummaryLoading() {
  return (
    <div className="payroll-summary-loading">
      <RefreshCw
        className="spin"
        size={20}
      />

      <span>
        Đang tải báo cáo lương...
      </span>
    </div>
  );
}

export default function PayrollSummary({
  report12Month,
  payrollRows = [],
  loading = false,
}) {
  const [annualVisible, setAnnualVisible] =
    useState(false);

  const latestPayslip =
    report12Month?.latestPayslip ??
    payrollRows[0] ??
    null;

  const totals =
    report12Month?.totals ?? {};

  const averages =
    report12Month?.averages ?? {};

  const numberOfMonths =
    report12Month?.releasedPeriodCount ??
    report12Month?.numberOfMonths ??
    0;

  const statusLabel = latestPayslip
    ? latestPayslip.statusLabel ??
      getPayrollStatusLabel(
        latestPayslip.status,
      )
    : "Chưa phát hành";

  const paymentDate =
    latestPayslip?.paidAt ??
    latestPayslip?.paymentDate;

  const latestPeriodCode =
    latestPayslip?.periodCode;

  const totalGrossIncome = Number(
    totals.grossIncome ?? 0,
  );

  const averageNetSalary = Number(
    averages.netSalary ?? 0,
  );

  return (
      <aside className="payroll-summary">
        <div className="summary-card-gradient">
          <WalletCards />

          <span>
            TỔNG THU NHẬP 12 THÁNG
          </span>

          {loading ? (
            <SummaryLoading />
          ) : (
            <>
              <strong>
                <SensitiveAmount
                  value={formatPayrollMoney(
                    totalGrossIncome,
                  )}
                  visible={annualVisible}
                  onToggle={() =>
                    setAnnualVisible(
                      (current) => !current,
                    )
                  }
                  label="tổng thu nhập 12 tháng"
                />
              </strong>

              <small>
                VND · {numberOfMonths}/12 tháng
              </small>
            </>
          )}

          <Leaf />
        </div>

        <div className="mini-panel">
          <span className="mini-icon">
            <BadgeCheck />
          </span>

          <div>
            <small>
              PHIẾU LƯƠNG MỚI NHẤT
            </small>

            <strong>
              {latestPayslip
                ? `Tháng ${formatPayrollMonth(
                    latestPeriodCode,
                  )}`
                : "Chưa có dữ liệu"}
            </strong>

            <p>
              {latestPayslip
                ? statusLabel
                : "Chưa có phiếu lương được phát hành"}
            </p>

            {latestPayslip &&
              paymentDate && (
                <small>
                  Thanh toán:{" "}
                  {formatPayrollDate(
                    paymentDate,
                  )}
                </small>
              )}
          </div>
        </div>

        <div className="mini-panel">
          <span className="mini-icon">
            <Banknote />
          </span>

          <div>
            <small>
              THỰC LĨNH BÌNH QUÂN
            </small>

            <strong>
              {formatPayrollMoney(
                averageNetSalary,
              )}{" "}
              VND
            </strong>

            <p>
              Bình quân trên {numberOfMonths} kỳ
              lương có dữ liệu
            </p>
          </div>
        </div>
      </aside>
  );
}
