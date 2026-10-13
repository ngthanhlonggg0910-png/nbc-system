import pool from "../../config/db.js";

/**
 * Lấy các khoản lương được phép hiển thị cho nhân viên.
 *
 * Chỉ trả về salary_master_items có:
 * visible_to_employee = true.
 */
export async function findVisibleDetailsByPayslipId(
  payslipId,
  client = pool,
) {
  const query = `
    SELECT
      detail.id,
      detail.payslip_id,
      detail.staff_id,
      detail.period_code,
      detail.salary_item_id,
      detail.item_code,
      detail.item_label,
      detail.category,
      detail.taxable,
      detail.include_in_12month_average,
      detail.visible_to_employee,
      detail.display_order,
      detail.amount,
      detail.quantity,
      detail.rate,
      detail.description
    FROM vw_employee_payslip_details AS detail
    WHERE detail.payslip_id = $1
      AND detail.visible_to_employee = TRUE
    ORDER BY
      CASE
        WHEN detail.category = 'income' THEN 1
        WHEN detail.category = 'deduction' THEN 2
        ELSE 3
      END,
      detail.display_order ASC,
      detail.salary_item_id ASC;
  `;

  const { rows } = await client.query(query, [
    payslipId,
  ]);

  return rows;
}

/**
 * Lấy toàn bộ khoản lương, bao gồm cả khoản không hiển thị
 * cho nhân viên.
 *
 * Hàm này dùng cho HR/Admin.
 */
export async function findAllDetailsByPayslipId(
  payslipId,
  client = pool,
) {
  const query = `
    SELECT
      detail.id,
      detail.payslip_id,
      detail.staff_id,
      detail.period_code,
      detail.salary_item_id,
      detail.item_code,
      detail.item_label,
      detail.category,
      detail.taxable,
      detail.include_in_12month_average,
      detail.visible_to_employee,
      detail.display_order,
      detail.amount,
      detail.quantity,
      detail.rate,
      detail.description
    FROM vw_employee_payslip_details AS detail
    WHERE detail.payslip_id = $1
    ORDER BY
      CASE
        WHEN detail.category = 'income' THEN 1
        WHEN detail.category = 'deduction' THEN 2
        ELSE 3
      END,
      detail.display_order ASC,
      detail.salary_item_id ASC;
  `;

  const { rows } = await client.query(query, [
    payslipId,
  ]);

  return rows;
}

/**
 * Tìm một khoản lương cụ thể trong phiếu lương.
 */
export async function findByPayslipAndSalaryItem(
  {
    payslipId,
    salaryItemId,
  },
  client = pool,
) {
  const query = `
    SELECT
      detail.id,
      detail.payslip_id,
      detail.salary_item_id,
      salary_item.code AS item_code,
      salary_item.label AS item_label,
      salary_item.category,
      salary_item.taxable,
      salary_item.visible_to_employee,
      salary_item.display_order,
      detail.amount,
      detail.quantity,
      detail.rate,
      detail.description,
      detail.created_at
    FROM payslip_details AS detail

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id = detail.salary_item_id

    WHERE detail.payslip_id = $1
      AND detail.salary_item_id = $2

    LIMIT 1;
  `;

  const values = [
    payslipId,
    salaryItemId,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Thêm hoặc cập nhật một khoản lương.
 *
 * Nếu cùng payslip_id + salary_item_id đã tồn tại,
 * PostgreSQL sẽ cập nhật số tiền thay vì tạo dòng trùng.
 */
export async function upsertPayslipDetail(
  {
    payslipId,
    salaryItemId,
    amount,
    quantity = null,
    rate = null,
    description = null,
  },
  client = pool,
) {
  const query = `
    INSERT INTO payslip_details (
      payslip_id,
      salary_item_id,
      amount,
      quantity,
      rate,
      description
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6
    )

    ON CONFLICT (
      payslip_id,
      salary_item_id
    )
    DO UPDATE SET
      amount = EXCLUDED.amount,
      quantity = EXCLUDED.quantity,
      rate = EXCLUDED.rate,
      description = EXCLUDED.description

    RETURNING
      id,
      payslip_id,
      salary_item_id,
      amount,
      quantity,
      rate,
      description,
      created_at;
  `;

  const values = [
    payslipId,
    salaryItemId,
    amount,
    quantity,
    rate,
    description,
  ];

  const { rows } = await client.query(query, values);

  return rows[0];
}

/**
 * Thêm hoặc cập nhật nhiều khoản lương cùng lúc.
 *
 * Dùng khi:
 * - Import Excel.
 * - HR điều chỉnh nhiều khoản.
 * - Tạo phiếu lương mới.
 *
 * details có dạng:
 * [
 *   {
 *     salaryItemId: 1,
 *     amount: 8904000,
 *     quantity: 26,
 *     rate: null,
 *     description: "Lương công việc"
 *   }
 * ]
 */
export async function upsertManyPayslipDetails(
  {
    payslipId,
    details,
  },
  client = pool,
) {
  if (!Array.isArray(details) || details.length === 0) {
    return [];
  }

  const normalizedDetails = details.map((detail) => ({
    salary_item_id: detail.salaryItemId,
    amount: detail.amount,
    quantity: detail.quantity ?? null,
    rate: detail.rate ?? null,
    description: detail.description ?? null,
  }));

  const query = `
    INSERT INTO payslip_details (
      payslip_id,
      salary_item_id,
      amount,
      quantity,
      rate,
      description
    )
    SELECT
      $1,
      imported_detail.salary_item_id,
      imported_detail.amount,
      imported_detail.quantity,
      imported_detail.rate,
      imported_detail.description
    FROM JSONB_TO_RECORDSET($2::JSONB)
      AS imported_detail (
        salary_item_id BIGINT,
        amount NUMERIC(19,2),
        quantity NUMERIC(12,2),
        rate NUMERIC(19,4),
        description VARCHAR(1000)
      )

    ON CONFLICT (
      payslip_id,
      salary_item_id
    )
    DO UPDATE SET
      amount = EXCLUDED.amount,
      quantity = EXCLUDED.quantity,
      rate = EXCLUDED.rate,
      description = EXCLUDED.description

    RETURNING
      id,
      payslip_id,
      salary_item_id,
      amount,
      quantity,
      rate,
      description,
      created_at;
  `;

  const values = [
    payslipId,
    JSON.stringify(normalizedDetails),
  ];

  const { rows } = await client.query(query, values);

  return rows;
}

/**
 * Xóa một khoản lương khỏi phiếu.
 *
 * Chỉ nên được service điều chỉnh lương gọi khi:
 * - Phiếu chưa khóa.
 * - Phiếu chưa thanh toán.
 * - Phiên bản cũ đã được lưu snapshot.
 */
export async function deletePayslipDetail(
  {
    payslipId,
    salaryItemId,
  },
  client = pool,
) {
  const query = `
    DELETE FROM payslip_details
    WHERE payslip_id = $1
      AND salary_item_id = $2
    RETURNING
      id,
      payslip_id,
      salary_item_id,
      amount,
      quantity,
      rate,
      description;
  `;

  const values = [
    payslipId,
    salaryItemId,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Xóa toàn bộ chi tiết của một phiếu lương.
 *
 * Hàm này chủ yếu dùng khi import lại bản nháp.
 * Không được gọi cho phiếu đã phát hành hoặc đã thanh toán.
 *
 * Quy tắc trạng thái phải được kiểm tra ở service.
 */
export async function deleteAllByPayslipId(
  payslipId,
  client = pool,
) {
  const query = `
    DELETE FROM payslip_details
    WHERE payslip_id = $1
    RETURNING id;
  `;

  const { rows } = await client.query(query, [
    payslipId,
  ]);

  return {
    deletedCount: rows.length,
    deletedIds: rows.map((row) => Number(row.id)),
  };
}

/**
 * Tính tổng chi tiết theo loại thu nhập/khấu trừ.
 *
 * Hàm này hữu ích khi cần đối chiếu:
 * - Tổng các khoản thu nhập với gross_income.
 * - Tổng các khoản khấu trừ với total_deductions.
 */
export async function calculateDetailTotals(
  payslipId,
  client = pool,
) {
  const query = `
    SELECT
      COALESCE(
        SUM(detail.amount)
          FILTER (
            WHERE salary_item.category = 'income'
          ),
        0
      ) AS total_income,

      COALESCE(
        SUM(detail.amount)
          FILTER (
            WHERE salary_item.category = 'deduction'
          ),
        0
      ) AS total_deduction

    FROM payslip_details AS detail

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id = detail.salary_item_id

    WHERE detail.payslip_id = $1;
  `;

  const { rows } = await client.query(query, [
    payslipId,
  ]);

  return {
    totalIncome: rows[0]?.total_income ?? "0",
    totalDeduction:
      rows[0]?.total_deduction ?? "0",
  };
}