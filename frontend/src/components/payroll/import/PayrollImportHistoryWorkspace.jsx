import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  FilterX,
  ListChecks,
  PenLine,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import {
  getPayrollImportAuditCenter,
  getPayrollImportDetail,
  getPayrollImportErrors,
  getPayrollImportPreview,
} from "../../../api/payroll/payrollImport.api";

const nf = new Intl.NumberFormat("vi-VN");
const dt = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const STATUS = {
  uploaded: { label: "Đã tiếp nhận", tone: "info", note: "Đang chờ kiểm tra" },
  validating: { label: "Đang kiểm tra", tone: "info", note: "Đang đối chiếu dữ liệu" },
  validated: { label: "Chờ xác nhận", tone: "warning", note: "Dữ liệu hợp lệ, chưa lưu" },
  failed: { label: "Có lỗi", tone: "danger", note: "Cần sửa và nhập lại" },
  committed: { label: "Đã lưu", tone: "success", note: "Đã ghi vào bảng lương" },
  cancelled: { label: "Đã hủy", tone: "muted", note: "Không sử dụng dữ liệu" },
};

const SOURCES = {
  excel: { label: "Excel", icon: FileSpreadsheet, tone: "excel" },
  html: { label: "HTML", icon: Code2, tone: "html" },
  manual: { label: "Thủ công", icon: PenLine, tone: "manual" },
};

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Không thể tải lịch sử Import";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const downloadCsv = (fileName, headers, rows) => {
  const content = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

function StatusBadge({ value }) {
  const meta = STATUS[value] || { label: value || "—", tone: "muted" };
  return <span className={`audit-status is-${meta.tone}`}><i />{meta.label}</span>;
}

function SourceBadge({ value }) {
  const meta = SOURCES[value] || SOURCES.excel;
  const Icon = meta.icon;
  return <span className={`audit-source is-${meta.tone}`}><Icon />{meta.label}</span>;
}

function Kpi({ icon: Icon, label, value, note, tone = "" }) {
  return <article className={`audit-kpi ${tone}`}><Icon /><span>{label}<strong>{nf.format(value || 0)}</strong><small>{note}</small></span></article>;
}

export default function PayrollImportHistoryWorkspace({ onGoImport }) {
  const [filters, setFilters] = useState({
    from: "", to: "", status: "", fileType: "", uploaderId: "", payrollPeriodId: "", jobCode: "", page: 1, limit: 20,
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [tab, setTab] = useState("overview");
  const [refresh, setRefresh] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      getPayrollImportAuditCenter(filters, { signal: controller.signal })
        .then((response) => { setData(response.data); setError(""); })
        .catch((requestError) => { if (!controller.signal.aborted) setError(getErrorMessage(requestError)); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, filters.jobCode ? 320 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, refresh]);

  const open = async (job) => {
    setSelected(job);
    setDrawer({ loading: true });
    setTab("overview");
    setCopied(false);
    try {
      const [detail, preview, errors] = await Promise.all([
        getPayrollImportDetail(job.id),
        getPayrollImportPreview(job.id, { page: 1, limit: 100 }),
        getPayrollImportErrors(job.id, { page: 1, limit: 100 }),
      ]);
      setDrawer({ detail: detail.data, preview: preview.data, errors: errors.data });
    } catch (requestError) {
      setDrawer({ error: getErrorMessage(requestError) });
    }
  };

  const change = (key) => (event) => setFilters((old) => ({ ...old, [key]: event.target.value, page: 1 }));
  const reset = () => setFilters({ from: "", to: "", status: "", fileType: "", uploaderId: "", payrollPeriodId: "", jobCode: "", page: 1, limit: filters.limit });
  const kpi = data?.kpis || {};
  const pagination = data?.pagination || {};
  const jobs = data?.jobs || [];
  const activeFilters = Object.entries(filters).filter(([key, value]) => !["page", "limit"].includes(key) && value).length;

  const maxDay = useMemo(() => Math.max(1, ...(data?.analytics?.days || []).map((day) => day.success + day.validated + day.failed)), [data]);
  const sourceTotal = useMemo(
    () => Math.max(1, (data?.analytics?.sources || []).reduce((total, item) => total + Number(item.count || 0), 0)),
    [data],
  );

  return <section className={`audit-center audit-center-v2 ${loading ? "is-loading" : ""}`}>
    <header className="audit-header-v2">
      <div><span>NHẬT KÝ & KIỂM TOÁN DỮ LIỆU</span><h2>Lịch sử Import</h2><p>Tìm lại nguồn nhập, người thực hiện, kết quả kiểm tra và dữ liệu đã ghi trong từng phiên.</p></div>
      <div className="audit-header-v2__actions">
        <button type="button" className="secondary-button" onClick={onGoImport}><FileSpreadsheet />Import dữ liệu mới</button>
        <button type="button" className="secondary-button" onClick={() => setRefresh((value) => value + 1)} disabled={loading}><RefreshCw className={loading ? "spin" : ""} />Làm mới</button>
      </div>
    </header>

    <section className="audit-filter-panel">
      <div className="audit-filter-panel__title"><Search /><span><strong>Tìm nhanh phiên nhập</strong><small>Lọc đồng thời danh sách, KPI và phân tích</small></span>{activeFilters > 0 && <b>{activeFilters} bộ lọc</b>}</div>
      <div className="audit-filters-v2">
        <label className="audit-search-v2"><span>Mã job hoặc tên nguồn</span><div><Search /><input value={filters.jobCode} onChange={change("jobCode")} placeholder="IMP-000036, tên file..." /></div></label>
        <label><span>Kỳ lương</span><select value={filters.payrollPeriodId} onChange={change("payrollPeriodId")}><option value="">Tất cả kỳ</option>{(data?.filters?.periods || []).map((period) => <option key={period.id} value={period.id}>{period.code}</option>)}</select></label>
        <label><span>Nguồn nhập</span><select value={filters.fileType} onChange={change("fileType")}><option value="">Tất cả nguồn</option>{Object.entries(SOURCES).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>
        <label><span>Trạng thái</span><select value={filters.status} onChange={change("status")}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>
        <label><span>Người thực hiện</span><select value={filters.uploaderId} onChange={change("uploaderId")}><option value="">Tất cả người nhập</option>{(data?.filters?.uploaders || []).map((person) => <option key={person.id} value={person.id}>{person.name || person.id}</option>)}</select></label>
        <label><span>Từ ngày</span><input type="date" value={filters.from} onChange={change("from")} /></label>
        <label><span>Đến ngày</span><input type="date" value={filters.to} onChange={change("to")} /></label>
        <button type="button" className="audit-reset" onClick={reset} disabled={!activeFilters}><FilterX />Xóa lọc</button>
      </div>
    </section>

    {error && <div className="enterprise-error"><AlertTriangle />{error}<button onClick={() => setRefresh((value) => value + 1)}>Thử lại</button></div>}

    <div className="audit-kpis audit-kpis-v2">
      <Kpi icon={Database} label="Tổng phiên nhập" value={kpi.total} note="Theo phạm vi đang lọc" />
      <Kpi icon={CheckCircle2} label="Đã lưu chính thức" value={kpi.committed} note={`${kpi.total ? Math.round((kpi.committed / kpi.total) * 100) : 0}% tổng phiên`} tone="green" />
      <Kpi icon={Clock3} label="Chờ xác nhận" value={kpi.validated} note="Dữ liệu đã hợp lệ" tone="amber" />
      <Kpi icon={XCircle} label="Phiên có lỗi" value={kpi.failed} note={`${nf.format(kpi.invalid_rows || 0)} dòng cần xử lý`} tone="red" />
      <Kpi icon={ListChecks} label="Bản ghi hợp lệ" value={kpi.valid_rows} note="Qua kiểm tra dữ liệu" tone="blue" />
    </div>

    <section className="audit-history-card">
      <header><div><span>DANH SÁCH PHIÊN NHẬP</span><h3>{nf.format(pagination.total || 0)} kết quả</h3></div><small>Cập nhật {dt(data?.refreshedAt)}</small></header>
      <div className="audit-history-table-wrap">
        <table className="audit-history-table">
          <thead><tr><th>Phiên nhập</th><th>Kỳ lương</th><th>Kết quả dữ liệu</th><th>Người thực hiện</th><th>Thời điểm</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {jobs.map((job) => {
              const source = SOURCES[job.fileType] || SOURCES.excel;
              const SourceIcon = source.icon;
              const successRate = job.totalRows ? Math.round((job.successRows / job.totalRows) * 100) : 0;
              return <tr key={job.id} className={selected?.id === job.id ? "is-selected" : ""} onDoubleClick={() => open(job)}>
                <td><div className={`audit-job-icon is-${source.tone}`}><SourceIcon /></div><span><button type="button" onClick={() => open(job)}>{job.jobCode}</button><small title={job.fileName}>{job.fileName}</small></span></td>
                <td><strong>{job.periodCode}</strong><SourceBadge value={job.fileType} /></td>
                <td><div className="audit-result-line"><span><b>{nf.format(job.successRows)}</b> / {nf.format(job.totalRows)} hợp lệ</span><strong>{successRate}%</strong></div><i className="audit-result-meter"><b style={{ width: `${successRate}%` }} /></i>{job.errorRows > 0 && <small className="audit-result-error">{nf.format(job.errorRows)} lỗi</small>}</td>
                <td><strong>{job.uploader || "—"}</strong><small>{job.uploaderId || "—"}</small></td>
                <td><strong>{dt(job.startedAt)}</strong><small>{job.durationSeconds}s xử lý</small></td>
                <td><StatusBadge value={job.status} /><small>{STATUS[job.status]?.note}</small></td>
                <td><button type="button" className="audit-view-button" onClick={() => open(job)} aria-label={`Xem ${job.jobCode}`}><Eye /><span>Xem</span></button></td>
              </tr>;
            })}
          </tbody>
        </table>
        {!loading && !jobs.length && <div className="audit-empty"><Database /><strong>Không tìm thấy phiên nhập</strong><span>Thử xóa bớt bộ lọc hoặc bắt đầu một lần Import mới.</span><button type="button" onClick={reset}>Xóa bộ lọc</button></div>}
        {loading && !jobs.length && <div className="audit-empty"><RefreshCw className="spin" /><strong>Đang tải lịch sử...</strong></div>}
      </div>
      <footer><div><select value={filters.limit} onChange={change("limit")}><option value="20">20 / trang</option><option value="50">50 / trang</option><option value="100">100 / trang</option></select><span>Hiển thị {jobs.length} / {nf.format(pagination.total || 0)} phiên</span></div><div><button disabled={pagination.page <= 1 || loading} onClick={() => setFilters((old) => ({ ...old, page: pagination.page - 1 }))}><ChevronLeft /></button><b>Trang {pagination.page || 1} / {Math.max(pagination.totalPages || 1, 1)}</b><button disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setFilters((old) => ({ ...old, page: pagination.page + 1 }))}><ChevronRight /></button></div></footer>
    </section>

    <div className="audit-insights">
      <section className="audit-insight-card audit-volume-card"><header><div><span>14 NGÀY GẦN NHẤT</span><h3>Khối lượng Import</h3></div><BarChart3 /></header><div className="audit-chart-legend"><span><i className="success" />Đã lưu</span><span><i className="validated" />Chờ xác nhận</span><span><i className="failed" />Có lỗi</span></div><div className="audit-bars-v2">{(data?.analytics?.days || []).map((day) => <div key={day.day} title={`${new Date(day.day).toLocaleDateString("vi-VN")}: ${day.success} đã lưu, ${day.validated} chờ xác nhận, ${day.failed} lỗi`}><div><i className="success" style={{ height: `${Math.max(day.success ? 5 : 0, (day.success / maxDay) * 105)}px` }} /><i className="validated" style={{ height: `${Math.max(day.validated ? 5 : 0, (day.validated / maxDay) * 105)}px` }} /><i className="failed" style={{ height: `${Math.max(day.failed ? 5 : 0, (day.failed / maxDay) * 105)}px` }} /></div><small>{new Date(day.day).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</small></div>)}</div>{!data?.analytics?.days?.length && <p className="audit-insight-empty">Chưa có hoạt động trong phạm vi đang lọc.</p>}</section>
      <section className="audit-insight-card"><header><div><span>NGUỒN DỮ LIỆU</span><h3>Cơ cấu phương thức nhập</h3></div><Database /></header><div className="audit-source-stats">{(data?.analytics?.sources || []).map((item) => <div key={item.type}><SourceBadge value={item.type} /><i><b style={{ width: `${(item.count / sourceTotal) * 100}%` }} /></i><strong>{nf.format(item.count)}</strong></div>)}</div>{!data?.analytics?.sources?.length && <p className="audit-insight-empty">Chưa có dữ liệu nguồn nhập.</p>}</section>
      <section className="audit-insight-card"><header><div><span>CHẤT LƯỢNG DỮ LIỆU</span><h3>Lỗi thường gặp</h3></div><ShieldCheck /></header><div className="audit-common-errors">{(data?.analytics?.errors || []).map((item) => <div key={item.code}><span><strong>{item.code}</strong><small>{item.message || "Lỗi kiểm tra dữ liệu"}</small></span><b>{nf.format(item.count)}</b></div>)}</div>{!data?.analytics?.errors?.length && <p className="audit-insight-empty">Không có lỗi trong phạm vi đang lọc.</p>}</section>
    </div>

    {drawer && selected && <div className="audit-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawer(null); }}>
      <aside className="audit-drawer audit-drawer-v2" aria-label={`Chi tiết ${selected.jobCode}`}>
        <header><div><span>CHI TIẾT PHIÊN NHẬP</span><h2>{selected.jobCode}</h2><p><SourceBadge value={selected.fileType} /><StatusBadge value={selected.status} /></p></div><button onClick={() => setDrawer(null)} aria-label="Đóng chi tiết"><X /></button></header>
        <nav>{[["overview", "Tổng quan"], ["data", `Dữ liệu (${selected.successRows})`], ["errors", `Lỗi (${selected.errorRows})`], ["history", "Dấu vết"], ["compare", "So sánh"]].map(([value, label]) => <button className={tab === value ? "active" : ""} onClick={() => setTab(value)} key={value}>{label}</button>)}</nav>
        {drawer.loading ? <div className="audit-drawer-loading"><RefreshCw className="spin" />Đang tải chi tiết...</div> : drawer.error ? <div className="enterprise-error">{drawer.error}</div> : <div className="audit-drawer-body">
          {tab === "overview" && <AuditOverview selected={selected} copied={copied} onCopy={async () => { await navigator.clipboard.writeText(selected.checksum || ""); setCopied(true); }} />}
          {tab === "data" && <AuditRows data={drawer.preview} job={selected} />}
          {tab === "errors" && <AuditErrors data={drawer.errors} job={selected} />}
          {tab === "history" && <AuditTimeline selected={selected} />}
          {tab === "compare" && <AuditCompare current={selected} candidates={jobs.filter((job) => job.id !== selected.id && (job.fileName === selected.fileName || job.periodCode === selected.periodCode)).slice(0, 8)} />}
        </div>}
      </aside>
    </div>}
  </section>;
}

function AuditOverview({ selected, copied, onCopy }) {
  return <><section className="audit-drawer-hero"><div><span>Tỷ lệ hợp lệ</span><strong>{selected.totalRows ? `${Math.round((selected.successRows / selected.totalRows) * 100)}%` : "0%"}</strong></div><dl><div><dt>Tổng dòng</dt><dd>{nf.format(selected.totalRows)}</dd></div><div><dt>Hợp lệ</dt><dd className="good">{nf.format(selected.successRows)}</dd></div><div><dt>Có lỗi</dt><dd className={selected.errorRows ? "bad" : "good"}>{nf.format(selected.errorRows)}</dd></div></dl></section><h3>Thông tin vận hành</h3><dl className="audit-detail-list"><dt>Kỳ lương</dt><dd>{selected.periodCode}</dd><dt>Nguồn nhập</dt><dd><SourceBadge value={selected.fileType} /></dd><dt>Người thực hiện</dt><dd>{selected.uploader || "—"} · {selected.uploaderId || "—"}</dd><dt>Bắt đầu</dt><dd>{dt(selected.startedAt)}</dd><dt>Hoàn tất</dt><dd>{dt(selected.finishedAt)}</dd><dt>Thời gian xử lý</dt><dd>{selected.durationSeconds} giây</dd>{selected.committer && <><dt>Người xác nhận lưu</dt><dd>{selected.committer}</dd></>}</dl><h3>Nguồn và tính toàn vẹn</h3><dl className="audit-detail-list"><dt>Tên nguồn</dt><dd>{selected.fileName}</dd><dt>MIME</dt><dd>{selected.mimeType || "Không áp dụng"}</dd><dt>Chế độ ghi</dt><dd>STRICT_TRANSACTION</dd><dt>SHA-256</dt><dd className="audit-hash"><span>{selected.checksum || "—"}</span>{selected.checksum && <button type="button" onClick={onCopy}><Copy />{copied ? "Đã sao chép" : "Sao chép"}</button>}</dd></dl></>;
}

function AuditRows({ data, job }) {
  const rows = data?.rows || data?.items || [];
  const normalized = rows.map((row, index) => {
    const value = row.normalizedData || row.normalized_data || row.rowData || row.data || row;
    const summary = value.summary || {};
    return { number: row.rowNumber || row.row_number || index + 1, staffId: value.staffId || value.staff_id || row.staffId || "—", gross: summary.grossIncome ?? value.grossIncome ?? 0, deductions: summary.totalDeductions ?? value.totalDeductions ?? 0, net: summary.netSalary ?? value.netSalary ?? 0, valid: row.isValid ?? row.is_valid ?? true };
  });
  return <><div className="audit-tab-heading"><div><h3>Dữ liệu staging</h3><p>Bản xem trước sau khi chuẩn hóa, chưa phải dữ liệu nguồn gốc.</p></div>{normalized.length > 0 && <button onClick={() => downloadCsv(`${job.jobCode}-du-lieu.csv`, ["Dòng", "Mã nhân viên", "Tổng thu nhập", "Khấu trừ", "Thực lĩnh", "Hợp lệ"], normalized.map((row) => [row.number, row.staffId, row.gross, row.deductions, row.net, row.valid ? "Có" : "Không"]))}><Download />Tải CSV</button>}</div><div className="drawer-table"><table><thead><tr><th>Dòng</th><th>Mã nhân viên</th><th>Tổng thu nhập</th><th>Khấu trừ</th><th>Thực lĩnh</th><th>Kết quả</th></tr></thead><tbody>{normalized.map((row) => <tr key={`${row.number}-${row.staffId}`}><td>{row.number}</td><td><strong>{row.staffId}</strong></td><td>{nf.format(row.gross)} ₫</td><td>{nf.format(row.deductions)} ₫</td><td><strong>{nf.format(row.net)} ₫</strong></td><td>{row.valid ? <span className="audit-row-valid"><CheckCircle2 />Hợp lệ</span> : <span className="audit-row-invalid"><XCircle />Có lỗi</span>}</td></tr>)}</tbody></table>{!normalized.length && <p>Không có dữ liệu xem trước.</p>}</div></>;
}

function AuditErrors({ data, job }) {
  const errors = data?.errors || data?.items || [];
  return <><div className="audit-tab-heading"><div><h3>Lỗi theo dòng</h3><p>Thông tin dùng để sửa nguồn dữ liệu trước khi nhập lại.</p></div>{errors.length > 0 && <button onClick={() => downloadCsv(`${job.jobCode}-loi.csv`, ["Dòng", "Mã nhân viên", "Cột", "Mã lỗi", "Diễn giải"], errors.map((item) => [item.rowNumber || item.row_number, item.staffId || item.staff_id, item.columnName || item.column_name, item.errorCode || item.error_code, item.errorMessage || item.error_message]))}><Download />Tải danh sách lỗi</button>}</div><div className="drawer-table"><table><thead><tr><th>Dòng</th><th>Mã NV</th><th>Cột</th><th>Mã lỗi</th><th>Diễn giải</th></tr></thead><tbody>{errors.map((item, index) => <tr key={item.id || index}><td>{item.rowNumber || item.row_number}</td><td>{item.staffId || item.staff_id || "—"}</td><td>{item.columnName || item.column_name || "—"}</td><td><strong className="bad">{item.errorCode || item.error_code}</strong></td><td>{item.errorMessage || item.error_message}</td></tr>)}</tbody></table>{!errors.length && <div className="audit-no-error"><CheckCircle2 /><strong>Không có lỗi dữ liệu</strong><span>Toàn bộ dòng đã vượt qua kiểm tra.</span></div>}</div></>;
}

function AuditTimeline({ selected }) {
  const items = [
    { title: "Tiếp nhận nguồn dữ liệu", time: selected.startedAt, note: `${SOURCES[selected.fileType]?.label || selected.fileType} · ${selected.uploader || "—"}`, done: true },
    { title: "Kiểm tra cấu trúc & đối chiếu", time: selected.finishedAt, note: `${nf.format(selected.successRows)} hợp lệ · ${nf.format(selected.errorRows)} lỗi`, done: !["uploaded", "validating"].includes(selected.status) },
    { title: "Xác nhận lưu bảng lương", time: selected.committedAt, note: selected.committer || STATUS[selected.status]?.note, done: selected.status === "committed" },
  ];
  return <><h3>Dấu vết xử lý</h3><div className="audit-timeline-v2">{items.map((item, index) => <div key={item.title} className={item.done ? "is-done" : ""}><i>{item.done ? <CheckCircle2 /> : <CircleDot />}</i><span><strong>{item.title}</strong><small>{item.note}</small></span><time>{dt(item.time)}</time>{index < items.length - 1 && <b />}</div>)}</div></>;
}

function AuditCompare({ current, candidates }) {
  return <><h3>So sánh cùng kỳ hoặc cùng nguồn</h3><div className="drawer-table"><table><thead><tr><th>Phiên</th><th>Thời điểm</th><th>Hợp lệ</th><th>Lỗi</th><th>Chênh lệch</th></tr></thead><tbody>{candidates.map((item) => <tr key={item.id}><td><strong>{item.jobCode}</strong><small>{item.fileName}</small></td><td>{dt(item.startedAt)}</td><td>{nf.format(item.successRows)}</td><td>{nf.format(item.errorRows)}</td><td>{item.totalRows - current.totalRows >= 0 ? "+" : ""}{nf.format(item.totalRows - current.totalRows)} dòng</td></tr>)}</tbody></table>{!candidates.length && <p>Chưa có phiên phù hợp để so sánh.</p>}</div></>;
}
