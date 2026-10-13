import pool from "../../config/db.js";

/**
 * Lấy danh sách tiêu chí lương.
 *
 * Filter:
 * - category: income hoặc deduction.
 * - enabled: true hoặc false.
 * - visibleToEmployee: true hoặc false.
 */
export async function findSalaryItems(
  {
    category = null,
    enabled = null,
    visibleToEmployee = null,
  } = {},
  client = pool,
) {
  const query = `
    SELECT
      item.id,
      item.code,
      item.label,
      item.category,
      item.include_in_12month_average,
      item.taxable,
      item.visible_to_employee,
      item.display_order,
      item.enabled,
      item.description,
      item.created_at,
      item.updated_at
    FROM salary_master_items AS item
    WHERE (
      $1::VARCHAR IS NULL
      OR item.category = $1
    )
    AND (
      $2::BOOLEAN IS NULL
      OR item.enabled = $2
    )
    AND (
      $3::BOOLEAN IS NULL
      OR item.visible_to_employee = $3
    )
    ORDER BY
      CASE
        WHEN item.category = 'income' THEN 1
        WHEN item.category = 'deduction' THEN 2
        ELSE 3
      END,
      item.display_order ASC,
      item.id ASC;
  `;

  const values = [
    category,
    enabled,
    visibleToEmployee,
  ];

  const { rows } = await client.query(query, values);

  return rows;
}

/**
 * Lấy các tiêu chí đang được sử dụng.
 *
 * Hàm này phù hợp cho:
 * - Màn hình cấu hình lương.
 * - Import Excel.
 * - Tạo phiếu lương.
 */
export async function findEnabledSalaryItems(
  client = pool,
) {
  const query = `
    SELECT
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description,
      created_at,
      updated_at
    FROM salary_master_items
    WHERE enabled = TRUE
    ORDER BY
      CASE
        WHEN category = 'income' THEN 1
        WHEN category = 'deduction' THEN 2
        ELSE 3
      END,
      display_order ASC,
      id ASC;
  `;

  const { rows } = await client.query(query);

  return rows;
}

/**
 * Lấy danh sách tiêu chí được phép hiển thị cho nhân viên.
 */
export async function findEmployeeVisibleItems(
  client = pool,
) {
  const query = `
    SELECT
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description
    FROM salary_master_items
    WHERE enabled = TRUE
      AND visible_to_employee = TRUE
    ORDER BY
      CASE
        WHEN category = 'income' THEN 1
        WHEN category = 'deduction' THEN 2
        ELSE 3
      END,
      display_order ASC,
      id ASC;
  `;

  const { rows } = await client.query(query);

  return rows;
}

/**
 * Tìm tiêu chí lương bằng ID.
 */
export async function findById(
  salaryItemId,
  client = pool,
) {
  const query = `
    SELECT
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description,
      created_at,
      updated_at
    FROM salary_master_items
    WHERE id = $1
    LIMIT 1;
  `;

  const { rows } = await client.query(query, [
    salaryItemId,
  ]);

  return rows[0] ?? null;
}

/**
 * Tìm tiêu chí lương bằng mã dữ liệu.
 *
 * Ví dụ:
 * BASE_SALARY
 * OVERTIME
 * SOCIAL_INSURANCE
 */
export async function findByCode(
  code,
  client = pool,
) {
  const query = `
    SELECT
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description,
      created_at,
      updated_at
    FROM salary_master_items
    WHERE UPPER(code) = UPPER($1)
    LIMIT 1;
  `;

  const { rows } = await client.query(query, [
    code,
  ]);

  return rows[0] ?? null;
}

/**
 * Tìm nhiều tiêu chí lương bằng danh sách code.
 *
 * Dùng khi import Excel để ánh xạ:
 *
 * Cột Excel
 * → salary_master_items.code
 * → salary_item_id
 */
export async function findByCodes(
  codes,
  client = pool,
) {
  if (!Array.isArray(codes) || codes.length === 0) {
    return [];
  }

  const normalizedCodes = [
    ...new Set(
      codes
        .filter(
          (code) =>
            typeof code === "string" &&
            code.trim() !== "",
        )
        .map((code) =>
          code.trim().toUpperCase(),
        ),
    ),
  ];

  if (normalizedCodes.length === 0) {
    return [];
  }

  const query = `
    SELECT
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description
    FROM salary_master_items
    WHERE UPPER(code) =
      ANY($1::VARCHAR[])
    ORDER BY display_order ASC, id ASC;
  `;

  const { rows } = await client.query(query, [
    normalizedCodes,
  ]);

  return rows;
}

/**
 * Kiểm tra mã tiêu chí đã tồn tại.
 */
export async function codeExists(
  code,
  client = pool,
) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM salary_master_items
      WHERE UPPER(code) = UPPER($1)
    ) AS exists;
  `;

  const { rows } = await client.query(query, [
    code,
  ]);

  return rows[0]?.exists === true;
}

/**
 * Tạo tiêu chí lương mới.
 */
export async function createSalaryItem(
  {
    code,
    label,
    category,
    includeIn12MonthAverage = true,
    taxable = true,
    visibleToEmployee = true,
    displayOrder = 0,
    enabled = true,
    description = null,
  },
  client = pool,
) {
  const query = `
    INSERT INTO salary_master_items (
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description
    )
    VALUES (
      UPPER($1),
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9
    )
    RETURNING
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description,
      created_at,
      updated_at;
  `;

  const values = [
    code,
    label,
    category,
    includeIn12MonthAverage,
    taxable,
    visibleToEmployee,
    displayOrder,
    enabled,
    description,
  ];

  const { rows } = await client.query(query, values);

  return rows[0];
}

/**
 * Cập nhật tiêu chí lương.
 *
 * Không cho đổi code vì code được dùng để ánh xạ
 * dữ liệu Excel và tích hợp API.
 */
export async function updateSalaryItem(
  {
    salaryItemId,
    label,
    category,
    includeIn12MonthAverage,
    taxable,
    visibleToEmployee,
    displayOrder,
    description = null,
  },
  client = pool,
) {
  const query = `
    UPDATE salary_master_items
    SET
      label = $2,
      category = $3,
      include_in_12month_average = $4,
      taxable = $5,
      visible_to_employee = $6,
      display_order = $7,
      description = $8,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description,
      created_at,
      updated_at;
  `;

  const values = [
    salaryItemId,
    label,
    category,
    includeIn12MonthAverage,
    taxable,
    visibleToEmployee,
    displayOrder,
    description,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Bật hoặc tắt tiêu chí lương.
 *
 * Không xóa vật lý vì tiêu chí có thể đã được sử dụng
 * trong các phiếu lương cũ.
 */
export async function setSalaryItemEnabled(
  {
    salaryItemId,
    enabled,
  },
  client = pool,
) {
  const query = `
    UPDATE salary_master_items
    SET
      enabled = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description,
      created_at,
      updated_at;
  `;

  const values = [
    salaryItemId,
    enabled,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Cấu hình tiêu chí có được tính vào
 * báo cáo bình quân 12 tháng hay không.
 */
export async function setIncludeIn12MonthAverage(
  {
    salaryItemId,
    includeIn12MonthAverage,
  },
  client = pool,
) {
  const query = `
    UPDATE salary_master_items
    SET
      include_in_12month_average = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description,
      created_at,
      updated_at;
  `;

  const values = [
    salaryItemId,
    includeIn12MonthAverage,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Cấu hình tiêu chí có hiển thị cho nhân viên hay không.
 */
export async function setVisibleToEmployee(
  {
    salaryItemId,
    visibleToEmployee,
  },
  client = pool,
) {
  const query = `
    UPDATE salary_master_items
    SET
      visible_to_employee = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING
      id,
      code,
      label,
      category,
      include_in_12month_average,
      taxable,
      visible_to_employee,
      display_order,
      enabled,
      description,
      created_at,
      updated_at;
  `;

  const values = [
    salaryItemId,
    visibleToEmployee,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Cập nhật thứ tự hiển thị cho nhiều tiêu chí.
 *
 * items:
 * [
 *   {
 *     salaryItemId: 1,
 *     displayOrder: 1
 *   },
 *   {
 *     salaryItemId: 2,
 *     displayOrder: 2
 *   }
 * ]
 */
export async function updateDisplayOrders(
  items,
  client = pool,
) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const normalizedItems = items.map((item) => ({
    salary_item_id: item.salaryItemId,
    display_order: item.displayOrder,
  }));

  const query = `
    UPDATE salary_master_items AS salary_item
    SET
      display_order =
        imported_item.display_order,

      updated_at = CURRENT_TIMESTAMP

    FROM JSONB_TO_RECORDSET($1::JSONB)
      AS imported_item (
        salary_item_id BIGINT,
        display_order INT
      )

    WHERE salary_item.id =
          imported_item.salary_item_id

    RETURNING
      salary_item.id,
      salary_item.code,
      salary_item.label,
      salary_item.category,
      salary_item.display_order,
      salary_item.enabled,
      salary_item.updated_at;
  `;

  const { rows } = await client.query(query, [
    JSON.stringify(normalizedItems),
  ]);

  return rows;
}

/**
 * Lấy các code không tồn tại hoặc đã bị vô hiệu hóa.
 *
 * Dùng để báo lỗi cột Excel trước khi import.
 */
export async function findInvalidCodes(
  codes,
  client = pool,
) {
  if (!Array.isArray(codes) || codes.length === 0) {
    return [];
  }

  const normalizedCodes = [
    ...new Set(
      codes
        .filter(
          (code) =>
            typeof code === "string" &&
            code.trim() !== "",
        )
        .map((code) =>
          code.trim().toUpperCase(),
        ),
    ),
  ];

  if (normalizedCodes.length === 0) {
    return [];
  }

  const query = `
    WITH requested_code AS (
      SELECT UNNEST(
        $1::VARCHAR[]
      ) AS code
    )
    SELECT
      requested_code.code,

      CASE
        WHEN salary_item.id IS NULL
          THEN 'not_found'

        WHEN salary_item.enabled = FALSE
          THEN 'disabled'

        ELSE 'valid'
      END AS reason

    FROM requested_code

    LEFT JOIN salary_master_items AS salary_item
      ON UPPER(salary_item.code) =
         UPPER(requested_code.code)

    WHERE salary_item.id IS NULL
       OR salary_item.enabled = FALSE

    ORDER BY requested_code.code ASC;
  `;

  const { rows } = await client.query(query, [
    normalizedCodes,
  ]);

  return rows;
}