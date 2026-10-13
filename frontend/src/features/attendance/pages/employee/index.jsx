import { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { AttendancePage } from "./AttendanceView";
import { AppToast } from "@/components/common/AppToast";
import { Reply, UserCog } from "lucide-react";

import {
  setFeedbacks,
  setNotices,
  setNotificationsOpen,
} from "../../../../redux/userSlice";
import {
  createAttendanceFeedback,
  getAttendanceFeedbacks,
} from "@/api/attendance.api";

export default function AttendanceRoute() {
  const dispatch = useDispatch();
  const [toast, setToast] = useState(null);

  // Redux Selectors
  const session = useSelector((state) => state.user.session);
  const notices = useSelector((state) => state.user.notices);
  const employees = useSelector((state) => state.user.employees ?? []);
  const feedbacks = useSelector((state) => state.user.feedbacks ?? []);
  const systemConfig = useSelector((state) => state.user.systemConfig);
  const attendanceFocusDate = useSelector(
    (state) => state.user.attendanceFocusDate,
  );

  const currentStaffId = session?.staffId ?? "";
  const role = session?.role ?? "employee";

  const currentUser = useMemo(() => {
    const account = employees.find((item) => item.staffId === currentStaffId);

    return {
      name: account?.name ?? session?.name ?? "Nhân viên NBC",
      staffId: currentStaffId,
      email: account?.email ?? session?.email ?? "",
      department: account?.department ?? "Nhabe Corporation",
      position: account?.position ?? account?.access ?? "Nhân viên",
      workplace: account?.workplace ?? "Nhabe Corporation",
    };
  }, [employees, currentStaffId, session?.email, session?.name]);

  const roleNotices = useMemo(() => {
    if (import.meta.env.VITE_ENABLE_API === "true") {
      return notices;
    }

    return notices.filter(
      (notice) =>
        notice.audience === role &&
        (!notice.staffId || notice.staffId === currentUser.staffId),
    );
  }, [notices, role, currentUser.staffId]);

  const unreadCount = useMemo(() => {
    return roleNotices.filter((notice) => !notice.read).length;
  }, [roleNotices]);

  const loadFeedbacks = useCallback(async () => {
    if (!currentStaffId) {
      dispatch(setFeedbacks([]));
      return;
    }

    try {
      const rows = await getAttendanceFeedbacks();
      dispatch(setFeedbacks(Array.isArray(rows) ? rows : []));
    } catch (error) {
      console.error("Không thể tải phản hồi chấm công:", error);
    }
  }, [currentStaffId, dispatch]);

  useEffect(() => {
    void loadFeedbacks();

    window.addEventListener("focus", loadFeedbacks);
    return () => window.removeEventListener("focus", loadFeedbacks);
  }, [loadFeedbacks]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const submitAttendanceFeedback = async (date, message) => {
    try {
      await createAttendanceFeedback({ date, message });
      await loadFeedbacks();

      setToast({
        tone: "success",
        title: "Đã gửi phản hồi đến Nhân sự",
        message: `Ý kiến về ngày ${date} đã được ghi nhận.`,
      });

      return true;
    } catch (error) {
      setToast({
        tone: "error",
        title: "Gửi phản hồi chưa thành công",
        message: getErrorMessage(error),
      });

      return false;
    }
  };

  return (
    <>
      <AppToast toast={toast} onClose={() => setToast(null)} />
      <AttendancePage
        key={`${currentUser.staffId}-${attendanceFocusDate ?? "latest"}`}
        focusDate={attendanceFocusDate}
        feedbacks={feedbacks}
        user={currentUser}
        systemConfig={systemConfig}
        onSubmitFeedback={submitAttendanceFeedback}
        onNotifications={() => dispatch(setNotificationsOpen(true))}
        unreadCount={unreadCount}
      />
    </>
  );
}
