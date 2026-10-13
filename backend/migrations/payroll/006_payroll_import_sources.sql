BEGIN;

ALTER TABLE payroll_imports
  DROP CONSTRAINT IF EXISTS payroll_imports_file_type_check;

ALTER TABLE payroll_imports
  ADD CONSTRAINT payroll_imports_file_type_check
  CHECK (file_type IN ('excel', 'html', 'manual'));

COMMENT ON COLUMN payroll_imports.file_type IS
  'Nguồn nhập bảng lương: excel, html hoặc manual.';

COMMIT;
