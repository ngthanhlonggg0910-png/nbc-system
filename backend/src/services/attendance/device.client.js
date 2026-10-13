import ZKLib from "node-zklib";

export async function getLogsFromAttendanceDevice(device) {
  if (device.protocol !== "ZKTeco TCP") {
    throw new Error(
      `Chỉ hỗ trợ giao thức ZKTeco TCP, hiện tại là ${device.protocol}`,
    );
  }

  return getLogsFromZKTeco(device);
}

// kết nối máy và lấy dl
async function getLogsFromZKTeco(device) {
  const zk = new ZKLib(device.ip, Number(device.port), 10000, 4000);

  try {
    console.log(
      `Đang kết nối máy ${device.name} tại ${device.ip}:${device.port}`,
    );

    await zk.createSocket();

    console.log("✅ Kết nối máy chấm công thành công");

    const result = await zk.getAttendances();

    const attendanceData = result?.data ?? result ?? [];

    console.log("==================================");
    console.log(`Tổng số log trong máy: ${attendanceData.length}`);
    console.log("==================================");

    if (!Array.isArray(attendanceData)) {
      throw new Error("Dữ liệu log từ máy ZKTeco không hợp lệ");
    }

    return attendanceData.map((log) => ({
      device_record_id: String(log.userSn),
      device_user_id: String(log.deviceUserId),
      timestamp: log.recordTime.toISOString(),
    }));
  } catch (error) {
    console.error(
      `[ZKTeco] Lỗi máy ${device.name}:`,
      error?.getError?.() ?? error,
    );
    throw new Error(
      `Không thể lấy log từ máy ZKTeco: ${getZkErrorMessage(error)}`,
    );
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // Bỏ qua lỗi đóng kết nối
    }
  }
}

// Lấy lỗi
function getZkErrorMessage(error) {
  if (typeof error?.toast === "function") {
    return error.toast();
  }

  if (error?.err) {
    const code = error.err.code ? `[${error.err.code}] ` : "";
    const message = error.err.message || String(error.err);

    return `${code}${message} (${error.command ?? "UNKNOWN"} - ${error.ip ?? "unknown IP"})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
