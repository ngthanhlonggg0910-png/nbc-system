import React, { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown,
  ChevronRight,
  KeyRound,
  LogOut,
  Menu,
  UserRound,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Minimize2,
  Maximize2,
  Bell,
  Leaf,
} from "lucide-react";

import { Brand } from "@/components/common/Brand";
import { Avatar } from "@/components/common/Avatar";
import { LogoutModal, PasswordModal } from "@/components/auth";
import {
  NotificationCenter,
  NotificationDetailModal,
  PriorityArticleModal,
} from "@/components/Notice";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/utils/notification-api";
import {
  initializeOneSignal,
  logoutOneSignal,
  requestOneSignalPermission,
} from "@/utils/onesignal";
import { isNativeApp, postToNativeApp } from "@/utils/native-bridge";

import { adminNavItems, navItems } from "./navigation";

import {
  setDesktopSidebarHidden,
  setMobileMenu,
  setNotificationsOpen,
  setNotices,
  setIsFullscreen,
  setAccountMenu,
  setSelectedArticleId,
  setAttendanceFocusDate,
  setNotificationSetup,
  setNotificationDenied,
  setPriorityQueue,
  setPasswordModal,
  setLogoutModal,
  clearAuth,
} from "../redux/userSlice";
import { hasPermission } from "@/utils/permission";

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Grab state from Redux
  const session = useSelector((state) => state.user.session);
  const profileUser = useSelector((state) => state.user.currentUser);
  const desktopSidebarHidden = useSelector(
    (state) => state.user.desktopSidebarHidden,
  );
  const mobileMenu = useSelector((state) => state.user.mobileMenu);
  const notificationsOpen = useSelector(
    (state) => state.user.notificationsOpen,
  );
  const isFullscreen = useSelector((state) => state.user.isFullscreen);
  const accountMenu = useSelector((state) => state.user.accountMenu);
  const notices = useSelector((state) => state.user.notices);
  const employees = useSelector((state) => state.user.employees);
  const systemConfig = useSelector((state) => state.user.systemConfig);
  const avatarByUser = useSelector((state) => state.user.avatarByUser);
  const notificationSetup = useSelector(
    (state) => state.user.notificationSetup,
  );
  const notificationDenied = useSelector(
    (state) => state.user.notificationDenied,
  );
  const priorityQueue = useSelector((state) => state.user.priorityQueue);
  const passwordModal = useSelector((state) => state.user.passwordModal);
  const logoutModal = useSelector((state) => state.user.logoutModal);

  const permissions = profileUser?.role?.permissions ?? [];
  const role = profileUser?.role?.code ?? "employee";
  const currentStaffId = profileUser?.staff_id || session?.staffId || "";
  const storedAccount = employees.find(
    (item) => item.staffId === currentStaffId,
  );
  const account = {
    ...storedAccount,
    name:
      `${profileUser?.last_name ?? ""} ${profileUser?.first_name ?? ""}`.trim() ||
      storedAccount?.name,
    email: profileUser?.email ?? storedAccount?.email,
    department: profileUser?.department ?? storedAccount?.department,
    position:
      profileUser?.position ??
      profileUser?.role?.name ??
      storedAccount?.position,
  };

  const currentUser = {
    name: account?.name ?? "Nhân viên NBC",
    staffId: currentStaffId,
    email: account?.email ?? `${currentStaffId.toLowerCase()}@nbc.com.vn`,
    department: account?.department ?? "Nhabe Corporation",
    position: account?.position ?? account?.access ?? "Nhân viên",
    workplace: account?.workplace ?? "Nhabe Corporation",
  };

  const roleNotices =
    import.meta.env.VITE_ENABLE_API === "true"
      ? notices
      : notices.filter(
          (notice) =>
            notice.audience === role &&
            (!notice.staffId || notice.staffId === currentUser.staffId),
        );
  const unreadCount = roleNotices.filter((notice) => !notice.read).length;
  const avatarUrl =
    avatarByUser[currentUser.staffId] ??
    profileUser?.avatar_display_url ??
    profileUser?.avatar_url;
  const visibleNavItems = [...navItems, ...adminNavItems].filter(
    (item) => !item.permission || hasPermission(permissions, item.permission),
  );
  const mobileNavItems = visibleNavItems.slice(0, 5);
  const activePriorityArticle = priorityQueue[0];
  const [notificationPermissionMessage, setNotificationPermissionMessage] =
    useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationToast, setNotificationToast] = useState(null);
  const knownNotificationIds = useRef(null);
  const notificationApiEnabled = import.meta.env.VITE_ENABLE_API === "true";

  useEffect(() => {
    // Called from the native shell when the user taps a push notification,
    // so tapping one actually opens that notification instead of just
    // bringing the app to the foreground.
    const openNoticeById = (notificationId) => {
      if (!notificationId) return;
      const rawId = String(notificationId);
      const numId = Number(notificationId);

      const existing = notices.find(
        (item) =>
          String(item.id) === rawId || (!isNaN(numId) && item.id === numId),
      );

      dispatch(setNotificationsOpen(false));
      setSelectedNotification(
        existing ?? { id: !isNaN(numId) ? numId : rawId },
      );
    };

    window.__nbcOpenNotification = openNoticeById;

    // Process pending notification tapped during cold start or lock screen unlock
    if (window.__nbcPendingNotification) {
      openNoticeById(window.__nbcPendingNotification);
      delete window.__nbcPendingNotification;
    }

    // Process notification ID passed via URL query parameter
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlNoticeId =
        searchParams.get("noticeId") ||
        searchParams.get("notification_id") ||
        searchParams.get("notice_id");
      if (urlNoticeId) {
        openNoticeById(urlNoticeId);
      }
    } catch {
      // Ignore URL parsing errors
    }

    return () => {
      delete window.__nbcOpenNotification;
    };
  }, [dispatch, notices]);

  useEffect(() => {
    if (!session?.authenticated) return;

    if (isNativeApp()) {
      // The native shell owns push permission and OneSignal registration;
      // just tell it which staff this session belongs to.
      postToNativeApp({ type: "onesignal-login", staffId: currentStaffId });
      dispatch(setNotificationDenied(false));
      dispatch(setNotificationSetup(false));
      return;
    }

    if (!("Notification" in window)) return;

    const permission = Notification.permission;
    dispatch(setNotificationDenied(permission === "denied"));
    dispatch(setNotificationSetup(permission !== "granted"));
    setNotificationPermissionMessage("");

    if (permission === "granted") {
      void initializeOneSignal(currentStaffId).catch((error) => {
        if (import.meta.env.DEV)
          console.warn("OneSignal initialization failed", error);
      });
    }
  }, [currentStaffId, dispatch, session?.authenticated]);

  useEffect(() => {
    if (!notificationApiEnabled || !session?.authenticated || !session?.token)
      return undefined;

    let cancelled = false;
    let toastTimer;
    const syncNotifications = async () => {
      try {
        const data = await fetchMyNotifications({ token: session.token });
        if (cancelled) return;
        const serverNotices = (data.items ?? []).map((item) => {
          const publishedAt = item.published_at ?? item.created_at;
          return {
            id: Number(item.id),
            title: item.title,
            description: item.description,
            audience: "employee",
            staffId: item.staff_id ?? currentStaffId,
            target: item.target_tab ?? "home",
            attendanceDate: item.attendance_date,
            articleId: item.article_id,
            tone: item.tone ?? "blue",
            icon: Bell,
            read: Boolean(item.read_at ?? item.is_read),
            year: new Date(publishedAt).getFullYear(),
            time: new Date(publishedAt).toLocaleString("vi-VN"),
            publishedAt,
            actionUrl: item.action_url,
            imageUrl: item.image_url,
            allowReply: Boolean(item.allow_reply),
            isUrgent: Boolean(
              item.is_urgent || item.notification_type === "urgent",
            ),
            notificationType: item.notification_type,
            author: item.created_by || "Admin-HR",
            updatedAt: publishedAt,
            summary: item.description,
            content: "",
            attachments: [],
          };
        });

        const nextIds = new Set(serverNotices.map((item) => item.id));
        if (knownNotificationIds.current) {
          const newest = serverNotices.find(
            (item) => !knownNotificationIds.current.has(item.id),
          );
          if (newest) {
            setNotificationToast(newest);
            window.clearTimeout(toastTimer);
            toastTimer = window.setTimeout(
              () => setNotificationToast(null),
              8000,
            );
          }
        }
        knownNotificationIds.current = nextIds;
        dispatch(setNotices(serverNotices));
        if (role === "employee") {
          dispatch(
            setPriorityQueue(
              serverNotices.filter((item) => item.isUrgent && !item.read),
            ),
          );
        } else {
          dispatch(setPriorityQueue([]));
        }
      } catch (error) {
        if (import.meta.env.DEV)
          console.warn("Notification sync failed", error);
      }
    };

    void syncNotifications();
    const interval = window.setInterval(syncNotifications, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(toastTimer);
    };
  }, [
    currentStaffId,
    dispatch,
    notificationApiEnabled,
    role,
    session?.authenticated,
    session?.token,
  ]);

  // Effects
  useEffect(() => {
    const syncFullscreenState = () =>
      dispatch(setIsFullscreen(Boolean(document.fullscreenElement)));
    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, [dispatch]);

  const toggleDesktopSidebar = () => {
    const next = !desktopSidebarHidden;
    dispatch(setDesktopSidebarHidden(next));
    localStorage.setItem("nbc-desktop-sidebar-hidden", String(next));
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.fullscreenEnabled)
        await document.documentElement.requestFullscreen();
    } catch {
      dispatch(setIsFullscreen(Boolean(document.fullscreenElement)));
    }
  };

  const routeByTab = {
    home: "/",
    attendance: "/cham-cong",
    payroll: "/phieu-luong",
    requests: "/van-ban",
    documents: "/van-ban",
    news: "/thong-bao",
    profile: "/ca-nhan",
    adminhr: "/admin-hr",
    hrdata: "/du-lieu-cong",
    employees: "/nhan-vien",
    payrolladmin: "/quan-ly-luong",
    roles: "/nhom-quyen",
    permissions: "/phan-quyen",
    newsadmin: "/quan-ly-tin-tuc",
    settings: "/cau-hinh",
  };
  const activeTab =
    Object.entries(routeByTab).find(
      ([, path]) => path === location.pathname,
    )?.[0] ?? "home";

  const goTo = (tab) => {
    dispatch(setMobileMenu(false));
    dispatch(setAccountMenu(false));
    navigate(routeByTab[tab] ?? "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openNotice = (notice) => {
    dispatch(
      setNotices(
        notices.map((item) =>
          item.id === notice.id ? { ...item, read: true } : item,
        ),
      ),
    );
    dispatch(setNotificationsOpen(false));
    if (notificationApiEnabled) {
      void markNotificationRead(notice.id, session?.token).catch((error) => {
        if (import.meta.env.DEV)
          console.warn("Mark notification read failed", error);
      });
      setSelectedNotification(notice);
      return;
    }
    if (notice.attendanceDate)
      dispatch(setAttendanceFocusDate(notice.attendanceDate));
    if (notice.articleId) dispatch(setSelectedArticleId(notice.articleId));
    goTo(notice.target);
  };

  const markAllNotices = () => {
    dispatch(setNotices(notices.map((item) => ({ ...item, read: true }))));
    if (notificationApiEnabled) {
      void markAllNotificationsRead(session?.token).catch((error) => {
        if (import.meta.env.DEV)
          console.warn("Mark all notifications read failed", error);
      });
    }
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      dispatch(setNotificationDenied(true));
      setNotificationPermissionMessage(
        "Trình duyệt này không hỗ trợ thông báo nền.",
      );
      return;
    }

    if (Notification.permission === "denied") {
      dispatch(setNotificationDenied(true));
      dispatch(setNotificationSetup(true));
      setNotificationPermissionMessage(
        "Chrome đang chặn thông báo. Hãy đổi quyền Thông báo sang Cho phép tại biểu tượng cài đặt bên trái thanh địa chỉ, rồi bấm lại nút này.",
      );
      return;
    }

    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

    dispatch(setNotificationDenied(permission === "denied"));
    if (permission === "granted") {
      setNotificationPermissionMessage("Đang kết nối dịch vụ thông báo nền...");
      try {
        await requestOneSignalPermission(currentStaffId);
        dispatch(setNotificationSetup(false));
        setNotificationPermissionMessage("");
      } catch (error) {
        dispatch(setNotificationSetup(true));
        setNotificationPermissionMessage(
          error?.message ||
            "Không thể đăng ký thông báo nền. Vui lòng thử lại.",
        );
        console.error("OneSignal subscription failed", error);
      }
      return;
    }

    dispatch(setNotificationSetup(true));
    setNotificationPermissionMessage(
      "Bạn chưa cấp quyền. Hãy bấm Cho phép thông báo và chọn Cho phép trong hộp thoại Chrome.",
    );
  };

  const logout = () => {
    void logoutOneSignal().catch(() => undefined);
    postToNativeApp({ type: "onesignal-logout" });
    localStorage.removeItem("nbc-portal-session");
    localStorage.removeItem("nbc-access-token");
    localStorage.removeItem("nbc-refresh-token");
    sessionStorage.removeItem("nbc-portal-session");
    dispatch(clearAuth());
    dispatch(setLogoutModal(false));
    dispatch(setAccountMenu(false));
    dispatch(setNotificationsOpen(false));
    goTo("home");
  };

  const acknowledgePriorityArticle = async (article) => {
    if (notificationApiEnabled)
      await markNotificationRead(article.id, session?.token);
    dispatch(
      setPriorityQueue(priorityQueue.filter((item) => item.id !== article.id)),
    );
    dispatch(
      setNotices(
        notices.map((item) =>
          item.id === article.id ? { ...item, read: true } : item,
        ),
      ),
    );
  };

  return (
    <main
      className={`app-shell ${desktopSidebarHidden ? "desktop-sidebar-hidden" : ""}`}
    >
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="sidebar-close"
            onClick={() => dispatch(setMobileMenu(false))}
          >
            <X />
          </button>
        </div>
        <div className="account-zone">
          <button
            className={`side-profile ${accountMenu ? "active" : ""}`}
            onClick={() => dispatch(setAccountMenu(!accountMenu))}
          >
            <Avatar name={currentUser.name} src={avatarUrl} />
            <div className="side-profile-copy">
              <span>Xin chào,</span>
              <strong>{currentUser.name}</strong>
              <small>{currentUser.staffId}</small>
            </div>
            <ChevronDown className="profile-chevron" />
          </button>
          {accountMenu && (
            <div className="account-menu">
              <div className="account-menu-head">
                <Avatar name={currentUser.name} src={avatarUrl} />
                <div>
                  <strong>{currentUser.name}</strong>
                  <span>{currentUser.email}</span>
                </div>
              </div>
              <button onClick={() => goTo("profile")}>
                <UserRound />
                <span>
                  Hồ sơ cá nhân<small>Xem và cập nhật thông tin</small>
                </span>
                <ChevronRight />
              </button>
              <button
                onClick={() => {
                  dispatch(setPasswordModal(true));
                  dispatch(setAccountMenu(false));
                }}
              >
                <KeyRound />
                <span>
                  Đổi mật khẩu<small>Bảo mật tài khoản</small>
                </span>
                <ChevronRight />
              </button>
              <button
                onClick={() => {
                  dispatch(
                    setNotificationDenied(
                      "Notification" in window &&
                        Notification.permission === "denied",
                    ),
                  );
                  dispatch(setNotificationSetup(true));
                  dispatch(setAccountMenu(false));
                }}
              >
                <Bell />
                <span>
                  Cài đặt thông báo
                  <small>
                    Nhắc lại tin chưa đọc mỗi{" "}
                    {systemConfig.notificationReminderMinutes || 60} phút
                  </small>
                </span>
                <ChevronRight />
              </button>
            </div>
          )}
        </div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          {visibleNavItems.map((item, index) => (
            <div
              key={item.id}
              className={`${index === navItems.length ? "admin-nav-start" : ""}`}
            >
              {index === navItems.length && <small>QUẢN TRỊ HỆ THỐNG</small>}
              <button
                className={activeTab === item.id ? "active" : ""}
                onClick={() => goTo(item.id)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {activeTab === item.id && <ChevronRight size={17} />}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-support">
          <span>
            <Leaf />
          </span>
          <div>
            <strong>Văn phòng xanh</strong>
            <p>Cùng nhau sản xuất bền vững</p>
          </div>
        </div>
        <button
          className="sidebar-logout"
          onClick={() => dispatch(setLogoutModal(true))}
        >
          <LogOut />
          <span>
            Đăng xuất<small>Kết thúc phiên làm việc</small>
          </span>
        </button>
        <div className="sidebar-footer">
          <span>
            {systemConfig.footerCopyright || "© 2026 Nhabe Corporation"}
          </span>
          <small>{systemConfig.footerProduct || "NBC Portal v1.0"}</small>
        </div>
      </aside>

      {mobileMenu && (
        <div
          className="sidebar-overlay"
          onClick={() => dispatch(setMobileMenu(false))}
        />
      )}

      <section className="app-content">
        <div className="desktop-view-controls" aria-label="Điều khiển hiển thị">
          <button
            type="button"
            className="desktop-bell"
            aria-label={`Thông báo, ${unreadCount} tin chưa đọc`}
            onClick={() => dispatch(setNotificationsOpen(true))}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="bell-count">{unreadCount}</span>
            )}
          </button>
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            aria-label={
              desktopSidebarHidden ? "Hiện menu bên trái" : "Ẩn menu bên trái"
            }
            aria-pressed={desktopSidebarHidden}
            title={
              desktopSidebarHidden ? "Hiện menu bên trái" : "Ẩn menu bên trái"
            }
          >
            {desktopSidebarHidden ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={
              isFullscreen ? "Thoát toàn màn hình" : "Mở toàn màn hình"
            }
            aria-pressed={isFullscreen}
            title={isFullscreen ? "Thoát toàn màn hình" : "Mở toàn màn hình"}
          >
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </button>
        </div>
        <header className="mobile-header">
          <button
            onClick={() => dispatch(setMobileMenu(true))}
            aria-label="Mở menu"
          >
            <Menu />
          </button>
          <Brand />
          <button
            className="round-button"
            aria-label={`Thông báo, ${unreadCount} tin chưa đọc`}
            onClick={() => dispatch(setNotificationsOpen(true))}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="bell-count">{unreadCount}</span>
            )}
          </button>
        </header>
        {notificationSetup && (
          <div className="notification-consent-backdrop" role="presentation">
            <section
              className="notification-consent-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notification-consent-title"
            >
              <header>
                <span>
                  <Bell />
                </span>
                <div>
                  <small>THÔNG BÁO NBC PORTAL</small>
                  <h2 id="notification-consent-title">
                    Cho phép NBC Portal gửi thông báo
                  </h2>
                  <p>Bảo mật · Chấm công · Lương · Văn bản</p>
                </div>
              </header>
              <div className="notification-consent-body">
                <strong>
                  Nhân viên vui lòng bật thông báo để không bỏ lỡ những nội dung
                  quan trọng.
                </strong>
                <p>
                  Nhận ngay các thông báo quan trọng về chấm công, lương, văn
                  bản và bảo mật, kể cả khi NBC Portal không được mở.
                </p>
                {notificationPermissionMessage && (
                  <p className="notification-permission-feedback" role="status">
                    {notificationPermissionMessage}
                  </p>
                )}
              </div>
              <footer>
                <span className="notification-consent-note">
                  Bạn có thể thay đổi quyền này bất kỳ lúc nào trong cài đặt
                  trình duyệt.
                </span>
                <div className="notification-consent-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => dispatch(setNotificationSetup(false))}
                  >
                    Để sau
                  </button>
                  <button
                    type="button"
                    className="notification-consent-action"
                    onClick={enableNotifications}
                  >
                    <Bell />{" "}
                    {notificationDenied
                      ? "Kiểm tra lại quyền"
                      : "Cho phép thông báo"}
                  </button>
                </div>
              </footer>
            </section>
          </div>
        )}
        {notificationToast && (
          <aside
            className={`notification-live-toast ${notificationToast.tone}`}
            role="status"
            aria-live="polite"
          >
            <button
              type="button"
              className="notification-live-content"
              onClick={() => {
                setNotificationToast(null);
                openNotice(notificationToast);
              }}
            >
              <Bell />
              <span>
                <small>THÔNG BÁO MỚI</small>
                <strong>{notificationToast.title}</strong>
                <p>{notificationToast.description}</p>
              </span>
            </button>
            <button
              type="button"
              className="notification-live-close"
              aria-label="Đóng"
              onClick={() => setNotificationToast(null)}
            >
              <X />
            </button>
          </aside>
        )}

        <Outlet />
      </section>

      <nav
        className={`bottom-nav ${visibleNavItems.length > 5 ? "admin-bottom-nav" : ""}`}
        aria-label="Điều hướng di động"
      >
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            className={activeTab === item.id ? "active" : ""}
            onClick={() => goTo(item.id)}
          >
            <span className="bottom-nav-icon">
              <item.icon size={20} />
            </span>
            <span className="bottom-nav-label">{item.shortLabel}</span>
          </button>
        ))}
      </nav>

      {notificationsOpen && (
        <NotificationCenter
          notices={roleNotices}
          onClose={() => dispatch(setNotificationsOpen(false))}
          onOpen={openNotice}
          onMarkAll={markAllNotices}
        />
      )}
      {activePriorityArticle && (
        <PriorityArticleModal
          key={`${activePriorityArticle.id}:${activePriorityArticle.updatedAt}`}
          article={activePriorityArticle}
          remaining={priorityQueue.length}
          onAcknowledge={() =>
            acknowledgePriorityArticle(activePriorityArticle)
          }
          token={session?.token}
        />
      )}
      {selectedNotification && (
        <NotificationDetailModal
          notice={selectedNotification}
          token={session?.token}
          canArchive={!selectedNotification.sent}
          onClose={() => setSelectedNotification(null)}
          onArchived={(id) =>
            dispatch(setNotices(notices.filter((item) => item.id !== id)))
          }
        />
      )}
      {passwordModal && (
        <PasswordModal onClose={() => dispatch(setPasswordModal(false))} />
      )}
      {logoutModal && (
        <LogoutModal
          onClose={() => dispatch(setLogoutModal(false))}
          onConfirm={logout}
        />
      )}
    </main>
  );
}
