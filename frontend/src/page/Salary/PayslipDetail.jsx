import React, {
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Calculator,
  Download,
  Leaf,
  Printer,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";

import { Avatar } from "@/components/common/Avatar";
import { SensitiveAmount } from "@/components/common/SensitiveAmount";
import { exportElementAsPdf } from "@/utils/export-pdf";
import PayrollBreakdown from "@/components/payroll/PayrollBreakdown";
import PayrollConfirm from "@/components/payroll/PayrollConfirm";
import PayrollFeedbackModal from "@/components/payroll/PayrollFeedbackModal";

const STATUS_LABELS = {
  waiting_confirmation: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  employee_feedback: "Đang phản hồi",
  adjusted: "Đã điều chỉnh",
  published: "Đã phát hành",
  paid: "Đã thanh toán",
};

function formatMoney(value) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN").format(
    Number.isFinite(amount) ? amount : 0,
  );
}

function formatDate(value) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatMonth(periodCode) {
  if (!periodCode) {
    return "--/----";
  }

  const [year, month] = periodCode.split("-");

  return `${month}/${year}`;
}

function getStatusLabel(status) {
  return (
    STATUS_LABELS[status] ??
    status ??
    "Chưa xác định"
  );
}

export default function PayslipDetail({
  payroll,
  user,
  avatarUrl,
  systemConfig,
  onBack,
  onConfirm,
  confirmLoading = false,
  confirmMessage = null,
  confirmError = null,
  onFeedback,
  feedbackLoading = false,
  feedbackError = null,
  feedbackMessage = null,
}) {
  const [visible, setVisible] = useState(false);
  const [exporting, setExporting] =
    useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackItem, setFeedbackItem] = useState(null);

  const payslipRef = useRef(null);

  const incomeItems =
    payroll?.income?.items ?? [];

  const deductionItems =
    payroll?.deductions?.items ?? [];

  const totalIncome =
    Number(payroll?.income?.grossIncome) ||
    incomeItems.reduce(
      (total, item) =>
        total + Number(item.amount ?? 0),
      0,
    );

  const totalDeductions =
    Number(
      payroll?.deductions?.totalDeductions,
    ) ||
    deductionItems.reduce(
      (total, item) =>
        total + Number(item.amount ?? 0),
      0,
    );

  const taxableIncome = Number(
    payroll?.income?.taxableIncome ?? 0,
  );

  const netSalary =
    Number(payroll?.payment?.netSalary) ||
    totalIncome - totalDeductions;

  const periodCode = payroll?.period?.code;
  const status = payroll?.status;
  const tenureDisplay = payroll?.employee?.tenure?.display ?? payroll?.attendance?.seniority;
  const salaryCoefficient = payroll?.employee?.salaryCoefficient ?? payroll?.coefficients?.baseCoefficient;
  const actualWorkDays = payroll?.attendance?.actualWorkDays ?? payroll?.attendance?.workDays;
  const standardWorkDays = payroll?.attendance?.standardWorkDays ?? payroll?.attendance?.totalWorkDays;

  const employee = {
    name:
      payroll?.employee?.fullName ||
      user?.name ||
      "Nhân viên NBC",

    staffId:
      payroll?.employee?.staffId ||
      user?.staffId ||
      "",

    department:
      payroll?.employee?.department ||
      user?.department ||
      "Chưa cập nhật",

    position:
      payroll?.employee?.jobTitle ||
      user?.position ||
      "Nhân viên",
  };

  const money = (value, label) => (
    <SensitiveAmount
      value={formatMoney(value)}
      visible={visible}
      onToggle={() =>
        setVisible((current) => !current)
      }
      label={label}
    />
  );

  const handlePrint = () => {
    setVisible(true);

    requestAnimationFrame(() => {
      window.print();
    });
  };

  const handleExport = async () => {
    if (!payslipRef.current || exporting) {
      return;
    }

    setVisible(true);
    setExporting(true);

    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });

    try {
      await exportElementAsPdf(
        payslipRef.current,
        `phieu-luong-${
          periodCode || "khong-ro-ky"
        }-${employee.staffId}.pdf`,
        "portrait",
        1060,
      );
    } finally {
      setExporting(false);
    }
  };

  if (!payroll) {
    return (
      <div className="page payslip-detail-page">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Quay lại
        </button>

        <div className="payroll-empty-state">
          <WalletCards />
          <strong>
            Không tìm thấy phiếu lương
          </strong>
          <p>
            Phiếu lương có thể chưa được phát hành
            hoặc không thuộc tài khoản hiện tại.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page payslip-detail-page">
      <article
        ref={payslipRef}
        className="payslip-sheet print-surface"
      >
        <header className="payslip-hero">
          <div className="payslip-hero-actions no-print">
            <button
              type="button"
              onClick={onBack}
            >
              <ArrowLeft />
              Danh sách
            </button>

            <span>
              <button
                type="button"
                onClick={() =>
                  setVisible(
                    (current) => !current,
                  )
                }
              >
                {visible
                  ? "Ẩn số tiền"
                  : "Hiện số tiền"}
              </button>

              <button
                type="button"
                aria-label="Tải phiếu lương PDF"
                disabled={exporting}
                onClick={handleExport}
              >
                <Download />
              </button>
            </span>
          </div>

          <img
            src={
              systemConfig?.companyLogo ||
              "/nbc-logo.png"
            }
            alt={`Logo ${
              systemConfig?.companyName ||
              "Nhabe Corporation"
            }`}
          />

          <div>
            <h1>
              Phiếu lương{" "}
              {formatMonth(periodCode)}
            </h1>

            <p>
              {payroll?.period?.name ||
                `${formatDate(
                  payroll?.period?.startDate,
                )} - ${formatDate(
                  payroll?.period?.endDate,
                )}`}
            </p>

            <span>
              <ShieldCheck />
              {getStatusLabel(status)}
            </span>
          </div>

          <div className="payslip-eco">
            <Leaf />
            <Building2 />
            <Leaf />
          </div>
        </header>

        <section className="payslip-employee-card">
          <Avatar
            large
            name={employee.name}
            src={avatarUrl}
          />

          <div className="employee-facts">
            <div>
              <UserRound />

              <span>
                <small>Họ tên</small>
                <strong>
                  {employee.name}
                </strong>
              </span>
            </div>

            <div>
              <BadgeCheck />

              <span>
                <small>Mã nhân viên</small>
                <strong>
                  {employee.staffId}
                </strong>
              </span>
            </div>

            <div>
              <Building2 />

              <span>
                <small>Bộ phận</small>
                <strong>
                  {employee.department}
                </strong>
              </span>
            </div>
          </div>

          <div className="employee-facts right">
            <div>
              <CalendarDays />

              <span>
                <small>Thâm niên</small>
                <strong>
                  {tenureDisplay || "Chưa ghi nhận ngày vào làm"}
                </strong>
              </span>
            </div>

            <div>
              <Calculator />

              <span>
                <small>Hệ số lương</small>
                <strong>
                  {salaryCoefficient === null || salaryCoefficient === undefined
                    ? "Chưa ghi nhận"
                    : Number(salaryCoefficient).toLocaleString("vi-VN")}
                </strong>
              </span>
            </div>

            <div>
              <CalendarCheck2 />

              <span>
                <small>
                  Ngày công đi làm
                </small>

                <strong>
                  {Number(actualWorkDays ?? 0).toLocaleString("vi-VN")}
                  {" / "}
                  {Number(standardWorkDays ?? 0).toLocaleString("vi-VN")}{" "}
                  ngày
                </strong>
                {payroll?.attendance?.source === "payslip_snapshot" && (
                  <small className="employee-fact-note">Chưa có bản ghi chấm công trong kỳ</small>
                )}
              </span>
            </div>
          </div>
        </section>

        <section className="payslip-summary-strip">
          <div className="blue">
            <span>
              <WalletCards />
            </span>

            <div>
              <small>Tổng thu nhập</small>

              <strong>
                {money(
                  totalIncome,
                  "tổng thu nhập",
                )}
              </strong>

              <em>VND</em>
            </div>
          </div>

          <div className="teal">
            <span>
              <ShieldCheck />
            </span>

            <div>
              <small>
                Thu nhập chịu thuế
              </small>

              <strong>
                {money(
                  taxableIncome,
                  "thu nhập chịu thuế",
                )}
              </strong>

              <em>VND</em>
            </div>
          </div>

          <div className="green">
            <span>
              <Banknote />
            </span>

            <div>
              <small>Thực lĩnh</small>

              <strong>
                {money(
                  netSalary,
                  "thực lĩnh",
                )}
              </strong>

              <em>VND</em>
            </div>
          </div>
        </section>

        <PayrollBreakdown
          income={payroll.income}
          deductions={payroll.deductions}
          visible={visible}
          onToggleVisibility={() => setVisible((current) => !current)}
          onFeedbackItem={(item) => {
            setFeedbackItem(item);
            setFeedbackOpen(true);
          }}
        />

        <section className="payslip-net">
          <span>
            <Banknote />
          </span>

          <div>
            <strong>
              THỰC LĨNH (NGÂN HÀNG)
            </strong>

            <p>
              Ngày thanh toán:{" "}
              {formatDate(
                payroll?.payment?.paidAt ||
                  payroll?.period
                    ?.paymentDate,
              )}
            </p>

            {payroll?.payment?.reference && (
              <small>
                Mã giao dịch:{" "}
                {
                  payroll.payment
                    .reference
                }
              </small>
            )}
          </div>

          <b>
            {money(
              netSalary,
              "thực lĩnh",
            )}{" "}
            <small>VND</small>
          </b>
        </section>

        <PayrollConfirm
          payslip={payroll}
          loading={confirmLoading}
          message={confirmMessage}
          error={confirmError}
          onConfirm={onConfirm}
          onFeedback={() => {
            setFeedbackItem(null);
            setFeedbackOpen(true);
          }}
          feedbackLoading={feedbackLoading}
          feedbackError={feedbackError}
          feedbackMessage={feedbackMessage}
        />

        <footer className="payslip-footer">
          <div>
            <Leaf />

            <span>
              <strong>
                Cảm ơn bạn đã đồng hành cùng NBC!
              </strong>

              <p>
                Mọi thắc mắc về phiếu lương,
                vui lòng liên hệ Phòng Nhân sự.
              </p>
            </span>
          </div>

          <div className="payslip-footer-actions no-print">
            <button
              type="button"
              onClick={handlePrint}
            >
              <Printer />
              In phiếu lương
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={handleExport}
            >
              <Download />

              {exporting
                ? "Đang tạo..."
                : "Tải PDF"}
            </button>
          </div>
        </footer>
      </article>

      {feedbackOpen && (
        <PayrollFeedbackModal
          payslip={payroll}
          initialItem={feedbackItem}
          loading={feedbackLoading}
          error={feedbackError}
          onClose={() => {
            if (!feedbackLoading) {
              setFeedbackOpen(false);
              setFeedbackItem(null);
            }
          }}
          onSubmit={async (payslipId, payload) => {
            await onFeedback?.(payslipId, payload);
            setFeedbackOpen(false);
            setFeedbackItem(null);
          }}
        />
      )}
    </div>
  );
}
