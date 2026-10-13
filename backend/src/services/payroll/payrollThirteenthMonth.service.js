import { ErrorHandler } from "../../middleware/errorMiddleware.js";
import * as repository from "../../repositories/payroll/payrollThirteenthMonth.repository.js";

function validateYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ErrorHandler("Năm chính sách không hợp lệ", 400);
  }
  return year;
}

function validateCoefficient(value) {
  const coefficient = Number(value);
  if (!Number.isFinite(coefficient) || coefficient < 0 || coefficient > 5) {
    throw new ErrorHandler("Hệ số phải nằm trong khoảng từ 0 đến 5", 400);
  }
  return Math.round(coefficient * 1000) / 1000;
}

function mapPolicy(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    year: Number(row.policy_year),
    defaultCoefficient: Number(row.default_coefficient),
    status: row.status,
    notes: row.notes ?? "",
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export async function getPolicyWorkspace(rawYear) {
  const year = validateYear(rawYear);
  const [policyRow, employeeRows] = await Promise.all([
    repository.findPolicyByYear(year),
    repository.listEmployeesForPolicy(year),
  ]);
  const policy = mapPolicy(policyRow);
  const defaultCoefficient = policy?.defaultCoefficient ?? null;
  const employees = employeeRows.map((row) => {
    const overrideCoefficient = row.override_coefficient === null
      ? null
      : Number(row.override_coefficient);
    return {
      staffId: row.staff_id,
      fullName: row.full_name || row.staff_id,
      department: row.department_name,
      jobTitle: row.job_title_name,
      workLocation: row.work_location_name,
      role: row.role_code,
      overrideCoefficient,
      overrideReason: row.override_reason,
      effectiveCoefficient: overrideCoefficient ?? defaultCoefficient,
      source: policy
        ? overrideCoefficient === null ? "system_default" : "employee_override"
        : null,
      overrideUpdatedAt: row.override_updated_at,
    };
  });
  const overrideCount = employees.filter((employee) => employee.overrideCoefficient !== null).length;

  return {
    year,
    policy,
    summary: {
      totalEmployees: employees.length,
      inheritedCount: policy ? employees.length - overrideCount : 0,
      overrideCount,
      unconfiguredCount: policy ? 0 : employees.length,
    },
    employees,
  };
}

export async function savePolicy({ year: rawYear, payload, actorStaffId }) {
  const year = validateYear(rawYear);
  const defaultCoefficient = validateCoefficient(payload?.defaultCoefficient);
  const status = payload?.status ?? "draft";
  if (!['draft', 'published'].includes(status)) {
    throw new ErrorHandler("Trạng thái chính sách không hợp lệ", 400);
  }
  const notes = typeof payload?.notes === "string" ? payload.notes.trim() : "";
  if (notes.length > 1000) {
    throw new ErrorHandler("Ghi chú không được vượt quá 1000 ký tự", 400);
  }
  const row = await repository.upsertPolicy({
    year,
    defaultCoefficient,
    status,
    notes: notes || null,
    actorStaffId,
  });
  return mapPolicy(row);
}

export async function saveEmployeeOverride({ year: rawYear, staffId, payload, actorStaffId }) {
  const year = validateYear(rawYear);
  const normalizedStaffId = String(staffId ?? "").trim();
  const coefficient = validateCoefficient(payload?.coefficient);
  const reason = typeof payload?.reason === "string" ? payload.reason.trim() : "";
  if (reason.length < 3 || reason.length > 500) {
    throw new ErrorHandler("Lý do ngoại lệ phải từ 3 đến 500 ký tự", 400);
  }
  const [policy, exists] = await Promise.all([
    repository.findPolicyByYear(year),
    repository.employeeExists(normalizedStaffId),
  ]);
  if (!policy) throw new ErrorHandler("Hãy tạo chính sách năm trước khi thêm ngoại lệ", 409);
  if (!exists) throw new ErrorHandler("Không tìm thấy nhân viên đang hoạt động", 404);

  const row = await repository.upsertEmployeeOverride({
    policyId: policy.id,
    staffId: normalizedStaffId,
    coefficient,
    reason,
    actorStaffId,
  });
  return {
    staffId: row.staff_id,
    coefficient: Number(row.coefficient),
    reason: row.reason,
    updatedAt: row.updated_at,
  };
}

export async function removeEmployeeOverride({ year: rawYear, staffId }) {
  const year = validateYear(rawYear);
  const policy = await repository.findPolicyByYear(year);
  if (!policy) throw new ErrorHandler("Không tìm thấy chính sách năm", 404);
  const removed = await repository.deleteEmployeeOverride({
    policyId: policy.id,
    staffId: String(staffId ?? "").trim(),
  });
  if (!removed) throw new ErrorHandler("Nhân viên không có cấu hình ngoại lệ", 404);
  return { staffId, inheritedCoefficient: Number(policy.default_coefficient) };
}

export async function getEffectiveEmployeePolicy({ year: rawYear, staffId }) {
  const year = validateYear(rawYear);
  const row = await repository.findEffectiveEmployeePolicy({ year, staffId });
  if (!row) {
    return { configured: false, year, coefficient: null, source: null, publishedAt: null };
  }
  const hasOverride = row.override_coefficient !== null;
  return {
    configured: true,
    year,
    coefficient: Number(hasOverride ? row.override_coefficient : row.default_coefficient),
    source: hasOverride ? "employee_override" : "system_default",
    publishedAt: row.published_at,
  };
}
