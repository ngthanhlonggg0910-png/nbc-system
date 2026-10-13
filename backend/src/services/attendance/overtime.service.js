import * as repositories from "../../repositories/attendance/overtime.repository.js";

function normalizeDate(date) {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function calculateEmployeeOvertime(staff_id, date, client) {
  const normalizedDate = normalizeDate(date);

  console.log("[Overtime] Calculate:", {
    staff_id,
    date,
    normalizedDate,
  });

  const request = await repositories.findApprovedOvertimeRequest(
    staff_id,
    normalizedDate,
    client,
  );

  if (!request) {
    console.log("[Overtime] Không tìm thấy đơn");
    return null;
  }

  const result = await repositories.calculateOvertime(
    {
      staff_id,
      date: normalizedDate,
      start_time: request.start_time,
      end_time: request.end_time,
    },
    client,
  );

  console.log("[Overtime] Updated:", result);

  return result;
}
