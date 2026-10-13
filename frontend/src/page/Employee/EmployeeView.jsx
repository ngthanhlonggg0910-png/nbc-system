import React, { useState, useMemo, useRef, useEffect } from "react";

import {
  TriangleAlert,
  CalendarClock,
  CalendarDays,
  Clock3,
  Database,
  Download,
  Edit3,
  FileCheck2,
  FileSpreadsheet,
  Fingerprint,
  LogIn,
  LogOut,
  Plus,
  RotateCcw,
  Reply,
  Save,
  Search,
  Server,
  Settings,
  ShieldCheck,
  UploadCloud,
  UserCog,
  Users,
  WalletCards,
  Wifi,
  X,
} from "lucide-react";

import {
  updateAttendanceDevice,
  createAttendanceDevice,
  getAttendanceDevice,
  syncAttendanceDevice,
  updateSchedule,
  createSchedule,
} from "@/api/attendance.api";

import { formatVietnamDateTime } from "@/utils/formatVietnamDateTime";
import ScheduleEditModal from "@/components/modal/ScheduleEditModal";
import AttendanceDeviceModal from "@/components/modal/AttendanceDeviceModal";
import { PageTitle } from "@/components/common/PageTitle";
import Pagination from "@/components/pagination/Pagination";
import { attendanceEntriesFromRaw } from "@/components/attendance";
import ShiftManagementPanel from "@/features/attendance/components/admin/shifts/ShiftManagementPanel";
import AdminHR from "@/page/AdminHR";
import { buildPayrollIncomeBreakdown, salaryMaster } from "@/utils/payroll";

function excelCellText(value) {
  if (value instanceof Date)
    return `${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
  if (value && typeof value === "object" && "text" in value)
    return String(value.text ?? "").trim();
  if (value && typeof value === "object" && "result" in value)
    return String(value.result ?? "").trim();
  return String(value ?? "").trim();
}
function normalizeViDate(value) {
  const text = excelCellText(value);
  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  return match
    ? `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}`
    : text;
}
async function readExcelRows(file) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const headers = Array.from({ length: sheet.columnCount }, (_, index) =>
    excelCellText(sheet.getCell(1, index + 1).value),
  );
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item = {};
    headers.forEach((header, index) => {
      if (header) item[header] = row.getCell(index + 1).value;
    });
    if (Object.values(item).some((value) => excelCellText(value)))
      rows.push(item);
  });
  return rows;
}
export function salaryIncomeColumn(item) {
  return `Tiêu chí: ${item.label} [${item.code}]`;
}
async function downloadHrExcelTemplate(kind, salaryItems = salaryMaster) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "NBC Employee Portal";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(
    kind === "attendance"
      ? "ChamCongNgay"
      : kind === "payroll"
        ? "BangLuong"
        : "NhanVien",
  );
  const definitions = { columns: [], samples: [] };
  if (kind === "attendance") {
    definitions.columns = [
      "Ngày",
      "Mã nhân viên",
      "Họ tên",
      "Phòng ban",
      "Giờ vào",
      "Giờ ra",
      "Số giờ",
      "Trạng thái",
      "Mã máy vào",
      "Mã máy ra",
      "Ghi chú",
    ];
    definitions.samples = [
      [
        "14/07/2026",
        "NBC012345",
        "Nguyễn Văn An",
        "Phòng Sản xuất",
        "07:58",
        "17:05",
        8.17,
        "Đủ công",
        "MCC-CONG-01",
        "MCC-CONG-01",
        "Dữ liệu mẫu",
      ],
    ];
  } else if (kind === "payroll") {
    const incomeItems = salaryItems.filter(
      (item) => item.category === "income",
    );
    const sampleIncome = buildPayrollIncomeBreakdown(15200000);
    definitions.columns = [
      "Tháng",
      "Mã nhân viên",
      "Họ tên",
      "Phòng ban",
      ...incomeItems.map(salaryIncomeColumn),
      "Tổng thu nhập",
      "Thu nhập chịu thuế",
      "Tổng khấu trừ",
      "Thực lĩnh",
      "Trạng thái",
    ];
    definitions.samples = [
      [
        "2026-06",
        "NBC012345",
        "Nguyễn Văn An",
        "Phòng Sản xuất",
        ...incomeItems.map((item) => sampleIncome[item.code] || 0),
        15200000,
        13850000,
        2350000,
        12850000,
        "Đã phát hành",
      ],
    ];
  } else {
    definitions.columns = [
      "Mã nhân viên",
      "Họ tên",
      "Email",
      "Số điện thoại",
      "Ngày sinh",
      "Giới tính",
      "Phòng ban",
      "Chức danh",
      "Nơi làm việc",
      "Ngày vào công ty",
      "Mã quản lý trực tiếp",
      "Quyền truy cập",
      "Trạng thái",
    ];
    definitions.samples = [
      [
        "NBC012345",
        "Nguyễn Văn An",
        "nguyenvanan@nbc.com.vn",
        "0987654321",
        "12/05/1992",
        "Nam",
        "Phòng Sản xuất",
        "Nhân viên Sản xuất · Line 2",
        "Nhà máy NBC - KCN VSIP II",
        "15/08/2020",
        "HR0001",
        "Nhân viên",
        "Đang hoạt động",
      ],
    ];
  }
  sheet.addRow(definitions.columns);
  definitions.samples.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF087F88" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  sheet.getRow(1).height = 28;
  sheet.columns.forEach((column, index) => {
    column.width = Math.max(
      14,
      Math.min(28, definitions.columns[index].length + 5),
    );
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: "A1",
    to: `${String.fromCharCode(64 + definitions.columns.length)}1`,
  };
  const guide = workbook.addWorksheet("HuongDan");
  guide.addRows([
    ["HƯỚNG DẪN NHẬP DỮ LIỆU NBC PORTAL"],
    ["1. Không đổi tên cột hoặc tên sheet dữ liệu."],
    ["2. Mã nhân viên là duy nhất và phải trùng với danh sách nhân viên."],
    ["3. Ngày dùng định dạng DD/MM/YYYY; tháng dùng YYYY-MM; giờ dùng HH:mm."],
    ["4. Trạng thái chấm công: Đủ công, Đi trễ hoặc Vắng."],
    [
      "5. Mã quản lý trực tiếp phải là mã của một nhân viên đang có trong hệ thống.",
    ],
    [
      "6. Chính sách lương tháng 13 được quản lý tập trung trong module Quản lý lương.",
    ],
    [
      "7. Xóa dòng dữ liệu mẫu trước khi nhập dữ liệu chính thức nếu không muốn cập nhật bản ghi mẫu.",
    ],
  ]);
  guide.getColumn(1).width = 100;
  guide.getRow(1).font = { bold: true, size: 15, color: { argb: "FF075BAE" } };
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `NBC-${kind === "attendance" ? "mau-cham-cong" : kind === "payroll" ? "mau-bang-luong" : "mau-danh-sach-nhan-vien"}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
function monthlyAttendanceSummary(entries, month) {
  const rows = new Map();
  entries
    .filter((item) => item.month === month)
    .forEach((entry) => {
      const current = rows.get(entry.staffId) ?? {
        staffId: entry.staffId,
        name: entry.name,
        department: entry.department,
        full: 0,
        partial: 0,
        absent: 0,
        hours: 0,
      };
      if (entry.status === "full") current.full += 1;
      if (entry.status === "late") current.partial += 1;
      if (entry.status === "absent") current.absent += 1;
      current.hours += entry.hours;
      rows.set(entry.staffId, current);
    });
  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(year, monthNumber, 0).getDate();
  const standard = Array.from({ length: dayCount }, (_, index) =>
    new Date(year, monthNumber - 1, index + 1).getDay(),
  ).filter((day) => day !== 0 && day !== 6).length;
  return [...rows.values()].map((row) => ({
    ...row,
    standard,
    total: row.full + row.partial * 0.8,
  }));
}
export function HrDataPage({
  data,
  employees,
  salaryItems,
  onDataChange,
  onEmployeesChange,
  onNotifications,
  unreadCount,

  logPage,
  logPagination,
  onLogPageChange,
  attendanceLoadState,
}) {
  const [tab, setTab] = useState("attendance");
  const [month, setMonth] = useState("2026-07");
  const [payrollMonth, setPayrollMonth] = useState("2026-06");
  const [keyword, setKeyword] = useState("");
  console.log(keyword);
  console.log(employees);
  console.log("ABC");

  const [deviceFilter, setDeviceFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [editingDevice, setEditingDevice] = useState();
  const [savingDevice, setSavingDevice] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [syncingDeviceId, setSyncingDeviceId] = useState();
  const attendanceInput = useRef(null);
  const payrollInput = useRef(null);
  const employeeInput = useRef(null);

  const handleUpdateSchedule = async (schedule) => {
    try {
      setSavingSchedule(true);

      let response;

      if (schedule.id === 0) {
        response = await createSchedule({
          name: schedule.name,
          time: schedule.time,
          frequency: schedule.frequency,
          enabled: schedule.enabled,
        });

        onDataChange({
          ...data,
          schedules: [...data.schedules, response.data],
        });
      } else {
        response = await updateSchedule(schedule.id, {
          name: schedule.name,
          time: schedule.time,
          enabled: schedule.enabled,
        });

        onDataChange({
          ...data,
          schedules: data.schedules.map((item) =>
            item.id === response.data.id ? response.data : item,
          ),
        });
      }

      setMessage(response.message);
      setEditingSchedule(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveDevice = async (device) => {
    try {
      setSavingDevice(true);

      let result;

      if (device.id === 0) {
        result = await createAttendanceDevice(device);

        onDataChange({
          ...data,
          devices: [...data.devices, result.data],
        });
      } else {
        result = await updateAttendanceDevice(device.id, device);

        onDataChange({
          ...data,
          devices: data.devices.map((item) =>
            String(item.id) === String(device.id) ? result.data : item,
          ),
        });
      }

      setEditingDevice(undefined);
      setMessage(result.message);
    } catch (error) {
      setMessage(error?.message || "Không thể lưu máy chấm công.");
    } finally {
      setSavingDevice(false);
    }
  };

  const summary = useMemo(
    () => monthlyAttendanceSummary(data.attendanceEntries, month),
    [data.attendanceEntries, month],
  );
  const filteredAttendanceSummary = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi");
    if (!normalizedKeyword) return summary;
    return summary.filter((row) =>
      `${row.name} ${row.staffId} ${row.department}`
        .toLocaleLowerCase("vi")
        .includes(normalizedKeyword),
    );
  }, [summary, keyword]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  console.log("RAW LOGS:", data.rawLogs);
  const filteredRawLogs = data.rawLogs.filter(
    (item) =>
      (deviceFilter === "all" || item.deviceId === Number(deviceFilter)) &&
      (!keyword.trim() ||
        `${item.staffId} ${item.name} ${item.timestamp}`
          .toLocaleLowerCase("vi")
          .includes(keyword.trim().toLocaleLowerCase("vi"))),
  );
  const filteredEmployees = employees.filter(
    (item) =>
      !keyword.trim() ||
      `${item.staffId} ${item.name} ${item.department}`
        .toLocaleLowerCase("vi")
        .includes(keyword.trim().toLocaleLowerCase("vi")),
  );
  console.log(filteredEmployees);
  const filteredPayroll = data.payrollRows.filter(
    (item) =>
      item.month === payrollMonth &&
      (!keyword.trim() ||
        `${item.staffId} ${item.name} ${item.department}`
          .toLocaleLowerCase("vi")
          .includes(keyword.trim().toLocaleLowerCase("vi"))),
  );
  const formatMoney = (value) => new Intl.NumberFormat("vi-VN").format(value);

  const statusMap = {
    online: {
      text: "Trực tuyến",
      className: "ready",
    },
    offline: {
      text: "Ngoại tuyến",
      className: "pending",
    },
    checking: {
      text: "Đang kiểm tra",
      className: "checking",
    },
    maintenance: {
      text: "Bảo trì",
      className: "maintenance",
    },
  };

  async function importExcel(kind, file) {
    if (!file) return;
    try {
      const rows = await readExcelRows(file);
      if (!rows.length) throw new Error("Không có dòng dữ liệu hợp lệ.");
      if (kind === "attendance") {
        const imported = rows
          .flatMap((row, index) => {
            const date = normalizeViDate(row["Ngày"]);
            const staffId = excelCellText(row["Mã nhân viên"]).toUpperCase();
            if (!date || !staffId) return [];
            const [, monthNumber, year] = date.split("/");
            const statusText = excelCellText(
              row["Trạng thái"],
            ).toLocaleLowerCase("vi");
            const status = statusText.includes("vắng")
              ? "absent"
              : statusText.includes("trễ") || statusText.includes("0.8")
                ? "late"
                : "full";
            return [
              {
                id: Date.now() + index,
                date,
                month: `${year}-${monthNumber}`,
                staffId,
                name: excelCellText(row["Họ tên"]),
                department: excelCellText(row["Phòng ban"]),
                checkIn: excelCellText(row["Giờ vào"]) || "—",
                checkOut: excelCellText(row["Giờ ra"]) || "—",
                hours: Number(row["Số giờ"] || 0),
                status,
                deviceIn: excelCellText(row["Mã máy vào"]),
                deviceOut: excelCellText(row["Mã máy ra"]),
                note: excelCellText(row["Ghi chú"]),
              },
            ];
          })
          .filter(
            (item) => item.date.split("/").reverse().join("-") <= "2026-07-14",
          );
        const merged = new Map(
          data.attendanceEntries.map((item) => [
            `${item.staffId}-${item.date}`,
            item,
          ]),
        );
        imported.forEach((item) =>
          merged.set(`${item.staffId}-${item.date}`, item),
        );
        onDataChange({ ...data, attendanceEntries: [...merged.values()] });
        setMessage(
          `Đã nhập ${imported.length} dòng chấm công hợp lệ; dữ liệu sau 14/07/2026 được tự động loại bỏ.`,
        );
      } else if (kind === "payroll") {
        const imported = rows.flatMap((row, index) => {
          const staffId = excelCellText(row["Mã nhân viên"]).toUpperCase();
          if (!staffId) return [];
          const gross = Number(row["Tổng thu nhập"] || 0);
          const importedIncome = Object.fromEntries(
            salaryItems
              .filter((item) => item.category === "income")
              .map((item) => [
                item.code,
                Number(
                  row[salaryIncomeColumn(item)] ??
                    row[item.label] ??
                    row[item.code] ??
                    0,
                ),
              ]),
          );
          const income = Object.values(importedIncome).some(
            (value) => value !== 0,
          )
            ? importedIncome
            : buildPayrollIncomeBreakdown(gross);
          return [
            {
              id: Date.now() + index,
              month: excelCellText(row["Tháng"]),
              staffId,
              name: excelCellText(row["Họ tên"]),
              department: excelCellText(row["Phòng ban"]),
              gross,
              taxable: Number(row["Thu nhập chịu thuế"] || 0),
              deductions: Number(row["Tổng khấu trừ"] || 0),
              net: Number(row["Thực lĩnh"] || 0),
              income,
              status:
                excelCellText(row["Trạng thái"]) === "Bản nháp"
                  ? "Bản nháp"
                  : "Đã phát hành",
            },
          ];
        });
        const merged = new Map(
          data.payrollRows.map((item) => [
            `${item.staffId}-${item.month}`,
            item,
          ]),
        );
        imported.forEach((item) =>
          merged.set(`${item.staffId}-${item.month}`, item),
        );
        onDataChange({ ...data, payrollRows: [...merged.values()] });
        setMessage(`Đã nhập ${imported.length} bảng lương từ Excel.`);
      } else {
        const imported = rows.flatMap((row, index) => {
          const staffId = excelCellText(row["Mã nhân viên"]).toUpperCase();
          if (!staffId) return [];
          const existing = employees.find((item) => item.staffId === staffId);
          const accessText = excelCellText(row["Quyền truy cập"]);
          const access =
            accessText === "Quản trị viên"
              ? "Quản trị viên"
              : accessText === "HR"
                ? "HR"
                : "Nhân viên";
          return [
            {
              id: existing?.id ?? Date.now() + index,
              staffId,
              name: excelCellText(row["Họ tên"]),
              email: excelCellText(row["Email"]),
              phone: excelCellText(row["Số điện thoại"]),
              birthDate: normalizeViDate(row["Ngày sinh"]),
              gender: excelCellText(row["Giới tính"]),
              department: excelCellText(row["Phòng ban"]),
              position: excelCellText(row["Chức danh"]),
              workplace: excelCellText(row["Nơi làm việc"]),
              startDate: normalizeViDate(row["Ngày vào công ty"]),
              managerId: excelCellText(
                row["Mã quản lý trực tiếp"],
              ).toUpperCase(),
              access,
              status:
                excelCellText(row["Trạng thái"]) === "Tạm khóa"
                  ? "Tạm khóa"
                  : "Đang hoạt động",
            },
          ];
        });
        onEmployeesChange(imported);
        setMessage(`Đã đồng bộ ${imported.length} hồ sơ nhân sự.`);
      }
    } catch (err) {
      setMessage(
        `Lỗi nhập tệp: ${err instanceof Error ? err.message : "Định dạng bảng không tương thích."}`,
      );
    }
  }

  function handleRawLogsUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    readExcelRows(file)
      .then((rows) => {
        const logs = rows.flatMap((row, index) => {
          const staffId = excelCellText(row["Mã nhân viên"]).toUpperCase();
          if (!staffId) return [];
          return [
            {
              id: Date.now() + index,
              staffId,
              name: excelCellText(row["Họ tên"]),
              deviceId: Number(row["Mã máy"] || 1),
              timestamp: excelCellText(row["Thời gian"]),
              direction: excelCellText(row["Chiều"]) === "Vào" ? "Vào" : "Ra",
              verifyMode: "Vân tay",
              status: "Chờ xử lý",
            },
          ];
        });
        onDataChange({
          ...data,
          rawLogs: [...logs, ...data.rawLogs].slice(0, 50000),
        });
        setMessage(`Đã tải ${logs.length} bản ghi thô.`);
      })
      .catch(() => setMessage("Lỗi xử lý file log thô."));
  }
  function processRawLogs() {
    const pending = data.rawLogs.filter((item) => item.status === "Chờ xử lý");
    if (!pending.length) {
      setMessage("Không có bản ghi thô nào chờ xử lý.");
      return;
    }
    const computed = attendanceEntriesFromRaw(data.rawLogs, employees);
    const merged = new Map(
      data.attendanceEntries.map((item) => [
        `${item.staffId}-${item.date}`,
        item,
      ]),
    );
    computed.forEach((item) =>
      merged.set(`${item.staffId}-${item.date}`, item),
    );
    const processedLogs = data.rawLogs.map((log) => ({
      ...log,
      status: "Đã xử lý",
    }));
    onDataChange({
      ...data,
      attendanceEntries: [...merged.values()],
      rawLogs: processedLogs,
    });
    setMessage(
      `Đã xử lý xong ${pending.length} bản ghi thô thành ${computed.length} dòng chấm công.`,
    );
  }

  async function syncDevice(device) {
    try {
      setSyncingDeviceId(device.id);
      setMessage(`Đang đồng bộ ${device.code}...`);

      const payload = await syncAttendanceDevice(device.id);

      const updatedDevices = data.devices.map((item) =>
        item.id === device.id
          ? {
              ...item,
              status: "online",
              lastSync: new Date().toLocaleString("vi-VN"),
            }
          : item,
      );

      onDataChange({
        ...data,
        devices: data.devices.map((item) =>
          item.id === device.id
            ? {
                ...item,
                status: "online",
                last_sync: new Date().toISOString(),
              }
            : item,
        ),
      });

      const syncResult = payload.data;
      setMessage(
        syncResult
          ? `${payload.message || `Đồng bộ thành công từ ${device.name}.`} Mới: ${syncResult.inserted ?? 0}, trùng: ${syncResult.duplicated ?? 0}, lỗi: ${syncResult.failed ?? 0}.`
          : payload.message || `Đồng bộ thành công từ ${device.name}.`,
      );
    } catch (error) {
      const updatedDevices = data.devices.map((item) =>
        item.id === device.id ? { ...item, status: "offline" } : item,
      );

      onDataChange({
        ...data,
        devices: updatedDevices,
      });

      setMessage(error.message || `Không thể kết nối đến ${device.name}.`);
    } finally {
      setSyncingDeviceId(undefined);
    }
  }

  const openEditDevice = async (deviceId) => {
    try {
      const result = await getAttendanceDevice(deviceId);
      setEditingDevice(result.data);
      setDeviceErrors({});
      setDeviceSubmitError("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  function closeDeviceModal() {
    if (savingDevice) return;
    setEditingDevice(undefined);
    setDeviceErrors({});
    setDeviceSubmitError("");
  }

  function updateDeviceField(field, value) {
    setEditingDevice((current) => ({ ...current, [field]: value }));
    setDeviceErrors((current) => ({ ...current, [field]: "" }));
    setDeviceSubmitError("");
  }

  function validateDevice(device) {
    const errors = {};
    const code = device.code?.trim() ?? "";
    const name = device.name?.trim() ?? "";
    const ip = device.ip?.trim() ?? "";
    const protocol = device.protocol?.trim() ?? "";
    const port = Number(device.port);

    if (!code) errors.code = "Vui lòng nhập mã máy.";
    else if (
      data.devices.some(
        (item) =>
          String(item.id) !== String(device.id) &&
          item.code?.trim().toLocaleLowerCase("vi") ===
            code.toLocaleLowerCase("vi"),
      )
    )
      errors.code = "Mã máy đã tồn tại.";
    if (!name) errors.name = "Vui lòng nhập tên máy.";
    if (!ip) errors.ip = "Vui lòng nhập địa chỉ IP.";
    else {
      const parts = ip.split(".");
      if (
        parts.length !== 4 ||
        parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)
      )
        errors.ip = "Địa chỉ IPv4 không hợp lệ, ví dụ 192.168.1.10.";
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      errors.port = "Cổng phải là số nguyên từ 1 đến 65535.";
    if (!protocol) errors.protocol = "Vui lòng chọn giao thức.";

    return {
      errors,
      normalized: {
        ...device,
        code,
        name,
        ip,
        port,
        protocol,
        location: device.location?.trim() ?? "",
      },
    };
  }

  return (
    <div className="page hr-data-page">
      <PageTitle
        title="Dữ liệu công"
        subtitle="Nhập liệu, đồng bộ máy chấm công và quản lý dữ liệu HR"
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />
      <nav className="hr-data-tabs" aria-label="Danh mục dữ liệu nhân sự">
        {[
          { id: "attendance", label: "Bảng công tháng", icon: CalendarDays },
          { id: "raw", label: "Dữ liệu chấm công", icon: Fingerprint },
          { id: "devices", label: "Máy chấm công", icon: Settings },
          { id: "schedules", label: "Lịch đồng bộ", icon: CalendarClock },
          { id: "shifts", label: "Quản lý ca", icon: UserCog },
          { id: "feedback", label: "Phản hồi chấm công", icon: Reply },
          { id: "documents", label: "Duyệt văn bản", icon: FileCheck2 },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => {
                setTab(item.id);
                setKeyword("");
                setMessage("");
              }}
            >
              <Icon /> {item.label}
            </button>
          );
        })}
      </nav>

      {message && <div className="hr-data-message">{message}</div>}

      {tab === "feedback" && <AdminHR embedded initialTab="feedback" />}

      {tab === "documents" && <AdminHR embedded initialTab="documents" />}

      {tab === "shifts" && <ShiftManagementPanel />}

      {attendanceLoadState?.status === "loading" &&
        ["raw", "devices", "schedules"].includes(tab) && (
          <div className="hr-data-message">Đang tải dữ liệu máy chấm công…</div>
        )}
      {attendanceLoadState?.status === "error" &&
        ["raw", "devices", "schedules"].includes(tab) && (
          <div className="hr-data-message">
            Không thể tải dữ liệu máy chấm công: {attendanceLoadState.error}
          </div>
        )}

      {tab === "attendance" && (
        <section className="section-block hr-data-card">
          <div className="hr-data-toolbar">
            <div>
              <span>DANH SÁCH CHẤM CÔNG THÁNG</span>
              <h2>
                Chấm công tháng{" "}
                {new Intl.DateTimeFormat("en-US", {
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(`${month}-01`))}
              </h2>
            </div>
            <div className="hr-data-actions">
              <label className="hr-search attendance-summary-search">
                <Search />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm tên, mã NV, phòng ban..."
                />
                {keyword && (
                  <button
                    type="button"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => setKeyword("")}
                  >
                    <X />
                  </button>
                )}
              </label>
              <label>
                <CalendarDays />
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </label>
              <input
                type="file"
                ref={attendanceInput}
                hidden
                accept=".xlsx"
                onChange={(e) => importExcel("attendance", e.target.files?.[0])}
              />
              <button onClick={() => downloadHrExcelTemplate("attendance")}>
                <Download /> Tải form mẫu
              </button>
              <button
                className="primary-button"
                onClick={() => attendanceInput.current?.click()}
              >
                <FileSpreadsheet /> Import Excel
              </button>
            </div>
          </div>
          <div className="hr-kpi-row">
            <article>
              <Users />
              <div>
                <strong>{filteredAttendanceSummary.length}</strong>
                <span>Nhân viên có dữ liệu</span>
              </div>
            </article>
            <article>
              <CalendarDays />
              <div>
                <strong>
                  {filteredAttendanceSummary
                    .reduce((total, row) => total + row.total, 0)
                    .toFixed(1)}
                </strong>
                <span>Tổng ngày công</span>
              </div>
            </article>
            <article>
              <Clock3 />
              <div>
                <strong>
                  {filteredAttendanceSummary
                    .reduce((total, row) => total + row.hours, 0)
                    .toFixed(1)}
                  h
                </strong>
                <span>Tổng giờ làm</span>
              </div>
            </article>
          </div>
          <div className="hr-table-wrap">
            <table className="hr-data-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Nhân viên</th>
                  <th>Phòng ban</th>
                  <th>Công chuẩn</th>
                  <th>Đủ công</th>
                  <th>Công 0.8</th>
                  <th>Vắng</th>
                  <th>Tổng giờ</th>
                  <th>Tổng công</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendanceSummary.map((row, index) => (
                  <tr key={row.staffId}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.staffId}</small>
                    </td>
                    <td>{row.department}</td>
                    <td>{row.standard}</td>
                    <td>{row.full}</td>
                    <td>{row.partial}</td>
                    <td>{row.absent}</td>
                    <td>{row.hours.toFixed(1)}</td>
                    <td>
                      <span className="work-total">{row.total.toFixed(1)}</span>
                    </td>
                    <td>
                      <span className="data-status ready">Đã tính công</span>
                    </td>
                  </tr>
                ))}
                {filteredAttendanceSummary.length === 0 && (
                  <tr>
                    <td colSpan="10" className="hr-table-empty">
                      Không tìm thấy nhân viên phù hợp với “{keyword}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "raw" && (
        <section className="section-block hr-data-card">
          <div className="hr-data-toolbar">
            <div>
              <span>DỮ LIỆU THÔ TỪ THIẾT BỊ</span>
              <h2>Lượt quét máy chấm công</h2>
            </div>
            <div className="hr-data-actions">
              <select
                value={deviceFilter}
                onChange={(event) => setDeviceFilter(event.target.value)}
              >
                <option value="all">Tất cả máy</option>
                {data.devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
              <label className="hr-search">
                <Search />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Mã NV, họ tên, ngày..."
                />
              </label>
              <input
                type="file"
                ref={employeeInput}
                hidden
                accept=".xlsx"
                onChange={handleRawLogsUpload}
              />
              {/* <button className="primary-button" onClick={processRawLogs}>
                <Database /> Tính bảng công
              </button> */}
            </div>
          </div>
          <div className="hr-table-wrap">
            <table className="hr-data-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Nhân viên</th>
                  <th>Máy chấm công</th>
                  <th>Chiều</th>
                  <th>Xác thực</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredRawLogs.slice(0, 100).map((row) => (
                  <tr key={row.id}>
                    <td>
                      {new Date(row.timestamp).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </td>
                    <td>
                      <strong>{row.employee_name}</strong>
                      <small>{`ID: ${row.staff_id}`}</small>
                    </td>
                    <td>
                      <strong>
                        {data.devices.find(
                          (device) => device.id === row.deviceId,
                        )?.name ?? `${row.device_name}`}
                      </strong>
                      <small>
                        {
                          data.devices.find(
                            (device) => device.id === row.device_id,
                          )?.code
                        }
                      </small>
                    </td>
                    <td>
                      <span
                        className={`scan-direction ${
                          row.direction === "Vào"
                            ? "in"
                            : row.direction === "Thiếu giờ ra"
                              ? "missing"
                              : "out"
                        }`}
                      >
                        {row.direction === "Vào" ? (
                          <LogIn />
                        ) : row.direction === "Thiếu giờ ra" ? (
                          <TriangleAlert />
                        ) : (
                          <LogOut />
                        )}

                        {row.direction}
                      </span>
                    </td>
                    <td>
                      <span className="verify-mode">
                        <Fingerprint /> {row.verifyMode || "Vân tay"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`data-status ${
                          row.status === "Đã xử lý"
                            ? "ready"
                            : row.status === "Đang xử lý"
                              ? "checking"
                              : row.status === "Lỗi"
                                ? "error"
                                : " "
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              page={logPage}
              totalPages={logPagination.totalPages}
              onPageChange={onLogPageChange}
            />
          </div>
        </section>
      )}

      {tab === "devices" && (
        <section className="section-block hr-data-card">
          <div className="hr-data-toolbar">
            <div>
              <span>THIẾT BỊ KẾT NỐI</span>
              <h2>Danh sách máy chấm công</h2>
            </div>
            <div className="hr-data-actions">
              <button
                className="primary-button"
                onClick={() => {
                  setEditingDevice({
                    id: 0,
                    code: "",
                    name: "",
                    ip: "",
                    port: 4370,
                    password: "",
                    protocol: "ZKTeco TCP",
                    location: "",
                    enabled: true,
                    status: "checking",
                  });
                  setDeviceErrors({});
                  setDeviceSubmitError("");
                }}
              >
                <Plus /> Khai báo máy
              </button>
            </div>
          </div>
          <div className="device-grid">
            {data.devices.map((device) => (
              <article key={device.id}>
                <header>
                  <span
                    className={`device-state ${device.enabled ? "online" : "offline"}`}
                  >
                    <Server />
                  </span>
                  <div>
                    <strong>{device.name}</strong>
                    <small>
                      {device.code} · {device.location}
                    </small>
                  </div>
                  <i className={device.enabled ? "online" : "offline"}>
                    {device.enabled === true ? "Đang hoạt động" : "Vô hiệu hóa"}
                  </i>
                </header>
                <dl>
                  <div>
                    <dt>Địa chỉ IP</dt>
                    <dd>
                      {device.ip}:{device.port}
                    </dd>
                  </div>
                  <div>
                    <dt>Giao thức</dt>
                    <dd>{device.protocol}</dd>
                  </div>
                  <div>
                    <dt>Đồng bộ gần nhất</dt>
                    <dd>
                      {device.last_sync
                        ? new Date(device.last_sync).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })
                        : "Chưa đồng bộ"}
                    </dd>
                  </div>
                </dl>
                <footer>
                  <button
                    onClick={() => {
                      openEditDevice(device.id);
                    }}
                  >
                    <Settings /> Cấu hình
                  </button>
                  <button
                    onClick={() => syncDevice(device)}
                    disabled={syncingDeviceId === device.id}
                  >
                    <Wifi />{" "}
                    {syncingDeviceId === device.id
                      ? "Đang đồng bộ"
                      : "Đồng bộ ngay"}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "schedules" && (
        <section className="section-block hr-data-card">
          <div className="hr-data-toolbar">
            <div>
              <span>TỰ ĐỘNG LẤY DỮ LIỆU</span>
              <h2>Kế hoạch đồng bộ máy chấm công</h2>
            </div>
            <div className="hr-data-actions">
              <button
                className="primary-button"
                onClick={() =>
                  setEditingSchedule({
                    id: 0,
                    name: "",
                    time: "08:30",
                    frequency: "Hàng ngày",
                    enabled: true,
                  })
                }
              >
                <Plus /> Thêm kế hoạch
              </button>
            </div>
          </div>
          <div className="schedule-list">
            {data.schedules.map((schedule) => (
              <article key={schedule.id}>
                <span className={schedule.enabled ? "enabled" : ""}>
                  <CalendarClock />
                </span>

                <div>
                  <strong>{schedule.name}</strong>

                  <p>
                    {schedule.frequency} lúc <b>{schedule.time}</b>
                  </p>

                  <small>
                    Lần cuối:{" "}
                    {formatVietnamDateTime(schedule.last_run) || "Chưa chạy"} -
                    Kế tiếp:{" "}
                    {formatVietnamDateTime(schedule.next_run) || "Chưa có lịch"}
                  </small>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingSchedule(schedule)}
                >
                  <Settings size={18} />
                  Cấu hình
                </button>
              </article>
            ))}
            <aside className="scheduler-note">
              <ShieldCheck />
              <div>
                <strong>Bộ lập lịch tự động đang hoạt động</strong>
                <span>
                  Mỗi khi đến thời gian đã cấu hình, hệ thống sẽ tự động kết nối
                  các máy chấm công, đồng bộ dữ liệu quét và đưa vào hàng đợi để
                  xử lý bảng chấm công.
                </span>
              </div>
            </aside>
          </div>
        </section>
      )}

      {tab === "payroll" && (
        <section className="section-block hr-data-card">
          <div className="hr-data-toolbar">
            <div>
              <span>DANH SÁCH BẢNG LƯƠNG</span>
              <h2>
                Bảng lương tháng{" "}
                {new Intl.DateTimeFormat("en-US", {
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(`${payrollMonth}-01`))}
              </h2>
            </div>
            <div className="hr-data-actions">
              <label>
                <CalendarDays />
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                />
              </label>
              <label className="hr-search">
                <Search />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm mã, tên, phòng ban..."
                />
              </label>
              <input
                type="file"
                ref={payrollInput}
                hidden
                accept=".xlsx"
                onChange={(e) => importExcel("payroll", e.target.files?.[0])}
              />
              <button onClick={() => downloadHrExcelTemplate("payroll")}>
                <Download /> Tải form mẫu
              </button>
              <button
                className="primary-button"
                onClick={() => payrollInput.current?.click()}
              >
                <FileSpreadsheet /> Import Excel
              </button>
            </div>
          </div>
          <div className="hr-table-wrap">
            <table className="hr-data-table payroll-admin-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Phòng ban</th>
                  <th>Tổng thu nhập</th>
                  <th>Thu nhập tính BQ</th>
                  <th>Chịu thuế</th>
                  <th>Khấu trừ</th>
                  <th>Thực lĩnh</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayroll.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.staffId}</small>
                    </td>
                    <td>{row.department}</td>
                    <td>{formatMoney(row.gross)}</td>
                    <td className="average-income">
                      {formatMoney(row.taxable)}
                    </td>
                    <td>{formatMoney(row.taxable)}</td>
                    <td>{formatMoney(row.deductions)}</td>
                    <td className="net-pay">{formatMoney(row.net)}</td>
                    <td>
                      <span
                        className={`data-status ${row.status === "Đã phát hành" ? "ready" : "pending"}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "employees" && (
        <section className="section-block hr-data-card">
          <div className="hr-data-toolbar">
            <div>
              <span>HỒ SƠ NHÂN SỰ</span>
              <h2>Danh sách nhân viên</h2>
            </div>
            <div className="hr-data-actions">
              <label className="hr-search">
                <Search />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm mã, tên, phòng ban..."
                />
              </label>
              <input
                type="file"
                ref={employeeInput}
                hidden
                accept=".xlsx"
                onChange={(e) => importExcel("employees", e.target.files?.[0])}
              />
              <button onClick={() => downloadHrExcelTemplate("employees")}>
                <Download /> Tải form mẫu
              </button>
              <button
                className="primary-button"
                onClick={() => employeeInput.current?.click()}
              >
                <FileSpreadsheet /> Import Excel
              </button>
            </div>
          </div>
          <div className="hr-table-wrap">
            <table className="hr-data-table employee-admin-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Liên hệ</th>
                  <th>Phòng ban / Chức danh</th>
                  <th>Nơi làm việc</th>
                  <th>Ngày vào</th>
                  <th>Quản lý trực tiếp</th>
                  <th>Máy chấm công</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <strong>{emp.name}</strong>
                      <small>
                        {emp.staffId} · {emp.gender}
                      </small>
                    </td>
                    <td>
                      {emp.email}
                      <small>{emp.phone}</small>
                    </td>
                    <td>
                      {emp.department}
                      <small>{emp.position}</small>
                    </td>
                    <td>{emp.workplace}</td>
                    <td>{emp.startDate}</td>
                    <td>
                      <strong>
                        {employees.find(
                          (manager) => manager.staffId === emp.managerId,
                        )?.name ?? "—"}
                      </strong>
                      <small>{emp.managerId || ""}</small>
                    </td>
                    <td>{employees.device_id}</td>
                    <td>
                      <span
                        className={`data-status ${emp.status === "Đang hoạt động" ? "ready" : "pending"}`}
                      >
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editingDevice && (
        <AttendanceDeviceModal
          device={editingDevice}
          onChange={setEditingDevice}
          onClose={() => setEditingDevice(undefined)}
          onSubmit={handleSaveDevice}
          loading={savingDevice}
        />
      )}

      {editingSchedule && (
        <ScheduleEditModal
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSubmit={handleUpdateSchedule}
          loading={savingSchedule}
        />
      )}
    </div>
  );
}
