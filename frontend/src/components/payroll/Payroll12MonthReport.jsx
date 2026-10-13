import React, {
  useMemo,
  useState,
} from "react";

import {
  Banknote,
  Calculator,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  formatPayrollMoney,
  formatPayrollMonth,
} from "@/page/Salary/payroll.mapper";

function ReportLoading() {
  return (
    <div className="payroll-empty-state">
      <RefreshCw className="spin" />

      <strong>
        Đang tải báo cáo lương 12 tháng...
      </strong>
    </div>
  );
}

function ReportEmpty() {
  return (
    <div className="payroll-empty-state">
      <TrendingUp />

      <strong>
        Chưa có dữ liệu báo cáo
      </strong>

      <p>
        Báo cáo sẽ được hiển thị sau khi nhân viên
        có phiếu lương được phát hành.
      </p>
    </div>
  );
}

export default function Payroll12MonthReport({
  report,
  loading = false,
  error = null,
  thirteenthMonthCoefficient = null,
  onRetry,
}) {
  const [selectedMonth, setSelectedMonth] =
    useState(null);

  const months = report?.months ?? [];
  const totals = report?.totals ?? {};
  const averages = report?.averages ?? {};

  const numberOfMonths =
    report?.numberOfMonths ?? months.length;

  const coefficient = Number(
    thirteenthMonthCoefficient,
  );

  const hasCoefficient =
    thirteenthMonthCoefficient !== null &&
    thirteenthMonthCoefficient !== undefined &&
    Number.isFinite(coefficient);

  const estimated13MonthSalary =
    hasCoefficient
      ? Number(averages.netSalary ?? 0) *
        coefficient
      : null;

  const reportYear = Number(
    report?.year ??
      String(report?.endMonth ?? "").slice(
        0,
        4,
      ),
  );

  const chartMonths = useMemo(() => {
    if (!Number.isInteger(reportYear)) {
      return months;
    }

    return Array.from(
      { length: 12 },
      (_, index) => {
        const monthNumber = index + 1;
        const periodCode = `${reportYear}-${String(
          monthNumber,
        ).padStart(2, "0")}`;

        return (
          months.find(
            (month) =>
              month.periodCode === periodCode,
          ) ?? {
            periodCode,
            grossIncome: 0,
            totalDeductions: 0,
            netSalary: 0,
            hasData: false,
          }
        );
      },
    ).map((month) => ({
      ...month,
      hasData:
        month.hasData ??
        months.some(
          (item) =>
            item.periodCode === month.periodCode,
        ),
    }));
  }, [months, reportYear]);

  const chartValues = useMemo(
    () =>
      chartMonths.map((month) =>
        Number(month.netSalary ?? 0),
      ),
    [chartMonths],
  );

  const chartMaximum = useMemo(
    () => Math.max(...chartValues, 1),
    [chartValues],
  );

  const chartMinimum = useMemo(() => {
    const positiveValues = chartValues.filter(
      (value) => value > 0,
    );

    if (positiveValues.length === 0) {
      return 0;
    }

    return Math.min(...positiveValues);
  }, [chartValues]);

  const chartMiddle =
    (chartMaximum + chartMinimum) / 2;

  const getBarHeight = (value) => {
    const amount = Number(value ?? 0);

    if (amount <= 0) {
      return 0;
    }

    if (chartMaximum === chartMinimum) {
      return 75;
    }

    const normalized =
      ((amount - chartMinimum) /
        (chartMaximum - chartMinimum)) *
      70;

    return Math.max(15, normalized + 25);
  };

  const formatChartUnit = (value) =>
    new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(Number(value ?? 0) / 1_000_000);

  const selectedMonthData =
    chartMonths.find(
      (month) =>
        month.periodCode === selectedMonth &&
        month.hasData,
    ) ?? null;

  const kpis = [
    {
      id: "cumulative",
      icon: WalletCards,
      label: "Tổng thu nhập lũy kế",
      value: totals.grossIncome ?? 0,
      suffix: "VND",
    },
    {
      id: "average",
      icon: TrendingUp,
      label: "Thực lĩnh bình quân",
      value: averages.netSalary ?? 0,
      suffix: "VND",
    },
    {
      id: "coefficient",
      icon: Calculator,
      label: "Hệ số lương tháng 13",
      value: hasCoefficient
        ? coefficient
        : null,
      coefficient: true,
    },
    {
      id: "thirteenth",
      icon: Banknote,
      label: "Lương tháng 13 dự tính",
      value: estimated13MonthSalary,
      suffix: "VND",
      highlight: true,
    },
  ];

  return (
    <section className="section-block employee-payroll-12">
      <div className="section-heading compact">
        <div>
          <span className="section-kicker">
            BÁO CÁO 12 THÁNG
          </span>

          <h2>
            Lương bình quân và lương tháng 13
          </h2>

          <p>
            Tổng hợp dữ liệu từ các phiếu lương
            đã phát hành đến kỳ{" "}
            {report?.endMonth
              ? formatPayrollMonth(
                  report.endMonth,
                )
              : "hiện tại"}
            .
          </p>
        </div>

        <span className="list-summary">
          {numberOfMonths}/12 tháng
        </span>
      </div>

      {loading && <ReportLoading />}

      {!loading && error && (
        <div className="payroll-empty-state error">
          <TrendingUp />

          <strong>
            Không thể tải báo cáo
          </strong>

          <p>{error}</p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
            >
              <RefreshCw size={17} />
              Thử lại
            </button>
          )}
        </div>
      )}

      {!loading &&
        !error &&
        months.length === 0 && (
          <ReportEmpty />
        )}

      {!loading &&
        !error &&
        months.length > 0 && (
          <>
            <div className="employee-payroll-kpis">
              {kpis.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.id}
                    className={
                      item.highlight
                        ? "highlight"
                        : ""
                    }
                  >
                    <Icon />

                    <span>
                      <small>
                        {item.label}
                      </small>

                      <strong>
                        {item.coefficient
                          ? item.value === null
                            ? "Chưa cấu hình"
                            : `× ${Number(
                                item.value,
                              ).toLocaleString(
                                "vi-VN",
                                {
                                  minimumFractionDigits:
                                    1,
                                  maximumFractionDigits:
                                    2,
                                },
                              )}`
                          : item.value === null
                            ? "Chưa cấu hình"
                          : formatPayrollMoney(
                              item.value,
                            )}

                        {item.suffix &&
                          item.value !== null && (
                          <i>
                            {" "}
                            {item.suffix}
                          </i>
                        )}
                      </strong>
                    </span>
                  </article>
                );
              })}
            </div>

            <div className="employee-payroll-chart-title">
              <span>
                Thực lĩnh theo từng tháng
              </span>

              <small>
                Đơn vị: triệu VND
              </small>
            </div>

            <div className="employee-payroll-chart">
              <div className="employee-payroll-axis">
                <span>
                  {formatChartUnit(
                    chartMaximum,
                  )}{" "}
                  tr
                </span>

                <span>
                  {formatChartUnit(
                    chartMiddle,
                  )}{" "}
                  tr
                </span>

                <span>
                  {formatChartUnit(
                    chartMinimum,
                  )}{" "}
                  tr
                </span>
              </div>

              <div className="employee-payroll-progress">
                {chartMonths.map((month) => {
                  const active =
                    selectedMonth ===
                    month.periodCode;

                  const netSalary = Number(
                    month.netSalary ?? 0,
                  );

                  return (
                    <button
                      type="button"
                      key={month.periodCode}
                      className={
                        active ? "active" : ""
                      }
                      aria-label={
                        month.hasData
                          ? `Tháng ${formatPayrollMonth(
                              month.periodCode,
                            )}: thực lĩnh ${formatPayrollMoney(
                              netSalary,
                            )} VND`
                          : `Tháng ${formatPayrollMonth(
                              month.periodCode,
                            )}: chưa có phiếu lương`
                      }
                      aria-pressed={active}
                      disabled={!month.hasData}
                      onClick={() =>
                        setSelectedMonth(
                          active
                            ? null
                            : month.periodCode,
                        )
                      }
                    >
                      <span>
                        {formatPayrollMonth(
                          month.periodCode,
                        )}
                      </span>

                      <i
                        style={{
                          height: `${getBarHeight(
                            netSalary,
                          )}%`,
                        }}
                      >
                        <b>
                          {formatPayrollMoney(
                            netSalary,
                          )}{" "}
                          VND
                        </b>
                      </i>

                      <small>
                        {new Intl.NumberFormat(
                          "vi-VN",
                          {
                            notation: "compact",
                            maximumFractionDigits: 1,
                          },
                        ).format(
                          netSalary,
                        )}
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedMonthData && (
              <div className="payroll-month-detail">
                <div>
                  <small>Kỳ lương</small>

                  <strong>
                    {formatPayrollMonth(
                      selectedMonthData.periodCode,
                    )}
                  </strong>
                </div>

                <div>
                  <small>
                    Tổng thu nhập
                  </small>

                  <strong>
                    {formatPayrollMoney(
                      selectedMonthData.grossIncome,
                    )}{" "}
                    VND
                  </strong>
                </div>

                <div>
                  <small>
                    Tổng khấu trừ
                  </small>

                  <strong>
                    {formatPayrollMoney(
                      selectedMonthData.totalDeductions,
                    )}{" "}
                    VND
                  </strong>
                </div>

                <div>
                  <small>Thực lĩnh</small>

                  <strong>
                    {formatPayrollMoney(
                      selectedMonthData.netSalary,
                    )}{" "}
                    VND
                  </strong>
                </div>
              </div>
            )}

            <p className="employee-payroll-formula">
              <Calculator />

              {hasCoefficient ? (
                <>
                  Lương tháng 13 dự tính ={" "}
                  {formatPayrollMoney(
                    averages.netSalary,
                  )}{" "}
                  ×{" "}
                  {coefficient.toLocaleString(
                    "vi-VN",
                    {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    },
                  )}
                  {" = "}

                  <strong>
                    {formatPayrollMoney(
                      estimated13MonthSalary,
                    )}{" "}
                    VND
                  </strong>
                </>
              ) : (
                <strong>
                  Chưa cấu hình hệ số lương tháng 13
                </strong>
              )}
            </p>
          </>
        )}
    </section>
  );
}
