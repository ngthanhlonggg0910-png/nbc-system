import axios from "axios";
import { normalizeShift } from "../utils/attendance-shift.utils";

const SHIFT_MODE = import.meta.env.VITE_SHIFT_MODE?.trim() || "mock";
const MOCK_SHIFTS_KEY = "nbc-attendance-mock-shifts";
const MOCK_ASSIGNMENTS_KEY = "nbc-attendance-mock-shift-assignments";
const shiftClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

shiftClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("nbc-access-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const defaultShift = {
  id: 1,
  name: "Ca hành chính",
  startTime: "08:00",
  endTime: "17:00",
  breakStart: "12:00",
  breakEnd: "13:00",
  source: "default",
  effectiveDate: "2026-08-05",
  isActive: true,
};

function readMockCollection(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function persistMockState() {
  localStorage.setItem(MOCK_SHIFTS_KEY, JSON.stringify(mockShifts));
  localStorage.setItem(MOCK_ASSIGNMENTS_KEY, JSON.stringify(mockAssignments));
}

let mockShifts = readMockCollection(MOCK_SHIFTS_KEY, [defaultShift])
  .map(normalizeShift)
  .filter(Boolean);
let mockAssignments = readMockCollection(MOCK_ASSIGNMENTS_KEY, []);

if (mockShifts.length === 0) mockShifts = [defaultShift];

function normalizeResponse(response) {
  return normalizeShift(response.data?.data ?? response.data);
}

export async function getCurrentShift(date, signal) {
  if (SHIFT_MODE === "mock") {
    if (signal?.aborted)
      throw new DOMException("Request aborted", "AbortError");
    const shift = mockShifts.find(
      (item) =>
        item.isActive &&
        item.source === "default" &&
        (!date || !item.effectiveDate || item.effectiveDate <= date),
    );
    return normalizeShift(shift);
  }
  const response = await shiftClient.get("/api/shifts/current", {
    params: { date },
    signal,
  });
  return normalizeResponse(response);
}

export async function getShifts(signal) {
  if (SHIFT_MODE === "mock") {
    if (signal?.aborted)
      throw new DOMException("Request aborted", "AbortError");
    return mockShifts.map(normalizeShift);
  }
  const response = await shiftClient.get("/api/shifts", { signal });
  const rows = response.data?.data ?? response.data ?? [];
  return Array.isArray(rows) ? rows.map(normalizeShift) : [];
}

export async function createShift(data) {
  if (SHIFT_MODE === "mock") {
    const shift = normalizeShift({
      ...data,
      id: Math.max(0, ...mockShifts.map((item) => Number(item.id) || 0)) + 1,
    });
    mockShifts = [...mockShifts, shift];
    persistMockState();
    return shift;
  }
  return normalizeResponse(await shiftClient.post("/api/shifts", data));
}

export async function updateShift(id, data) {
  if (SHIFT_MODE === "mock") {
    mockShifts = mockShifts.map((item) =>
      String(item.id) === String(id)
        ? normalizeShift({ ...item, ...data, id: item.id })
        : item,
    );
    const updatedShift =
      mockShifts.find((item) => String(item.id) === String(id)) ?? null;
    if (!updatedShift)
      throw new Error("Không tìm thấy ca làm việc cần cập nhật.");
    persistMockState();
    return updatedShift;
  }
  return normalizeResponse(await shiftClient.patch(`/api/shifts/${id}`, data));
}

export async function setDefaultShift(id, effectiveDate) {
  if (SHIFT_MODE === "mock") {
    mockShifts = mockShifts.map((item) =>
      normalizeShift({
        ...item,
        source: String(item.id) === String(id) ? "default" : "assigned",
        effectiveDate:
          String(item.id) === String(id) ? effectiveDate : item.effectiveDate,
      }),
    );
    const defaultShift =
      mockShifts.find((item) => String(item.id) === String(id)) ?? null;
    if (!defaultShift)
      throw new Error("Không tìm thấy ca làm việc cần đặt mặc định.");
    persistMockState();
    return defaultShift;
  }
  return normalizeResponse(
    await shiftClient.patch(`/api/shifts/${id}/default`, { effectiveDate }),
  );
}

export async function assignShift(data) {
  if (SHIFT_MODE === "mock") {
    const assignment = { ...data, id: Date.now() };
    mockAssignments = [...mockAssignments, assignment];
    persistMockState();
    return assignment;
  }
  return (await shiftClient.post("/api/shift-assignments", data)).data?.data;
}

export async function getShiftAssignments(params, signal) {
  if (SHIFT_MODE === "mock") {
    if (signal?.aborted)
      throw new DOMException("Request aborted", "AbortError");
    return mockAssignments.filter((item) =>
      Object.entries(params ?? {}).every(
        ([key, value]) => value == null || String(item[key]) === String(value),
      ),
    );
  }
  const response = await shiftClient.get("/api/shift-assignments", {
    params,
    signal,
  });
  return response.data?.data ?? [];
}

export async function deleteShift(id) {
  if (SHIFT_MODE === "mock") {
    const shift = mockShifts.find((item) => String(item.id) === String(id));
    if (!shift) throw new Error("Không tìm thấy ca làm việc cần xóa.");
    if (shift.source === "default")
      throw new Error("Không thể xóa ca mặc định.");
    mockShifts = mockShifts.filter((item) => String(item.id) !== String(id));
    mockAssignments = mockAssignments.filter(
      (item) => String(item.shiftId ?? item.shift_id) !== String(id),
    );
    persistMockState();
    return;
  }
  await shiftClient.delete(`/api/shifts/${id}`);
}
