import * as attendanceDeviceService from "../../services/attendance/device.service.js";

export async function getAllDevices(req, res, next) {
  try {
    const devices = await attendanceDeviceService.getAllDevices();

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách máy chấm công thành công",
      data: devices,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDeviceById(req, res, next) {
  try {
    const deviceId = Number(req.params.id);

    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID máy chấm công không hợp lệ",
      });
    }

    const device = await attendanceDeviceService.getDeviceById(deviceId);

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin máy chấm công thành công",
      data: device,
    });
  } catch (error) {
    next(error);
  }
}

export async function createDevice(req, res, next) {
  try {
    const device = await attendanceDeviceService.createDevice(req.body);

    return res.status(201).json({
      success: true,
      message: "Thêm máy chấm công thành công",
      data: device,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDevice(req, res, next) {
  try {
    const deviceId = Number(req.params.id);

    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID máy chấm công không hợp lệ",
      });
    }

    const device = await attendanceDeviceService.updateDevice(
      deviceId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật máy chấm công thành công",
      data: device,
    });
  } catch (error) {
    next(error);
  }
}
