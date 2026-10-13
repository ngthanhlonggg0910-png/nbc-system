import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
} from "lucide-react";

const getValue = (
  value,
  fallback = "—",
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return value;
};

const PayrollImportErrors = ({
  errors = [],
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="hr-empty">
        Đang tải danh sách lỗi...
      </div>
    );
  }

  if (!errors.length) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          margin: "18px 22px 22px",
          padding: "14px",
          color: "#08754c",
          background: "#eaf8f0",
          border: "1px solid #d5eddf",
          borderRadius: "11px",
          fontSize: "10px",
          fontWeight: 700,
        }}
      >
        <CheckCircle2
          style={{
            width: "18px",
            height: "18px",
            flex: "0 0 auto",
          }}
        />

        Không phát hiện dòng lỗi trong dữ liệu đã nhập.
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .payroll-import-errors {
            display: grid;
            gap: 10px;
            padding: 16px 22px 22px;
          }

          .payroll-import-error-summary {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            color: #9f3e49;
            background: #fff4f4;
            border: 1px solid #f1d8dc;
            border-radius: 11px;
          }

          .payroll-import-error-summary svg {
            width: 18px;
            height: 18px;
            flex: 0 0 auto;
          }

          .payroll-import-error-summary strong {
            display: block;
            font-size: 11px;
          }

          .payroll-import-error-summary span {
            display: block;
            margin-top: 3px;
            color: #9a6c73;
            font-size: 9px;
          }

          .payroll-import-error-item {
            display: grid;
            grid-template-columns:
              minmax(80px, 110px)
              minmax(100px, 130px)
              minmax(120px, 150px)
              minmax(240px, 1fr);
            gap: 12px;
            align-items: start;
            padding: 13px 14px;
            background: #fff;
            border: 1px solid #edf0f2;
            border-radius: 11px;
          }

          .payroll-import-error-cell {
            display: grid;
            gap: 4px;
            min-width: 0;
          }

          .payroll-import-error-cell > span {
            color: #8796a5;
            font-size: 8px;
            font-weight: 800;
            letter-spacing: .04em;
            text-transform: uppercase;
          }

          .payroll-import-error-cell > strong {
            color: #354f64;
            font-size: 10px;
            line-height: 1.45;
            word-break: break-word;
          }

          .payroll-import-error-message strong {
            color: #b43e4b;
          }

          .payroll-import-error-code {
            display: inline-flex;
            width: fit-content;
            padding: 5px 8px;
            color: #a65b22;
            background: #fff0df;
            border-radius: 999px;
            font-size: 8px;
            font-weight: 800;
          }

          @media (max-width: 760px) {
            .payroll-import-errors {
              padding: 14px;
            }

            .payroll-import-error-item {
              grid-template-columns:
                1fr 1fr;
            }

            .payroll-import-error-message {
              grid-column: 1 / -1;
            }
          }

          @media (max-width: 420px) {
            .payroll-import-error-item {
              grid-template-columns: 1fr;
            }

            .payroll-import-error-message {
              grid-column: auto;
            }
          }
        `}
      </style>

      <div className="payroll-import-errors">
        <div className="payroll-import-error-summary">
          <FileWarning />

          <div>
            <strong>
              Phát hiện {errors.length} lỗi trong file
            </strong>

            <span>
              Cần sửa dữ liệu nguồn và nhập lại
              trước khi có thể lưu chính thức.
            </span>
          </div>
        </div>

        {errors.map(
          (
            error,
            index,
          ) => {
            const rowNumber =
              error?.rowNumber ??
              error?.row_number ??
              "—";

            const staffId =
              error?.staffId ??
              error?.staff_id ??
              "—";

            const columnName =
              error?.columnName ??
              error?.column_name ??
              "—";

            const code =
              error?.code ??
              error?.errorCode ??
              error?.error_code ??
              "ERROR";

            const message =
              error?.message ??
              error?.errorMessage ??
              error?.error_message ??
              "Dữ liệu không hợp lệ";

            return (
              <article
                key={
                  error?.id ??
                  `${rowNumber}-${index}`
                }
                className="payroll-import-error-item"
              >
                <div className="payroll-import-error-cell">
                  <span>
                    Dòng dữ liệu
                  </span>

                  <strong>
                    #{getValue(
                      rowNumber,
                    )}
                  </strong>
                </div>

                <div className="payroll-import-error-cell">
                  <span>
                    Nhân viên
                  </span>

                  <strong>
                    {getValue(
                      staffId,
                    )}
                  </strong>
                </div>

                <div className="payroll-import-error-cell">
                  <span>
                    Trường lỗi
                  </span>

                  <strong>
                    {getValue(
                      columnName,
                    )}
                  </strong>

                  <small className="payroll-import-error-code">
                    {code}
                  </small>
                </div>

                <div className="payroll-import-error-cell payroll-import-error-message">
                  <span>
                    Nội dung lỗi
                  </span>

                  <strong>
                    {message}
                  </strong>
                </div>
              </article>
            );
          },
        )}
      </div>
    </>
  );
};

export default PayrollImportErrors;
