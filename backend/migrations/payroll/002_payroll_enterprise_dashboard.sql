-- Read-model indexes for the enterprise payroll command center.
-- Safe to execute repeatedly on PostgreSQL/Neon.
CREATE INDEX IF NOT EXISTS idx_payroll_periods_dashboard
  ON payroll_periods (period_code, status, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_employee_payslips_period_status_staff
  ON employee_payslips (payroll_period_id, status, staff_id);

CREATE INDEX IF NOT EXISTS idx_payroll_imports_period_status_updated
  ON payroll_imports (payroll_period_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_feedbacks_payslip_status_updated
  ON payroll_feedbacks (payslip_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_employees_location_active
  ON employees (work_location_id, is_active_staff, staff_id);
