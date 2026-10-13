import {
  Banknote,
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  FileText,
  Send,
  WalletCards,
} from "lucide-react";

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const formatMoney = (value) => {
  return new Intl.NumberFormat(
    "vi-VN",
  ).format(toNumber(value));
};

const PayrollPeriodSummary = ({
  statistics = null,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="hr-empty">
        Đang tải thống kê kỳ lương...
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="hr-empty">
        Chưa có dữ liệu thống kê.
      </div>
    );
  }

  const payslips =
    statistics.payslips ?? {};

  const amounts =
    statistics.amounts ?? {};

  const totalPayslips = toNumber(
    payslips.total ??
      statistics.totalPayslips,
  );

  const draftCount = toNumber(
    payslips.draft ??
      statistics.draftCount,
  );

  const waitingConfirmationCount =
    toNumber(
      payslips.waitingConfirmation ??
        statistics.pendingCount,
    );

  const confirmedCount = toNumber(
    payslips.confirmed ??
      statistics.confirmedPayslips,
  );

  const publishedCount = toNumber(
    payslips.published ??
      statistics.publishedCount,
  );

  const paidCount = toNumber(
    payslips.paid ??
      statistics.paidPayslips,
  );

  const totalGrossIncome = toNumber(
    amounts.grossIncome ??
      statistics.totalGrossIncome,
  );

  const totalDeductions = toNumber(
    amounts.totalDeductions ??
      statistics.totalDeductions,
  );

  const totalNetSalary = toNumber(
    amounts.netSalary ??
      statistics.totalNetSalary,
  );

  return (
    <div>
      {/* TRẠNG THÁI PHIẾU LƯƠNG */}
      <div className="hr-kpi-row">
        <article>
          <FileText />

          <div>
            <strong>
              {totalPayslips}
            </strong>

            <span>
              Tổng phiếu lương
            </span>
          </div>
        </article>

        <article>
          <Clock3 />

          <div>
            <strong>
              {draftCount}
            </strong>

            <span>
              Bản nháp
            </span>
          </div>
        </article>

        <article>
          <Clock3 />

          <div>
            <strong>
              {
                waitingConfirmationCount
              }
            </strong>

            <span>
              Chờ xác nhận
            </span>
          </div>
        </article>

        <article>
          <BadgeCheck />

          <div>
            <strong>
              {confirmedCount}
            </strong>

            <span>
              Đã xác nhận
            </span>
          </div>
        </article>

        <article>
          <Send />

          <div>
            <strong>
              {publishedCount}
            </strong>

            <span>
              Đã phát hành
            </span>
          </div>
        </article>

        <article>
          <WalletCards />

          <div>
            <strong>
              {paidCount}
            </strong>

            <span>
              Đã thanh toán
            </span>
          </div>
        </article>
      </div>

      {/* TỔNG TIỀN */}
      <div
        className="hr-kpi-row"
        style={{
          paddingTop: "12px",
          paddingBottom: "20px",
        }}
      >
        <article>
          <Banknote />

          <div>
            <strong>
              {formatMoney(
                totalGrossIncome,
              )}{" "}
              ₫
            </strong>

            <span>
              Tổng thu nhập
            </span>
          </div>
        </article>

        <article>
          <CircleDollarSign />

          <div>
            <strong>
              {formatMoney(
                totalDeductions,
              )}{" "}
              ₫
            </strong>

            <span>
              Tổng khấu trừ
            </span>
          </div>
        </article>

        <article>
          <WalletCards />

          <div>
            <strong className="net-pay">
              {formatMoney(
                totalNetSalary,
              )}{" "}
              ₫
            </strong>

            <span>
              Tổng thực lĩnh
            </span>
          </div>
        </article>
      </div>
    </div>
  );
};

export default PayrollPeriodSummary;