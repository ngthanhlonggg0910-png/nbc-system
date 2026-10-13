export function isNotificationAdmin(
    req,
    res,
    next,
) {
    const adminRoleId = Number(
        process.env.ADMIN_ROLE_ID,
    );

    if (!Number.isInteger(adminRoleId)) {
        return res.status(500).json({
            success: false,
            message:
                "Server chưa cấu hình ADMIN_ROLE_ID",
        });
    }

    if (Number(req.user?.role_id) !== adminRoleId) {
        return res.status(403).json({
            success: false,
            message:
                "Bạn không có quyền tạo thông báo",
        });
    }

    next();
}