import { config } from "../../config/index.js";

export function isPushConfigured() {
  return Boolean(config.oneSignal.appId && config.oneSignal.apiKey);
}

export async function pushNotificationToStaffIds(notification, staffIds) {
  if (!isPushConfigured()) return { skipped: true, reason: "NOT_CONFIGURED" };
  if (!staffIds.length) return { skipped: true, reason: "NO_RECIPIENTS" };

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${config.oneSignal.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: config.oneSignal.appId,
      target_channel: "push",
      include_aliases: { external_id: staffIds.map(String) },
      headings: { en: notification.title, vi: notification.title },
      contents: { en: notification.description, vi: notification.description },
      url: notification.action_url || undefined,
      big_picture: notification.image_url || undefined,
      data: {
        notification_id: String(notification.id),
        target_tab: notification.target_tab,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.errors?.join?.(", ") || "OneSignal push failed");
    error.status = response.status;
    throw error;
  }

  return { skipped: false, messageId: payload.id ?? null };
}

export function pushNotificationToStaff(notification, staffId) {
  return pushNotificationToStaffIds(notification, [staffId]);
}
