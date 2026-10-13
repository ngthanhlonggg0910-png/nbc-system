import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export function uploadNotificationAttachment(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    return res.status(400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Tệp đính kèm tối đa 10 MB"
        : "Tệp đính kèm không hợp lệ",
      code: "INVALID_NOTIFICATION_ATTACHMENT",
    });
  });
}
