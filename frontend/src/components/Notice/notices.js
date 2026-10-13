import { AlarmClock, Clock3, FileText, KeyRound, Reply, WalletCards, } from "lucide-react";
export const initialNotices = [
    { id: 1, title: "Đã ghi nhận chấm công", description: "Check-in lúc 07:58 ngày 14/07 đã được xác nhận.", time: "5 phút trước", read: false, target: "attendance", tone: "blue", icon: Clock3, audience: "employee", year: 2026, attendanceDate: "14/07/2026" },
    { id: 2, title: "Phiếu lương tháng 06/2026", description: "Phiếu lương mới đã được phát hành và thanh toán.", time: "1 giờ trước", read: false, target: "payroll", tone: "green", icon: WalletCards, audience: "employee", year: 2026 },
    { id: 3, title: "Văn bản nghỉ phép đã được duyệt", description: "Yêu cầu nghỉ phép ngày 20/07 - 21/07 đã được phê duyệt.", time: "3 giờ trước", read: false, target: "requests", tone: "orange", icon: FileText, audience: "employee", year: 2026 },
    { id: 4, title: "Nhắc chấm công cuối ca", description: "Bạn đừng quên check-out sau khi kết thúc ca làm việc.", time: "Hôm qua", read: true, target: "attendance", tone: "blue", icon: AlarmClock, audience: "employee", year: 2026, attendanceDate: "14/07/2026" },
    { id: 5, title: "Yêu cầu cấp lại mật khẩu", description: "Nhân viên Lê Thị Mai (NBC012351) vừa gửi yêu cầu hỗ trợ.", time: "12 phút trước", read: false, target: "adminhr", tone: "orange", icon: KeyRound, audience: "admin", year: 2026 },
    { id: 6, title: "Phản hồi thời gian chấm công", description: "Có 2 ý kiến mới đang chờ bộ phận nhân sự trả lời.", time: "35 phút trước", read: false, target: "adminhr", tone: "blue", icon: Reply, audience: "admin", year: 2026 },
];
