const NOTIFICATION_TYPES = new Set([
    "general",
    "attendance",
    "payroll",
    "document",
    "system",
    "urgent",
    "article",
]);

const TONES = new Set([
    "blue",
    "green",
    "orange",
    "red",
]);

const AUDIENCES = new Set([
    "employee",
    "department",
    "all",
]);

const TARGET_TABS = new Set([
    "home",
    "attendance",
    "payroll",
    "documents",
    "news",
    "profile",
]);

function sendValidationError(
    res,
    message,
    field,
) {
    return res.status(400).json({
        success: false,
        message,
        error: {
            code: "VALIDATION_ERROR",
            field,
        },
    });
}

function parseOptionalBoolean(value) {
    if (value === undefined) {
        return {
            valid: true,
            value: undefined,
        };
    }

    if (typeof value === "boolean") {
        return {
            valid: true,
            value,
        };
    }

    return {
        valid: false,
        value: undefined,
    };
}

function isSafeUrl(value) {
    if (!value) return true;
    if (value.startsWith("/")) return !value.startsWith("//");
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function validateCreateNotification(
    req,
    res,
    next,
) {
    const body = req.body ?? {};

    const title =
        typeof body.title === "string"
            ? body.title.trim()
            : "";

    const description =
        typeof body.description === "string"
            ? body.description.trim()
            : "";

    const notificationType =
        body.notification_type ?? "general";

    const tone = body.tone ?? "blue";
    const audience =
        body.audience ?? "employee";

    const staffId =
        typeof body.staff_id === "string"
            ? body.staff_id.trim()
            : "";

    const targetTab =
        body.target_tab ?? "home";

    if (!title) {
        return sendValidationError(
            res,
            "Tiêu đề không được để trống",
            "title",
        );
    }

    if (title.length > 255) {
        return sendValidationError(
            res,
            "Tiêu đề tối đa 255 ký tự",
            "title",
        );
    }

    if (!description) {
        return sendValidationError(
            res,
            "Nội dung thông báo không được để trống",
            "description",
        );
    }

    if (!NOTIFICATION_TYPES.has(notificationType)) {
        return sendValidationError(
            res,
            "Loại thông báo không hợp lệ",
            "notification_type",
        );
    }

    if (!TONES.has(tone)) {
        return sendValidationError(
            res,
            "Tone thông báo không hợp lệ",
            "tone",
        );
    }

    if (!AUDIENCES.has(audience)) {
        return sendValidationError(
            res,
            "Hiện tại chỉ hỗ trợ audience=employee",
            "audience",
        );
    }

    if (audience === "employee" && !staffId) {
        return sendValidationError(
            res,
            "Thiếu mã nhân viên nhận thông báo",
            "staff_id",
        );
    }

    const departmentId = body.department_id === undefined || body.department_id === null || body.department_id === ""
        ? null : Number(body.department_id);
    if (audience === "department" && (!Number.isSafeInteger(departmentId) || departmentId <= 0)) {
        return sendValidationError(res, "Phòng ban không hợp lệ", "department_id");
    }

    if (staffId.length > 30) {
        return sendValidationError(
            res,
            "Mã nhân viên tối đa 30 ký tự",
            "staff_id",
        );
    }

    if (!TARGET_TABS.has(targetTab)) {
        return sendValidationError(
            res,
            "Màn hình đích không hợp lệ",
            "target_tab",
        );
    }

    const urgentResult =
        parseOptionalBoolean(body.is_urgent);

    if (!urgentResult.valid) {
        return sendValidationError(
            res,
            "is_urgent phải là boolean",
            "is_urgent",
        );
    }

    const replyResult =
        parseOptionalBoolean(body.allow_reply);

    if (!replyResult.valid) {
        return sendValidationError(
            res,
            "allow_reply phải là boolean",
            "allow_reply",
        );
    }

    let expiresAt = null;
    let publishedAt = null;

    if (body.published_at) {
        publishedAt = new Date(body.published_at);
        if (Number.isNaN(publishedAt.getTime())) return sendValidationError(res, "Thời gian gửi không hợp lệ", "published_at");
    }

    if (body.expires_at) {
        expiresAt = new Date(body.expires_at);

        if (Number.isNaN(expiresAt.getTime())) {
            return sendValidationError(
                res,
                "expires_at không hợp lệ",
                "expires_at",
            );
        }

        if (expiresAt.getTime() <= Date.now()) {
            return sendValidationError(
                res,
                "expires_at phải ở tương lai",
                "expires_at",
            );
        }
    }

    if (
        body.action_url !== undefined &&
        body.action_url !== null &&
        typeof body.action_url !== "string"
    ) {
        return sendValidationError(
            res,
            "action_url phải là chuỗi",
            "action_url",
        );
    }

    if (
        typeof body.action_url === "string" &&
        body.action_url.length > 1000
    ) {
        return sendValidationError(
            res,
            "action_url tối đa 1000 ký tự",
            "action_url",
        );
    }

    if (typeof body.action_url === "string" && !isSafeUrl(body.action_url.trim())) {
        return sendValidationError(res, "action_url không an toàn", "action_url");
    }

    if (
        body.image_url !== undefined &&
        body.image_url !== null &&
        typeof body.image_url !== "string"
    ) {
        return sendValidationError(
            res,
            "image_url phải là chuỗi",
            "image_url",
        );
    }

    if (
        typeof body.image_url === "string" &&
        body.image_url.length > 1000
    ) {
        return sendValidationError(
            res,
            "image_url tối đa 1000 ký tự",
            "image_url",
        );
    }

    if (typeof body.image_url === "string" && !isSafeUrl(body.image_url.trim())) {
        return sendValidationError(res, "image_url không an toàn", "image_url");
    }

    req.body = {
        title,
        description,
        notification_type: notificationType,
        tone,
        icon:
            typeof body.icon === "string"
                ? body.icon.trim() || null
                : null,
        audience,
        staff_id: staffId,
        department_id: departmentId,
        target_tab: targetTab,
        action_url:
            typeof body.action_url === "string"
                ? body.action_url.trim() || null
                : null,
        image_url:
            typeof body.image_url === "string"
                ? body.image_url.trim() || null
                : null,
        is_urgent:
            urgentResult.value ?? false,
        allow_reply:
            replyResult.value ?? false,
        published_at: publishedAt,
        expires_at: expiresAt,
    };

    next();
}

export function validateNotificationReply(
    req,
    res,
    next,
) {
    const body = req.body ?? {};

    const message =
        typeof body.message === "string"
            ? body.message.trim()
            : "";

    if (!message) {
        return sendValidationError(
            res,
            "Nội dung phản hồi không được để trống",
            "message",
        );
    }

    if (message.length > 5000) {
        return sendValidationError(
            res,
            "Nội dung phản hồi tối đa 5000 ký tự",
            "message",
        );
    }

    req.body = {
        message,
    };

    next();
}

export function validateNotificationArchive(req, res, next) {
    const value = req.body?.is_archived;

    if (typeof value !== "boolean") {
        return sendValidationError(
            res,
            "is_archived phải là boolean",
            "is_archived",
        );
    }

    req.body = { is_archived: value };
    next();
}

function parseIntegerQuery(
    value,
    defaultValue,
) {
    if (
        value === undefined ||
        value === ""
    ) {
        return {
            valid: true,
            value: defaultValue,
        };
    }

    if (!/^\d+$/.test(String(value))) {
        return {
            valid: false,
            value: defaultValue,
        };
    }

    return {
        valid: true,
        value: Number(value),
    };
}

export function validateNotificationList(
    req,
    res,
    next,
) {
    const limitResult = parseIntegerQuery(
        req.query.limit,
        20,
    );

    if (
        !limitResult.valid ||
        limitResult.value < 1 ||
        limitResult.value > 100
    ) {
        return sendValidationError(
            res,
            "limit phải là số nguyên từ 1 đến 100",
            "limit",
        );
    }

    const offsetResult = parseIntegerQuery(
        req.query.offset,
        0,
    );

    if (
        !offsetResult.valid ||
        offsetResult.value < 0
    ) {
        return sendValidationError(
            res,
            "offset phải là số nguyên không âm",
            "offset",
        );
    }

    const unreadValue =
        req.query.unread_only;

    if (
        unreadValue !== undefined &&
        unreadValue !== "true" &&
        unreadValue !== "false"
    ) {
        return sendValidationError(
            res,
            "unread_only phải là true hoặc false",
            "unread_only",
        );
    }

    req.notificationQuery = {
        limit: limitResult.value,
        offset: offsetResult.value,
        unreadOnly:
            unreadValue === "true",
    };

    next();
}
