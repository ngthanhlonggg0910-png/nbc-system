import { ErrorHandler } from "../../middleware/errorMiddleware.js";
import * as repository from "../../repositories/payroll/payrollPeriodOperations.repository.js";
import * as periodRepository from "../../repositories/payroll/payrollPeriod.repository.js";
import pool from "../../config/db.js";

const number = (value) => Number(value) || 0;
const dateOnly = (value) => value ? (typeof value === "string" ? value.slice(0, 10) : `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`) : null;

function deriveStatus(row) {
  if (row.status === "locked") return "locked";
  if (row.status === "published") return number(row.adjustment_count) ? "adjusting" : "released";
  if (number(row.total_payslips) > 0 && number(row.blocking_payslips) === 0 && number(row.invalid_rows) === 0) return "ready_to_release";
  if (number(row.total_payslips) > 0) return "reconciling";
  if (number(row.import_count) > 0) return "importing";
  return row.opened_at ? "open" : "draft";
}

function workflowFor(row) {
  const operationalStatus = deriveStatus(row);
  const completed = operationalStatus === "locked" ? 7 : operationalStatus === "adjusting" ? 6 : operationalStatus === "released" ? 5 : operationalStatus === "ready_to_release" ? 4 : operationalStatus === "reconciling" ? 3 : operationalStatus === "importing" ? 2 : 1;
  const dates = [row.created_at, row.last_import_at, row.updated_at, null, row.published_at, number(row.adjustment_count) ? row.updated_at : null, row.closed_at];
  const labels = ["Tạo kỳ", "Nhập dữ liệu", "Đối soát", "Sẵn sàng phát hành", "Phát hành", "Điều chỉnh", "Khóa kỳ"];
  return { currentStep: completed, totalSteps: 7, progress: Math.round(completed / 7 * 100), steps: labels.map((label,index) => ({ key: index + 1, label, state: index + 1 < completed || operationalStatus === "locked" ? "done" : index + 1 === completed ? "current" : "pending", updatedAt: dates[index] || null })) };
}

function mapPeriod(row) {
  const gross = number(row.total_gross);
  const employees = number(row.total_employees);
  const workflow = workflowFor(row);
  return {
    id: number(row.id), periodCode: String(row.period_code).trim(), periodName: row.period_name,
    startDate: dateOnly(row.start_date), endDate: dateOnly(row.end_date), paymentDate: dateOnly(row.payment_date),
    status: row.status, operationalStatus: deriveStatus(row), manager: { id: row.manager_id || row.created_by, name: row.manager_name || "Chưa phân công" },
    approver: { id: row.approver_id, name: row.approver_name || "Chưa phân công" }, description: row.description || "",
    summary: { employees, totalPayslips: number(row.total_payslips), grossIncome: gross, deductions: number(row.total_deductions), netSalary: number(row.total_net), averageSalary: employees ? Math.round(number(row.total_net) / employees) : 0 },
    issues: number(row.invalid_rows) + number(row.failed_imports) + number(row.open_feedback) + number(row.negative_net) + number(row.blocking_payslips),
    adjustments: number(row.adjustment_count), units: number(row.unit_count), workflow,
    configuration: { scopeType: row.scope_type || "enterprise", cycleType: row.cycle_type || "monthly", attendanceCutoffDay: number(row.attendance_cutoff_day) || 3, dataLockDay: number(row.data_lock_day) || 7, paymentDay: number(row.payment_day) || 10, paymentMethod: row.payment_method || "bank_transfer", allowPostReleaseAdjustment: row.allow_post_release_adjustment !== false },
    timestamps: { createdAt: row.created_at, openedAt: row.opened_at, publishedAt: row.published_at, closedAt: row.closed_at, updatedAt: row.updated_at },
  };
}

export async function getOperations(params = {}) {
  const year = Number(params.year) || new Date().getFullYear();
  const month = params.month ? Number(params.month) : null;
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 8));
  if (month && (month < 1 || month > 12)) throw new ErrorHandler("Tháng không hợp lệ", 400);
  const result = await repository.listPeriods({ year, month, unitId: params.unitId ? Number(params.unitId) : null, status: params.status || null, managerId: params.managerId || null, search: params.search?.trim() || null, limit, offset: (page - 1) * limit });
  return { items: result.rows.map(mapPeriod), summary: { total: number(result.summary.total), processing: number(result.summary.processing), ready: number(result.summary.ready), issues: number(result.summary.issues) }, filters: { years: result.filters.years || [], managers: result.filters.managers || [], units: result.filters.units || [] }, pagination: { page, limit, total: result.total, totalPages: result.total ? Math.ceil(result.total / limit) : 0 } };
}

export async function getOperationsReport(params = {}) {
  const firstPage = await getOperations({ ...params, page: 1, limit: 50 });
  const items = [...firstPage.items];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const nextPage = await getOperations({ ...params, page, limit: 50 });
    items.push(...nextPage.items);
  }

  const unit = params.unitId
    ? firstPage.filters.units.find((item) => Number(item.id) === Number(params.unitId))
    : null;
  const manager = params.managerId
    ? firstPage.filters.managers.find((item) => String(item.id) === String(params.managerId))
    : null;

  return {
    year: Number(params.year) || new Date().getFullYear(),
    items,
    summary: firstPage.summary,
    appliedFilters: {
      month: params.month ? Number(params.month) : null,
      unit: unit ? `${unit.code} · ${unit.name}` : "Toàn doanh nghiệp",
      status: params.status || null,
      manager: manager?.name || null,
      search: params.search?.trim() || null,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getOperationDetail(periodId) {
  if (!Number.isInteger(periodId) || periodId <= 0) throw new ErrorHandler("Mã kỳ lương không hợp lệ", 400);
  const row = await repository.getOperationDetail(periodId);
  if (!row) throw new ErrorHandler("Không tìm thấy kỳ lương", 404);
  const period = mapPeriod(row);
  const status = period.operationalStatus;
  period.allowedActions = {
    open: status === "draft", import: ["open", "importing", "reconciling"].includes(status),
    release: status === "ready_to_release", adjust: ["released", "adjusting"].includes(status),
    lock: ["released", "adjusting"].includes(status), duplicate: true, editSettings: ["draft", "open", "importing", "reconciling"].includes(status),
  };
  period.nextAction = status === "draft" ? { title: "Mở kỳ lương để bắt đầu chuẩn bị dữ liệu.", action: "open" }
    : status === "open" || status === "importing" ? { title: "Import dữ liệu lương để bắt đầu đối soát.", action: "import" }
    : status === "reconciling" ? { title: `Hoàn tất đối soát ${number(row.blocking_payslips)} phiếu còn lại trước ngày chi trả.`, action: "data" }
    : status === "ready_to_release" ? { title: "Dữ liệu đã sẵn sàng. Kiểm tra lần cuối và phát hành lương.", action: "release" }
    : status === "released" || status === "adjusting" ? { title: period.adjustments ? `Theo dõi ${period.adjustments} điều chỉnh và khóa kỳ khi hoàn tất.` : "Kỳ đã phát hành, có thể khóa sau khi hoàn tất kiểm tra.", action: period.adjustments ? "adjust" : "lock" }
    : { title: "Kỳ lương đã khóa và chỉ còn quyền xem.", action: "view" };
  return period;
}

const readinessRows = (row) => {
  const total = number(row.total);
  const item = (key, label, count) => ({ key, label, count: number(count), total, progress: total ? Math.round(number(count) / total * 100) : 0, status: total && number(count) >= total ? "ready" : total ? "warning" : "empty" });
  return [item("attendance","Chấm công",row.attendance), item("salary","Lương cơ bản & phụ cấp",row.salary), item("tax","Thuế TNCN",row.tax), item("insurance","BHXH / BHYT / BHTN",row.insurance), item("deductions","Tạm ứng & khấu trừ",row.deductions), item("banking","Thông tin thanh toán",row.banking)];
};

export async function getReadiness(periodId) { await getOperationDetail(periodId); return readinessRows(await repository.getReadiness(periodId)); }
export async function getUnits(periodId, query = {}) { await getOperationDetail(periodId); const page=Math.max(1,Number(query.page)||1); const limit=Math.min(50,Math.max(1,Number(query.limit)||10)); const rows=await repository.getUnits(periodId,{page,limit}); return { items: rows.map(r=>({ id:r.id,code:r.code,name:r.name,employees:number(r.employees),payroll:number(r.payroll),progress:number(r.progress),warnings:number(r.warnings) })), pagination:{page,limit,total:number(rows[0]?.total),totalPages:rows[0]?.total?Math.ceil(number(rows[0].total)/limit):0} }; }
export async function getAlerts(periodId) { await getOperationDetail(periodId); return (await repository.getAlerts(periodId)).map(r=>({...r,count:number(r.count)})); }
export async function getActivities(periodId) { await getOperationDetail(periodId); return repository.getActivities(periodId); }
export async function getOptions() { return { employees: await repository.getEmployees() }; }

export async function openPeriod(periodId, actor) {
  const period = await getOperationDetail(periodId);
  if (period.status !== "draft") throw new ErrorHandler("Chỉ có thể mở kỳ lương bản nháp", 409);
  const opened = await repository.openPeriod(periodId, actor);
  if (!opened) throw new ErrorHandler("Không thể mở kỳ lương", 409);
  return getOperationDetail(periodId);
}

export async function duplicatePeriod(sourceId, payload, actor) {
  await getOperationDetail(sourceId);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(payload.periodCode || "")) throw new ErrorHandler("Kỳ đích không hợp lệ", 400);
  if (!payload.periodName?.trim() || !payload.startDate || !payload.endDate) throw new ErrorHandler("Thiếu thông tin kỳ lương đích", 400);
  if (await periodRepository.periodCodeExists(payload.periodCode)) throw new ErrorHandler(`Kỳ lương ${payload.periodCode} đã tồn tại`, 409);
  try { const client=await pool.connect(); try { await client.query("BEGIN"); const created=await repository.duplicatePeriod(sourceId,{...payload,periodName:payload.periodName.trim(),paymentDate:payload.paymentDate||null,copyConfiguration:payload.copyConfiguration!==false,copyUnits:payload.copyUnits!==false,copyPeople:payload.copyPeople!==false,copyRules:payload.copyRules!==false},actor,client); await client.query("COMMIT"); return getOperationDetail(created.id); } catch(error){ await client.query("ROLLBACK"); throw error; } finally { client.release(); } }
  catch(error){ if(error.code==="23505") throw new ErrorHandler(`Kỳ lương ${payload.periodCode} đã tồn tại`,409); throw error; }
}

export async function updateSettings(periodId, payload) {
  const period = await getOperationDetail(periodId);
  if (!period.allowedActions.editSettings) throw new ErrorHandler("Trạng thái kỳ lương không cho phép sửa cấu hình", 409);
  const days=[payload.attendanceCutoffDay,payload.dataLockDay,payload.paymentDay].map(Number);
  if(days.some(day=>!Number.isInteger(day)||day<1||day>31)) throw new ErrorHandler("Ngày cấu hình phải từ 1 đến 31",400);
  const updated=await repository.updateSettings(periodId,{...payload,attendanceCutoffDay:days[0],dataLockDay:days[1],paymentDay:days[2],paymentMethod:payload.paymentMethod||"bank_transfer",allowPostReleaseAdjustment:payload.allowPostReleaseAdjustment!==false});
  if(!updated) throw new ErrorHandler("Không thể cập nhật cấu hình kỳ lương",409);
  return getOperationDetail(periodId);
}

export async function getLockPrecheck(periodId) {
  const period=await getOperationDetail(periodId); const stats=await periodRepository.getPeriodPayslipStatistics(periodId);
  const checks=[
    {key:"released",label:"Đã phát hành toàn bộ phiếu",passed:period.status==="published"&&period.summary.totalPayslips>0},
    {key:"critical",label:"Không còn lỗi nghiêm trọng",passed:number(stats.negative_net_count)===0},
    {key:"reconciled",label:"Không còn phiếu chờ xác nhận",passed:number(stats.waiting_confirmation_count)===0},
    {key:"adjustments",label:"Không còn phản hồi hoặc phiếu chờ phát hành lại",passed:number(stats.employee_feedback_count)===0&&number(stats.adjusted_count)===0},
  ];
  return { allowed: checks.every(x=>x.passed), checks };
}
