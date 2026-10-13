import pool from "../config/db.js";
import * as repository from "../repositories/company-settings.repository.js";
import {
  deleteCompanyLogo,
  getCompanyLogoDisplayUrl,
} from "./storage/r2.service.js";

export async function getCompanySettings() {
  const settings = await repository.findLatest();

  if (!settings) return null;

  return {
    ...settings,
    logo_display_url: await getCompanyLogoDisplayUrl(settings.logo_url),
  };
}

export async function saveCompanySettings(settings) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('company_settings'))");

    const current = await repository.findLatest(client);
    const updated = await repository.updateLatest(settings, client);
    const result = updated ?? (await repository.create(settings, client));

    await client.query("COMMIT");

    if (
      current?.logo_url &&
      current.logo_url !== result.logo_url
    ) {
      try {
        await deleteCompanyLogo(current.logo_url);
      } catch (error) {
        console.error("[Company Settings] Không thể xóa logo cũ trên R2:", error);
      }
    }

    return {
      ...result,
      logo_display_url: await getCompanyLogoDisplayUrl(result.logo_url),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
