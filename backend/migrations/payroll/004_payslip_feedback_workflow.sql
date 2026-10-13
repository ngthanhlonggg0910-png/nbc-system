-- =========================================================
-- PAYSLIP CONFIRMATION + EMPLOYEE FEEDBACK WORKFLOW
-- =========================================================

ALTER TABLE employee_payslips
  ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(50) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_employee_payslips_confirmed_by'
      AND conrelid = 'employee_payslips'::regclass
  ) THEN
    ALTER TABLE employee_payslips
      ADD CONSTRAINT fk_employee_payslips_confirmed_by
      FOREIGN KEY (confirmed_by)
      REFERENCES employees(staff_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE payroll_feedbacks
  ADD COLUMN IF NOT EXISTS feedback_code VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS issue_type VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS salary_item_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS payslip_version INTEGER NULL,
  ADD COLUMN IF NOT EXISTS proposed_value VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS attachment_original_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS attachment_stored_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS attachment_mime_type VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS attachment_size_bytes BIGINT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_payroll_feedbacks_salary_item'
      AND conrelid = 'payroll_feedbacks'::regclass
  ) THEN
    ALTER TABLE payroll_feedbacks
      ADD CONSTRAINT fk_payroll_feedbacks_salary_item
      FOREIGN KEY (salary_item_id)
      REFERENCES salary_master_items(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_payroll_feedbacks_priority'
      AND conrelid = 'payroll_feedbacks'::regclass
  ) THEN
    ALTER TABLE payroll_feedbacks
      ADD CONSTRAINT ck_payroll_feedbacks_priority
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END
$$;

UPDATE payroll_feedbacks AS feedback
SET
  feedback_code = CONCAT(
    'FB-',
    REPLACE(period.period_code, '-', ''),
    '-',
    LPAD(feedback.id::TEXT, 5, '0')
  ),
  issue_type = COALESCE(
    feedback.issue_type,
    CASE feedback.category
      WHEN 'attendance' THEN 'attendance'
      WHEN 'income' THEN 'other_income'
      WHEN 'deduction' THEN 'other_deduction'
      ELSE 'other'
    END
  ),
  payslip_version = COALESCE(feedback.payslip_version, payslip.current_version)
FROM employee_payslips AS payslip
INNER JOIN payroll_periods AS period
  ON period.id = payslip.payroll_period_id
WHERE payslip.id = feedback.payslip_id
  AND (
    feedback.feedback_code IS NULL
    OR feedback.issue_type IS NULL
    OR feedback.payslip_version IS NULL
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_feedbacks_code
  ON payroll_feedbacks(feedback_code)
  WHERE feedback_code IS NOT NULL;

DROP INDEX IF EXISTS uq_payroll_feedbacks_open;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_feedbacks_open_issue
  ON payroll_feedbacks (
    payslip_id,
    staff_id,
    issue_type,
    COALESCE(salary_item_id, 0)
  )
  WHERE status IN ('pending', 'reviewing', 'accepted', 'adjusted');

CREATE INDEX IF NOT EXISTS idx_payroll_feedbacks_payslip_issue
  ON payroll_feedbacks(payslip_id, issue_type, salary_item_id, created_at DESC);
