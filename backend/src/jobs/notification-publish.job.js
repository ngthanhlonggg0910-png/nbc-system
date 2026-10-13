import cron from "node-cron";
import * as repository from "../repositories/notification/notification.repository.js";
import { pushNotificationToStaffIds } from "../services/notification/notification-push.service.js";

let running = false;

export async function processScheduledNotifications() {
  if (running) return;
  running = true;
  try {
    const recipients = await repository.findDuePushRecipients();
    const notifications = new Map();
    for (const item of recipients) {
      const group = notifications.get(String(item.id)) ?? { notification: item, staffIds: [] };
      group.staffIds.push(item.staff_id);
      notifications.set(String(item.id), group);
    }
    for (const { notification, staffIds } of notifications.values()) {
      try {
        const result = await pushNotificationToStaffIds(notification, staffIds);
        if (!result.skipped) await Promise.all(staffIds.map((staffId) => repository.recordPushSent(notification.id, staffId)));
      } catch (error) {
        console.error(`[Notification Schedule] ${notification.id}:`, error.message);
      }
    }
  } finally {
    running = false;
  }
}

export function startNotificationPublishJob() {
  console.log("[Notification Schedule] Job chạy mỗi 1 phút.");
  cron.schedule("* * * * *", () => void processScheduledNotifications(), { timezone: "Asia/Ho_Chi_Minh" });
  void processScheduledNotifications();
}
