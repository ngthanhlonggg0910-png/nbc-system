import * as dashboardRepo from "../../repositories/dashboard/dashboard.repository.js";
import { countUnreadNotifications } from "../../repositories/notification/notification.repository.js";
import { findEmployeeShift } from "../../repositories/attendance/employee.repository.js";
import pool from "../../config/db.js";

export async function getDashboardSummary(staffId) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
    const todayDateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // 1. Employee Profile
    const profile = await dashboardRepo.findEmployeeProfile(staffId);
    if (!profile) {
        throw new Error("Employee profile not found");
    }

    const employee = {
        staffId: profile.staff_id,
        name: `${profile.last_name} ${profile.first_name}`.trim(),
        position: profile.position ?? "Nhân viên",
        department: profile.department ?? "Nhabe Corporation",
        avatarUrl: profile.avatar_url,
    };

    // 2. Document Count
    const documentCount = await dashboardRepo.findDocumentCount(staffId, currentYear);

    // 3. Unread Notifications Count
    const unreadNotificationCount = await countUnreadNotifications(staffId);

    // 4. Today's Attendance & Shift
    const todayAttendance = await dashboardRepo.findTodayAttendance(staffId, todayDateStr);
    let todayShift = null;

    if (todayAttendance) {
        todayShift = {
            shiftName: todayAttendance.shift_name ?? "Ca ngày",
            startTime: todayAttendance.start_time?.slice(0, 5) ?? "07:30",
            endTime: todayAttendance.end_time?.slice(0, 5) ?? "16:30",
            breakStart: todayAttendance.break_minutes ? "12:00" : null,
            breakEnd: todayAttendance.break_minutes ? "13:00" : null,
            checkIn: todayAttendance.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null,
            checkOut: todayAttendance.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null,
            status: todayAttendance.status,
        };
    } else {
        // Fallback to assigned shift
        const assignedShift = await findEmployeeShift(staffId, pool);
        if (assignedShift) {
            todayShift = {
                shiftName: assignedShift.name,
                startTime: assignedShift.start_time?.slice(0, 5),
                endTime: assignedShift.end_time?.slice(0, 5),
                breakStart: assignedShift.break_minutes ? "12:00" : null,
                breakEnd: assignedShift.break_minutes ? "13:00" : null,
                checkIn: null,
                checkOut: null,
                status: "absent", // Not checked in yet
            };
        } else {
            // Default shift fallback
            todayShift = {
                shiftName: "Ca ngày",
                startTime: "07:30",
                endTime: "16:30",
                breakStart: "12:00",
                breakEnd: "13:00",
                checkIn: null,
                checkOut: null,
                status: "absent",
            };
        }
    }

    // 5. Monthly Attendance Summary
    const monthlyEntries = await dashboardRepo.findMonthlyAttendanceEntries(staffId, currentMonthStr);
    const workedEntries = monthlyEntries.filter((entry) => entry.status !== "absent");
    const workedDays = workedEntries.length;
    const scheduledDays = monthlyEntries.length;
    const lateDays = monthlyEntries.filter((entry) => entry.status === "late").length;
    const absentDays = monthlyEntries.filter((entry) => entry.status === "absent").length;
    const totalHours = monthlyEntries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
    const expectedHours = scheduledDays * 8;
    const averageHoursPerDay = workedDays > 0 ? totalHours / workedDays : 0;

    const attendanceSummary = {
        month: currentMonthStr,
        workedDays,
        scheduledDays,
        lateDays,
        absentDays,
        totalHours: parseFloat(totalHours.toFixed(1)),
        expectedHours,
        averageHoursPerDay: parseFloat(averageHoursPerDay.toFixed(1)),
    };

    // 6. Latest Payslip
    const latestPayslipRaw = await dashboardRepo.findLatestPayslip(staffId);
    let latestPayslip = null;
    if (latestPayslipRaw) {
        const [year, month] = latestPayslipRaw.period_code.split("-");
        latestPayslip = {
            month: `${month}/${year}`,
            netSalary: parseFloat(latestPayslipRaw.net_salary),
            paidAt: latestPayslipRaw.paid_at ? new Date(latestPayslipRaw.paid_at).toLocaleDateString("vi-VN") : null,
        };
    }

    return {
        employee,
        attendanceSummary,
        todayShift,
        documentCount,
        unreadNotificationCount,
        latestPayslip,
        monthlyEntries,
    };
}
