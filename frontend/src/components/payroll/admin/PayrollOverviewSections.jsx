import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  FileChartColumn,
  FileSpreadsheet,
  History,
  Landmark,
  ListChecks,
  Send,
  SlidersHorizontal,
  Upload,
  Users,
  WalletCards,
} from "lucide-react";

export const numberFormat = new Intl.NumberFormat("vi-VN");

export const currencyFormat = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export const toNumber = (value) => Number(value) || 0;

export const formatPeriod = (code) => {
  const [year, month] = String(code || "").trim().split("-");
  return year && month ? `${month}/${year}` : code || "—";
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN").format(date);
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
};

export const compactMoney = (value) => {
  const amount = toNumber(value);
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} tỷ ₫`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} triệu ₫`;
  }
  return currencyFormat.format(amount);
};

export const formatChange = (value, fallback = "Chưa có kỳ so sánh") => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return fallback;
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })}% so với kỳ trước`;
};

const statusLabels = {
  draft: "Đang chuẩn bị",
  processing: "Đang xử lý",
  adjusting: "Đang điều chỉnh",
  published: "Đã phát hành",
  locked: "Đã khóa",
  empty: "Chưa có dữ liệu",
  waiting_confirmation: "Chờ xác nhận",
  employee_feedback: "Có phản hồi",
  adjusted: "Đã điều chỉnh",
  committed: "Thành công",
  failed: "Thất bại",
  resolved: "Đã xử lý",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export function OverviewStatus({ status = "draft", children }) {
  return (
    <span className={`payroll-overview-status is-${status}`}>
      {children || statusLabels[status] || status}
    </span>
  );
}

export function OverviewEmpty({
  icon: Icon = BarChart3,
  title = "Chưa có dữ liệu",
  description = "Dữ liệu sẽ được cập nhật khi kỳ lương phát sinh.",
}) {
  return (
    <div className="payroll-overview-empty">
      <Icon />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="payroll-overview-skeleton" aria-label="Đang tải dữ liệu tổng quan">
      <div className="payroll-overview-skeleton__kpis">
        {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
      </div>
      <div className="payroll-overview-skeleton__hero"><i /><i /></div>
      <div className="payroll-overview-skeleton__body"><i /><i /><i /></div>
    </div>
  );
}

const KPI_ICONS = [Users, FileSpreadsheet, CircleDollarSign, Clock3, AlertTriangle, CheckCircle2];

export function PayrollKpiGrid({ items = [] }) {
  return (
    <section className="payroll-overview-kpis" aria-label="Chỉ số tổng quan kỳ lương">
      {items.map((item, index) => {
        const Icon = item.icon || KPI_ICONS[index] || FileChartColumn;
        return (
          <button
            type="button"
            className={`payroll-overview-kpi tone-${item.tone || "blue"}`}
            key={item.label}
            onClick={item.onClick}
          >
            <span>
              <small>{item.label}</small>
              <strong title={String(item.value)}>{item.value}</strong>
              <em className={item.changeTone || ""}>{item.note}</em>
            </span>
            <i><Icon /></i>
            <ArrowRight className="payroll-overview-kpi__arrow" />
          </button>
        );
      })}
    </section>
  );
}

const workflowCopy = {
  done: "Hoàn thành",
  running: "Đang thực hiện",
  warning: "Chờ xử lý",
  pending: "Chưa bắt đầu",
};

export function PayrollWorkflowCard({ periodCode, rows = [], onOpen, actions = {} }) {
  return (
    <section className="payroll-overview-card payroll-overview-workflow">
      <header className="payroll-overview-card__header">
        <div>
          <span>TIẾN ĐỘ QUY TRÌNH LƯƠNG THÁNG {formatPeriod(periodCode)}</span>
          <h3>Kiểm soát tiến độ kỳ lương</h3>
        </div>
        <button type="button" onClick={onOpen}>Xem chi tiết quy trình <ArrowRight /></button>
      </header>
      {rows.length ? (
        <div className="payroll-overview-workflow__track">
          {rows.map((step, index) => (
            <button
              type="button"
              className={`payroll-overview-workflow__step is-${step.state || "pending"}`}
              key={step.key}
              onClick={actions[step.key] || onOpen}
            >
              <span className="payroll-overview-workflow__node">
                {step.state === "done" ? <Check /> : index + 1}
              </span>
              <strong>{step.label}</strong>
              <b>{toNumber(step.progress)}%</b>
              <em>{workflowCopy[step.state] || "Chưa bắt đầu"}</em>
              <small>{step.updatedAt ? formatDateTime(step.updatedAt) : "—"}</small>
            </button>
          ))}
        </div>
      ) : (
        <OverviewEmpty
          icon={ListChecks}
          title="Chưa có quy trình kỳ lương"
          description="Mở kỳ lương hoặc import dữ liệu để bắt đầu."
        />
      )}
    </section>
  );
}

const aggregateQuarterly = (rows) => {
  const buckets = new Map();
  rows.forEach((row) => {
    const [year, month] = String(row.periodCode || "").split("-");
    const quarter = Math.max(1, Math.ceil(toNumber(month) / 3));
    const key = `${year}-Q${quarter}`;
    const current = buckets.get(key) || {
      periodCode: key,
      label: `Q${quarter}/${year}`,
      netSalary: 0,
      payslipCount: 0,
    };
    current.netSalary += toNumber(row.netSalary);
    current.payslipCount += toNumber(row.payslipCount);
    buckets.set(key, current);
  });
  return [...buckets.values()];
};

export function PayrollTrendChart({ rows = [], mode = "month", onModeChange }) {
  const chartRows = mode === "quarter" ? aggregateQuarterly(rows) : rows;
  const maxFund = Math.max(...chartRows.map((row) => toNumber(row.netSalary)), 1);
  const maxCount = Math.max(...chartRows.map((row) => toNumber(row.payslipCount)), 1);
  const linePoints = chartRows
    .map((row, index) => {
      const x = chartRows.length === 1 ? 50 : 4 + index * (92 / (chartRows.length - 1));
      const y = 87 - (toNumber(row.payslipCount) / maxCount) * 65;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="payroll-overview-card payroll-overview-trend-card">
      <header className="payroll-overview-card__header">
        <div>
          <span>XU HƯỚNG QUỸ LƯƠNG & SỐ PHIẾU LƯƠNG</span>
          <h3>Phân tích biến động 12 kỳ gần nhất</h3>
        </div>
        <div className="payroll-overview-segmented" aria-label="Chế độ biểu đồ">
          <button type="button" className={mode === "month" ? "is-active" : ""} onClick={() => onModeChange("month")}>Theo tháng</button>
          <button type="button" className={mode === "quarter" ? "is-active" : ""} onClick={() => onModeChange("quarter")}>Theo quý</button>
        </div>
      </header>
      {chartRows.length ? (
        <div className="payroll-overview-chart">
          <div className="payroll-overview-chart__legend">
            <span><i className="is-fund" />Quỹ lương (tỷ đồng)</span>
            <span><i className="is-slip" />Số phiếu lương</span>
          </div>
          <div className="payroll-overview-chart__plot">
            <span className="payroll-overview-chart__axis is-left">Tỷ đồng</span>
            <span className="payroll-overview-chart__axis is-right">Phiếu lương</span>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={linePoints} />
              {chartRows.map((row, index) => {
                const x = chartRows.length === 1 ? 50 : 4 + index * (92 / (chartRows.length - 1));
                const y = 87 - (toNumber(row.payslipCount) / maxCount) * 65;
                return <circle key={`${row.periodCode}-${index}`} cx={x} cy={y} r="1.25" />;
              })}
            </svg>
            <div className="payroll-overview-chart__bars">
              {chartRows.map((row) => (
                <span key={row.periodCode} title={`${row.label || formatPeriod(row.periodCode)} · ${currencyFormat.format(toNumber(row.netSalary))}`}>
                  <i style={{ height: `${Math.max(3, (toNumber(row.netSalary) / maxFund) * 78)}%` }} />
                  <small>{row.label || formatPeriod(row.periodCode).slice(0, 2)}</small>
                </span>
              ))}
            </div>
          </div>
          <p>Ghi chú: Cột gạch chéo thể hiện dữ liệu kỳ chưa phát hành.</p>
        </div>
      ) : (
        <OverviewEmpty
          title="Chưa có dữ liệu xu hướng"
          description="Biểu đồ sẽ xuất hiện sau khi hệ thống ghi nhận dữ liệu kỳ lương."
        />
      )}
    </section>
  );
}

export function PayrollUnitOverview({ rows = [], onOpen }) {
  return (
    <section className="payroll-overview-card payroll-overview-units">
      <header className="payroll-overview-card__header">
        <div>
          <span>TỔNG QUAN THEO NHÀ MÁY / ĐƠN VỊ</span>
          <h3>Phạm vi vận hành kỳ lương</h3>
        </div>
      </header>
      {rows.length ? (
        <div className="payroll-overview-table-wrap">
          <table>
            <thead>
              <tr><th>Nhà máy / đơn vị</th><th>Nhân sự</th><th>Phiếu lương</th><th>Quỹ lương</th><th>Trạng thái</th><th>Vấn đề</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 6).map((unit) => (
                <tr key={unit.id} onClick={onOpen} tabIndex="0">
                  <td><Building2 /><span><strong>{unit.code}</strong><small>{unit.name}</small></span></td>
                  <td>{numberFormat.format(toNumber(unit.employeeCount))}</td>
                  <td>{numberFormat.format(toNumber(unit.payslipCount))}</td>
                  <td>{compactMoney(unit.payrollFund)}</td>
                  <td><OverviewStatus status={unit.status} /></td>
                  <td><b className={unit.issueCount ? "has-issue" : ""}>{numberFormat.format(toNumber(unit.issueCount))}</b><ArrowRight /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <OverviewEmpty
          icon={Building2}
          title="Chưa có dữ liệu theo đơn vị"
          description="Dữ liệu đơn vị sẽ được tổng hợp sau khi import phiếu lương."
        />
      )}
      <footer><button type="button" onClick={onOpen}>Xem tất cả {numberFormat.format(rows.length)} nhà máy / đơn vị <ArrowRight /></button></footer>
    </section>
  );
}

const severityIcons = {
  critical: CircleAlert,
  high: AlertTriangle,
  warning: Clock3,
  info: CircleAlert,
};

export function PayrollSignalCard({ eyebrow, title, items = [], footer, onOpen, id }) {
  return (
    <section className="payroll-overview-card payroll-overview-signals" id={id}>
      <header className="payroll-overview-card__header">
        <div><span>{eyebrow}</span><h3>{title}</h3></div>
      </header>
      {items.length ? (
        <div className="payroll-overview-signals__list">
          {items.slice(0, 5).map((item) => {
            const Icon = severityIcons[item.severity] || AlertTriangle;
            return (
              <button type="button" key={item.key} onClick={() => onOpen?.(item)}>
                <i className={`is-${item.severity || "info"}`}><Icon /></i>
                <span>{item.label}</span>
                <strong>{numberFormat.format(toNumber(item.count))}</strong>
                <ArrowRight />
              </button>
            );
          })}
        </div>
      ) : (
        <OverviewEmpty
          icon={CheckCircle2}
          title="Không có ngoại lệ"
          description="Các chỉ số trong phạm vi đang ổn định."
        />
      )}
      <footer><button type="button" onClick={() => onOpen?.()}>{footer} <ArrowRight /></button></footer>
    </section>
  );
}

const QUICK_ACTIONS = [
  { key: "create", label: "Tạo kỳ lương", icon: CalendarPlus },
  { key: "import", label: "Import dữ liệu", icon: Upload },
  { key: "compare", label: "Xem chênh lệch", icon: Landmark },
  { key: "publish", label: "Phát hành lương", icon: Send },
  { key: "adjust", label: "Điều chỉnh lương", icon: SlidersHorizontal },
  { key: "report", label: "Báo cáo tổng hợp", icon: FileChartColumn },
];

export function PayrollQuickActions({ actions = {} }) {
  return (
    <section className="payroll-overview-card payroll-overview-quick">
      <header className="payroll-overview-card__header"><div><span>ĐIỀU HÀNH</span><h3>Thao tác nhanh</h3></div></header>
      <div>
        {QUICK_ACTIONS.map(({ key, label, icon: Icon }) => (
          <button type="button" key={key} onClick={actions[key]}><Icon /><span>{label}</span></button>
        ))}
      </div>
    </section>
  );
}

export function PayrollUpcomingTimeline({ rows = [], onOpen }) {
  return (
    <section className="payroll-overview-card payroll-overview-upcoming">
      <header className="payroll-overview-card__header"><div><span>LỊCH KỲ LƯƠNG</span><h3>Mốc thời gian sắp tới</h3></div></header>
      {rows.length ? (
        <div>
          {rows.slice(0, 4).map((item, index) => (
            <article key={`${item.type}-${item.dueDate}-${index}`}>
              <i><CalendarClock /></i>
              <time>{formatDate(item.dueDate)}</time>
              <span>{item.title}</span>
            </article>
          ))}
        </div>
      ) : (
        <OverviewEmpty icon={CalendarClock} title="Chưa có mốc sắp tới" description="Lịch sẽ cập nhật theo cấu hình kỳ lương." />
      )}
      <footer><button type="button" onClick={onOpen}>Xem lịch chi tiết <ArrowRight /></button></footer>
    </section>
  );
}

const activityIcons = {
  import: Upload,
  feedback: AlertTriangle,
  adjustment: SlidersHorizontal,
  publish: Send,
};

export function PayrollRecentActivity({ rows = [], onOpen }) {
  return (
    <section className="payroll-overview-card payroll-overview-activity-v2">
      <header className="payroll-overview-card__header">
        <div><span>NHẬT KÝ VẬN HÀNH</span><h3>Hoạt động gần đây</h3></div>
        <button type="button" onClick={onOpen}>Xem tất cả hoạt động <ArrowRight /></button>
      </header>
      {rows.length ? (
        <div>
          {rows.slice(0, 4).map((item, index) => {
            const Icon = activityIcons[item.type] || History;
            return (
              <article key={`${item.type}-${item.entityId}-${item.timestamp}-${index}`}>
                <i className={`is-${item.status}`}><Icon /></i>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.unit || "Toàn hệ thống"}{item.actor ? ` · ${item.actor}` : ""}</small>
                </span>
                <time>{formatDateTime(item.timestamp)}</time>
                <OverviewStatus status={item.status} />
              </article>
            );
          })}
        </div>
      ) : (
        <OverviewEmpty icon={History} title="Chưa có hoạt động trong kỳ" description="Import, điều chỉnh và phát hành sẽ được ghi nhận tại đây." />
      )}
    </section>
  );
}

export function PayrollOverviewSummaryLine({ period, summary = {}, completion = 0 }) {
  const status = period?.status || "draft";
  return (
    <section className="payroll-overview-summary-line">
      <div>
        <span>TRẠNG THÁI KỲ LƯƠNG</span>
        <strong>Kỳ {formatPeriod(period?.code)}</strong>
        <OverviewStatus status={status} />
      </div>
      <dl>
        <div><dt>Tiến độ tổng thể</dt><dd>{completion}%</dd></div>
        <div><dt>Phiếu lương</dt><dd>{numberFormat.format(toNumber(summary.total_payslips))}</dd></div>
        <div><dt>Quỹ lương thực nhận</dt><dd>{compactMoney(summary.total_net)}</dd></div>
        <div><dt>Ngày chi trả</dt><dd>{formatDate(period?.paymentDate)}</dd></div>
      </dl>
    </section>
  );
}

export const payrollOverviewIcons = {
  users: Users,
  slips: WalletCards,
  fund: CircleDollarSign,
  pending: Clock3,
  feedback: AlertTriangle,
  released: CheckCircle2,
};
