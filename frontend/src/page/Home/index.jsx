import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Dashboard as DashboardComponent } from "@/page/Home/HomeView";
import { getDashboardSummary } from "@/api/dashboard.api";
import { mapAttendanceEntry } from "@/features/attendance/utils/attendance-entry.utils";
import { Reply } from "lucide-react";
import {
  setFeedbacks,
  setNotices,
  setNotificationsOpen,
} from "../../redux/userSlice";

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redux Selectors
  const articles = useSelector((state) => state.user.articles);
  const notices = useSelector((state) => state.user.notices);
  const feedbacks = useSelector((state) => state.user.feedbacks);

  useEffect(() => {
    let active = true;
    getDashboardSummary()
      .then((res) => {
        if (active && res.success) {
          setSummary(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Không thể tải dữ liệu tổng quan");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        className="page dashboard-page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
        }}
      >
        <div
          className="animate-spin"
          style={{
            border: "4px solid rgba(0,0,0,0.1)",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            borderLeftColor: "#09f",
          }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="page dashboard-page"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          gap: "16px",
        }}
      >
        <p style={{ color: "#ef4444" }}>{error}</p>
        <button
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const currentUser = {
    name: summary.employee.name,
    staffId: summary.employee.staffId,
    position: summary.employee.position,
    department: summary.employee.department,
  };

  const attendanceRecords = (summary.monthlyEntries || []).map(
    mapAttendanceEntry,
  );

  const routeByTab = {
    home: "/",
    attendance: "/cham-cong",
    payroll: "/phieu-luong",
    requests: "/van-ban",
    news: "/thong-bao",
  };

  const goTo = (tab) => {
    navigate(routeByTab[tab] || "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openArticle = (id) => {
    navigate("/thong-bao");
  };

  const submitAttendanceFeedback = (date, message) => {
    const nextFeedbacks = [
      {
        id: Date.now(),
        employee: currentUser.name,
        staffId: currentUser.staffId,
        date,
        message,
        createdAt: "14/07/2026 · vừa xong",
        status: "pending",
      },
      ...feedbacks,
    ];
    dispatch(setFeedbacks(nextFeedbacks));

    const nextNotices = [
      {
        id: Date.now() + 1,
        title: "Phản hồi chấm công mới",
        description: `${currentUser.name} gửi ý kiến về ngày ${date}.`,
        time: "Vừa xong",
        read: false,
        target: "adminhr",
        tone: "blue",
        icon: Reply,
        audience: "admin",
        year: 2026,
        attendanceDate: date,
      },
      ...notices,
    ];
    dispatch(setNotices(nextNotices));
  };

  return (
    <DashboardComponent
      goTo={goTo}
      avatarUrl={summary.employee.avatarUrl}
      user={currentUser}
      articles={articles}
      documentCount={summary.documentCount}
      latestPayslip={summary.latestPayslip}
      todayShift={summary.todayShift}
      attendanceSummary={summary.attendanceSummary}
      onOpenArticle={openArticle}
      onSubmitFeedback={submitAttendanceFeedback}
      onNotifications={() => dispatch(setNotificationsOpen(true))}
      unreadCount={summary.unreadNotificationCount}
      attendanceRecords={attendanceRecords}
    />
  );
}
