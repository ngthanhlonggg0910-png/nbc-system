import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bell, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download,
  Eye, FileCheck2, FileSpreadsheet, LockKeyhole, RefreshCw, Search, Send,
  ShieldCheck, WalletCards, X, XCircle,
} from "lucide-react";
import {
  downloadPayrollReleaseReconciliation,
  getPayrollReleaseControlCenter,
} from "@/api/payroll/payrollPeriod.api";

const toNumber = (value) => Number(value) || 0;
const number = new Intl.NumberFormat("vi-VN");
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const displayNumber = (value) => number.format(toNumber(value));
const displayMoney = (value) => currency.format(toNumber(value));
const displayDate = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value)) : "—";
const displayDateTime = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
const percentage = (value, total) => total ? Math.round(toNumber(value) / toNumber(total) * 10000) / 100 : 0;
const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

const GATE = {
  READY: { label: "Sẵn sàng phát hành", tone: "success", note: "Tất cả điều kiện bắt buộc đã đạt" },
  READY_WITH_WARNINGS: { label: "Sẵn sàng, có cảnh báo", tone: "warning", note: "Có thể phát hành sau khi rà soát cảnh báo" },
  BLOCKED: { label: "Chưa đủ điều kiện", tone: "danger", note: "Cần xử lý điều kiện chặn trước khi phát hành" },
  RELEASED: { label: "Đã phát hành", tone: "success", note: "Phiếu lương đã được gửi đến nhân viên" },
  LOCKED: { label: "Đã khóa kỳ", tone: "locked", note: "Dữ liệu đã được đóng và bảo toàn" },
};

const PERIOD_STATUS = {
  draft: "Bản nháp", published: "Đã phát hành", locked: "Đã khóa", cancelled: "Đã hủy",
};

const RESULT_STATUS = {
  draft: "Bản nháp", waiting_confirmation: "Chờ xác nhận", adjusted: "Đã điều chỉnh",
  published: "Đã phát hành", confirmed: "Nhân viên đã xác nhận", paid: "Đã thanh toán",
  employee_feedback: "Có phản hồi",
};

function saveResponse(response, fallback) {
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  link.href = url;
  link.download = match?.[1] ? decodeURIComponent(match[1]) : fallback;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function GateBadge({ status }) {
  const meta = GATE[status] || { label: status || "Đang tải", tone: "info" };
  return <span className={`release-gate-badge ${meta.tone}`}><i />{meta.label}</span>;
}

function ReleaseModal({ type, data, onClose, onConfirm, busy }) {
  const [checked, setChecked] = useState(false);
  const [step, setStep] = useState(1);
  const isLock = type === "lock";
  const gate = data?.gate || {};
  const summary = data?.summary || {};
  const steps = ["Phạm vi", "Kiểm tra", "Đối soát", "Xác nhận"];
  return <div className="release-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="release-modal release-modal-v2" role="dialog" aria-modal="true" aria-label={isLock ? "Xác nhận khóa kỳ" : "Xác nhận phát hành lương"}>
      <header>
        <div><span>{isLock ? "KIỂM SOÁT KỲ LƯƠNG" : `BƯỚC ${step} / ${steps.length}`}</span><h3>{isLock ? `Khóa kỳ ${data?.period?.code}` : "Phát hành lương toàn kỳ"}</h3></div>
        <button type="button" onClick={onClose} aria-label="Đóng"><X /></button>
      </header>
      {!isLock && <nav className="release-steps">{steps.map((label, index) => <span className={step >= index + 1 ? "active" : ""} key={label}><b>{index + 1}</b>{label}</span>)}</nav>}
      <div className="release-modal-body">
        {isLock ? <>
          <div className="release-callout warning"><LockKeyhole /><div><strong>Đây là thao tác đóng kỳ chính thức</strong><p>Sau khi khóa, dữ liệu không thể import hoặc điều chỉnh theo luồng thông thường.</p></div></div>
          <div className="release-review-grid"><span>Kỳ lương<strong>{data?.period?.code}</strong></span><span>Phiếu đã phát hành<strong>{displayNumber(summary.releasedSlips)}</strong></span><span>Thực lĩnh<strong>{displayMoney(summary.net)}</strong></span></div>
          <label className="release-confirm-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> Tôi đã đối soát và xác nhận khóa kỳ lương này.</label>
        </> : <>
          {step === 1 && <div className="release-modal-section"><h4>Phạm vi phát hành</h4><div className="release-scope-card"><ShieldCheck /><div><strong>Toàn bộ kỳ {data?.period?.code}</strong><p>{displayNumber(summary.readySlips)} phiếu sẵn sàng · {displayNumber(summary.totalSlips)} phiếu trong kỳ</p></div><em>Transaction toàn kỳ</em></div><p className="release-note">Bộ lọc đơn vị trên màn hình chỉ dùng để đối soát. Lệnh phát hành luôn áp dụng cho toàn bộ kỳ nhằm bảo đảm tính nhất quán.</p></div>}
          {step === 2 && <div className="release-modal-section"><div className={`release-callout ${gate.canRelease ? "success" : "danger"}`}>{gate.canRelease ? <ShieldCheck /> : <XCircle />}<div><strong>{GATE[gate.status]?.label || gate.status}</strong><p>{GATE[gate.status]?.note}</p></div></div>{[...(gate.blockers || []), ...(gate.warnings || [])].map((item) => <div className="release-issue-line" key={item.code}><AlertTriangle /><span>{item.label}<small>{item.code}</small></span><strong>{displayNumber(item.count)}</strong></div>)}</div>}
          {step === 3 && <div className="release-modal-section"><h4>Giá trị sắp công bố</h4><div className="release-review-grid"><span>Tổng thu nhập<strong>{displayMoney(summary.gross)}</strong></span><span>Tổng khấu trừ<strong>{displayMoney(summary.deductions)}</strong></span><span>Thực lĩnh<strong>{displayMoney(summary.net)}</strong></span></div><p className="release-note">Sau khi phát hành, nhân viên có thể xem phiếu lương và nhận thông báo trực tiếp trong NBC Portal.</p></div>}
          {step === 4 && <div className="release-modal-section"><div className="release-callout warning"><Send /><div><strong>Xác nhận lệnh phát hành</strong><p>Hệ thống khóa bản ghi trong transaction để chống phát hành trùng và tạo thông báo cho từng nhân viên.</p></div></div><label className="release-confirm-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> Tôi đã kiểm tra số liệu và đồng ý phát hành toàn bộ kỳ lương.</label></div>}
        </>}
      </div>
      <footer>
        <button type="button" className="secondary-button" onClick={step > 1 && !isLock ? () => setStep(step - 1) : onClose}>{step > 1 && !isLock ? "Quay lại" : "Hủy"}</button>
        {!isLock && step < 4
          ? <button type="button" className="primary-button" disabled={step === 2 && !gate.canRelease} onClick={() => setStep(step + 1)}>Tiếp tục</button>
          : <button type="button" className="primary-button" disabled={!checked || busy || (!isLock && !gate.canRelease)} onClick={onConfirm}>{busy ? "Đang xử lý…" : isLock ? "Khóa kỳ lương" : "Phát hành ngay"}</button>}
      </footer>
    </section>
  </div>;
}

export default function PayrollPublishWorkspace({ selectedPeriod, actionLoading = false, onSelectPeriod, onPublish, onLock }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ periodId: selectedPeriod?.id || "", unitId: "", status: "", search: "", page: 1, limit: 20 });
  const [searchDraft, setSearchDraft] = useState("");
  const [modal, setModal] = useState(null);
  const [preview, setPreview] = useState(false);
  const [exporting, setExporting] = useState("");

  const load = useCallback(async (signal) => {
    setLoading(true); setError("");
    try { setData(unwrap(await getPayrollReleaseControlCenter(filters, { signal }))); }
    catch (requestError) {
      if (requestError?.name !== "CanceledError" && requestError?.name !== "AbortError") setError(requestError?.response?.data?.message || requestError.message || "Không thể tải trung tâm phát hành lương.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [filters]);

  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => load(controller.signal), 160); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  useEffect(() => { if (selectedPeriod?.id) setFilters((current) => ({ ...current, periodId: selectedPeriod.id, page: 1 })); }, [selectedPeriod?.id]);

  const period = data?.period;
  const summary = data?.summary || {};
  const gate = data?.gate || {};
  const notifications = data?.notifications || {};
  const releaseProgress = percentage(summary.releasedSlips, summary.totalSlips);
  const readyProgress = percentage(summary.readySlips + summary.releasedSlips, summary.totalSlips);
  const gateMeta = GATE[gate.status] || {};
  const riskTotal = useMemo(() => (data?.risks || []).reduce((total, item) => total + toNumber(item.count), 0), [data?.risks]);
  const change = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const resetFilters = () => { setSearchDraft(""); setFilters((current) => ({ ...current, unitId: "", status: "", search: "", page: 1 })); };
  const hasActiveFilters = Boolean(filters.unitId || filters.status || filters.search);

  const confirmAction = async () => {
    try { if (modal === "lock") await onLock?.(); else await onPublish?.(); setModal(null); await load(); }
    catch (requestError) { setError(requestError?.response?.data?.message || requestError?.message || "Không thể hoàn tất thao tác."); }
  };

  const exportReport = async (format) => {
    setExporting(format); setError("");
    try {
      const response = await downloadPayrollReleaseReconciliation({ ...filters, format });
      saveResponse(response, `doi-soat-phat-hanh-${period?.code || "ky-luong"}.${format}`);
    } catch (requestError) { setError(requestError?.response?.data?.message || requestError?.message || "Không thể xuất báo cáo đối soát."); }
    finally { setExporting(""); }
  };

  return <div className="release-center release-center-v2">
    <section className="release-command">
      <div className="release-command-copy"><span>TRUNG TÂM PHÁT HÀNH</span><h2>Kiểm soát trước khi công bố lương</h2><p>Đối soát điều kiện, quỹ lương, phạm vi nhận và dấu vết phát hành trên một màn hình.</p></div>
      <div className="release-command-actions">
        <button type="button" onClick={() => setPreview(true)} disabled={!period}><Eye /> Xem kiểm tra</button>
        <button type="button" onClick={() => exportReport("xlsx")} disabled={!period || Boolean(exporting)}><FileSpreadsheet /> {exporting === "xlsx" ? "Đang xuất…" : "Excel"}</button>
        <button type="button" onClick={() => exportReport("pdf")} disabled={!period || Boolean(exporting)}><Download /> {exporting === "pdf" ? "Đang xuất…" : "PDF"}</button>
        {period?.status === "published"
          ? <button type="button" className="release-lock-action" onClick={() => setModal("lock")}><LockKeyhole /> Khóa kỳ</button>
          : <button type="button" className="release-primary-action" disabled={!gate.canRelease} title={!gate.canRelease ? gateMeta.note : ""} onClick={() => setModal("release")}><Send /> Phát hành lương</button>}
      </div>
    </section>

    <section className="release-filter-panel">
      <div><strong>Phạm vi đối soát</strong><span>KPI chính luôn phản ánh toàn kỳ; bộ lọc áp dụng cho danh sách đơn vị và file xuất.</span></div>
      <label><span>Kỳ lương</span><select value={filters.periodId} onChange={(event) => { change("periodId", event.target.value); onSelectPeriod?.(Number(event.target.value)); }}>{data?.periods?.map((item) => <option key={item.id} value={item.id}>{item.code} · {PERIOD_STATUS[item.status] || item.status}</option>)}</select></label>
      <label><span>Đơn vị</span><select value={filters.unitId} onChange={(event) => change("unitId", event.target.value)}><option value="">Tất cả đơn vị</option>{data?.units?.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} · {unit.name}</option>)}</select></label>
      <label><span>Tình trạng đơn vị</span><select value={filters.status} onChange={(event) => change("status", event.target.value)}><option value="">Tất cả</option><option value="ready">Có phiếu sẵn sàng</option><option value="released">Đã phát hành đủ</option><option value="warning">Có ngoại lệ</option></select></label>
      <label className="release-search"><span>Tìm kiếm</span><div><Search /><input value={searchDraft} placeholder="Mã đơn vị, tên, mã nhân viên…" onChange={(event) => setSearchDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && change("search", searchDraft.trim())} /></div></label>
      <button type="button" className="secondary-button" disabled={loading} onClick={() => load()}><RefreshCw className={loading ? "spin" : ""} /> Làm mới</button>
      <button type="button" className="release-clear-filter" disabled={!hasActiveFilters} onClick={resetFilters}><X /> Xóa lọc</button>
    </section>

    {error && <div className="release-error"><AlertTriangle /> <span>{error}</span><button type="button" onClick={() => load()}>Thử lại</button></div>}

    <section className={`release-period-hero ${gateMeta.tone || "info"}`}>
      <div className="release-hero-status"><span>TÌNH TRẠNG KỲ LƯƠNG</span><h2>{period?.name || "Chưa chọn kỳ lương"}</h2><div><GateBadge status={gate.status} /><small>{gateMeta.note}</small></div></div>
      <div className="release-hero-progress"><div><span>Tiến độ phát hành</span><strong>{releaseProgress}%</strong></div><div className="release-progress-track"><i style={{ width: `${releaseProgress}%` }} /></div><small>{displayNumber(summary.releasedSlips)} / {displayNumber(summary.totalSlips)} phiếu đã công bố</small></div>
      <div className="release-hero-facts"><span><Clock3 />Ngày chi trả<strong>{displayDate(period?.paymentDate)}</strong></span><span><Bell />Thông báo<strong>{displayNumber(notifications.delivered)} / {displayNumber(notifications.total)}</strong></span></div>
    </section>

    <section className="release-kpis release-kpis-v2">
      <article className="blue"><FileCheck2 /><div><span>Tổng phiếu lương</span><strong>{loading ? "…" : displayNumber(summary.totalSlips)}</strong><small>Toàn bộ nhân sự trong kỳ</small></div></article>
      <article className="green"><ShieldCheck /><div><span>Sẵn sàng hoặc đã công bố</span><strong>{loading ? "…" : displayNumber(toNumber(summary.readySlips) + toNumber(summary.releasedSlips))}</strong><small>{readyProgress}% phạm vi đã hoàn tất kiểm soát</small></div></article>
      <article className="teal"><WalletCards /><div><span>Tổng thực lĩnh</span><strong>{loading ? "…" : displayMoney(summary.net)}</strong><small>Gross {displayMoney(summary.gross)}</small></div></article>
      <article className={riskTotal ? "red" : "green"}>{riskTotal ? <AlertTriangle /> : <CheckCircle2 />}<div><span>Điểm cần xử lý</span><strong>{loading ? "…" : displayNumber(riskTotal)}</strong><small>{riskTotal ? "Điều kiện chặn và cảnh báo" : "Không phát hiện ngoại lệ"}</small></div></article>
    </section>

    <div className="release-main-grid release-main-grid-v2">
      <main>
        <section className="release-card release-readiness-card">
          <header><div><span>RELEASE GATE</span><h3>Kiểm tra sẵn sàng phát hành</h3><p>Năm lớp kiểm soát từ dữ liệu nguồn đến trạng thái phiếu.</p></div><button type="button" className="link-button" onClick={() => setPreview(true)}>Xem toàn bộ</button></header>
          <div className="release-readiness release-readiness-v2">{data?.readiness?.map((item) => <article key={item.code} className={item.status}>
            <div className={`release-ready-icon ${item.status}`}>{item.status === "complete" ? <CheckCircle2 /> : <AlertTriangle />}</div>
            <div><strong>{item.label}</strong><span>{displayNumber(item.completed)} / {displayNumber(item.total)} đạt</span><div className="release-meter"><i style={{ width: `${item.percentage}%` }} /></div></div><b>{item.percentage}%</b>
          </article>)}</div>
        </section>

        <section className="release-card release-queue-card">
          <header><div><span>PHẠM VI PHÁT HÀNH</span><h3>Đối soát theo đơn vị</h3><p>Quan sát quy mô, số tiền và ngoại lệ trước khi tạo lệnh.</p></div><small>Cập nhật {displayDateTime(data?.updatedAt)}</small></header>
          <div className="release-table-wrap"><table className="release-table release-table-v2"><thead><tr><th>Đơn vị</th><th>Nhân sự / phiếu</th><th>Quỹ lương</th><th>Sẵn sàng</th><th>Kết quả</th><th>Ngoại lệ</th><th>Cập nhật</th></tr></thead><tbody>
            {loading ? [1, 2, 3].map((item) => <tr key={item}><td colSpan="7"><div className="release-skeleton" /></td></tr>) : data?.queue?.length ? data.queue.map((unit) => <tr key={`${unit.id}-${unit.code}`}>
              <td><strong>{unit.code}</strong><small>{unit.name}</small></td>
              <td><strong>{displayNumber(unit.employees)} nhân sự</strong><small>{displayNumber(unit.slips)} phiếu lương</small></td>
              <td><strong>{displayMoney(unit.net)}</strong><small>Gross {displayMoney(unit.gross)}</small></td>
              <td><div className="release-cell-progress"><span><b className={unit.readiness >= 95 ? "good" : unit.readiness >= 80 ? "warn" : "bad"}>{unit.readiness}%</b><small>{displayNumber(unit.ready + unit.released)} / {displayNumber(unit.slips)}</small></span><i><b style={{ width: `${unit.readiness}%` }} /></i></div></td>
              <td><span className={`release-unit-result ${unit.issues ? "warning" : unit.released === unit.slips ? "success" : "info"}`}>{unit.issues ? "Cần rà soát" : unit.released === unit.slips ? "Đã hoàn tất" : "Sẵn sàng"}</span></td>
              <td><strong className={unit.issues ? "bad" : "good"}>{displayNumber(unit.issues)}</strong></td>
              <td>{displayDateTime(unit.updatedAt)}</td>
            </tr>) : <tr><td colSpan="7" className="release-empty">Không có đơn vị trong phạm vi đang lọc.</td></tr>}
          </tbody></table></div>
          <footer className="release-pagination"><span>Hiển thị {data?.queue?.length || 0} / {displayNumber(data?.pagination?.total)} đơn vị</span><div><button type="button" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}><ChevronLeft /></button><b>{filters.page} / {Math.max(1, toNumber(data?.pagination?.totalPages))}</b><button type="button" disabled={filters.page >= toNumber(data?.pagination?.totalPages)} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}><ChevronRight /></button></div></footer>
        </section>

        <div className="release-bottom-grid release-bottom-grid-v2">
          <section className="release-card release-sample"><header><div><span>PHIẾU ĐẠI DIỆN</span><h3>Kiểm tra nhanh số liệu</h3></div></header>{data?.samplePayslip ? <div className="release-payslip release-payslip-v2"><div className="release-avatar">{data.samplePayslip.employee_name?.split(" ").slice(-2).map((part) => part[0]).join("")}</div><div className="release-sample-person"><strong>{data.samplePayslip.employee_name}</strong><small>{data.samplePayslip.staff_id} · {data.samplePayslip.unit_name}</small><em>{RESULT_STATUS[data.samplePayslip.status] || data.samplePayslip.status}</em></div><div className="release-sample-metrics"><span>Thu nhập<strong>{displayMoney(data.samplePayslip.gross_income)}</strong></span><span>Khấu trừ<strong>{displayMoney(data.samplePayslip.total_deductions)}</strong></span><span>Thực lĩnh<strong>{displayMoney(data.samplePayslip.net_salary)}</strong></span></div></div> : <p className="release-empty">Kỳ này chưa có phiếu lương để xem trước.</p>}</section>
          <section className="release-card release-audit-card"><header><div><span>DẤU VẾT PHÁT HÀNH</span><h3>Hoạt động gần nhất</h3></div></header><div className="release-activities release-activities-v2">{data?.activities?.length ? data.activities.map((activity, index) => <div key={`${activity.staff_id}-${index}`}><i /><time>{displayDateTime(activity.event_at)}</time><span>{activity.event}<small>{activity.staff_id}</small></span><strong>{activity.actor_name || activity.actor || "Hệ thống"}</strong></div>) : <p className="release-empty">Chưa có hoạt động trong kỳ.</p>}</div></section>
        </div>
      </main>

      <aside>
        <section className="release-card release-notification-card"><header><div><span>TRUYỀN THÔNG</span><h3>Thông báo nhân viên</h3></div><Bell /></header><div className="release-notification"><div className="release-donut" style={{ "--sent": `${percentage(notifications.delivered, notifications.total) * 3.6}deg` }}><strong>{displayNumber(notifications.total)}<small>Người nhận</small></strong></div><ul><li><i className="green" />Đã gửi <b>{displayNumber(notifications.delivered)}</b></li><li><i className="orange" />Chờ gửi <b>{displayNumber(notifications.pending)}</b></li><li><i className="blue" />Đã đọc <b>{displayNumber(notifications.read)}</b></li></ul></div><p className="release-note">Thông báo được tạo tự động trong cùng transaction phát hành. Kênh hiện có: ứng dụng NBC Portal.</p></section>
        <section className="release-card release-risk-card"><header><div><span>RỦI RO & NGOẠI LỆ</span><h3>Điểm cần chú ý</h3></div><strong>{displayNumber(riskTotal)}</strong></header><div className="release-risks">{data?.risks?.length ? data.risks.map((risk) => <div key={risk.code}><AlertTriangle /><span>{risk.label}<small>{risk.code}</small></span><strong>{displayNumber(risk.count)}</strong></div>) : <div className="release-safe"><CheckCircle2 /><span><strong>Không có ngoại lệ</strong><small>Release Gate không phát hiện điều kiện chặn.</small></span></div>}</div></section>
      </aside>
    </div>

    {preview && <div className="release-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPreview(false)}><aside className="release-drawer release-drawer-v2"><header><div><span>KIỂM TRA TRƯỚC PHÁT HÀNH</span><h3>Kỳ {period?.code}</h3><p>{period?.name}</p></div><button type="button" onClick={() => setPreview(false)} aria-label="Đóng kiểm tra"><X /></button></header><div className={`release-callout ${gate.canRelease ? "success" : gate.status === "LOCKED" ? "warning" : "danger"}`}>{gate.canRelease ? <ShieldCheck /> : gate.status === "LOCKED" ? <LockKeyhole /> : <AlertTriangle />}<div><strong>{gateMeta.label || gate.status}</strong><p>{gateMeta.note}</p></div></div><div className="release-review-grid"><span>Tổng phiếu<strong>{displayNumber(summary.totalSlips)}</strong></span><span>Sẵn sàng<strong>{displayNumber(summary.readySlips)}</strong></span><span>Thực lĩnh<strong>{displayMoney(summary.net)}</strong></span></div><h4>Điều kiện kiểm soát</h4>{data?.readiness?.map((item) => <div className={`release-issue-line ${item.status}`} key={item.code}>{item.status === "complete" ? <CheckCircle2 /> : <AlertTriangle />}<span>{item.label}<small>{displayNumber(item.completed)} / {displayNumber(item.total)} đạt</small></span><strong>{item.percentage}%</strong></div>)}<h4>Rủi ro và cảnh báo</h4>{data?.risks?.length ? data.risks.map((risk) => <div className="release-issue-line" key={risk.code}><AlertTriangle /><span>{risk.label}<small>{risk.code}</small></span><strong>{displayNumber(risk.count)}</strong></div>) : <div className="release-safe"><CheckCircle2 /> Không có ngoại lệ được phát hiện.</div>}</aside></div>}
    {modal && <ReleaseModal type={modal} data={data} busy={actionLoading} onClose={() => setModal(null)} onConfirm={confirmAction} />}
  </div>;
}
