import pool from "../../config/db.js";

const query = (text, params = []) => pool.query(text, params);
const filterSql = `
  AND ($2::bigint IS NULL OR e.work_location_id = $2)
  AND ($3::text IS NULL OR ep.status = $3)
  AND ($4::text IS NULL OR
    e.staff_id ILIKE '%' || $4 || '%' OR
    CONCAT_WS(' ', e.last_name, e.first_name) ILIKE '%' || $4 || '%' OR
    COALESCE(wl.code, '') ILIKE '%' || $4 || '%' OR
    COALESCE(wl.name, '') ILIKE '%' || $4 || '%')`;

export async function findDashboardPeriod(periodCode) {
  const { rows } = await query(
    `SELECT id, TRIM(period_code) AS period_code, period_name, start_date, end_date,
            payment_date, status, published_at, closed_at, created_at, updated_at
       FROM payroll_periods
      WHERE ($1::text IS NULL OR TRIM(period_code) = $1) AND status <> 'cancelled'
      ORDER BY start_date DESC LIMIT 1`,
    [periodCode || null],
  );
  return rows[0] || null;
}

export async function getDashboardFilters() {
  const [periods, units] = await Promise.all([
    query(`SELECT id, TRIM(period_code) AS code, period_name AS name, status
             FROM payroll_periods WHERE status <> 'cancelled'
            ORDER BY start_date DESC LIMIT 36`),
    query(`SELECT id, code, name FROM work_locations WHERE is_active = TRUE ORDER BY code, name`),
  ]);
  return { periods: periods.rows, units: units.rows };
}

export async function getDashboardSummary(periodId, unitId, status, search) {
  const params = [periodId, unitId, status, search];
  const { rows } = await query(
    `WITH filtered AS (
       SELECT ep.* FROM employee_payslips ep
       JOIN employees e ON e.staff_id = ep.staff_id
       LEFT JOIN work_locations wl ON wl.id = e.work_location_id
       WHERE ep.payroll_period_id = $1 ${filterSql}
     ), previous AS (
       SELECT COUNT(ep.id)::numeric AS payslips, COALESCE(SUM(ep.net_salary), 0)::numeric AS fund
       FROM payroll_periods pp
       LEFT JOIN employee_payslips ep ON ep.payroll_period_id = pp.id
       WHERE pp.id = (SELECT id FROM payroll_periods WHERE start_date <
         (SELECT start_date FROM payroll_periods WHERE id = $1) AND status <> 'cancelled'
         ORDER BY start_date DESC LIMIT 1)
     )
     SELECT COUNT(DISTINCT f.staff_id) AS total_employees,
            COUNT(f.id) AS total_payslips,
            COALESCE(SUM(f.net_salary), 0) AS total_net,
            COUNT(f.id) FILTER (WHERE f.status IN ('draft','waiting_confirmation','employee_feedback','adjusted')) AS pending_payslips,
            COUNT(f.id) FILTER (WHERE f.status IN ('published','confirmed','paid')) AS released_payslips,
            COUNT(f.id) FILTER (WHERE f.net_salary < 0) AS negative_payslips,
            (SELECT COUNT(*) FROM payroll_periods WHERE status IN ('published','locked')
              AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)) AS released_periods,
            (SELECT COUNT(*) FROM payroll_feedbacks pf JOIN filtered x ON x.id = pf.payslip_id
              WHERE pf.status IN ('pending','reviewing','accepted','adjusted')) AS pending_feedbacks,
            (SELECT COUNT(*) FROM payroll_imports pi WHERE pi.payroll_period_id = $1 AND pi.status = 'failed') AS failed_imports,
            COALESCE(MAX(previous.payslips), 0) AS previous_payslips,
            COALESCE(MAX(previous.fund), 0) AS previous_fund
       FROM filtered f CROSS JOIN previous`, params);
  return rows[0];
}

export async function getDashboardTrends(unitId) {
  const { rows } = await query(
    `SELECT TRIM(pp.period_code) AS period_code, COUNT(ep.id) AS payslip_count,
            COALESCE(SUM(ep.net_salary), 0) AS net_salary
       FROM payroll_periods pp
       LEFT JOIN employee_payslips ep ON ep.payroll_period_id = pp.id
       LEFT JOIN employees e ON e.staff_id = ep.staff_id
      WHERE pp.status <> 'cancelled' AND ($1::bigint IS NULL OR e.work_location_id = $1)
      GROUP BY pp.id, pp.period_code, pp.start_date ORDER BY pp.start_date DESC LIMIT 12`,
    [unitId],
  );
  return rows.reverse();
}

export async function getDashboardUnits(periodId, status, search) {
  const { rows } = await query(
    `SELECT wl.id, wl.code, wl.name, COUNT(DISTINCT e.staff_id) AS employee_count,
            COUNT(ep.id) AS payslip_count, COALESCE(SUM(ep.net_salary), 0) AS payroll_fund,
            COUNT(ep.id) FILTER (WHERE ep.status IN ('draft','waiting_confirmation','employee_feedback','adjusted')) AS issue_count,
            CASE WHEN COUNT(ep.id) = 0 THEN 'empty'
                 WHEN BOOL_AND(ep.status IN ('published','confirmed','paid')) THEN 'published'
                 WHEN BOOL_OR(ep.status = 'employee_feedback') THEN 'adjusting'
                 ELSE 'processing' END AS status
       FROM work_locations wl
       LEFT JOIN employees e ON e.work_location_id = wl.id AND e.is_active_staff = TRUE
       LEFT JOIN employee_payslips ep ON ep.staff_id = e.staff_id AND ep.payroll_period_id = $1
         AND ($2::text IS NULL OR ep.status = $2)
       WHERE wl.is_active = TRUE AND ($3::text IS NULL OR e.staff_id ILIKE '%' || $3 || '%'
         OR CONCAT_WS(' ', e.last_name, e.first_name) ILIKE '%' || $3 || '%'
         OR wl.code ILIKE '%' || $3 || '%' OR wl.name ILIKE '%' || $3 || '%')
       GROUP BY wl.id, wl.code, wl.name ORDER BY payroll_fund DESC, employee_count DESC`,
    [periodId, status, search],
  );
  return rows;
}

export async function getDashboardActivities(periodId, unitId) {
  const { rows } = await query(
    `SELECT * FROM (
       SELECT 'import' AS type, pi.status, pi.file_name AS title, pi.uploaded_by AS actor,
              NULL::text AS unit, pi.id::text AS entity_id, pi.updated_at AS occurred_at
         FROM payroll_imports pi WHERE pi.payroll_period_id = $1
       UNION ALL
       SELECT 'feedback', pf.status, CONCAT('Phản hồi phiếu lương #', pf.payslip_id),
              pf.staff_id, wl.name, pf.id::text, pf.updated_at
         FROM payroll_feedbacks pf JOIN employee_payslips ep ON ep.id = pf.payslip_id
         JOIN employees e ON e.staff_id = ep.staff_id LEFT JOIN work_locations wl ON wl.id = e.work_location_id
        WHERE ep.payroll_period_id = $1 AND ($2::bigint IS NULL OR e.work_location_id = $2)
       UNION ALL
       SELECT 'adjustment', 'completed', CONCAT('Điều chỉnh phiếu lương #', pa.payslip_id),
              pa.adjusted_by, wl.name, pa.id::text, pa.created_at
         FROM payroll_adjustments pa JOIN employee_payslips ep ON ep.id = pa.payslip_id
         JOIN employees e ON e.staff_id = ep.staff_id LEFT JOIN work_locations wl ON wl.id = e.work_location_id
        WHERE ep.payroll_period_id = $1 AND ($2::bigint IS NULL OR e.work_location_id = $2)
     ) activity ORDER BY occurred_at DESC LIMIT 12`, [periodId, unitId]);
  return rows;
}

const chosenPeriodsSql = `
  SELECT DISTINCT ON (EXTRACT(MONTH FROM start_date))
    id, TRIM(period_code) AS period_code, period_name, start_date, end_date,
    payment_date, status, published_at, closed_at, created_at, updated_at
  FROM payroll_periods
  WHERE status <> 'cancelled' AND EXTRACT(YEAR FROM start_date)::int = $1
  ORDER BY EXTRACT(MONTH FROM start_date), start_date DESC, id DESC`;

export async function getPayrollYearOverview(year, unitId = null) {
  const params = [year, unitId];
  const [months, summary, issues, activities, filters] = await Promise.all([
    query(`WITH chosen AS (${chosenPeriodsSql})
      SELECT EXTRACT(MONTH FROM c.start_date)::int AS month, c.*,
        COALESCE(pay.employee_count,0)::int employee_count,COALESCE(pay.total_income,0)::numeric total_income,
        COALESCE(pay.total_deductions,0)::numeric total_deductions,COALESCE(pay.net_salary,0)::numeric net_salary,
        COALESCE(pay.average_salary,0)::numeric average_salary,COALESCE(pay.pending_count,0)::int pending_count,
        COALESCE(pay.negative_count,0)::int negative_count,COALESCE(feed.feedback_count,0)::int feedback_count,
        COALESCE(imp.invalid_rows,0)::int invalid_rows,COALESCE(imp.has_import,FALSE) has_import
      FROM chosen c LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT ep.staff_id) employee_count,SUM(ep.gross_income) total_income,
          SUM(ep.total_deductions) total_deductions,SUM(ep.net_salary) net_salary,AVG(ep.net_salary) average_salary,
          COUNT(ep.id) FILTER(WHERE ep.status IN ('draft','waiting_confirmation','employee_feedback','adjusted')) pending_count,
          COUNT(ep.id) FILTER(WHERE ep.net_salary<0) negative_count
        FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id
        WHERE ep.payroll_period_id=c.id AND ($2::bigint IS NULL OR e.work_location_id=$2)
      ) pay ON TRUE LEFT JOIN LATERAL (
        SELECT COUNT(pf.id) FILTER(WHERE pf.status IN ('pending','reviewing','accepted','adjusted')) feedback_count
        FROM payroll_feedbacks pf JOIN employee_payslips ep ON ep.id=pf.payslip_id JOIN employees e ON e.staff_id=ep.staff_id
        WHERE ep.payroll_period_id=c.id AND ($2::bigint IS NULL OR e.work_location_id=$2)
      ) feed ON TRUE LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(pi.invalid_rows),0) invalid_rows,BOOL_OR(pi.status='committed') has_import
        FROM payroll_imports pi WHERE pi.payroll_period_id=c.id
      ) imp ON TRUE ORDER BY month`, params),
    query(`WITH chosen AS (${chosenPeriodsSql}), totals AS (
      SELECT COUNT(DISTINCT ep.staff_id)::numeric employee_count,
        COALESCE(SUM(ep.gross_income),0)::numeric total_income,
        COALESCE(SUM(ep.total_deductions),0)::numeric total_deductions,
        COALESCE(SUM(ep.net_salary),0)::numeric net_salary,COALESCE(AVG(ep.net_salary),0)::numeric average_salary,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('published','locked'))::int released_periods
      FROM chosen c LEFT JOIN employee_payslips ep ON ep.payroll_period_id=c.id
      LEFT JOIN employees e ON e.staff_id=ep.staff_id
      WHERE $2::bigint IS NULL OR e.work_location_id=$2
    ) SELECT *,
      (SELECT COALESCE(AVG(month_staff),0) FROM (
        SELECT COUNT(DISTINCT ep.staff_id)::numeric month_staff FROM chosen c
        LEFT JOIN employee_payslips ep ON ep.payroll_period_id=c.id LEFT JOIN employees e ON e.staff_id=ep.staff_id
        WHERE $2::bigint IS NULL OR e.work_location_id=$2 GROUP BY c.id) x) average_employees FROM totals`, params),
    query(`WITH chosen AS (${chosenPeriodsSql}), filtered AS (
      SELECT ep.*,e.phone FROM chosen c JOIN employee_payslips ep ON ep.payroll_period_id=c.id JOIN employees e ON e.staff_id=ep.staff_id
      WHERE $2::bigint IS NULL OR e.work_location_id=$2)
      SELECT COUNT(id) FILTER(WHERE status IN ('draft','waiting_confirmation'))::int pending_approval,
      COUNT(id) FILTER(WHERE net_salary<0)::int negative_salary,
      (SELECT COUNT(*) FROM payroll_feedbacks pf JOIN filtered f ON f.id=pf.payslip_id WHERE pf.status IN ('pending','reviewing','accepted','adjusted'))::int feedback,
      (SELECT COALESCE(SUM(pi.invalid_rows),0) FROM payroll_imports pi JOIN chosen c ON c.id=pi.payroll_period_id)::int invalid_import,
      COUNT(DISTINCT staff_id) FILTER(WHERE COALESCE(phone,'')='')::int missing_contact FROM filtered`, params),
    query(`WITH chosen AS (${chosenPeriodsSql}) SELECT * FROM (
      SELECT 'import' type,pi.status,pi.file_name title,pi.uploaded_by actor,pi.payroll_period_id period_id,pi.updated_at occurred_at
      FROM payroll_imports pi JOIN chosen c ON c.id=pi.payroll_period_id
      UNION ALL SELECT 'feedback',pf.status,CONCAT('Phản hồi phiếu lương ',ep.staff_id),pf.staff_id,ep.payroll_period_id,pf.updated_at
      FROM payroll_feedbacks pf JOIN employee_payslips ep ON ep.id=pf.payslip_id JOIN chosen c ON c.id=ep.payroll_period_id
      UNION ALL SELECT 'adjustment','completed',CONCAT('Điều chỉnh phiếu lương ',ep.staff_id),pa.adjusted_by,ep.payroll_period_id,pa.created_at
      FROM payroll_adjustments pa JOIN employee_payslips ep ON ep.id=pa.payslip_id JOIN chosen c ON c.id=ep.payroll_period_id
    ) a ORDER BY occurred_at DESC LIMIT 8`, [year]),
    getDashboardFilters(),
  ]);
  return { months: months.rows, summary: summary.rows[0] || {}, issues: issues.rows[0] || {}, activities: activities.rows, filters };
}

export async function getPayrollMonthOverview(periodId, unitId = null) {
  const { rows } = await query(`SELECT p.id,TRIM(p.period_code) period_code,p.period_name,p.start_date,p.end_date,p.payment_date,
    p.status,p.published_at,p.closed_at,p.created_at,p.updated_at,COALESCE(pay.employee_count,0)::int employee_count,
    COALESCE(pay.payslip_count,0)::int payslip_count,COALESCE(pay.total_income,0)::numeric total_income,
    COALESCE(pay.total_deductions,0)::numeric total_deductions,COALESCE(pay.net_salary,0)::numeric net_salary,
    COALESCE(pay.average_salary,0)::numeric average_salary,COALESCE(pay.pending_approval,0)::int pending_approval,
    COALESCE(pay.feedback_count,0)::int feedback_count,COALESCE(pay.negative_count,0)::int negative_count,
    COALESCE(imp.invalid_rows,0)::int invalid_rows,COALESCE(imp.has_import,FALSE) has_import
    FROM payroll_periods p LEFT JOIN LATERAL (SELECT COUNT(DISTINCT ep.staff_id) employee_count,COUNT(ep.id) payslip_count,
      SUM(ep.gross_income) total_income,SUM(ep.total_deductions) total_deductions,SUM(ep.net_salary) net_salary,AVG(ep.net_salary) average_salary,
      COUNT(ep.id) FILTER(WHERE ep.status IN ('draft','waiting_confirmation')) pending_approval,
      COUNT(ep.id) FILTER(WHERE ep.status='employee_feedback') feedback_count,COUNT(ep.id) FILTER(WHERE ep.net_salary<0) negative_count
      FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id WHERE ep.payroll_period_id=p.id AND ($2::bigint IS NULL OR e.work_location_id=$2)) pay ON TRUE
    LEFT JOIN LATERAL (SELECT SUM(invalid_rows) invalid_rows,BOOL_OR(status='committed') has_import FROM payroll_imports WHERE payroll_period_id=p.id) imp ON TRUE
    WHERE p.id=$1`, [periodId, unitId]);
  return rows[0] || null;
}

const employeeFilterSql = `WHERE ep.payroll_period_id=$1
  AND ($2::text IS NULL OR e.staff_id ILIKE '%'||$2||'%' OR CONCAT_WS(' ',e.last_name,e.first_name) ILIKE '%'||$2||'%' OR COALESCE(d.name,'') ILIKE '%'||$2||'%')
  AND ($3::bigint IS NULL OR e.work_location_id=$3) AND ($4::bigint IS NULL OR e.department_id=$4)
  AND ($5::text IS NULL OR ep.status=$5) AND ($6::numeric IS NULL OR ep.net_salary >= $6)
  AND ($7::numeric IS NULL OR ep.net_salary <= $7)`;

export async function getPayrollPeriodEmployees(filters) {
  const { periodId,search,unitId,departmentId,status,minSalary,maxSalary,page,limit,sort,order } = filters;
  const offset=(page-1)*limit;
  const sortMap={employee:"employee_name",staffId:"e.staff_id",department:"d.name",grossIncome:"ep.gross_income",taxableIncome:"ep.taxable_income",deductions:"ep.total_deductions",netSalary:"ep.net_salary",status:"ep.status"};
  const orderBy=`${sortMap[sort]||"e.staff_id"} ${order==="desc"?"DESC":"ASC"}, ep.id ASC`;
  const params=[periodId,search,unitId,departmentId,status,minSalary,maxSalary,limit,offset];
  const [list,count,options]=await Promise.all([
    query(`SELECT ep.id payslip_id,e.staff_id,CONCAT_WS(' ',e.last_name,e.first_name) employee_name,
      d.id department_id,d.name department,wl.id unit_id,wl.code unit_code,wl.name unit_name,
      ep.gross_income,ep.base_salary+ep.attendance_salary insurance_income,ep.taxable_income,ep.total_deductions,ep.net_salary,ep.status
      FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id
      LEFT JOIN departments d ON d.id=e.department_id LEFT JOIN work_locations wl ON wl.id=e.work_location_id
      ${employeeFilterSql} ORDER BY ${orderBy} LIMIT $8 OFFSET $9`,params),
    query(`SELECT COUNT(*)::int total FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id
      LEFT JOIN departments d ON d.id=e.department_id ${employeeFilterSql}`,params.slice(0,7)),
    query(`SELECT (SELECT json_agg(x ORDER BY x.name) FROM (SELECT DISTINCT d.id,d.name FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id JOIN departments d ON d.id=e.department_id WHERE ep.payroll_period_id=$1) x) departments,
      (SELECT json_agg(x ORDER BY x.code) FROM (SELECT DISTINCT wl.id,wl.code,wl.name FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id JOIN work_locations wl ON wl.id=e.work_location_id WHERE ep.payroll_period_id=$1) x) units`,[periodId]),
  ]);
  return { rows:list.rows,total:count.rows[0]?.total||0,options:options.rows[0]||{} };
}

export async function getPayrollPeriodAnalytics(periodId, year, unitId = null) {
  const params=[periodId,unitId];
  const [distribution,byUnit,incomeByUnit,composition,trend]=await Promise.all([
    query(`SELECT bucket,COUNT(*)::int employee_count FROM (SELECT CASE WHEN ep.net_salary<5000000 THEN 'under5' WHEN ep.net_salary<10000000 THEN '5to10' WHEN ep.net_salary<15000000 THEN '10to15' WHEN ep.net_salary<20000000 THEN '15to20' WHEN ep.net_salary<30000000 THEN '20to30' ELSE 'over30' END bucket FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id WHERE ep.payroll_period_id=$1 AND ($2::bigint IS NULL OR e.work_location_id=$2)) x GROUP BY bucket`,params),
    query(`SELECT wl.id,wl.code,wl.name,COUNT(DISTINCT ep.staff_id)::int employee_count,COALESCE(SUM(ep.net_salary),0)::numeric payroll_fund FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id LEFT JOIN work_locations wl ON wl.id=e.work_location_id WHERE ep.payroll_period_id=$1 AND ($2::bigint IS NULL OR e.work_location_id=$2) GROUP BY wl.id,wl.code,wl.name ORDER BY payroll_fund DESC`,params),
    query(`SELECT COALESCE(wl.code,'N/A') label,COALESCE(SUM(ep.gross_income),0)::numeric income,COALESCE(SUM(ep.total_deductions),0)::numeric deductions,COALESCE(SUM(ep.net_salary),0)::numeric net FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id LEFT JOIN work_locations wl ON wl.id=e.work_location_id WHERE ep.payroll_period_id=$1 AND ($2::bigint IS NULL OR e.work_location_id=$2) GROUP BY wl.id,wl.code ORDER BY net DESC`,params),
    query(`SELECT category,COALESCE(SUM(amount),0)::numeric amount FROM (SELECT pd.amount,CASE WHEN smi.code IN ('BASE_SALARY','ATTENDANCE_SALARY') THEN 'base' WHEN smi.code ILIKE '%ALLOWANCE%' THEN 'allowance' WHEN smi.code ILIKE '%BONUS%' THEN 'bonus' WHEN smi.code ILIKE '%PERFORMANCE%' OR smi.code='KPI' THEN 'kpi' ELSE 'other' END category FROM payslip_details pd JOIN salary_master_items smi ON smi.id=pd.salary_item_id JOIN employee_payslips ep ON ep.id=pd.payslip_id JOIN employees e ON e.staff_id=ep.staff_id WHERE ep.payroll_period_id=$1 AND smi.category='income' AND ($2::bigint IS NULL OR e.work_location_id=$2)) grouped GROUP BY category`,params),
    query(`SELECT EXTRACT(MONTH FROM pp.start_date)::int AS report_month,COUNT(DISTINCT ep.staff_id)::int employee_count,COALESCE(SUM(ep.net_salary),0)::numeric payroll_fund,COALESCE(AVG(ep.net_salary),0)::numeric average_salary FROM payroll_periods pp LEFT JOIN employee_payslips ep ON ep.payroll_period_id=pp.id LEFT JOIN employees e ON e.staff_id=ep.staff_id WHERE pp.status<>'cancelled' AND EXTRACT(YEAR FROM pp.start_date)::int=$1 AND ($2::bigint IS NULL OR e.work_location_id=$2) GROUP BY report_month ORDER BY report_month`,[year,unitId]),
  ]);
  return {distribution:distribution.rows,byUnit:byUnit.rows,incomeByUnit:incomeByUnit.rows,composition:composition.rows,trend:trend.rows};
}

export async function getPayrollPeriodHistory(periodId) {
  const { rows }=await query(`SELECT * FROM (
    SELECT 'import' type,pi.status,pi.file_name title,pi.uploaded_by actor,pi.updated_at occurred_at FROM payroll_imports pi WHERE pi.payroll_period_id=$1
    UNION ALL SELECT 'feedback',pf.status,CONCAT('Phản hồi ',ep.staff_id),pf.staff_id,pf.updated_at FROM payroll_feedbacks pf JOIN employee_payslips ep ON ep.id=pf.payslip_id WHERE ep.payroll_period_id=$1
    UNION ALL SELECT 'adjustment','completed',CONCAT('Điều chỉnh ',ep.staff_id),pa.adjusted_by,pa.created_at FROM payroll_adjustments pa JOIN employee_payslips ep ON ep.id=pa.payslip_id WHERE ep.payroll_period_id=$1
  ) a ORDER BY occurred_at DESC LIMIT 100`,[periodId]);
  return rows;
}
