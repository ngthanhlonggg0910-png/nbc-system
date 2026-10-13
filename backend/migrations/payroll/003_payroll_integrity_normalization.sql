-- =========================================================
-- E0.2 — PAYROLL INTEGRITY NORMALIZATION
-- =========================================================
--
-- Ensure every employee payslip belongs to an existing
-- employee and protect payroll history from employee deletion.
--
-- Preflight:
--   orphan payslips = 0
-- =========================================================

ALTER TABLE employee_payslips
  ADD CONSTRAINT fk_employee_payslips_staff
  FOREIGN KEY (staff_id)
  REFERENCES employees(staff_id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE employee_payslips
  VALIDATE CONSTRAINT fk_employee_payslips_staff;
