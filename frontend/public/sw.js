const DB_NAME = "nbc-portal-notification-state";
const STORE = "settings";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setValue(key, value) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(value, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function getValue(key) {
  const db = await openDb();
  const value = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_NOTIFICATION_SETTINGS") event.waitUntil(Promise.all([
    setValue("unreadCount", Number(event.data.count) || 0),
    setValue("reminderMinutes", Math.min(1440, Math.max(1, Number(event.data.reminderMinutes) || 60))),
  ]));
});

async function remindUnread() {
  const count = Number(await getValue("unreadCount")) || 0;
  const reminderMinutes = Number(await getValue("reminderMinutes")) || 60;
  if (!count) return;
  await self.registration.showNotification("NBC Portal: Bạn có thông báo chưa đọc", {
    body: `Bạn còn ${count} thông báo chưa xem. Chu kỳ nhắc ${reminderMinutes} phút.`,
    icon: "/nbc-logo.png",
    badge: "/nbc-logo.png",
    tag: "nbc-unread-reminder",
    renotify: true,
    data: { url: "/?open=notifications" },
  });
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "nbc-unread-reminder") event.waitUntil(remindUnread());
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() ?? { title: "NBC Portal", body: "Bạn có thông báo mới.", url: "/?open=notifications" };
  event.waitUntil(self.registration.showNotification(payload.title || "NBC Portal", {
    body: payload.body || "Bạn có thông báo mới.",
    icon: "/nbc-logo.png",
    badge: "/nbc-logo.png",
    tag: payload.tag || "nbc-push",
    data: { url: payload.url || "/?open=notifications" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/?open=notifications", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.focus();
      if ("navigate" in existing) await existing.navigate(targetUrl);
      return;
    }
    await self.clients.openWindow(targetUrl);
  }));
});
