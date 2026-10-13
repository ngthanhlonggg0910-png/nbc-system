import { Megaphone } from "lucide-react";
import { attendanceEntriesFromRaw } from "@/components/attendance";
import { initialNotices } from "@/components/Notice";
import { isPriorityArticle } from "./articles";
import { normalizeSalaryItems, salaryMaster, withPayrollDemoRows } from "@/utils/payroll";
import { initialAdminPayrollRows, initialEmployees, initialHrAdminState, initialSystemConfig, } from "@/utils/data";
import { readPersistedPortalState } from "./portal-persistence";
const apiEnabled = import.meta.env.VITE_ENABLE_API === "true";
export function startPortalStateRestore({ setFeedbacks, setResetRequests, setEmployees, setArticles, setDocuments, setSystemConfig, setSalaryItems, setHrAdminData, setAvatarByUser, setNotices, setDesktopSidebarHidden, setSession, }) {
    let cancelled = false;
    const restorePersistedState = () => {
        if (cancelled)
            return;
        try {
            const restored = readPersistedPortalState();
            setFeedbacks(restored.loadedFeedbacks);
            setResetRequests(restored.loadedResetRequests);
            setEmployees(restored.loadedEmployees);
            setArticles(restored.loadedArticles);
            setDocuments(restored.loadedDocuments);
            setSystemConfig(restored.savedSystemConfig ? { ...initialSystemConfig, ...JSON.parse(restored.savedSystemConfig) } : initialSystemConfig);
            setSalaryItems(restored.loadedSalaryItems);
            setHrAdminData(restored.loadedHrAdminData);
            setAvatarByUser(restored.savedAvatars ? JSON.parse(restored.savedAvatars) : {});
            setNotices([...restored.restoredNotices, ...initialNotices]);
            setDesktopSidebarHidden(restored.savedSidebarHidden);
            setSession(restored.savedSession ? JSON.parse(restored.savedSession) : { authenticated: false, staffId: "" });
        }
        catch {
            setSession({ authenticated: false, staffId: "" });
        }
    };
    queueMicrotask(restorePersistedState);
    return () => { cancelled = true; };
}
export function startPortalBootstrapSync({ authenticated, currentStaffId, articlesRef, setSystemConfig, setArticles, setPriorityQueue, setNotices, }) {
    if (!authenticated || !apiEnabled)
        return;
    let cancelled = false;
    const readKey = `nbc-priority-read-${currentStaffId}`;
    const syncServerBootstrap = async () => {
        try {
            const response = await fetch(`/api/portal-bootstrap?staffId=${encodeURIComponent(currentStaffId)}`, { cache: "no-store" });
            if (!response.ok)
                throw new Error("Không thể đồng bộ cấu hình máy chủ.");
            const payload = await response.json();
            if (cancelled)
                return;
            const serverConfig = { ...initialSystemConfig, ...(payload.config ?? {}), notificationReminderMinutes: Math.min(1440, Math.max(1, Number(payload.config?.notificationReminderMinutes) || 60)) };
            const serverPriorityArticles = (payload.priorityArticles ?? []).filter((article) => article.status === "published").map((article) => ({ ...article, priority: true, category: "Thông báo ưu tiên" }));
            const readTokens = new Set(JSON.parse(localStorage.getItem(readKey) ?? "[]"));
            setSystemConfig(serverConfig);
            localStorage.setItem("nbc-system-config", JSON.stringify(serverConfig));
            setArticles((items) => [...serverPriorityArticles, ...items.filter((item) => !serverPriorityArticles.some((serverArticle) => serverArticle.id === item.id))]);
            setPriorityQueue(serverPriorityArticles.filter((article) => !readTokens.has(`${article.id}:${article.updatedAt}`)));
            setNotices((items) => {
                const withoutServerPriority = items.filter((item) => !serverPriorityArticles.some((article) => item.id === article.id + 900000));
                return [...serverPriorityArticles.map((article) => ({ id: article.id + 900000, title: article.title, description: article.summary, time: new Date(article.updatedAt).toLocaleDateString("vi-VN"), read: readTokens.has(`${article.id}:${article.updatedAt}`), target: "news", tone: "orange", icon: Megaphone, audience: "employee", year: new Date(article.updatedAt).getFullYear(), articleId: article.id, staffId: currentStaffId })), ...withoutServerPriority];
            });
        }
        catch {
            if (cancelled)
                return;
            const readTokens = new Set(JSON.parse(localStorage.getItem(readKey) ?? "[]"));
            setPriorityQueue(articlesRef.current.filter((article) => article.status === "published" && isPriorityArticle(article) && !readTokens.has(`${article.id}:${article.updatedAt}`)));
        }
    };
    void syncServerBootstrap();
    return () => { cancelled = true; };
}
export function startHrAdminStateSync({ authenticated, role, setHrAdminData, setSalaryItems, setEmployees, }) {
    if (!authenticated || !apiEnabled)
        return;
    let cancelled = false;
    fetch("/api/hr-admin-state", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => {
        if (cancelled || !payload.state)
            return;
        const next = {
            devices: Array.isArray(payload.state.devices) && payload.state.devices.length ? payload.state.devices : initialHrAdminState.devices,
            schedules: Array.isArray(payload.state.schedules) && payload.state.schedules.length ? payload.state.schedules : initialHrAdminState.schedules,
            rawLogs: Array.isArray(payload.state.rawLogs) && payload.state.rawLogs.length ? payload.state.rawLogs : initialHrAdminState.rawLogs,
            attendanceEntries: Array.isArray(payload.state.attendanceEntries) && payload.state.attendanceEntries.length ? payload.state.attendanceEntries : initialHrAdminState.attendanceEntries,
            payrollRows: withPayrollDemoRows(Array.isArray(payload.state.payrollRows) && payload.state.payrollRows.length ? payload.state.payrollRows : initialHrAdminState.payrollRows, initialEmployees, initialAdminPayrollRows),
            salaryItems: normalizeSalaryItems(Array.isArray(payload.state.salaryItems) && payload.state.salaryItems.length ? payload.state.salaryItems : JSON.parse(localStorage.getItem("nbc-salary-master") ?? JSON.stringify(salaryMaster)), salaryMaster),
        };
        setHrAdminData(next);
        localStorage.setItem("nbc-hr-admin-data", JSON.stringify(next));
        if (next.salaryItems)
            setSalaryItems(next.salaryItems);
        if (Array.isArray(payload.state.employees) && payload.state.employees.length)
            setEmployees(payload.state.employees.map(({ thirteenthMonthCoefficient: _removedDemoCoefficient, ...item }) => ({ ...initialEmployees.find((employee) => employee.staffId === item.staffId), ...item })));
    }).catch(() => undefined);
    return () => { cancelled = true; };
}
export function startAttendanceDeviceScheduler({ authenticated, role, hrAdminData, employees, updateHrAdminData, }) {
    if (!authenticated || !apiEnabled)
        return;
    let running = false;
    const runDueSchedules = async () => {
        if (running)
            return;
        const now = new Date();
        const date = now.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        const time = now.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
        const runKey = `${date} · ${time}`;
        const schedule = hrAdminData.schedules.find((item) => item.enabled && (item.frequency === "Mỗi giờ" ? item.time.slice(3) === time.slice(3) : item.time === time) && item.lastRun !== runKey);
        if (!schedule)
            return;
        const device = hrAdminData.devices.find((item) => item.id === schedule.deviceId && item.enabled);
        if (!device)
            return;
        running = true;
        try {
            const response = await fetch("/api/hr-device-sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId: device.id, ip: device.ip, port: device.port, protocol: device.protocol, automatic: true }) });
            if (!response.ok)
                throw new Error();
            const sampleEmployee = device.id === 2 ? { staffId: "NBC012351", name: "Lê Thị Mai" } : { staffId: "NBC012345", name: "Nguyễn Văn An" };
            const samples = [
                { id: device.id * 100000 + 71401, ...sampleEmployee, deviceId: device.id, timestamp: "14/07/2026 07:29", direction: "Vào", verifyMode: "Vân tay", status: "Chờ xử lý" },
                { id: device.id * 100000 + 71402, ...sampleEmployee, deviceId: device.id, timestamp: "14/07/2026 16:33", direction: "Ra", verifyMode: "Vân tay", status: "Chờ xử lý" },
            ];
            const known = new Set(hrAdminData.rawLogs.map((item) => `${item.staffId}-${item.timestamp}-${item.deviceId}`));
            const rawLogs = [...samples.filter((item) => !known.has(`${item.staffId}-${item.timestamp}-${item.deviceId}`)), ...hrAdminData.rawLogs];
            const calculated = attendanceEntriesFromRaw(rawLogs, employees);
            const attendanceMap = new Map(hrAdminData.attendanceEntries.map((item) => [`${item.staffId}-${item.date}`, item]));
            calculated.forEach((item) => attendanceMap.set(`${item.staffId}-${item.date}`, item));
            const nextDate = new Date(now.getTime() + (schedule.frequency === "Mỗi giờ" ? 3600000 : 86400000));
            const nextRun = `${nextDate.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · ${schedule.frequency === "Mỗi giờ" ? nextDate.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }) : schedule.time}`;
            updateHrAdminData({ ...hrAdminData, rawLogs: rawLogs.map((item) => ({ ...item, status: "Đã xử lý" })), attendanceEntries: [...attendanceMap.values()], devices: hrAdminData.devices.map((item) => item.id === device.id ? { ...item, status: "online", lastSync: runKey } : item), schedules: hrAdminData.schedules.map((item) => item.id === schedule.id ? { ...item, lastRun: runKey, nextRun } : item) });
        }
        catch {
            updateHrAdminData({ ...hrAdminData, devices: hrAdminData.devices.map((item) => item.id === device.id ? { ...item, status: "offline" } : item) });
        }
        finally {
            running = false;
        }
    };
    void runDueSchedules();
    const timer = setInterval(() => void runDueSchedules(), 30000);
    return () => clearInterval(timer);
}
export function startNotificationReminder({ authenticated, unreadCount, notificationReminderMinutes, setNotificationSetup, }) {
    if (!authenticated || !import.meta.env.PROD || !("serviceWorker" in navigator))
        return;
    let cancelled = false;
    let timer;
    const reminderMinutes = Math.min(1440, Math.max(1, Number(notificationReminderMinutes) || 60));
    const reminderInterval = reminderMinutes * 60 * 1000;
    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
        registration.active?.postMessage({ type: "SYNC_NOTIFICATION_SETTINGS", count: unreadCount, reminderMinutes });
        const periodicSync = registration.periodicSync;
        if (periodicSync)
            periodicSync.register("nbc-unread-reminder", { minInterval: reminderInterval }).catch(() => undefined);
        timer = setInterval(() => { if (unreadCount > 0 && Notification.permission === "granted")
            registration.showNotification("NBC Portal: Bạn có thông báo chưa đọc", { body: `Bạn còn ${unreadCount} thông báo chưa xem. Chu kỳ nhắc ${reminderMinutes} phút.`, icon: "/nbc-logo.png", badge: "/nbc-logo.png", tag: "nbc-unread-reminder", data: { url: "/?open=notifications" } }); }, reminderInterval);
    }).catch(() => undefined);
    if (Notification.permission === "default" && !localStorage.getItem("nbc-notification-prompted")) {
        queueMicrotask(() => {
            if (!cancelled)
                setNotificationSetup(true);
        });
    }
    return () => {
        cancelled = true;
        if (timer)
            clearInterval(timer);
    };
}
