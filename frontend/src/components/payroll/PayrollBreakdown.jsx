import React from "react";

import {
  BriefcaseBusiness,
  ShieldCheck,
} from "lucide-react";

import { SensitiveAmount } from "@/components/common/SensitiveAmount";
import { formatPayrollMoney } from "@/page/Salary/payroll.mapper";

function BreakdownEmpty({
  category,
}) {
  return (
    <p className="payroll-no-items">
      Chưa có chi tiết các khoản{" "}
      {category === "income"
        ? "thu nhập"
        : "khấu trừ"}
      .
    </p>
  );
}

function BreakdownLine({
  item,
  visible,
  onToggle,
  onFeedbackItem,
}) {
  return (
    <div
      className="payslip-line"
      key={
        item.id ??
        item.code ??
        item.salaryItemId
      }
    >
      <span>
        <strong className="payslip-item-label">
          {item.label || "Khoản lương"}
        </strong>

        {item.description && (
          <small className="payslip-item-description">
            {item.description}
          </small>
        )}

        {(item.quantity !== null &&
          item.quantity !== undefined) ||
        (item.rate !== null &&
          item.rate !== undefined) ? (
          <small className="payslip-item-calculation">
            {item.quantity !== null &&
              item.quantity !== undefined && (
                <>
                  Số lượng:{" "}
                  {Number(
                    item.quantity,
                  ).toLocaleString("vi-VN")}
                </>
              )}

            {item.quantity !== null &&
              item.quantity !== undefined &&
              item.rate !== null &&
              item.rate !== undefined && (
                <span> · </span>
              )}

            {item.rate !== null &&
              item.rate !== undefined && (
                <>
                  Đơn giá:{" "}
                  {formatPayrollMoney(
                    item.rate,
                  )}{" "}
                  VND
                </>
              )}
          </small>
        ) : null}
      </span>

      <span className="payslip-line-actions">
      <strong>
        <SensitiveAmount
          value={formatPayrollMoney(
            item.amount,
          )}
          visible={visible}
          onToggle={onToggle}
          label={item.label}
        />
      </strong>
      {onFeedbackItem && (
        <button type="button" className="payslip-item-feedback no-print" title="Phản hồi khoản này" onClick={() => onFeedbackItem(item)}>
          ?
        </button>
      )}
      </span>
    </div>
  );
}

function BreakdownColumn({
  category,
  title,
  items,
  total,
  visible,
  onToggle,
  onFeedbackItem,
}) {
  const income =
    category === "income";

  const Icon = income
    ? BriefcaseBusiness
    : ShieldCheck;

  return (
    <div
      className={
        income ? "" : "deductions"
      }
    >
      <h2>
        <span>
          <Icon />
        </span>

        {title}
      </h2>

      {items.length === 0 ? (
        <BreakdownEmpty
          category={category}
        />
      ) : (
        items.map((item) => (
          <BreakdownLine
            key={
              item.id ??
              item.code ??
              item.salaryItemId
            }
            item={item}
            visible={visible}
            onToggle={onToggle}
            onFeedbackItem={onFeedbackItem}
          />
        ))
      )}

      <footer>
        <span>
          {income
            ? "TỔNG THU NHẬP"
            : "TỔNG KHẤU TRỪ"}
        </span>

        <strong>
          <SensitiveAmount
            value={formatPayrollMoney(total)}
            visible={visible}
            onToggle={onToggle}
            label={
              income
                ? "tổng thu nhập"
                : "tổng khấu trừ"
            }
          />
        </strong>
      </footer>
    </div>
  );
}

export default function PayrollBreakdown({
  income,
  deductions,
  visible = false,
  onToggleVisibility,
  onFeedbackItem,
}) {
  const incomeItems =
    income?.items ?? [];

  const deductionItems =
    deductions?.items ?? [];

  const calculatedIncome =
    incomeItems.reduce(
      (total, item) =>
        total +
        Number(item.amount ?? 0),
      0,
    );

  const calculatedDeductions =
    deductionItems.reduce(
      (total, item) =>
        total +
        Number(item.amount ?? 0),
      0,
    );

  const totalIncome =
    Number(income?.grossIncome) ||
    calculatedIncome;

  const totalDeductions =
    Number(
      deductions?.totalDeductions,
    ) || calculatedDeductions;

  return (
    <section className="payslip-breakdown">
      <BreakdownColumn
        category="income"
        title="THU NHẬP"
        items={incomeItems}
        total={totalIncome}
        visible={visible}
        onToggle={onToggleVisibility}
        onFeedbackItem={(item) => onFeedbackItem?.({ ...item, category: "income" })}
      />

      <BreakdownColumn
        category="deduction"
        title="KHẤU TRỪ"
        items={deductionItems}
        total={totalDeductions}
        visible={visible}
        onToggle={onToggleVisibility}
        onFeedbackItem={(item) => onFeedbackItem?.({ ...item, category: "deduction" })}
      />
    </section>
  );
}
