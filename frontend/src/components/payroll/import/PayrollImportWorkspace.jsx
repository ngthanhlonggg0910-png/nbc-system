import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  FileCheck2,
  FileSpreadsheet,
  ShieldCheck,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import PayrollUploadZone from "@/components/payroll/import/PayrollUploadZone";
import PayrollImportPreview from "@/components/payroll/import/PayrollImportPreview";
import PayrollImportErrors from "@/components/payroll/import/PayrollImportErrors";
import PayrollImportOperations from "@/components/payroll/import/PayrollImportOperations";

/**
 * ==========================================
 * WORKFLOW HELPERS
 * ==========================================
 */

const getStepClassName = ({
  done,
  active,
  error,
}) => {
  return [
    "payroll-import-step",

    done
      ? "payroll-import-step--done"
      : "",

    active
      ? "payroll-import-step--active"
      : "",

    error
      ? "payroll-import-step--error"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const PayrollImportWorkspace = ({
  periods = [],

  payrollPeriodId = "",
  file = null,
  sourceType = "excel",
  manualRows = [],

  activeImport = null,
  currentImportId = null,

  importTotal = 0,
  importValid = 0,
  importInvalid = 0,

  importHasErrors = false,
  importStatus = "",
  importStatusLabel = "—",

  importCommitted = false,
  importCancelled = false,

  canCommitImport = false,
  canCancelImport = false,

  preview = [],
  errors = [],

  successMessage = "",
  error = "",

  uploadLoading = false,
  templateLoading = false,
  previewLoading = false,
  errorsLoading = false,
  commitLoading = false,
  cancelLoading = false,
  restoringImport = false,

  historyViewMode = false,

  onPeriodChange,
  onFileChange,
  onSourceTypeChange,
  onManualRowsChange,
  onUpload,
  onDownloadTemplate,

  onCancel,
  onCommit,
}) => {
  /**
   * ==========================================
   * WORKFLOW STATE
   * ==========================================
   */

  const hasPeriod =
    Boolean(
      payrollPeriodId,
    );

  const hasFile = sourceType === "manual"
    ? manualRows.some((row) => String(row?.staffId || "").trim())
    : Boolean(file);

  const hasImport =
    Boolean(
      activeImport &&
        currentImportId,
    );

  const validationFinished =
    hasImport &&
    [
      "validated",
      "failed",
      "committed",
      "cancelled",
    ].includes(
      importStatus,
    );

  const previewAvailable =
    hasImport &&
    (
      preview.length > 0 ||
      importTotal > 0
    );

  const workflowFinished =
    importCommitted;

  /**
   * Bước đang làm.
   */
  let activeStep = 1;

  if (hasPeriod) {
    activeStep = 2;
  }

  if (
    hasFile ||
    hasImport
  ) {
    activeStep = 3;
  }

  if (
    validationFinished
  ) {
    activeStep = 4;
  }

  if (
    importCommitted ||
    importCancelled
  ) {
    activeStep = 5;
  }

  const steps = [
    {
      number: 1,
      label: "Chọn phương thức",
      icon: FileSpreadsheet,

      done:
        hasPeriod,
    },

    {
      number: 2,
      label: "Nhập dữ liệu",
      icon: UploadCloud,

      done:
        hasImport,

      active:
        activeStep === 2,
    },

    {
      number: 3,
      label: "Kiểm tra cấu trúc",
      icon: ShieldCheck,

      done:
        hasImport,

      active:
        activeStep === 3,

      error: false,
    },

    {
      number: 4,
      label: "Kiểm tra dữ liệu",
      icon: FileCheck2,

      done:
        validationFinished && !importHasErrors,

      active:
        activeStep === 4,

      error:
        importHasErrors,
    },

    {
      number: 5,
      label: "Xác nhận nhập",
      icon: CheckCircle2,

      done:
        workflowFinished,

      active:
        activeStep === 5,

      error:
        importCancelled,
    },
  ];

  const workspaceLoading =
    uploadLoading ||
    templateLoading ||
    commitLoading ||
    cancelLoading ||
    restoringImport;

  return (
    <section className="payroll-import-workspace">
      {/*
       * ==================================
       * HEADER
       * ==================================
       */}

      <div className="payroll-import-workspace__header">
        <div>
          <span>
            TIẾP NHẬN DỮ LIỆU LƯƠNG
          </span>

          <h2>
            Import dữ liệu lương
          </h2>

          <p>
            Nhập từ Excel, bảng HTML hoặc cập nhật thủ công
            trên cùng một quy trình kiểm soát.
          </p>
        </div>

        {historyViewMode &&
          currentImportId && (
          <div className="payroll-import-history-view">
            Đang xem Import #
            {currentImportId}
          </div>
        )}
      </div>

      <PayrollImportOperations payrollPeriodId={payrollPeriodId} onDownloadTemplate={onDownloadTemplate} />

      {/*
       * ==================================
       * STEPPER
       * ==================================
       */}

      <div className="payroll-import-stepper">
        {steps.map(
          (
            step,
            index,
          ) => {
            const Icon =
              step.icon;

            return (
              <div
                key={
                  step.number
                }
                className={getStepClassName(
                  {
                    done:
                      step.done,

                    active:
                      step.active,

                    error:
                      step.error,
                  },
                )}
              >
                <div className="payroll-import-step__marker">
                  {step.done ? (
                    <Check />
                  ) : step.error ? (
                    <X />
                  ) : (
                    <Icon />
                  )}
                </div>

                <div className="payroll-import-step__text">
                  <span>
                    Bước{" "}
                    {
                      step.number
                    }
                  </span>

                  <strong>
                    {
                      step.label
                    }
                  </strong>
                </div>

                {index <
                  steps.length -
                    1 && (
                  <div className="payroll-import-step__line" />
                )}
              </div>
            );
          },
        )}
      </div>

      {/*
       * ==================================
       * TERMINAL STATUS
       * ==================================
       */}

      {importCommitted && (
        <div className="payroll-import-result payroll-import-result--success">
          <CheckCircle2 />

          <div>
            <strong>
              Import #
              {
                currentImportId
              }{" "}
              đã hoàn tất
            </strong>

            <span>
              Dữ liệu hợp lệ đã được lưu
              chính thức vào bảng lương.
            </span>
          </div>
        </div>
      )}

      {importCancelled && (
        <div className="payroll-import-result payroll-import-result--cancelled">
          <XCircle />

          <div>
            <strong>
              Import #
              {
                currentImportId
              }{" "}
              đã bị hủy
            </strong>

            <span>
              Lần import này không thể được
              sử dụng để lưu bảng lương.
            </span>
          </div>
        </div>
      )}

      {/*
       * ==================================
       * SUCCESS MESSAGE
       * ==================================
       */}

      {successMessage &&
        activeImport &&
        !importCommitted &&
        !importCancelled && (
          <div className="payroll-import-result payroll-import-result--success">
            <CheckCircle2 />

            <div>
              <strong>
                Kiểm tra file thành công
              </strong>

              <span>
                {successMessage}

                {currentImportId
                  ? ` Mã import: #${currentImportId}.`
                  : ""}
              </span>
            </div>
          </div>
        )}

      {/*
       * ==================================
       * MAIN UPLOAD PANEL
       * ==================================
       */}

      <div className="payroll-import-workspace__panel">
        <div className="payroll-import-workspace__section-heading">
          <div>
            <span>
              BƯỚC 1–3
            </span>

            <h3>
              Chọn nguồn và chuẩn bị dữ liệu
            </h3>
          </div>

          {restoringImport && (
            <span className="data-status pending">
              Đang khôi phục...
            </span>
          )}
        </div>

        <PayrollUploadZone
          periods={
            periods
          }
          payrollPeriodId={
            payrollPeriodId
          }
          file={
            file
          }
          sourceType={sourceType}
          manualRows={manualRows}
          loading={
            workspaceLoading
          }
          error={
            error
          }
          onPeriodChange={
            onPeriodChange
          }
          onFileChange={
            onFileChange
          }
          onSourceTypeChange={onSourceTypeChange}
          onManualRowsChange={onManualRowsChange}
          onUpload={
            onUpload
          }
          onDownloadTemplate={
            onDownloadTemplate
          }
        />
      </div>

      {/*
       * ==================================
       * IMPORT INFORMATION
       * ==================================
       */}

      {activeImport && (
        <div className="payroll-import-summary-grid">
          <article>
            <span>
              Mã import
            </span>

            <strong>
              #
              {currentImportId ??
                "—"}
            </strong>
          </article>

          <article>
            <span>
              Tổng dòng
            </span>

            <strong>
              {
                importTotal
              }
            </strong>
          </article>

          <article>
            <span>
              Hợp lệ
            </span>

            <strong className="payroll-import-summary-grid__success">
              {
                importValid
              }
            </strong>
          </article>

          <article>
            <span>
              Có lỗi
            </span>

            <strong
              className={
                importInvalid >
                0
                  ? "payroll-import-summary-grid__error"
                  : ""
              }
            >
              {
                importInvalid
              }
            </strong>
          </article>

          <article>
            <span>
              Trạng thái
            </span>

            <span
              className={`data-status ${
                importHasErrors ||
                importCancelled
                  ? "pending"
                  : "ready"
              }`}
            >
              {
                importStatusLabel
              }
            </span>
          </article>
        </div>
      )}

      {/*
       * ==================================
       * VALIDATION ERROR
       * ==================================
       */}

      {activeImport &&
        (
          importHasErrors ||
          errorsLoading
        ) && (
          <div className="payroll-import-workspace__panel">
            <div className="payroll-import-workspace__section-heading">
              <div>
                <span>
                  KIỂM TRA DỮ LIỆU
                </span>

                <h3>
                  Lỗi cần xử lý
                </h3>
              </div>

              {errors.length >
                0 && (
                <span className="data-status pending">
                  {
                    errors.length
                  }{" "}
                  lỗi
                </span>
              )}
            </div>

            <PayrollImportErrors
              errors={
                errors
              }
              loading={
                errorsLoading
              }
            />
          </div>
        )}

      {/*
       * ==================================
       * PREVIEW
       * ==================================
       */}

      {activeImport &&
        (
          previewAvailable ||
          previewLoading
        ) && (
          <div className="payroll-import-workspace__panel">
            <div className="payroll-import-workspace__section-heading">
              <div>
                <span>
                  BƯỚC 4
                </span>

                <h3>
                  Xem trước dữ liệu
                </h3>
              </div>

              <div className="payroll-import-workspace__badges">
                <span className="data-status ready">
                  {importValid} hợp lệ
                </span>

                {importInvalid >
                  0 && (
                  <span className="data-status pending">
                    {
                      importInvalid
                    }{" "}
                    lỗi
                  </span>
                )}
              </div>
            </div>

            <PayrollImportPreview
              rows={
                preview
              }
              loading={
                previewLoading
              }
            />
          </div>
        )}

      {/*
       * ==================================
       * ACTION
       * ==================================
       */}

      {(
        canCancelImport ||
        canCommitImport
      ) && (
        <div className="payroll-import-workspace__actions">
          <div className="payroll-import-workspace__action-note">
            {importHasErrors ? (
              <>
                <AlertTriangle />

                <span>
                  Cần xử lý hết lỗi trước khi
                  lưu chính thức.
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 />

                <span>
                  Dữ liệu đã sẵn sàng để
                  xác nhận.
                </span>
              </>
            )}
          </div>

          <div className="payroll-import-workspace__action-buttons">
            {canCancelImport && (
              <button
                type="button"
                className="secondary-button payroll-import-cancel-button"
                onClick={
                  onCancel
                }
                disabled={
                  cancelLoading ||
                  commitLoading ||
                  restoringImport
                }
              >
                <X />

                {cancelLoading
                  ? "Đang hủy..."
                  : "Hủy lần import"}
              </button>
            )}

            {canCommitImport && (
              <button
                type="button"
                className="primary-button"
                onClick={
                  onCommit
                }
                disabled={
                  commitLoading ||
                  cancelLoading ||
                  restoringImport
                }
              >
                <CheckCircle2 />

                {commitLoading
                  ? "Đang lưu..."
                  : "Xác nhận lưu chính thức"}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default PayrollImportWorkspace;
