import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import {
  deleteThirteenthMonthOverride,
  getThirteenthMonthPolicy,
  saveThirteenthMonthOverride,
  saveThirteenthMonthPolicy,
} from "@/api/payroll.api";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);
const coefficientText = (value) => value === null || value === undefined
  ? "Chưa cấu hình"
  : `× ${Number(value).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 3 })}`;

export default function ThirteenthMonthPolicyWorkspace() {
  const [year, setYear] = useState(currentYear);
  const [workspace, setWorkspace] = useState(null);
  const [coefficient, setCoefficient] = useState("1");
  const [notes, setNotes] = useState("");
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState(null);
  const [overrideCoefficient, setOverrideCoefficient] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getThirteenthMonthPolicy(year);
      const data = response.data;
      setWorkspace(data);
      setCoefficient(String(data.policy?.defaultCoefficient ?? 1));
      setNotes(data.policy?.notes ?? "");
    } catch (requestError) {
      setError(requestError.message || "Không thể tải chính sách lương tháng 13.");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const employees = useMemo(() => {
    const needle = keyword.trim().toLocaleLowerCase("vi");
    return (workspace?.employees ?? []).filter((employee) => !needle ||
      `${employee.fullName} ${employee.staffId} ${employee.department ?? ""} ${employee.workLocation ?? ""}`
        .toLocaleLowerCase("vi").includes(needle));
  }, [workspace?.employees, keyword]);

  const submitPolicy = async (status) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await saveThirteenthMonthPolicy(year, {
        defaultCoefficient: Number(coefficient),
        notes,
        status,
      });
      setMessage(response.message);
      await load();
    } catch (requestError) {
      setError(requestError.message || "Không thể lưu chính sách.");
    } finally {
      setSaving(false);
    }
  };

  const openOverride = (employee) => {
    setEditing(employee);
    setOverrideCoefficient(String(employee.overrideCoefficient ?? employee.effectiveCoefficient ?? coefficient));
    setOverrideReason(employee.overrideReason ?? "");
    setError("");
  };

  const submitOverride = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await saveThirteenthMonthOverride(year, editing.staffId, {
        coefficient: Number(overrideCoefficient),
        reason: overrideReason,
      });
      setMessage(response.message);
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(requestError.message || "Không thể lưu ngoại lệ.");
    } finally {
      setSaving(false);
    }
  };

  const removeOverride = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await deleteThirteenthMonthOverride(year, editing.staffId);
      setMessage(response.message);
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(requestError.message || "Không thể xóa ngoại lệ.");
    } finally {
      setSaving(false);
    }
  };

  const summary = workspace?.summary ?? {};
  const published = workspace?.policy?.status === "published";

  return (
    <div className="t13-workspace">
      <section className="t13-hero">
        <div className="t13-hero__copy">
          <span className="t13-eyebrow"><Sparkles /> CHÍNH SÁCH TOÀN HỆ THỐNG</span>
          <h2>Lương tháng 13</h2>
          <p>Một hệ số mặc định cho toàn bộ nhân viên, chỉ tạo ngoại lệ khi có quyết định riêng. Nhân viên luôn nhận giá trị hiệu lực mới nhất từ chính sách đã ban hành.</p>
          <div className="t13-status-row">
            <span className={published ? "is-published" : "is-draft"}>
              <ShieldCheck /> {published ? "Đã ban hành" : workspace?.policy ? "Bản nháp" : "Chưa cấu hình"}
            </span>
            {workspace?.policy?.publishedAt && <small>Ban hành {new Date(workspace.policy.publishedAt).toLocaleString("vi-VN")}</small>}
          </div>
        </div>
        <div className="t13-hero__metric">
          <CircleDollarSign />
          <span>Hệ số mặc định năm {year}</span>
          <strong>{coefficientText(workspace?.policy?.defaultCoefficient)}</strong>
          <small>{published ? `${summary.inheritedCount ?? 0} nhân viên đang kế thừa` : "Chỉ có hiệu lực sau khi ban hành"}</small>
        </div>
      </section>

      {(error || message) && <div className={`t13-message ${error ? "is-error" : "is-success"}`}>{error || message}</div>}

      <section className="t13-policy-card">
        <header>
          <div><span className="t13-eyebrow">THIẾT LẬP CHUNG</span><h3>Cấu hình theo năm</h3></div>
          <button type="button" className="t13-refresh" onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""} /> Làm mới</button>
        </header>
        <div className="t13-policy-form">
          <label>Năm áp dụng
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {yearOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Hệ số mặc định
            <input type="number" min="0" max="5" step="0.05" value={coefficient} onChange={(event) => setCoefficient(event.target.value)} />
          </label>
          <label className="t13-notes">Ghi chú chính sách
            <input value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} placeholder="Ví dụ: Áp dụng theo quyết định thưởng cuối năm..." />
          </label>
          <div className="t13-policy-actions">
            <button type="button" onClick={() => submitPolicy("draft")} disabled={saving}>Lưu nháp</button>
            <button type="button" className="primary-button" onClick={() => submitPolicy("published")} disabled={saving || coefficient === ""}>
              <BadgeCheck /> Ban hành cho toàn hệ thống
            </button>
          </div>
        </div>
      </section>

      <section className="t13-summary-grid">
        <article><UsersRound /><span>Tổng nhân viên</span><strong>{summary.totalEmployees ?? 0}</strong></article>
        <article><Building2 /><span>Kế thừa mặc định</span><strong>{summary.inheritedCount ?? 0}</strong></article>
        <article><UserRoundCog /><span>Ngoại lệ cá nhân</span><strong>{summary.overrideCount ?? 0}</strong></article>
        <article className={summary.unconfiguredCount ? "is-warning" : ""}><ShieldCheck /><span>Chưa có chính sách</span><strong>{summary.unconfiguredCount ?? 0}</strong></article>
      </section>

      <section className="t13-employees">
        <header>
          <div><span className="t13-eyebrow">PHẠM VI ÁP DỤNG</span><h3>Nhân viên và hệ số hiệu lực</h3></div>
          <label className="t13-search"><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm tên, mã, đơn vị..." /></label>
        </header>
        <div className="t13-table-wrap">
          <table>
            <thead><tr><th>Nhân viên</th><th>Đơn vị / chức danh</th><th>Nguồn áp dụng</th><th>Hệ số hiệu lực</th><th>Thao tác</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="t13-empty"><RefreshCw className="spin" /> Đang tải dữ liệu thật...</td></tr> : employees.length ? employees.map((employee) => (
                <tr key={employee.staffId}>
                  <td><strong>{employee.fullName}</strong><small>{employee.staffId}</small></td>
                  <td><span>{employee.department || employee.workLocation || "Chưa cập nhật đơn vị"}</span><small>{employee.jobTitle || employee.role || "Chưa cập nhật chức danh"}</small></td>
                  <td><span className={`t13-source ${employee.overrideCoefficient !== null ? "is-override" : ""}`}>{employee.overrideCoefficient !== null ? "Ngoại lệ cá nhân" : workspace?.policy ? "Mặc định hệ thống" : "Chưa có chính sách"}</span></td>
                  <td><strong className="t13-effective">{coefficientText(employee.effectiveCoefficient)}</strong></td>
                  <td><button type="button" onClick={() => openOverride(employee)} disabled={!workspace?.policy}><UserRoundCog /> {employee.overrideCoefficient !== null ? "Sửa ngoại lệ" : "Tạo ngoại lệ"}</button></td>
                </tr>
              )) : <tr><td colSpan="5" className="t13-empty">Không có nhân viên phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <div className="payroll-modal-root" role="presentation">
          <button className="payroll-modal-backdrop" type="button" aria-label="Đóng" onClick={() => setEditing(null)} />
          <form className="payroll-modal-surface t13-override-dialog" onSubmit={submitOverride}>
            <header className="payroll-modal-header">
              <span className="payroll-modal-icon"><UserRoundCog /></span>
              <div><span className="payroll-modal-eyebrow">NGOẠI LỆ NHÂN VIÊN</span><h2>{editing.fullName}</h2><p>{editing.staffId} · năm {year}</p></div>
              <button className="payroll-modal-close" type="button" onClick={() => setEditing(null)}><X /></button>
            </header>
            <div className="t13-override-body">
              <p>Giá trị này chỉ thay thế hệ số mặc định cho đúng nhân viên và đúng năm đã chọn.</p>
              <label>Hệ số ngoại lệ <b>*</b><input type="number" min="0" max="5" step="0.05" value={overrideCoefficient} onChange={(event) => setOverrideCoefficient(event.target.value)} required /></label>
              <label>Lý do áp dụng <b>*</b><textarea value={overrideReason} minLength={3} maxLength={500} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Nhập căn cứ hoặc quyết định áp dụng..." required /></label>
            </div>
            <footer className="payroll-modal-footer">
              {editing.overrideCoefficient !== null && <button type="button" className="t13-danger-button" onClick={removeOverride} disabled={saving}>Xóa ngoại lệ</button>}
              <button type="button" onClick={() => setEditing(null)}>Hủy</button>
              <button type="submit" className="primary-button" disabled={saving}>Lưu ngoại lệ</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
