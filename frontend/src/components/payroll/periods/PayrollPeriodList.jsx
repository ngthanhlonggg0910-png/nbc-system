import { Eye } from "lucide-react";

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
  ).format(date);
};

const formatMoney = (value) => {
  return new Intl.NumberFormat(
    "vi-VN",
  ).format(
    Number(value) || 0,
  );
};

const getPeriodValue = (
  period,
  camelCaseKey,
  snakeCaseKey,
) => {
  return (
    period?.[camelCaseKey] ??
    period?.[snakeCaseKey] ??
    ""
  );
};

const getStatus = (status) => {
  const statusMap = {
  draft: {
    label: "Nháp",
    className: "pending",
  },

  published: {
    label: "Đã phát hành",
    className: "ready",
  },

  cancelled: {
    label: "Đã hủy",
    className: "pending",
  },

  locked: {
    label: "Đã khóa",
    className: "ready",
  },
};

  return (
    statusMap[status] ?? {
      label: status || "—",
      className: "pending",
    }
  );
};

const PayrollPeriodList = ({
  items = [],
  loading = false,

  pagination = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  onSelect,
  onPageChange,
}) => {
  if (loading) {
    return (
      <div className="hr-empty">
        Đang tải danh sách kỳ lương...
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="hr-empty">
        Chưa có kỳ lương nào.
      </div>
    );
  }

  const page =
    Number(pagination.page) || 1;

  const totalPages =
    Number(
      pagination.totalPages,
    ) || 1;

  const total =
    Number(pagination.total) ||
    items.length;

  const handlePrevious = () => {
    if (page <= 1) {
      return;
    }

    onPageChange?.(
      page - 1,
    );
  };

  const handleNext = () => {
    if (
      page >= totalPages
    ) {
      return;
    }

    onPageChange?.(
      page + 1,
    );
  };

  return (
    <>
      <style>
        {`
          .payroll-table-mobile-hint {
            display: none;
          }

          .payroll-period-table-wrap {
            position: relative;
          }

          .payroll-period-pagination {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 0 22px 20px;
          }

          .payroll-period-pagination-total {
            color: #748596;
            font-size: 10px;
            font-weight: 700;
          }

          .payroll-period-pagination-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .payroll-period-pagination-page {
            color: #53677a;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
          }

          @media (max-width: 760px) {
            .payroll-table-mobile-hint {
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 12px 14px 0;
              padding: 9px 10px;

              color: #688097;
              background: #f3f8fb;

              border:
                1px solid #e0e9ef;
              border-radius: 9px;

              font-size: 9px;
              font-weight: 700;
              text-align: center;
            }

            .payroll-period-table-wrap {
              overflow-x: auto;

              padding:
                10px 0px 16px;

              scrollbar-width: thin;

              -webkit-overflow-scrolling:
                touch;
            }

            .payroll-period-table
              th:first-child,
            .payroll-period-table
              td:first-child {
              position: sticky;
              left: 0;
            }

            .payroll-period-table
              th:first-child {
              z-index: 3;

              background:
                #f4f7f9;
            }

            .payroll-period-table
              td:first-child {
              z-index: 2;

              background: #fff;

              box-shadow:
                8px 0 12px -12px
                rgba(
                  30,
                  65,
                  90,
                  0.65
                );
            }

            .payroll-period-pagination {
              align-items: stretch;
              flex-direction: column;

              gap: 10px;

              padding:
                0 14px 18px;
            }

            .payroll-period-pagination-total {
              text-align: left;
            }

            .payroll-period-pagination-actions {
              display: grid;

              grid-template-columns:
                minmax(0, 1fr)
                auto
                minmax(0, 1fr);

              width: 100%;
            }

            .payroll-period-pagination-actions
              .secondary-button {
              width: 100%;
              min-width: 0;
            }

            .payroll-period-pagination-page {
              display: flex;
              align-items: center;
              justify-content: center;

              padding: 0 4px;
            }
          }
        `}
      </style>

      <div className="payroll-table-mobile-hint">
        ← Vuốt ngang để xem đầy đủ →
      </div>

      <div className="hr-table-wrap payroll-period-table-wrap">
        <table className="hr-data-table payroll-period-table">
          <thead>
            <tr>
              <th>
                Kỳ lương
              </th>

              <th>
                Thời gian kỳ
              </th>

              <th>
                Ngày thanh toán
              </th>

              <th>
                Phiếu lương
              </th>

              <th>
                Thực lĩnh
              </th>

              <th>
                Trạng thái
              </th>

              <th>
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map(
              (period) => {
                const periodCode =
                  getPeriodValue(
                    period,
                    "periodCode",
                    "period_code",
                  );

                const periodName =
                  getPeriodValue(
                    period,
                    "periodName",
                    "period_name",
                  );

                const startDate =
                  getPeriodValue(
                    period,
                    "startDate",
                    "start_date",
                  );

                const endDate =
                  getPeriodValue(
                    period,
                    "endDate",
                    "end_date",
                  );

                const paymentDate =
                  getPeriodValue(
                    period,
                    "paymentDate",
                    "payment_date",
                  );

                const status =
                  getStatus(
                    period.status,
                  );

                const statistics =
                  period.statistics ??
                  {};

                const totalPayslips =
                  statistics
                    .totalPayslips ??
                  0;

                const totalNetSalary =
                  statistics
                    .totalNetSalary ??
                  0;

                return (
                  <tr
                    key={
                      period.id
                    }
                  >
                    <td>
                      <strong>
                        {periodName ||
                          periodCode}
                      </strong>

                      <small>
                        {
                          periodCode
                        }
                      </small>
                    </td>

                    <td>
                      <strong>
                        {formatDate(
                          startDate,
                        )}
                      </strong>

                      <small>
                        đến{" "}
                        {formatDate(
                          endDate,
                        )}
                      </small>
                    </td>

                    <td>
                      {formatDate(
                        paymentDate,
                      )}
                    </td>

                    <td>
                      <strong>
                        {
                          totalPayslips
                        }
                      </strong>

                      <small>
                        phiếu lương
                      </small>
                    </td>

                    <td>
                      <strong className="net-pay">
                        {formatMoney(
                          totalNetSalary,
                        )}{" "}
                        ₫
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`data-status ${status.className}`}
                      >
                        {
                          status.label
                        }
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          onSelect?.(
                            period,
                          )
                        }
                      >
                        <Eye />
                        Xem
                      </button>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      <div className="payroll-period-pagination">
        <span className="payroll-period-pagination-total">
          Tổng: {total} kỳ lương
        </span>

        <div className="payroll-period-pagination-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={
              page <= 1
            }
            onClick={
              handlePrevious
            }
          >
            Trước
          </button>

          <span className="payroll-period-pagination-page">
            Trang {page} /{" "}
            {totalPages}
          </span>

          <button
            type="button"
            className="secondary-button"
            disabled={
              page >= totalPages
            }
            onClick={
              handleNext
            }
          >
            Sau
          </button>
        </div>
      </div>
    </>
  );
};

export default PayrollPeriodList;