BEGIN;

ALTER TABLE payroll_periods
  ADD COLUMN IF NOT EXISTS manager_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS approver_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20) NOT NULL DEFAULT 'enterprise',
  ADD COLUMN IF NOT EXISTS cycle_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS attendance_cutoff_day SMALLINT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS data_lock_day SMALLINT NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS payment_day SMALLINT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NOT NULL DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS allow_post_release_adjustment BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_by VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_periods_manager') THEN
    ALTER TABLE payroll_periods ADD CONSTRAINT fk_payroll_periods_manager
      FOREIGN KEY (manager_id) REFERENCES employees(staff_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_periods_approver') THEN
    ALTER TABLE payroll_periods ADD CONSTRAINT fk_payroll_periods_approver
      FOREIGN KEY (approver_id) REFERENCES employees(staff_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_periods_opener') THEN
    ALTER TABLE payroll_periods ADD CONSTRAINT fk_payroll_periods_opener
      FOREIGN KEY (opened_by) REFERENCES employees(staff_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_payroll_periods_scope_type') THEN
    ALTER TABLE payroll_periods ADD CONSTRAINT ck_payroll_periods_scope_type
      CHECK (scope_type IN ('enterprise', 'selected_units'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_payroll_periods_cycle_type') THEN
    ALTER TABLE payroll_periods ADD CONSTRAINT ck_payroll_periods_cycle_type
      CHECK (cycle_type IN ('monthly'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_payroll_periods_operation_days') THEN
    ALTER TABLE payroll_periods ADD CONSTRAINT ck_payroll_periods_operation_days
      CHECK (attendance_cutoff_day BETWEEN 1 AND 31 AND data_lock_day BETWEEN 1 AND 31 AND payment_day BETWEEN 1 AND 31);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payroll_period_units (
  payroll_period_id BIGINT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  work_location_id BIGINT NOT NULL REFERENCES work_locations(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payroll_period_id, work_location_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_operations_filter
  ON payroll_periods (status, start_date DESC, manager_id);

CREATE INDEX IF NOT EXISTS idx_payroll_period_units_location
  ON payroll_period_units (work_location_id, payroll_period_id);

COMMIT;
