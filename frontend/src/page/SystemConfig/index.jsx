import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SystemSettingsPage } from "./SystemConfigView";
import { normalizeSalaryItems, salaryMaster } from "@/utils/payroll";
import { persistHrAdminState } from "../../utils/portal-persistence";
import {
  getCompanySettings,
  uploadCompanyLogo,
  updateCompanySettings,
} from "@/api/company-settings.api";
import {
  setSystemConfig,
  setSalaryItems,
  setHrAdminData,
  setNotificationsOpen
} from "../../redux/userSlice";

export default function Settings() {
  const dispatch = useDispatch();

  // Redux Selectors
  const session = useSelector((state) => state.user.session);
  const systemConfig = useSelector((state) => state.user.systemConfig);
  const salaryItems = useSelector((state) => state.user.salaryItems);
  const employees = useSelector((state) => state.user.employees);
  const hrAdminData = useSelector((state) => state.user.hrAdminData);
  const notices = useSelector((state) => state.user.notices);

  const role = session?.role ?? "employee";
  const currentStaffId = session?.staffId || "";
  const account = employees.find((item) => item.staffId === currentStaffId);

  const currentUser = {
    name: account?.name ?? "Nhân viên NBC",
    staffId: currentStaffId,
    email: account?.email ?? `${currentStaffId.toLowerCase()}@nbc.com.vn`,
    department: account?.department ?? "Nhabe Corporation",
    position: account?.position ?? account?.access ?? "Nhân viên",
    workplace: account?.workplace ?? "Nhabe Corporation"
  };

  const roleNotices = import.meta.env.VITE_ENABLE_API === "true"
    ? notices
    : notices.filter((notice) => notice.audience === role && (!notice.staffId || notice.staffId === currentUser.staffId));
  const unreadCount = roleNotices.filter((notice) => !notice.read).length;

  const mapCompanySettings = (settings, current = systemConfig) => {
    if (!settings) return current;

    const productName = settings.product_name ?? "";
    const productVersion = settings.product_version ?? "";

    return {
      ...current,
      companyName: settings.company_name ?? current.companyName,
      companyLogo:
        settings.logo_display_url || settings.logo_url || "/nbc-logo.png",
      companyLogoKey: settings.logo_url ?? current.companyLogoKey ?? null,
      footerCopyright: settings.footer_copyright ?? "",
      productName,
      productVersion,
      footerProduct: [productName, productVersion].filter(Boolean).join(" · "),
    };
  };

  React.useEffect(() => {
    let active = true;

    getCompanySettings()
      .then((settings) => {
        if (!active || !settings) return;
        const latest = mapCompanySettings(settings);
        dispatch(setSystemConfig(latest));
        localStorage.setItem("nbc-system-config", JSON.stringify(latest));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [dispatch]);

  const saveSystemConfig = async (config) => {
    const normalized = { ...config, notificationReminderMinutes: Math.min(1440, Math.max(1, Number(config.notificationReminderMinutes) || 60)) };
    const settings = await updateCompanySettings({
      company_name: normalized.companyName,
      logo_url: normalized.companyLogoKey ?? normalized.companyLogo,
      footer_copyright: normalized.footerCopyright,
      product_name: normalized.productName,
      product_version: normalized.productVersion,
    });
    const latest = mapCompanySettings(settings, normalized);
    dispatch(setSystemConfig(latest));
    localStorage.setItem("nbc-system-config", JSON.stringify(latest));
    return latest;
  };

  const uploadLogo = async (file) => {
    const uploaded = await uploadCompanyLogo(file);
    if (!uploaded?.logo_url || !uploaded?.logo_display_url) {
      throw new Error("Máy chủ không trả về thông tin logo hợp lệ.");
    }
    return uploaded;
  };

  const updateSalaryItems = useCallback((next) => {
    const normalized = normalizeSalaryItems(next, salaryMaster);
    dispatch(setSalaryItems(normalized));
    
    const updatedHrData = { ...hrAdminData, salaryItems: normalized };
    dispatch(setHrAdminData(updatedHrData));
    persistHrAdminState(updatedHrData, employees, normalized);
    
    localStorage.setItem("nbc-salary-master", JSON.stringify(normalized));
  }, [dispatch, employees, hrAdminData]);

  return (
    <SystemSettingsPage
      config={systemConfig}
      salaryItems={salaryItems}
      onSave={saveSystemConfig}
      onUploadLogo={uploadLogo}
      onSalaryItemsChange={updateSalaryItems}
      onNotifications={() => dispatch(setNotificationsOpen(true))}
      unreadCount={unreadCount}
    />
  );
}

