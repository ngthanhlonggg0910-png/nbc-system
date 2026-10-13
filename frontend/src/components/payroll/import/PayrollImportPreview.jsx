import {
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";

const formatMoney = (value) => {
  const amount =
    Number(value) || 0;

  return `${new Intl.NumberFormat(
    "vi-VN",
  ).format(amount)} ₫`;
};

const getRowValue = (
  row,
  camelKey,
  snakeKey,
) => {
  return (
    row?.[camelKey] ??
    row?.[snakeKey] ??
    null
  );
};

const PayrollImportPreview = ({
  rows = [],
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="hr-empty">
        Đang tải dữ liệu xem trước...
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="hr-empty">
        Chưa có dữ liệu bảng lương để xem trước.
      </div>
    );
  }

  const validCount =
    rows.filter(
      (row) =>
        row?.isValid === true ||
        row?.is_valid === true,
    ).length;

  const invalidCount =
    rows.length -
    validCount;

  return (
    <>
      <style>
        {`
          .payroll-import-preview {
            padding: 16px 22px 22px;
          }

          .payroll-import-preview-summary {
            display: grid;
            grid-template-columns:
              repeat(
                3,
                minmax(160px, 1fr)
              );
            gap: 10px;
            margin-bottom: 14px;
          }

          .payroll-import-preview-summary article {
            display: flex;
            align-items: center;
            gap: 10px;
            min-height: 64px;
            padding: 12px 13px;
            background: linear-gradient(
              135deg,
              #f4f9fc,
              #f3faf7
            );
            border:
              1px solid #e0eaef;
            border-radius: 12px;
          }

          .payroll-import-preview-summary svg {
            width: 18px;
            height: 18px;
            padding: 9px;
            box-sizing: content-box;
            color: var(--blue);
            background: #fff;
            border-radius: 10px;
          }

          .payroll-import-preview-summary strong {
            display: block;
            color: var(--navy);
            font-size: 15px;
          }

          .payroll-import-preview-summary span {
            display: block;
            margin-top: 2px;
            color: #748596;
            font-size: 8px;
            font-weight: 700;
          }

          .payroll-import-preview-table-wrap {
            overflow-x: auto;
            border:
              1px solid #e7edf1;
            border-radius: 12px;
          }

          .payroll-import-preview-table {
            width: 100%;
            min-width: 1050px;
            border-collapse:
              separate;
            border-spacing: 0;
          }

          .payroll-import-preview-table th {
            padding: 12px 11px;
            color: #718394;
            background: #f4f7f9;
            border-bottom:
              1px solid #e1e7eb;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: .03em;
            text-align: left;
            white-space: nowrap;
          }

          .payroll-import-preview-table td {
            padding: 13px 11px;
            color: #53677a;
            background: #fff;
            border-bottom:
              1px solid #edf1f4;
            font-size: 9px;
            vertical-align: middle;
          }

          .payroll-import-preview-table
            tbody tr:last-child td {
            border-bottom: 0;
          }

          .payroll-import-preview-table
            td strong {
            display: block;
            color: #314d63;
            font-size: 10px;
          }

          .payroll-import-preview-table
            td small {
            display: block;
            margin-top: 3px;
            color: #8997a4;
            font-size: 8px;
          }

          .payroll-import-preview-status {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 6px 8px;
            border-radius: 999px;
            font-size: 8px;
            font-weight: 800;
            white-space: nowrap;
          }

          .payroll-import-preview-status svg {
            width: 13px;
            height: 13px;
          }

          .payroll-import-preview-status.valid {
            color: #08754c;
            background: #e5f6ec;
          }

          .payroll-import-preview-status.invalid {
            color: #b44350;
            background: #fff0f1;
          }

          .payroll-import-preview-money {
            color: #08754c !important;
            white-space: nowrap;
          }

          .payroll-import-preview-mobile-hint {
            display: none;
          }

          @media (max-width: 760px) {
            .payroll-import-preview {
              padding: 14px;
            }

            .payroll-import-preview-summary {
              grid-template-columns:
                1fr;
            }

            .payroll-import-preview-mobile-hint {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 10px;
              padding: 8px 10px;
              color: #688097;
              background: #f3f8fb;
              border:
                1px solid #e0e9ef;
              border-radius: 9px;
              font-size: 8px;
              font-weight: 700;
            }

            .payroll-import-preview-table-wrap {
              -webkit-overflow-scrolling:
                touch;
            }

            .payroll-import-preview-table
              th:first-child,
            .payroll-import-preview-table
              td:first-child {
              position: sticky;
              left: 0;
            }

            .payroll-import-preview-table
              th:first-child {
              z-index: 3;
              background: #f4f7f9;
            }

            .payroll-import-preview-table
              td:first-child {
              z-index: 2;
              background: #fff;
              box-shadow:
                7px 0 10px -10px
                rgba(
                  30,
                  65,
                  90,
                  .6
                );
            }
          }
        `}
      </style>

      <div className="payroll-import-preview">
        <div className="payroll-import-preview-summary">
          <article>
            <FileSpreadsheet />

            <div>
              <strong>
                {rows.length}
              </strong>

              <span>
                Tổng dòng xem trước
              </span>
            </div>
          </article>

          <article>
            <CheckCircle2 />

            <div>
              <strong>
                {validCount}
              </strong>

              <span>
                Dòng hợp lệ
              </span>
            </div>
          </article>

          <article>
            <XCircle />

            <div>
              <strong>
                {invalidCount}
              </strong>

              <span>
                Dòng có lỗi
              </span>
            </div>
          </article>
        </div>

        <div className="payroll-import-preview-mobile-hint">
          ← Vuốt ngang để xem đầy đủ →
        </div>

        <div className="payroll-import-preview-table-wrap">
          <table className="payroll-import-preview-table">
            <thead>
              <tr>
                <th>
                  Dòng
                </th>

                <th>
                  Nhân viên
                </th>

                <th>
                  Kỳ lương
                </th>

                <th>
                  Phòng ban
                </th>

                <th>
                  Tổng thu nhập
                </th>

                <th>
                  Tổng khấu trừ
                </th>

                <th>
                  Thực lĩnh
                </th>

                <th>
                  Trạng thái
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (
                  row,
                  index,
                ) => {
                  const rowNumber =
                    getRowValue(
                      row,
                      "rowNumber",
                      "row_number",
                    ) ??
                    index + 1;

                  const staffId =
                    getRowValue(
                      row,
                      "staffId",
                      "staff_id",
                    ) ??
                    "—";

                  const periodCode =
                    getRowValue(
                      row,
                      "periodCode",
                      "period_code",
                    ) ??
                    "—";

                  const data =
                    row?.data ??
                    row
                      ?.normalizedData ??
                    row
                      ?.normalized_data ??
                    {};

                  const summary =
                    data?.summary ??
                    {};

                  const employeeName =
                    data
                      ?.employeeName ??
                    data
                      ?.employee_name ??
                    "";

                  const departmentName =
                    data
                      ?.departmentName ??
                    data
                      ?.department_name ??
                    "—";

                  const grossIncome =
                    summary
                      ?.grossIncome ??
                    summary
                      ?.gross_income ??
                    0;

                  const totalDeductions =
                    summary
                      ?.totalDeductions ??
                    summary
                      ?.total_deductions ??
                    0;

                  const netSalary =
                    summary
                      ?.netSalary ??
                    summary
                      ?.net_salary ??
                    0;

                  const isValid =
                    row
                      ?.isValid ===
                      true ||
                    row
                      ?.is_valid ===
                      true;

                  return (
                    <tr
                      key={
                        row?.id ??
                        `${rowNumber}-${index}`
                      }
                    >
                      <td>
                        <strong>
                          #
                          {
                            rowNumber
                          }
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {
                            staffId
                          }
                        </strong>

                        {employeeName && (
                          <small>
                            {
                              employeeName
                            }
                          </small>
                        )}
                      </td>

                      <td>
                        <strong>
                          {
                            periodCode
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          departmentName
                        }
                      </td>

                      <td>
                        {formatMoney(
                          grossIncome,
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          totalDeductions,
                        )}
                      </td>

                      <td>
                        <strong className="payroll-import-preview-money">
                          {formatMoney(
                            netSalary,
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`payroll-import-preview-status ${
                            isValid
                              ? "valid"
                              : "invalid"
                          }`}
                        >
                          {isValid ? (
                            <>
                              <CheckCircle2 />
                              Hợp lệ
                            </>
                          ) : (
                            <>
                              <XCircle />
                              Có lỗi
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default PayrollImportPreview;
