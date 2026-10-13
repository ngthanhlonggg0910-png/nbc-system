import { catchAsyncError } from "../middleware/catchAsyncError.js";
import { ErrorHandler } from "../middleware/errorMiddleware.js";
import * as companySettingsService from "../services/company-settings.service.js";
import {
  getCompanyLogoDisplayUrl,
  uploadCompanyLogo as uploadCompanyLogoToR2,
} from "../services/storage/r2.service.js";

const LIMITS = {
  company_name: 255,
  footer_copyright: 255,
  product_name: 150,
  product_version: 50,
  logo_url: 2_000_000,
};

function normalizeOptionalText(value, field) {
  const normalized = String(value ?? "").trim();

  if (normalized.length > LIMITS[field]) {
    throw new ErrorHandler(`${field} vượt quá độ dài cho phép!`, 400);
  }

  return normalized || null;
}

function normalizeSettings(body) {
  const companyName = String(body.company_name ?? body.companyName ?? "").trim();

  if (!companyName) {
    throw new ErrorHandler("Tên công ty là bắt buộc!", 400);
  }
  if (companyName.length > LIMITS.company_name) {
    throw new ErrorHandler("Tên công ty vượt quá 255 ký tự!", 400);
  }

  return {
    company_name: companyName,
    logo_url: normalizeOptionalText(
      body.logo_url ?? body.logoUrl ?? body.companyLogo,
      "logo_url",
    ),
    footer_copyright: normalizeOptionalText(
      body.footer_copyright ?? body.footerCopyright,
      "footer_copyright",
    ),
    product_name: normalizeOptionalText(
      body.product_name ?? body.productName,
      "product_name",
    ),
    product_version: normalizeOptionalText(
      body.product_version ?? body.productVersion,
      "product_version",
    ),
  };
}

export const getCompanySettings = catchAsyncError(async (req, res) => {
  const data = await companySettingsService.getCompanySettings();

  return res.status(200).json({
    success: true,
    data,
  });
});

export const updateCompanySettings = catchAsyncError(async (req, res) => {
  const settings = normalizeSettings(req.body);
  const data = await companySettingsService.saveCompanySettings(settings);

  return res.status(200).json({
    success: true,
    message: "Đã lưu thông tin công ty.",
    data,
  });
});

export const uploadCompanyLogo = catchAsyncError(async (req, res) => {
  const uploaded = await uploadCompanyLogoToR2(req.file);
  const logo_display_url = await getCompanyLogoDisplayUrl(uploaded.logo_url);

  return res.status(201).json({
    success: true,
    message: "Đã tải logo lên R2.",
    data: {
      ...uploaded,
      logo_display_url,
    },
  });
});
