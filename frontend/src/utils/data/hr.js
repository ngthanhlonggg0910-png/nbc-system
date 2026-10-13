import { initialAttendanceDevices, initialAttendanceEntries, initialRawAttendanceLogs, initialSyncSchedules, } from "./attendance";
import { initialAdminPayrollRows } from "./payroll";
export const initialHrAdminState = {
    devices: [],
    schedules: initialSyncSchedules,
    rawLogs: initialRawAttendanceLogs,
    attendanceEntries: initialAttendanceEntries,
    payrollRows: initialAdminPayrollRows,
};
