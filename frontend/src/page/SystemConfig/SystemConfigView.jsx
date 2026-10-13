import React, { useState, useRef } from "react";
import {
  Settings,
  KeyRound,
  EyeOff,
  Eye,
  UploadCloud,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { PageTitle } from "@/components/common/PageTitle";
export function SystemSettingsPage({
  config,
  salaryItems,
  onSave,
  onUploadLogo,
  onSalaryItemsChange,
  onNotifications,
  unreadCount,
}) {
  const [draft, setDraft] = useState(config);
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [newSalaryLabel, setNewSalaryLabel] = useState("");
  const [newSalaryCategory, setNewSalaryCategory] = useState("income");
  const logoInput = useRef(null);
  React.useEffect(() => {
    setDraft(config);
  }, [config]);

  async function saveSettings() {
    if (saving) return;

    setSaving(true);
    setSaved(false);
    setSaveError("");

    try {
      await onSave(draft);
      setSaved(true);
    } catch (error) {
      setSaveError(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể lưu cấu hình. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function readLogo(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setUploadingLogo(true);
    setSaved(false);
    setSaveError("");

    try {
      const uploaded = await onUploadLogo(file);
      setDraft((item) => ({
        ...item,
        companyLogo: uploaded.logo_display_url,
        companyLogoKey: uploaded.logo_url,
      }));
    } catch (error) {
      setSaveError(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tải logo lên R2.",
      );
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }
  function addSalaryItem() {
    const label = newSalaryLabel.trim();
    if (!label) return;
    const code = `custom_${Date.now()}`;
    onSalaryItemsChange([
      ...salaryItems,
      {
        code,
        label,
        category: newSalaryCategory,
        includeIn12MonthAverage: false,
      },
    ]);
    setNewSalaryLabel("");
  }
  return (
    <div className="page settings-page">
      <PageTitle
        title="Cấu hình hệ thống"
        subtitle="Thiết lập nhận diện doanh nghiệp, tài khoản và danh mục lương"
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />
      <div className="settings-layout">
        <section className="section-block system-config-card">
          <div className="section-heading compact">
            <div>
              <span className="section-kicker">THÔNG TIN CHUNG</span>
              <h2>Nhận diện doanh nghiệp</h2>
            </div>
            <Settings />
          </div>
          <div className="company-logo-setting">
            <div>
              <img
                src={draft.companyLogo || "/nbc-logo.png"}
                alt="Logo công ty hiện tại"
              />
            </div>
            <span>
              <strong>Logo công ty</strong>
              <p>Được sử dụng trên báo cáo chấm công và phiếu lương.</p>
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={readLogo}
              />
              <button
                disabled={uploadingLogo}
                onClick={() => logoInput.current?.click()}
              >
                <UploadCloud /> {uploadingLogo ? "Đang tải logo..." : "Tải logo mới"}
              </button>
            </span>
          </div>
          <label>
            Tên công ty
            <input
              value={draft.companyName}
              onChange={(event) =>
                setDraft({ ...draft, companyName: event.target.value })
              }
              placeholder="Nhập tên doanh nghiệp"
            />
          </label>

          {/* CHu kì thông báo */}
          <div className="footer-config-grid">
            <label>
              Dòng bản quyền chân trang
              <input
                value={draft.footerCopyright}
                onChange={(event) =>
                  setDraft({ ...draft, footerCopyright: event.target.value })
                }
                placeholder="© 2026 Nhabe Corporation"
              />
            </label>
            <label>
              Tên sản phẩm
              <input
                value={draft.productName ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, productName: event.target.value })
                }
                placeholder="Employee Portal"
              />
            </label>
            <label>
              Phiên bản sản phẩm
              <input
                value={draft.productVersion ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, productVersion: event.target.value })
                }
                placeholder="v2.1"
              />
            </label>
          </div>
          {saved && (
            <div className="permission-message">
              <CheckCheckIcon /> Đã lưu cấu hình mới nhất lên máy chủ.
            </div>
          )}
          {saveError && (
            <div className="permission-message error">{saveError}</div>
          )}
          <button
            className="primary-button settings-save"
            disabled={saving || uploadingLogo}
            onClick={() => void saveSettings()}
          >
            <Save /> {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </section>
        {/* <section className="section-block salary-master-card">
          <div className="section-heading compact">
            <div><span className="section-kicker">MASTER DATA</span><h2>Danh mục tiêu chí lương</h2></div>
            <span className="list-summary">{salaryItems.length} tiêu chí</span>
          </div>
          <p className="master-description">Đánh dấu từng tiêu chí thu nhập được đưa vào lương bình quân 12 tháng. Cấu hình này được áp dụng trực tiếp cho báo cáo lũy kế và công thức lương tháng 13.</p>
          <div className="salary-master-add">
            <select value={newSalaryCategory} onChange={(event) => setNewSalaryCategory(event.target.value)}>
              <option value="income">Thu nhập</option>
              <option value="deduction">Khấu trừ</option>
            </select>
            <input value={newSalaryLabel} onChange={(event) => setNewSalaryLabel(event.target.value)} placeholder="Tên tiêu chí mới..."/>
            <button onClick={addSalaryItem}><Plus /> Thêm</button>
          </div>
          <div className="salary-master-columns"><span>Phân loại</span><span>Tên tiêu chí</span><span>Tính BQ 12 tháng</span><span>Mã dữ liệu</span></div>
          <div className="salary-master-list">
            {salaryItems.map((item) => (<div key={item.code}>
                <span className={item.category}><i>{item.category === "income" ? <Plus /> : <CheckCheckIcon />}</i>{item.category === "income" ? "Thu nhập" : "Khấu trừ"}</span>
                <input value={item.label} onChange={(event) => onSalaryItemsChange(salaryItems.map((row) => row.code === item.code ? { ...row, label: event.target.value } : row))}/>
                <label className={`average-toggle ${item.category === "deduction" ? "disabled" : ""}`}>
                  <input type="checkbox" disabled={item.category === "deduction"} checked={item.includeIn12MonthAverage} onChange={(event) => onSalaryItemsChange(salaryItems.map((row) => row.code === item.code ? { ...row, includeIn12MonthAverage: event.target.checked } : row))}/>
                  <span>{item.category === "income" ? item.includeIn12MonthAverage ? "Có tính" : "Không tính" : "Không áp dụng"}</span>
                </label>
                <code>{item.code}</code>
                <button aria-label={`Xóa ${item.label}`} onClick={() => onSalaryItemsChange(salaryItems.filter((row) => row.code !== item.code))}><Trash2 /></button>
              </div>))}
          </div>
        </section> */}
      </div>
    </div>
  );
}
function CheckCheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-check-check"
    >
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7.5 7.5L13 16" />
    </svg>
  );
}
