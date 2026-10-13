import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

export function uploadPayrollFeedbackAttachment(req, res, next) {
  upload.single("attachment")(req, res, (error) => {
    if (!error) return next();

    return res.status(400).json({
      success: false,
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "Tệp minh chứng tối đa 5 MB"
          : "Tệp minh chứng không hợp lệ",
      code: "INVALID_PAYROLL_FEEDBACK_ATTACHMENT",
    });
  });
}
