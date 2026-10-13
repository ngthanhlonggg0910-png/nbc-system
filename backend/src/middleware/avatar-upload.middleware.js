import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
        if (allowedTypes.has(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error("Chỉ chấp nhận định dạng ảnh jpg, jpeg, png, webp!"));
    },
});

export function uploadAvatarMiddleware(req, res, next) {
    upload.single("avatar")(req, res, (error) => {
        if (!error) return next();
        return res.status(400).json({
            success: false,
            message: error.message || "Tệp tải lên không hợp lệ",
        });
    });
}
