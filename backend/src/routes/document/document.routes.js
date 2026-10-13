import express from "express";
import * as controller from "../../controllers/document/document.controller.js";
import {
  isAuthenticated,
  authorizeRoles,
} from "../../middleware/authMiddleware.js";

import { uploadDocumentAttachments } from "../../middleware/document-upload.middleware.js";

const router = express.Router();

router.get(
  "/attachments/:id/url",
  isAuthenticated,
  controller.getAttachmentUrl,
);
router.get(
  "/manager/pending",
  isAuthenticated,
  controller.getPendingDocumentsForManager,
);
router.get("/", controller.getDocuments);

router.post(
  "/",
  isAuthenticated,
  uploadDocumentAttachments.array("attachments", 10),
  controller.createDocumentRequest,
);

router.patch("/:id/reject", isAuthenticated, controller.rejectDocumentRequest);

router.patch(
  "/:id/approve",
  isAuthenticated,
  controller.approveDocumentRequest,
);

export default router;
