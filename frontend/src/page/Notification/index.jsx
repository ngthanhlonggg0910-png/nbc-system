import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NewsPage } from "./NotificationView";
import { NotificationDetailModal } from "@/components/Notice";
import { markNotificationRead } from "@/utils/notification-api";
import {
  setSelectedArticleId,
  setNotificationsOpen,
  setNotices,
} from "../../redux/userSlice";

export default function News() {
  const dispatch = useDispatch();
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Redux Selectors
  const session = useSelector((state) => state.user.session);
  const employees = useSelector((state) => state.user.employees);
  const articles = useSelector((state) => state.user.articles);
  const selectedArticleId = useSelector((state) => state.user.selectedArticleId);
  const notices = useSelector((state) => state.user.notices);
  const notificationApiEnabled = import.meta.env.VITE_ENABLE_API === "true";

  const role = session?.role ?? "employee";
  const currentStaffId = session?.staffId || "";
  const account = employees.find((item) => item.staffId === currentStaffId);

  const currentUser = {
    name: account?.name ?? "Nhân viên NBC",
    staffId: currentStaffId,
    email: account?.email ?? `${currentStaffId.toLowerCase()}@nbc.com.vn`,
    department: account?.department ?? "Nhabe Corporation",
    position: account?.position ?? account?.access ?? "Nhân viên",
    workplace: account?.workplace ?? "Nhabe Corporation"
  };

  const roleNotices = import.meta.env.VITE_ENABLE_API === "true"
    ? notices
    : notices.filter((notice) => notice.audience === role && (!notice.staffId || notice.staffId === currentUser.staffId));
  const unreadCount = roleNotices.filter((notice) => !notice.read).length;

  const handleSelectArticle = (id) => {
    dispatch(setSelectedArticleId(id || undefined));
  };

  const openNotification = (notice) => {
    dispatch(setNotices(notices.map((item) => item.id === notice.id ? { ...item, read: true } : item)));
    if (notificationApiEnabled) {
      void markNotificationRead(notice.id, session?.token).catch(() => undefined);
    }
    setSelectedNotification(notice);
  };

  return (
    <>
      <NewsPage
        articles={articles}
        notices={roleNotices}
        selectedArticleId={selectedArticleId}
        onSelectArticle={handleSelectArticle}
        onOpenNotification={openNotification}
        onNotifications={() => dispatch(setNotificationsOpen(true))}
        unreadCount={unreadCount}
      />
      {selectedNotification && (
        <NotificationDetailModal
          notice={selectedNotification}
          token={session?.token}
          canArchive={false}
          onClose={() => setSelectedNotification(null)}
          onArchived={() => setSelectedNotification(null)}
        />
      )}
    </>
  );
}

