import pool from "../config/db.js";

const columns = `
  company_name,
  logo_url,
  footer_copyright,
  product_name,
  product_version,
  updated_at
`;

export async function findLatest(client = pool) {
  const { rows } = await client.query(`
    SELECT ${columns}
    FROM company_settings
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
  `);

  return rows[0] ?? null;
}

export async function updateLatest(settings, client = pool) {
  const { rows } = await client.query(
    `
      WITH latest AS (
        SELECT ctid
        FROM company_settings
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
      )
      UPDATE company_settings AS setting
      SET
        company_name = $1,
        logo_url = $2,
        footer_copyright = $3,
        product_name = $4,
        product_version = $5,
        updated_at = NOW()
      FROM latest
      WHERE setting.ctid = latest.ctid
      RETURNING ${columns}
    `,
    [
      settings.company_name,
      settings.logo_url,
      settings.footer_copyright,
      settings.product_name,
      settings.product_version,
    ],
  );

  return rows[0] ?? null;
}

export async function create(settings, client = pool) {
  const { rows } = await client.query(
    `
      INSERT INTO company_settings (
        company_name,
        logo_url,
        footer_copyright,
        product_name,
        product_version,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING ${columns}
    `,
    [
      settings.company_name,
      settings.logo_url,
      settings.footer_copyright,
      settings.product_name,
      settings.product_version,
    ],
  );

  return rows[0];
}
