import multer from "multer";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

export function uploadCompanyLogo(req, res, next) {
  upload.single("logo")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Logo tối đa 2 MB."
            : "Tệp logo không hợp lệ.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.",
      });
    }

    return next();
  });
}
