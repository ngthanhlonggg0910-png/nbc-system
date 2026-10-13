export const attendanceRecords = [
    { day: 1, date: "01/07/2026", weekday: "Thứ Tư", checkIn: "07:27", checkOut: "16:32", hours: 8.08, status: "full", note: "Đủ công" },
    { day: 2, date: "02/07/2026", weekday: "Thứ Năm", checkIn: "07:30", checkOut: "16:35", hours: 8.08, status: "full", note: "Đủ công" },
    { day: 3, date: "03/07/2026", weekday: "Thứ Sáu", checkIn: "07:49", checkOut: "16:33", hours: 7.73, status: "late", note: "Đi trễ 19 phút" },
    { day: 6, date: "06/07/2026", weekday: "Thứ Hai", checkIn: "—", checkOut: "—", hours: 0, status: "absent", note: "Vắng không phép" },
    { day: 7, date: "07/07/2026", weekday: "Thứ Ba", checkIn: "07:25", checkOut: "16:32", hours: 8.12, status: "full", note: "Đủ công" },
    { day: 8, date: "08/07/2026", weekday: "Thứ Tư", checkIn: "07:28", checkOut: "16:31", hours: 8.05, status: "full", note: "Đủ công" },
    { day: 9, date: "09/07/2026", weekday: "Thứ Năm", checkIn: "07:51", checkOut: "16:30", hours: 7.65, status: "late", note: "Đi trễ 21 phút" },
    { day: 10, date: "10/07/2026", weekday: "Thứ Sáu", checkIn: "07:24", checkOut: "16:34", hours: 8.17, status: "full", note: "Đủ công" },
    { day: 13, date: "13/07/2026", weekday: "Thứ Hai", checkIn: "07:26", checkOut: "16:32", hours: 8.10, status: "full", note: "Đủ công" },
    { day: 14, date: "14/07/2026", weekday: "Thứ Ba", checkIn: "07:58", checkOut: "17:05", hours: 8.17, status: "full", note: "Đủ công" },
];
export const initialFeedbacks = [
    { id: 1, employee: "Nguyễn Văn An", staffId: "NBC012345", date: "09/07/2026", message: "Ngày 09/07 máy chấm công ghi nhận tôi vào lúc 07:51, nhưng tôi đã có mặt tại cổng lúc 07:29. Nhờ HR kiểm tra camera.", createdAt: "10/07/2026 · 08:15", status: "pending" },
    { id: 2, employee: "Lê Thị Mai", staffId: "NBC012351", date: "06/07/2026", message: "Tôi đã xin nghỉ phép nhưng hệ thống đang hiển thị vắng không phép.", createdAt: "07/07/2026 · 09:20", status: "pending" },
    { id: 3, employee: "Trần Quốc Bình", staffId: "NBC012328", date: "03/07/2026", message: "Nhờ xác nhận lại giờ check-out ca ngày 03/07.", createdAt: "04/07/2026 · 10:05", status: "answered", reply: "HR đã đối chiếu và cập nhật check-out thành 16:34." },
];
export const initialAttendanceDevices = [
    { id: 1, code: "MCC-CONG-01", name: "Máy cổng chính", ip: "192.168.10.21", port: 4370, password: "••••••••", protocol: "ZKTeco TCP", location: "Cổng chính · Nhà máy VSIP II", enabled: true, status: "online", lastSync: "14/07/2026 · 17:12" },
    { id: 2, code: "MCC-VP-01", name: "Máy văn phòng", ip: "192.168.10.22", port: 4370, password: "••••••••", protocol: "ZKTeco TCP", location: "Sảnh văn phòng NBC", enabled: true, status: "online", lastSync: "14/07/2026 · 17:10" },
    { id: 3, code: "MCC-XUONG-02", name: "Máy xưởng Line 2", ip: "192.168.10.31", port: 4370, password: "••••••••", protocol: "Gateway nội bộ", location: "Xưởng sản xuất · Line 2", enabled: false, status: "offline" },
];
export const initialSyncSchedules = [
    { id: 1, name: "Đồng bộ đầu ca", deviceId: 1, time: "08:00", frequency: "Ngày làm việc", enabled: true, lastRun: "14/07/2026 · 08:00", nextRun: "15/07/2026 · 08:00" },
    { id: 2, name: "Đồng bộ cuối ca", deviceId: 1, time: "17:15", frequency: "Ngày làm việc", enabled: true, lastRun: "14/07/2026 · 17:15", nextRun: "15/07/2026 · 17:15" },
    { id: 3, name: "Dữ liệu văn phòng", deviceId: 2, time: "18:00", frequency: "Hàng ngày", enabled: true, lastRun: "14/07/2026 · 18:00", nextRun: "15/07/2026 · 18:00" },
];
export const initialAttendanceEntries = attendanceRecords.map((record, index) => ({
    id: 1000 + index,
    date: record.date,
    month: "2026-07",
    staffId: "NBC012345",
    name: "Nguyễn Văn An",
    department: "Phòng Sản xuất",
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    hours: record.hours,
    status: record.status,
    deviceIn: record.status === "absent" ? "" : "MCC-CONG-01",
    deviceOut: record.status === "absent" ? "" : "MCC-CONG-01",
    note: record.note,
}));
export const initialRawAttendanceLogs = attendanceRecords
    .filter((record) => record.status !== "absent")
    .flatMap((record, index) => [
    { id: 2000 + index * 2, staffId: "NBC012345", name: "Nguyễn Văn An", deviceId: 1, timestamp: `${record.date} ${record.checkIn}`, direction: "Vào", verifyMode: "Vân tay", status: "Đã xử lý" },
    { id: 2001 + index * 2, staffId: "NBC012345", name: "Nguyễn Văn An", deviceId: 1, timestamp: `${record.date} ${record.checkOut}`, direction: "Ra", verifyMode: "Vân tay", status: "Đã xử lý" },
]);
