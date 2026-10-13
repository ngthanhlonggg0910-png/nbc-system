import pool from "../../config/db.js";

const operationalStatusSql = `CASE
  WHEN p.status='locked' THEN 'locked'
  WHEN p.status='published' AND COALESCE(x.adjustment_count,0)>0 THEN 'adjusting'
  WHEN p.status='published' THEN 'released'
  WHEN COALESCE(x.total_payslips,0)>0
    AND COALESCE(x.blocking_payslips,0)=0
    AND COALESCE(x.invalid_rows,0)=0 THEN 'ready_to_release'
  WHEN COALESCE(x.total_payslips,0)>0 THEN 'reconciling'
  WHEN COALESCE(x.import_count,0)>0 THEN 'importing'
  WHEN p.opened_at IS NOT NULL THEN 'open'
  ELSE 'draft'
END`;

const listWhere = ({ year, month, unitId, status, managerId, search }) => {
  const values = [];
  const clauses = ["p.status <> 'cancelled'"];
  const add = (sql, value) => { values.push(value); clauses.push(sql.replace("?", `$${values.length}`)); };
  if (year) add("EXTRACT(YEAR FROM p.start_date)::int = ?", year);
  if (month) add("EXTRACT(MONTH FROM p.start_date)::int = ?", month);
  if (unitId) add("EXISTS (SELECT 1 FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id WHERE ep.payroll_period_id=p.id AND e.work_location_id=?)", unitId);
  if (status) add(`(${operationalStatusSql}) = ?`, status);
  if (managerId) add("COALESCE(p.manager_id,p.created_by) = ?", managerId);
  if (search) add("(p.period_code ILIKE '%' || ? || '%' OR p.period_name ILIKE '%' || $" + (values.length + 1) + " || '%')", search);
  return { where: clauses.join(" AND "), values };
};

const aggregateSql = `LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT ep.staff_id)::int total_employees, COUNT(ep.id)::int total_payslips,
    COALESCE(SUM(ep.gross_income),0)::numeric total_gross, COALESCE(SUM(ep.total_deductions),0)::numeric total_deductions,
    COALESCE(SUM(ep.net_salary),0)::numeric total_net,
    COUNT(ep.id) FILTER(WHERE ep.status IN ('draft','waiting_confirmation','employee_feedback','adjusted'))::int blocking_payslips,
    COUNT(ep.id) FILTER(WHERE ep.net_salary < 0)::int negative_net,
    COUNT(DISTINCT e.work_location_id) FILTER(WHERE e.work_location_id IS NOT NULL)::int unit_count
  FROM employee_payslips ep LEFT JOIN employees e ON e.staff_id=ep.staff_id WHERE ep.payroll_period_id=p.id
) pay ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*)::int import_count, COALESCE(SUM(invalid_rows),0)::int invalid_rows,
  COUNT(*) FILTER(WHERE status='failed')::int failed_imports, MAX(updated_at) last_import_at
  FROM payroll_imports WHERE payroll_period_id=p.id) imp ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*)::int open_feedback FROM payroll_feedbacks f JOIN employee_payslips ep ON ep.id=f.payslip_id
  WHERE ep.payroll_period_id=p.id AND f.status NOT IN ('resolved','rejected')) fb ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*)::int adjustment_count FROM payroll_adjustments a JOIN employee_payslips ep ON ep.id=a.payslip_id
  WHERE ep.payroll_period_id=p.id) adj ON TRUE
LEFT JOIN LATERAL (SELECT pay.*,imp.import_count,imp.invalid_rows,imp.failed_imports,imp.last_import_at,fb.open_feedback,adj.adjustment_count) x ON TRUE`;

const selectBase = `p.*, CONCAT_WS(' ',m.last_name,m.first_name) manager_name,
  CONCAT_WS(' ',a.last_name,a.first_name) approver_name,
  COALESCE(x.total_employees,0)::int total_employees, COALESCE(x.total_payslips,0)::int total_payslips,
  COALESCE(x.total_gross,0)::numeric total_gross, COALESCE(x.total_deductions,0)::numeric total_deductions,
  COALESCE(x.total_net,0)::numeric total_net, COALESCE(x.blocking_payslips,0)::int blocking_payslips,
  COALESCE(x.negative_net,0)::int negative_net, COALESCE(x.unit_count,0)::int unit_count,
  COALESCE(x.import_count,0)::int import_count, COALESCE(x.invalid_rows,0)::int invalid_rows,
  COALESCE(x.failed_imports,0)::int failed_imports, x.last_import_at,
  COALESCE(x.open_feedback,0)::int open_feedback, COALESCE(x.adjustment_count,0)::int adjustment_count`;

export async function listPeriods(filters, client = pool) {
  const { where, values } = listWhere(filters);
  const limitIndex = values.length + 1;
  const offsetIndex = values.length + 2;
  const baseFrom = `FROM payroll_periods p LEFT JOIN employees m ON m.staff_id=COALESCE(p.manager_id,p.created_by)
    LEFT JOIN employees a ON a.staff_id=p.approver_id ${aggregateSql}`;
  const [list, count, summary, filtersResult] = await Promise.all([
    client.query(`SELECT ${selectBase} ${baseFrom} WHERE ${where} ORDER BY p.start_date DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      [...values, filters.limit, filters.offset]),
    client.query(`SELECT COUNT(*)::int total ${baseFrom} WHERE ${where}`, values),
    client.query(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER(WHERE (${operationalStatusSql}) IN ('open','importing','reconciling','adjusting'))::int processing,
      COUNT(*) FILTER(WHERE (${operationalStatusSql})='ready_to_release')::int ready,
      COUNT(*) FILTER(WHERE COALESCE(x.invalid_rows,0)>0 OR COALESCE(x.failed_imports,0)>0
        OR COALESCE(x.open_feedback,0)>0 OR COALESCE(x.negative_net,0)>0
        OR COALESCE(x.blocking_payslips,0)>0)::int issues
      ${baseFrom} WHERE ${where}`, values),
    client.query(`SELECT (SELECT json_agg(y ORDER BY y) FROM (SELECT DISTINCT EXTRACT(YEAR FROM start_date)::int y FROM payroll_periods) q) years,
      (SELECT json_agg(e ORDER BY e.name) FROM (SELECT DISTINCT COALESCE(p.manager_id,p.created_by) id, CONCAT_WS(' ',e.last_name,e.first_name) name FROM payroll_periods p JOIN employees e ON e.staff_id=COALESCE(p.manager_id,p.created_by)) e) managers,
      (SELECT json_agg(w ORDER BY w.code) FROM (SELECT id,code,name FROM work_locations WHERE is_active=TRUE) w) units`),
  ]);
  return { rows: list.rows, total: count.rows[0]?.total || 0, summary: summary.rows[0], filters: filtersResult.rows[0] };
}

export async function getOperationDetail(periodId, client = pool) {
  const { rows } = await client.query(`SELECT ${selectBase} FROM payroll_periods p
    LEFT JOIN employees m ON m.staff_id=COALESCE(p.manager_id,p.created_by)
    LEFT JOIN employees a ON a.staff_id=p.approver_id ${aggregateSql} WHERE p.id=$1`, [periodId]);
  return rows[0] || null;
}

export async function getReadiness(periodId, client = pool) {
  const { rows } = await client.query(`SELECT COUNT(*)::int total,
    COUNT(*) FILTER(WHERE work_days IS NOT NULL)::int attendance,
    COUNT(*) FILTER(WHERE base_salary IS NOT NULL AND base_salary>0)::int salary,
    COUNT(*) FILTER(WHERE taxable_income IS NOT NULL)::int tax,
    COUNT(*) FILTER(WHERE social_insurance IS NOT NULL AND health_insurance IS NOT NULL)::int insurance,
    COUNT(*) FILTER(WHERE total_deductions IS NOT NULL)::int deductions,
    COUNT(*) FILTER(WHERE payment_reference IS NOT NULL OR status IN ('published','paid'))::int banking
    FROM employee_payslips WHERE payroll_period_id=$1`, [periodId]);
  return rows[0];
}

export async function getUnits(periodId, { page, limit }, client = pool) {
  const offset = (page - 1) * limit;
  const { rows } = await client.query(`WITH grouped AS (
    SELECT COALESCE(w.id,d.id) id, COALESCE(w.code,'PB-'||d.id) code, COALESCE(w.name,d.name,'Chưa phân đơn vị') name,
      COUNT(DISTINCT ep.staff_id)::int employees, COALESCE(SUM(ep.net_salary),0)::numeric payroll,
      COUNT(ep.id) FILTER(WHERE ep.status IN ('draft','waiting_confirmation','employee_feedback','adjusted'))::int warnings,
      CASE WHEN COUNT(ep.id)=0 THEN 0 ELSE ROUND(100.0*COUNT(ep.id) FILTER(WHERE ep.status NOT IN ('draft','waiting_confirmation','employee_feedback','adjusted'))/COUNT(ep.id)) END::int progress
    FROM employee_payslips ep JOIN employees e ON e.staff_id=ep.staff_id
    LEFT JOIN work_locations w ON w.id=e.work_location_id LEFT JOIN departments d ON d.id=e.department_id
    WHERE ep.payroll_period_id=$1 GROUP BY COALESCE(w.id,d.id),COALESCE(w.code,'PB-'||d.id),COALESCE(w.name,d.name,'Chưa phân đơn vị'))
    SELECT *,COUNT(*) OVER()::int total FROM grouped ORDER BY name LIMIT $2 OFFSET $3`, [periodId, limit, offset]);
  return rows;
}

export async function getAlerts(periodId, client = pool) {
  const { rows } = await client.query(`SELECT * FROM (
    SELECT 'critical' severity,'negative_net' code,COUNT(*)::int count,'Phiếu lương có thực lĩnh âm' description FROM employee_payslips WHERE payroll_period_id=$1 AND net_salary<0
    UNION ALL SELECT 'high','import_errors',COALESCE(SUM(invalid_rows),0)::int,'Dòng dữ liệu import chưa hợp lệ' FROM payroll_imports WHERE payroll_period_id=$1
    UNION ALL SELECT 'high','failed_imports',COUNT(*)::int,'Tệp import xử lý thất bại' FROM payroll_imports WHERE payroll_period_id=$1 AND status='failed'
    UNION ALL SELECT 'warning','open_feedback',COUNT(*)::int,'Phản hồi nhân viên chưa xử lý' FROM payroll_feedbacks f JOIN employee_payslips ep ON ep.id=f.payslip_id WHERE ep.payroll_period_id=$1 AND f.status NOT IN ('resolved','rejected')
    UNION ALL SELECT 'warning','pending_payslips',COUNT(*)::int,'Phiếu lương chưa hoàn tất đối soát' FROM employee_payslips WHERE payroll_period_id=$1 AND status IN ('draft','waiting_confirmation','employee_feedback','adjusted')
  ) a WHERE count>0 ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END`, [periodId]);
  return rows;
}

export async function getActivities(periodId, client = pool) {
  const { rows } = await client.query(`SELECT * FROM (
    SELECT 'period_created' type,p.created_by actor,p.created_at occurred_at,'Tạo kỳ lương' action FROM payroll_periods p WHERE p.id=$1
    UNION ALL SELECT 'period_opened',p.opened_by,p.opened_at,'Mở kỳ lương' FROM payroll_periods p WHERE p.id=$1 AND p.opened_at IS NOT NULL
    UNION ALL SELECT 'import',pi.uploaded_by,pi.updated_at,CONCAT('Import ',pi.file_name) FROM payroll_imports pi WHERE pi.payroll_period_id=$1
    UNION ALL SELECT 'publish',p.published_by,p.published_at,'Phát hành lương' FROM payroll_periods p WHERE p.id=$1 AND p.published_at IS NOT NULL
    UNION ALL SELECT 'adjustment',pa.adjusted_by,pa.created_at,'Điều chỉnh phiếu lương' FROM payroll_adjustments pa JOIN employee_payslips ep ON ep.id=pa.payslip_id WHERE ep.payroll_period_id=$1
    UNION ALL SELECT 'locked',p.locked_by,p.closed_at,'Khóa kỳ lương' FROM payroll_periods p WHERE p.id=$1 AND p.closed_at IS NOT NULL
  ) h LEFT JOIN employees e ON e.staff_id=h.actor ORDER BY occurred_at DESC LIMIT 50`, [periodId]);
  return rows.map(({ last_name, first_name, ...row }) => ({ ...row, actor_name: [last_name, first_name].filter(Boolean).join(" ") }));
}

export async function getEmployees(client = pool) {
  const { rows } = await client.query(`SELECT staff_id id,CONCAT_WS(' ',last_name,first_name) name FROM employees WHERE is_active_staff=TRUE ORDER BY name`);
  return rows;
}

export async function openPeriod(periodId, actor, client = pool) {
  const { rows } = await client.query(`UPDATE payroll_periods SET opened_at=COALESCE(opened_at,CURRENT_TIMESTAMP),opened_by=COALESCE(opened_by,$2),updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status='draft' RETURNING *`, [periodId, actor]);
  return rows[0] || null;
}

export async function duplicatePeriod(sourceId, payload, actor, client = pool) {
  const { rows } = await client.query(`INSERT INTO payroll_periods(period_code,period_name,start_date,end_date,payment_date,status,created_by,manager_id,approver_id,description,scope_type,cycle_type,attendance_cutoff_day,data_lock_day,payment_day,payment_method,allow_post_release_adjustment)
    SELECT $2,$3,$4,$5,$6,'draft',$7,CASE WHEN $9 THEN manager_id ELSE $7 END,CASE WHEN $9 THEN approver_id ELSE NULL END,
      CASE WHEN $8 THEN description ELSE NULL END,CASE WHEN $8 THEN scope_type ELSE 'enterprise' END,cycle_type,attendance_cutoff_day,data_lock_day,payment_day,payment_method,allow_post_release_adjustment
    FROM payroll_periods WHERE id=$1 RETURNING *`, [sourceId,payload.periodCode,payload.periodName,payload.startDate,payload.endDate,payload.paymentDate,actor,payload.copyConfiguration,payload.copyPeople]);
  if (rows[0] && payload.copyUnits) {
    await client.query(`INSERT INTO payroll_period_units(payroll_period_id,work_location_id)
      SELECT $1,work_location_id FROM payroll_period_units WHERE payroll_period_id=$2 ON CONFLICT DO NOTHING`, [rows[0].id,sourceId]);
  }
  return rows[0] || null;
}

export async function updateSettings(periodId, data, client = pool) {
  const { rows } = await client.query(`UPDATE payroll_periods SET manager_id=$2,approver_id=$3,description=$4,attendance_cutoff_day=$5,data_lock_day=$6,payment_day=$7,payment_method=$8,allow_post_release_adjustment=$9,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status='draft' RETURNING *`,
    [periodId,data.managerId||null,data.approverId||null,data.description||null,data.attendanceCutoffDay,data.dataLockDay,data.paymentDay,data.paymentMethod,data.allowPostReleaseAdjustment]);
  return rows[0] || null;
}
