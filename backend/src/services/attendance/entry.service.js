import pool from "../../config/db.js";

import { findEmployeeShift } from "../../repositories/attendance/employee.repository.js";
import {
  findAttendanceContextByDeviceStaffId,
  findAttendanceContextByStaffId,
} from "../../repositories/attendance/staff-device-mapping.repository.js";

import {
  findAttendanceLogsByDeviceStaffIdAndDate,
  findPendingAttendanceLogs,
  markAttendanceLogsError,
  markAttendanceLogsProcessed,
} from "../../repositories/attendance/log.repository.js";

import * as entryRepository from "../../repositories/attendance/entry.repository.js";
import { calculateEmployeeOvertime } from "./overtime.service.js";

function getVietnamDate(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function groupLogsByDeviceStaffIdAndDate(logs) {
  const groups = new Map();

  for (const log of logs) {
    const staffIdDevice = String(log.device_user_id ?? "").trim();
    const date = getVietnamDate(log.timestamp);
    const key = `${staffIdDevice}_${date}`;

    if (!groups.has(key)) {
      groups.set(key, {
        staff_id_device: staffIdDevice,
        date,
        logs: [],
      });
    }

    groups.get(key).logs.push(log);
  }

  return [...groups.values()];
}

function createVietnamDateTime(date, time) {
  if (!date || !time) {
    return null;
  }

  const normalizedTime = String(time).slice(0, 8);

  return new Date(`${date}T${normalizedTime}+07:00`);
}

function calculateWorkdayUnits(workedMinutes, standardMinutes) {
  if (!Number.isFinite(standardMinutes) || standardMinutes <= 0) {
    return 0;
  }

  return Number((workedMinutes / standardMinutes).toFixed(2));
}

// Tính công
function calculateAttendance(group, shift) {
  const sortedLogs = [...group.logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  if (sortedLogs.length === 0) {
    throw new Error(`Không có log chấm công của nhân viên ${group.staff_id}`);
  }

  if (!shift) {
    throw new Error(`Nhân viên ${group.staff_id} chưa được gán ca làm việc`);
  }

  const firstLog = sortedLogs[0];

  const lastLog =
    sortedLogs.length >= 2 ? sortedLogs[sortedLogs.length - 1] : null;

  const checkIn = new Date(firstLog.timestamp);

  const checkOut = lastLog ? new Date(lastLog.timestamp) : null;

  const shiftStart = createVietnamDateTime(group.date, shift.start_time);

  let shiftEnd = createVietnamDateTime(group.date, shift.end_time);

  if (!shiftStart || !shiftEnd) {
    throw new Error(
      `Ca ${shift.name ?? shift.id} thiếu start_time hoặc end_time`,
    );
  }

  if (shift.crosses_midnight === true || shiftEnd <= shiftStart) {
    shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  let workedMinutes = 0;
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;
  let workdayUnits = 0;
  let status = [];

  if (!checkOut) {
    status.push("missing_punch");
  } else {
    const totalPresenceMinutes = Math.max(
      0,
      Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000),
    );

    const standardMinutes = Number(shift.standard_work_minutes ?? 480);

    const breakMinutes = Number(shift.break_minutes ?? 0);

    const breakStart = createVietnamDateTime(
      group.date,
      shift.break_start ?? "12:00:00",
    );
    const configuredBreakEnd = shift.break_end
      ? createVietnamDateTime(group.date, shift.break_end)
      : null;
    const breakEnd = configuredBreakEnd ?? (
      breakStart
        ? new Date(breakStart.getTime() + breakMinutes * 60000)
        : null
    );
    const overlappingBreakMinutes = breakMinutes > 0 && breakStart && breakEnd
      ? Math.max(
          0,
          Math.min(
            breakMinutes,
            Math.floor(
              (Math.min(checkOut.getTime(), breakEnd.getTime())
                - Math.max(checkIn.getTime(), breakStart.getTime())) / 60000,
            ),
          ),
        )
      : 0;

    let totalWorkedMinutes = totalPresenceMinutes - overlappingBreakMinutes;

    totalWorkedMinutes = Math.max(0, totalWorkedMinutes);

    const lateGraceMinutes = Number(shift.late_grace_minutes ?? 0);

    const earlyLeaveGraceMinutes = Number(shift.early_leave_grace_minutes ?? 0);

    const lateThreshold = new Date(
      shiftStart.getTime() + lateGraceMinutes * 60000,
    );

    if (checkIn > lateThreshold) {
      lateMinutes = Math.max(
        0,
        Math.floor((checkIn.getTime() - shiftStart.getTime()) / 60000),
      );
    }

    const earlyLeaveThreshold = new Date(
      shiftEnd.getTime() - earlyLeaveGraceMinutes * 60000,
    );

    if (checkOut < earlyLeaveThreshold) {
      earlyLeaveMinutes = Math.max(
        0,
        Math.floor((shiftEnd.getTime() - checkOut.getTime()) / 60000),
      );
    }

    // if (checkOut > shiftEnd) {
    //   overtimeMinutes = Math.max(
    //     0,
    //     Math.floor((checkOut.getTime() - shiftEnd.getTime()) / 60000),
    //   );
    // }

    workedMinutes = Math.min(totalWorkedMinutes, standardMinutes);

    workdayUnits = calculateWorkdayUnits(workedMinutes, standardMinutes);

    if (lateMinutes > 0) {
      status.push("late");
    }

    if (earlyLeaveMinutes > 0) {
      status.push("early_leave");
    }

    // if (overtimeMinutes > 0) {
    //   status.push("overtime");
    // }

    if (status.length === 0) {
      status.push("full");
    }
  }

  const hours = Number((workedMinutes / 60).toFixed(2));

  return {
    staff_id: String(group.staff_id),
    date: group.date,

    check_in: checkIn.toISOString(),
    check_out: checkOut?.toISOString() ?? null,

    hours,
    status,

    device_in: firstLog.device_id != null ? String(firstLog.device_id) : null,

    device_out: lastLog?.device_id != null ? String(lastLog.device_id) : null,

    note: null,
    shift_id: shift.id,

    worked_minutes: workedMinutes,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    overtime_minutes: overtimeMinutes,
    workday_units: workdayUnits,

    is_manually_adjusted: false,
    calculated_at: new Date(),

    log_ids: sortedLogs.map((log) => log.id),
  };
}

async function saveCalculatedAttendance(attendance, client) {
  return await entryRepository.upsertAttendanceEntry(
    {
      staff_id: attendance.staff_id,
      date: attendance.date,
      check_in: attendance.check_in,
      check_out: attendance.check_out,
      hours: attendance.hours,
      status: attendance.status,
      device_in: attendance.device_in,
      device_out: attendance.device_out,
      note: attendance.note,
      shift_id: attendance.shift_id,
      worked_minutes: attendance.worked_minutes,
      late_minutes: attendance.late_minutes,
      early_leave_minutes: attendance.early_leave_minutes,
      // overtime_minutes: attendance.overtime_minutes,
      workday_units: attendance.workday_units,
      is_manually_adjusted: attendance.is_manually_adjusted,
      calculated_at: attendance.calculated_at,
    },
    client,
  );
}

export async function processPendingAttendanceLogs() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pendingLogs = await findPendingAttendanceLogs(client);

    console.log(`[Attendance Process] Số log chờ xử lý: ${pendingLogs.length}`);

    if (pendingLogs.length === 0) {
      await client.query("COMMIT");

      return {
        total_logs: 0,
        processed_logs: 0,
        processed_groups: 0,
        skipped_groups: 0,
        message: "Không có log chờ xử lý",
      };
    }

    const groups = groupLogsByDeviceStaffIdAndDate(pendingLogs);

    let processedGroups = 0;
    let processedLogs = 0;
    let skippedGroups = 0;

    for (const group of groups) {
      if (!group.staff_id_device) {
        console.error(
          `[Attendance Process] Log is missing device_user_id for ${group.date}`,
        );

        await markAttendanceLogsError(
          group.logs.map((log) => log.id),
          "Log is missing device_user_id",
          client,
        );

        skippedGroups += 1;
        continue;
      }

      const allLogs = await findAttendanceLogsByDeviceStaffIdAndDate(
        group.staff_id_device,
        group.date,
        client,
      );

      if (allLogs.length === 0) {
        console.error(
          `[Attendance Process] No logs found for device staff ID ${group.staff_id_device} on ${group.date}`,
        );

        skippedGroups += 1;
        continue;
      }

      const context = await findAttendanceContextByDeviceStaffId(
        group.staff_id_device,
        client,
      );

      if (!context) {
        console.error(
          `[Attendance Process] No attendance mapping or shift for device staff ID ${group.staff_id_device}`,
        );

        await markAttendanceLogsError(
          group.logs.map((log) => log.id),
          `No attendance mapping or shift for device staff ID ${group.staff_id_device}`,
          client,
        );

        skippedGroups += 1;
        continue;
      }

      const attendance = calculateAttendance(
        {
          staff_id: context.staff_id,
          date: group.date,
          logs: allLogs,
        },
        context,
      );

      const savedEntry = await saveCalculatedAttendance(attendance, client);

      if (!savedEntry) {
        throw new Error(
          `Could not save attendance entry for ${context.staff_id} on ${group.date}`,
        );
      }

      await calculateEmployeeOvertime(context.staff_id, group.date, client);

      await markAttendanceLogsProcessed(
        group.logs.map((log) => log.id),
        client,
      );

      processedGroups += 1;
      processedLogs += group.logs.length;
    }

    await client.query("COMMIT");

    return {
      total_logs: pendingLogs.length,
      processed_logs: processedLogs,
      processed_groups: processedGroups,
      skipped_groups: skippedGroups,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("[Attendance Process] Rollback do lỗi:", error);

    throw error;
  } finally {
    client.release();
  }
}

export async function rebuildAttendanceEntry(staffId, date) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const context = await findAttendanceContextByStaffId(staffId, client);

    if (!context) {
      throw new Error(`No attendance mapping or shift found for ${staffId}`);
    }

    const logs = await findAttendanceLogsByDeviceStaffIdAndDate(
      context.staff_id_device,
      date,
      client,
    );

    if (logs.length === 0) {
      throw new Error(`Không có log chấm công của ${staffId} ngày ${date}`);
    }

    const attendance = calculateAttendance(
      {
        staff_id: staffId,
        date,
        logs,
      },
      context,
    );

    const entry = await saveCalculatedAttendance(attendance, client);

    await client.query("COMMIT");

    return entry;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAttendanceEntries() {
  return await entryRepository.findAttendanceEntries();
}

export async function applyManualAttendanceAdjustment(
  { staffId, date, checkIn, checkOut, note },
  client = pool,
) {
  const shift = await findEmployeeShift(staffId, client);
  if (!shift) throw new Error(`Nhân viên ${staffId} chưa được gán ca làm việc`);
  const existing = await entryRepository.findAttendanceEntryByStaffAndDate(
    staffId,
    date,
    client,
  );
  const checkInAt = createVietnamDateTime(date, checkIn);
  const checkOutAt = createVietnamDateTime(date, checkOut);
  if (!checkInAt || !checkOutAt || checkOutAt <= checkInAt)
    throw new Error("Giờ điều chỉnh không hợp lệ");
  const attendance = calculateAttendance(
    {
      staff_id: String(staffId),
      date,
      logs: [
        {
          id: `manual-in-${Date.now()}`,
          timestamp: checkInAt,
          device_id: existing?.device_in ?? null,
        },
        {
          id: `manual-out-${Date.now()}`,
          timestamp: checkOutAt,
          device_id: existing?.device_out ?? null,
        },
      ],
    },
    shift,
  );
  return entryRepository.upsertAttendanceEntry(
    {
      ...attendance,
      device_in: existing?.device_in ?? attendance.device_in,
      device_out: existing?.device_out ?? attendance.device_out,
      note: note || "HR điều chỉnh từ phản hồi chấm công",
      is_manually_adjusted: true,
      calculated_at: new Date(),
    },
    client,
  );
}

export async function getMonthlyEntriesByEmployeeId(staffId, month) {
  return await entryRepository.getMonthlyEntriesByEmployeeId(staffId, month);
}
