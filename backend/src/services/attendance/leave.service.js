import * as repositories from "../../repositories/attendance/leave.repository.js";

export async function applyApprovedLeave(request, client) {
  console.log("[Leave] applyApprovedLeave chạy:", request);

  if (!request.start_date || !request.end_date) {
    throw new Error("Đơn nghỉ phép thiếu start_date hoặc end_date");
  }

  const start = new Date(request.start_date);
  const end = new Date(request.end_date);

  for (
    let current = new Date(start);
    current <= end;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    const date = current.toISOString().slice(0, 10);

    console.log("[Leave] upsert ngày:", date);

    const result = await repositories.upsertLeaveAttendance(
      {
        staff_id: request.staff_id,
        date,
      },
      client,
    );

    console.log("[Leave] upsert result:", result);
  }
}
