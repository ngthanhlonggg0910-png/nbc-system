// Tính toán lần chạy tiếp theo
export function calculateNextRun(schedule, fromDate = new Date()) {
  if (schedule.frequency === "Hàng ngày") {
    return calculateDailyNextRun(schedule.time, fromDate);
  }

  // if (schedule.frequency === "Theo khoảng") {
  //     return calculateIntervalNextRun(
  //         schedule.interval_minutes,
  //         fromDate
  //     );
  // }

  throw new Error(`Chưa hỗ trợ tần suất: ${schedule.frequency}`);
}

function calculateDailyNextRun(time, fromDate) {
  const [hour, minute, second = 0] = String(time).split(":").map(Number);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error(`Thời gian không hợp lệ: ${time}`);
  }

  // Lấy ngày hiện tại theo Việt Nam UTC+7.
  const vietnamNow = new Date(fromDate.getTime() + 7 * 60 * 60 * 1000);

  const year = vietnamNow.getUTCFullYear();
  const month = vietnamNow.getUTCMonth();
  const day = vietnamNow.getUTCDate();

  // Tạo giờ Việt Nam rồi chuyển thành UTC.
  let nextRun = new Date(Date.UTC(year, month, day, hour - 7, minute, second));

  // Nếu giờ hôm nay đã qua thì chuyển sang ngày mai.
  if (nextRun <= fromDate) {
    nextRun = new Date(nextRun.getTime() + 24 * 60 * 60 * 1000);
  }

  return nextRun;
}

function calculateIntervalNextRun(intervalMinutes, fromDate) {
  const minutes = Number(intervalMinutes);

  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error("interval_minutes phải lớn hơn 0");
  }

  return new Date(fromDate.getTime() + minutes * 60 * 1000);
}
