-- =========================================================
-- MIGRATION: Bổ sung salary_master_items.id & payslip.current_version
-- =========================================================

-- id cho salary_master_items (giữ nguyên PK cũ trên code)
ALTER TABLE salary_master_items
  ADD COLUMN IF NOT EXISTS id BIGINT;

CREATE SEQUENCE IF NOT EXISTS salary_master_items_id_seq
  OWNED BY salary_master_items.id;

UPDATE salary_master_items SET id = nextval('salary_master_items_id_seq') WHERE id IS NULL;

SELECT setval('salary_master_items_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM salary_master_items), 1));

ALTER TABLE salary_master_items ALTER COLUMN id SET DEFAULT nextval('salary_master_items_id_seq');
ALTER TABLE salary_master_items ALTER COLUMN id SET NOT NULL;
ALTER TABLE salary_master_items DROP CONSTRAINT IF EXISTS salary_master_items_id_unique;
ALTER TABLE salary_master_items ADD CONSTRAINT salary_master_items_id_unique UNIQUE (id);

-- Phiên bản hiện tại của payslip (dùng trong workflow feedback)
ALTER TABLE employee_payslips
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1;
