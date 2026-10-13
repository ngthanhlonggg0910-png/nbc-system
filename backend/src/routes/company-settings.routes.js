import { Router } from "express";
import {
  getCompanySettings,
  uploadCompanyLogo,
  updateCompanySettings,
} from "../controllers/company-settings.controller.js";
import { uploadCompanyLogo as uploadCompanyLogoFile } from "../middleware/company-logo-upload.middleware.js";
import {
  authorizePermissions,
  isAuthenticated,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(isAuthenticated);
router.get("/", getCompanySettings);
router.use(authorizePermissions("view_setting"));
router.post("/logo", uploadCompanyLogoFile, uploadCompanyLogo);
router.put("/", updateCompanySettings);

export default router;
