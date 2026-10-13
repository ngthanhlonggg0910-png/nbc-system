import {
  findDashboardPeriod, getDashboardActivities, getDashboardFilters,
  getDashboardSummary, getDashboardTrends, getDashboardUnits,
  getPayrollMonthOverview, getPayrollPeriodAnalytics as getPeriodAnalytics,
  getPayrollPeriodEmployees, getPayrollPeriodHistory, getPayrollYearOverview,
} from "../../repositories/payroll/payrollDashboard.repository.js";
import { findAdminPayslipById } from "../../repositories/payroll/payslip.repository.js";
import { findAllDetailsByPayslipId } from "../../repositories/payroll/payslipDetail.repository.js";

const number = (value) => Number(value || 0);
const clean = (value) => String(value || "").trim() || null;
const percentChange = (current, previous) => previous ? ((current - previous) / previous) * 100 : null;

export async function getPayrollDashboard(input = {}) {
  const periodCode = clean(input.periodCode);
  const unitId = input.unitId && input.unitId !== "all" ? Number(input.unitId) : null;
  const status = input.status && input.status !== "all" ? clean(input.status) : null;
  const search = clean(input.search);
  if (unitId !== null && (!Number.isSafeInteger(unitId) || unitId <= 0)) {
    const error = new Error("Đơn vị không hợp lệ"); error.statusCode = 400; throw error;
  }

  const [period, filters] = await Promise.all([findDashboardPeriod(periodCode), getDashboardFilters()]);
  if (!period) return { period: null, filters, summary: {}, trends: [], units: [], activities: [], workflow: [], issues: [], alerts: [], upcoming: [] };

  const [raw, trends, units, activities] = await Promise.all([
    getDashboardSummary(period.id, unitId, status, search), getDashboardTrends(unitId),
    getDashboardUnits(period.id, status, search), getDashboardActivities(period.id, unitId),
  ]);
  const summary = Object.fromEntries(Object.entries(raw || {}).map(([key, value]) => [key, number(value)]));
  summary.employee_change = percentChange(summary.total_employees, summary.previous_payslips);
  summary.fund_change = percentChange(summary.total_net, summary.previous_fund);
  summary.pending_rate = summary.total_payslips ? summary.pending_payslips / summary.total_payslips * 100 : 0;

  const total = summary.total_payslips;
  const released = summary.released_payslips;
  const releaseRate = total ? Math.round(released / total * 100) : 0;
  const latestImport = activities.find((item) => item.type === "import");
  const feedbackActivity = activities.find((item) => item.type === "feedback");
  const workflow = [
    { key: "import", label: "Nhập dữ liệu", progress: total ? 100 : 0, state: total ? "done" : "pending", updatedAt: latestImport?.occurred_at },
    { key: "reconcile", label: "Đối soát dữ liệu", progress: total ? Math.max(0, 100 - Math.round(summary.pending_rate)) : 0, state: summary.pending_payslips ? "running" : total ? "done" : "pending", updatedAt: period.updated_at },
    { key: "publish", label: "Phát hành lương", progress: releaseRate, state: releaseRate === 100 ? "done" : releaseRate ? "running" : "pending", updatedAt: period.published_at },
    { key: "adjust", label: "Điều chỉnh lương", progress: summary.pending_feedbacks ? 0 : (feedbackActivity ? 100 : 0), state: summary.pending_feedbacks ? "warning" : feedbackActivity ? "done" : "pending", updatedAt: feedbackActivity?.occurred_at },
    { key: "complete", label: "Hoàn tất", progress: period.status === "locked" ? 100 : 0, state: period.status === "locked" ? "done" : "pending", updatedAt: period.closed_at },
  ];
  const issues = [
    { key: "failed-import", label: "Import dữ liệu thất bại", count: summary.failed_imports, severity: "critical", action: "history" },
    { key: "pending-payslip", label: "Phiếu lương chờ xử lý", count: summary.pending_payslips, severity: "warning", action: "periods" },
    { key: "pending-feedback", label: "Phản hồi nhân viên chưa xử lý", count: summary.pending_feedbacks, severity: "high", action: "adjustment" },
  ];
  const alerts = [
    { key: "negative", label: "Phiếu lương âm", count: summary.negative_payslips, severity: "critical" },
    { key: "deadline", label: "Kỳ lương chưa hoàn tất", count: period.status === "locked" ? 0 : 1, severity: "warning" },
    { key: "feedback", label: "Phản hồi cần điều chỉnh", count: summary.pending_feedbacks, severity: "high" },
    { key: "unassigned", label: "Đơn vị chưa có phiếu lương", count: units.filter((u) => number(u.payslip_count) === 0).length, severity: "info" },
  ];
  const upcoming = [
    period.payment_date && { title: "Ngày chi trả lương", dueDate: period.payment_date, type: "payment", status: period.status, relatedPayrollPeriodId: period.id },
    period.end_date && { title: "Kết thúc kỳ lương", dueDate: period.end_date, type: "period_end", status: period.status, relatedPayrollPeriodId: period.id },
  ].filter(Boolean).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return {
    period: { id: period.id, code: period.period_code, name: period.period_name, startDate: period.start_date, endDate: period.end_date, paymentDate: period.payment_date, status: period.status, updatedAt: period.updated_at },
    filters, summary, workflow, issues, alerts, upcoming,
    trends: trends.map((r) => ({ periodCode: r.period_code, payslipCount: number(r.payslip_count), netSalary: number(r.net_salary) })),
    units: units.map((r) => ({ id: r.id, code: r.code, name: r.name, employeeCount: number(r.employee_count), payslipCount: number(r.payslip_count), payrollFund: number(r.payroll_fund), issueCount: number(r.issue_count), status: r.status })),
    activities: activities.map((r) => ({ type: r.type, status: r.status, title: r.title, actor: r.actor, unit: r.unit, entityId: r.entity_id, timestamp: r.occurred_at })),
    refreshedAt: new Date().toISOString(),
  };
}

function validateYear(value) {
  const year=Number(value);
  if (!Number.isInteger(year)||year<2000||year>2100) { const error=new Error("Năm báo cáo không hợp lệ");error.statusCode=400;throw error; }
  return year;
}
function positive(value,label){const n=Number(value);if(!Number.isSafeInteger(n)||n<=0){const e=new Error(`${label} không hợp lệ`);e.statusCode=400;throw e;}return n;}
const maybePositive=(value)=>value&&value!=="all"?positive(value,"Bộ lọc"):null;

const statusProgress=(row)=>{
  if(row.status==="locked")return 100;
  if(row.status==="published")return 100;
  if(number(row.employee_count)&&number(row.pending_count)===0)return 72;
  if(number(row.employee_count))return 52;
  if(row.has_import)return 28;
  return 12;
};
const monthStatus=(row)=>{
  if(number(row.negative_count)||number(row.invalid_rows))return "error";
  if(row.status==="locked")return "locked";
  if(row.status==="published")return "published";
  if(number(row.feedback_count))return "adjusting";
  if(number(row.employee_count)&&number(row.pending_count)===0)return "reconciling";
  if(number(row.employee_count)||row.has_import)return "importing";
  return "draft";
};
const mapMonth=(row)=>({id:Number(row.id),month:Number(row.month),periodCode:row.period_code,name:row.period_name,startDate:row.start_date,endDate:row.end_date,paymentDate:row.payment_date,status:monthStatus(row),periodStatus:row.status,progress:statusProgress(row),employeeCount:number(row.employee_count),totalIncome:number(row.total_income),totalDeductions:number(row.total_deductions),netSalary:number(row.net_salary),averageSalary:number(row.average_salary),warningCount:number(row.negative_count)+number(row.invalid_rows)+number(row.feedback_count)});

export async function getPayrollYearCalendar(input={}){
  const year=validateYear(input.year||new Date().getFullYear());
  const unitId=maybePositive(input.unitId);
  const raw=await getPayrollYearOverview(year,unitId);
  const byMonth=new Map(raw.months.map(row=>[Number(row.month),mapMonth(row)]));
  const months=Array.from({length:12},(_,i)=>byMonth.get(i+1)||{month:i+1,periodCode:`${year}-${String(i+1).padStart(2,"0")}`,status:"not_created",progress:0,employeeCount:0,totalIncome:0,totalDeductions:0,netSalary:0,averageSalary:0,warningCount:0});
  const s=raw.summary;
  const issues=[
    {key:"pending",label:"Phiếu lương chờ duyệt",count:number(raw.issues.pending_approval),severity:"warning"},
    {key:"feedback",label:"Phản hồi cần xử lý",count:number(raw.issues.feedback),severity:"high"},
    {key:"invalid",label:"Dòng import chưa hợp lệ",count:number(raw.issues.invalid_import),severity:"danger"},
    {key:"negative",label:"Phiếu lương âm",count:number(raw.issues.negative_salary),severity:"danger"},
  ].filter(x=>x.count>0);
  return {year,unitId,summary:{annualPayroll:number(s.net_salary),totalIncome:number(s.total_income),totalDeductions:number(s.total_deductions),averageEmployees:Math.round(number(s.average_employees)),averageSalary:number(s.average_salary),releasedPeriods:number(s.released_periods)},months,trend:months.map(m=>({month:m.month,payrollFund:m.netSalary,averageSalary:m.averageSalary,employeeCount:m.employeeCount,status:m.status})),issues,activities:raw.activities.map(a=>({type:a.type,status:a.status,title:a.title,actor:a.actor,periodId:Number(a.period_id),timestamp:a.occurred_at})),filters:raw.filters,refreshedAt:new Date().toISOString()};
}

export async function getPayrollMonthDetail(input={}){
  const periodId=positive(input.periodId,"Mã kỳ lương"),unitId=maybePositive(input.unitId);
  const row=await getPayrollMonthOverview(periodId,unitId);
  if(!row){const e=new Error("Không tìm thấy kỳ lương");e.statusCode=404;throw e;}
  const progress=statusProgress(row);
  return {period:{id:Number(row.id),code:row.period_code,name:row.period_name,startDate:row.start_date,endDate:row.end_date,paymentDate:row.payment_date,status:monthStatus(row),periodStatus:row.status,publishedAt:row.published_at,closedAt:row.closed_at},summary:{totalIncome:number(row.total_income),totalDeductions:number(row.total_deductions),netSalary:number(row.net_salary),employeeCount:number(row.employee_count),averageSalary:number(row.average_salary)},progress,workflow:[
    {key:"import",label:"Import dữ liệu",state:row.has_import||number(row.employee_count)?"done":"pending"},
    {key:"reconcile",label:"Đối soát",state:number(row.employee_count)&&!number(row.pending_approval)?"done":number(row.employee_count)?"running":"pending"},
    {key:"publish",label:"Phát hành",state:["published","locked"].includes(row.status)?"done":number(row.employee_count)?"running":"pending"},
    {key:"adjust",label:"Điều chỉnh",state:number(row.feedback_count)?"warning":"pending"},
    {key:"complete",label:"Hoàn tất",state:row.status==="locked"?"done":"pending"},
  ],issues:[{key:"pending",label:"Phiếu chờ duyệt",count:number(row.pending_approval),severity:"warning"},{key:"feedback",label:"Phản hồi cần xử lý",count:number(row.feedback_count),severity:"high"},{key:"invalid",label:"Lỗi dữ liệu import",count:number(row.invalid_rows),severity:"danger"},{key:"negative",label:"Phiếu lương âm",count:number(row.negative_count),severity:"danger"}].filter(x=>x.count>0)};
}

export async function getPayrollEmployees(input={}){
  const page=Math.max(1,Number(input.page)||1),limit=[20,50,100].includes(Number(input.limit))?Number(input.limit):20;
  const filters={periodId:positive(input.periodId,"Mã kỳ lương"),search:clean(input.search),unitId:maybePositive(input.unitId),departmentId:maybePositive(input.departmentId),status:clean(input.status),minSalary:input.minSalary!==undefined&&input.minSalary!==""?Number(input.minSalary):null,maxSalary:input.maxSalary!==undefined&&input.maxSalary!==""?Number(input.maxSalary):null,page,limit,sort:input.sort,order:input.order==="desc"?"desc":"asc"};
  const raw=await getPayrollPeriodEmployees(filters);
  return {employees:raw.rows.map(r=>({payslipId:Number(r.payslip_id),staffId:r.staff_id,employeeName:r.employee_name,department:{id:r.department_id?Number(r.department_id):null,name:r.department},unit:{id:r.unit_id?Number(r.unit_id):null,code:r.unit_code,name:r.unit_name},grossIncome:number(r.gross_income),insuranceIncome:number(r.insurance_income),taxableIncome:number(r.taxable_income),totalDeductions:number(r.total_deductions),netSalary:number(r.net_salary),status:r.status})),filters:raw.options,pagination:{page,limit,total:number(raw.total),totalPages:Math.ceil(number(raw.total)/limit)},appliedFilters:filters};
}

export async function getPayrollAnalytics(input={}){
  const periodId=positive(input.periodId,"Mã kỳ lương"),year=validateYear(input.year||new Date().getFullYear()),unitId=maybePositive(input.unitId);
  const raw=await getPeriodAnalytics(periodId,year,unitId);
  const labels={under5:"< 5 triệu","5to10":"5 – 10 triệu","10to15":"10 – 15 triệu","15to20":"15 – 20 triệu","20to30":"20 – 30 triệu",over30:"> 30 triệu"};
  const total=raw.distribution.reduce((s,x)=>s+number(x.employee_count),0);
  return {salaryDistribution:Object.keys(labels).map(key=>{const row=raw.distribution.find(x=>x.bucket===key);const count=number(row?.employee_count);return {key,label:labels[key],count,percentage:total?count/total*100:0};}),payrollByUnit:raw.byUnit.map(r=>({id:r.id?Number(r.id):null,code:r.code,name:r.name,employeeCount:number(r.employee_count),payrollFund:number(r.payroll_fund)})),incomeByUnit:raw.incomeByUnit.map(r=>({label:r.label,income:number(r.income),deductions:number(r.deductions),net:number(r.net)})),composition:raw.composition.map(r=>({category:r.category,amount:number(r.amount)})),trend:raw.trend.map(r=>({month:Number(r.report_month),employeeCount:number(r.employee_count),payrollFund:number(r.payroll_fund),averageSalary:number(r.average_salary)}))};
}

export async function getAdminPayslipDetail(input={}){
  const payslipId=positive(input.payslipId,"Mã phiếu lương");
  const [row,details]=await Promise.all([findAdminPayslipById(payslipId),findAllDetailsByPayslipId(payslipId)]);
  if(!row){const e=new Error("Không tìm thấy phiếu lương");e.statusCode=404;throw e;}
  return {id:Number(row.id),staffId:row.staff_id,employeeName:row.employee_name,department:row.department,jobTitle:row.job_title,period:{id:Number(row.payroll_period_id),code:row.period_code,name:row.period_name},amounts:{baseSalary:number(row.base_salary),attendanceSalary:number(row.attendance_salary),overtime:number(row.overtime_salary),allowance:number(row.total_allowance),bonus:number(row.total_bonus),grossIncome:number(row.gross_income),taxableIncome:number(row.taxable_income),socialInsurance:number(row.social_insurance),healthInsurance:number(row.health_insurance),unemploymentInsurance:number(row.unemployment_insurance),personalIncomeTax:number(row.personal_income_tax),totalDeductions:number(row.total_deductions),netSalary:number(row.net_salary)},status:row.status,currentVersion:Number(row.current_version),details:details.map(d=>({id:Number(d.id),code:d.item_code,label:d.item_label,category:d.category,amount:number(d.amount),description:d.description}))};
}

export async function getPayrollHistory(input={}){return (await getPayrollPeriodHistory(positive(input.periodId,"Mã kỳ lương"))).map(a=>({type:a.type,status:a.status,title:a.title,actor:a.actor,timestamp:a.occurred_at}));}
