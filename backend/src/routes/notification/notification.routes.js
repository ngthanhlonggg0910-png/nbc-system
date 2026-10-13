import { Router } from "express";

import {
    isAuthenticated,
} from "../../middleware/authMiddleware.js";

import {
    isNotificationAdmin,
} from "../../middleware/notification.middleware.js";

import {
    createNotification,
    getMyNotifications,
    getNotificationDetail,
    getSentNotifications,
    getNotificationResponses,
    getNotificationAudiences,
    markNotificationRead,
    markAllNotificationsRead,
    setNotificationArchived,
    replyNotification,
    uploadAttachment,
    downloadAttachment,
} from "../../controllers/notification/notification.controller.js";

import {
    validateCreateNotification,
    validateNotificationList,
    validateNotificationReply,
    validateNotificationArchive,
} from "../../../validates/notification.validate.js";
import { uploadNotificationAttachment } from "../../middleware/notification-upload.middleware.js";

const router = Router();

router.use(isAuthenticated);

router.post(
    "/",
    isNotificationAdmin,
    validateCreateNotification,
    createNotification,
);

router.get(
    "/",
    validateNotificationList,
    getMyNotifications,
);

router.get(
    "/sent",
    isNotificationAdmin,
    validateNotificationList,
    getSentNotifications,
);

router.get(
    "/responses",
    isNotificationAdmin,
    getNotificationResponses,
);

router.get(
    "/audiences",
    isNotificationAdmin,
    getNotificationAudiences,
);

router.get(
    "/attachments/:attachmentId/download",
    downloadAttachment,
);

router.patch(
    "/read-all",
    markAllNotificationsRead,
);

router.get(
    "/:id",
    getNotificationDetail,
);

router.patch(
    "/:id/read",
    markNotificationRead,
);

router.patch(
    "/:id/archive",
    validateNotificationArchive,
    setNotificationArchived,
);

router.post(
    "/:id/responses",
    validateNotificationReply,
    replyNotification,
);

router.post(
    "/:id/attachments",
    isNotificationAdmin,
    uploadNotificationAttachment,
    uploadAttachment,
);

export default router;
