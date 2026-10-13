// Derived from current routes, sidebar entries and actionable controls.
// Role-related keys exactly match backend route middleware.
export const permissionGroups = [
  { module: "Trang chủ", permissions: [{ code: "view_home", label: "Xem trang chủ" }] },
  { module: "Chấm công", permissions: [{ code: "view_attendance", label: "Xem chấm công" }, { code: "export_attendance", label: "Xuất báo cáo" }, { code: "feedback_attendance", label: "Phản hồi chấm công" }, { code: "manage_shift", label: "Quản lý ca làm việc" }] },
  { module: "Phiếu lương", permissions: [{ code: "view_salary", label: "Xem phiếu lương" }, { code: "export_salary", label: "Xuất phiếu lương" }, { code: "manage_payroll", label: "Quản lý bảng lương" }] },
  { module: "Văn bản", permissions: [{ code: "view_document", label: "Xem văn bản" }, { code: "create_document", label: "Tạo văn bản" }, { code: "approve_document", label: "Duyệt văn bản" }, { code: "reject_document", label: "Từ chối văn bản" }] },
  { module: "Nhân viên", permissions: [{ code: "view_employee", label: "Xem danh sách" }, { code: "import_employee", label: "Import nhân viên" }, { code: "edit_employee", label: "Cập nhật nhân viên" }, { code: "delete_employee", label: "Xóa nhân viên" }] },
  { module: "Dữ liệu công", permissions: [{ code: "view_hr_data", label: "Xem dữ liệu công" }, { code: "import_attendance", label: "Import chấm công" }, { code: "manage_attendance_device", label: "Quản lý máy chấm công" }] },
  { module: "Thông báo & Tin tức", permissions: [{ code: "view_news", label: "Xem tin tức" }, { code: "create_news", label: "Đăng tin / thông báo" }, { code: "edit_news", label: "Sửa tin / thông báo" }, { code: "delete_news", label: "Xóa tin / thông báo" }, { code: "reply_notification", label: "Trả lời phản hồi" }] },
  { module: "Nhóm quyền", permissions: [{ code: "view_role", label: "Xem nhóm quyền" }, { code: "create_role", label: "Thêm nhóm quyền" }, { code: "edit_role", label: "Sửa nhóm quyền" }, { code: "delete_role", label: "Xóa nhóm quyền" }, { code: "permission_role", label: "Cập nhật phân quyền" }] },
  { module: "Cấu hình hệ thống", permissions: [{ code: "view_setting", label: "Xem cấu hình" }, { code: "edit_setting", label: "Cập nhật cấu hình" }] },
];

export const permissionRows = permissionGroups.flatMap((group) => group.permissions.map((permission) => ({ ...permission, module: group.module })));
