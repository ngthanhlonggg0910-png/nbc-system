import * as attendanceDeviceRepository from "../../repositories/attendance/device.repository.js";

export async function getAllDevices() {
  return attendanceDeviceRepository.findAll();
}

export async function getDeviceById(id) {
  return attendanceDeviceRepository.findById(id);
}

export async function createDevice(data) {
  return attendanceDeviceRepository.create(data);
}

export async function updateDevice(id, data) {
  return attendanceDeviceRepository.update(id, data);
}
