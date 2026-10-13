import multer from "multer";

export const uploadDocumentAttachments = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB / file
    files: 10,
  },
});
