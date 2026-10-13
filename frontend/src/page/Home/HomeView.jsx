import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  FileText,
  ChevronRight,
  Building2,
  Leaf,
  WalletCards,
  Bell,
  LogIn,
  LogOut,
  Reply,
} from "lucide-react";
import { PageTitle } from "@/components/common/PageTitle";
import { Avatar } from "@/components/common/Avatar";
import { SensitiveAmount } from "@/components/common/SensitiveAmount";
import AttendanceFeedbackModal from "@/features/attendance/components/employee/AttendanceFeedbackModal";
import { formatVnd } from "@/utils/payroll";
import { getTimeGreeting, formatDashboardDate } from "@/utils/date";

const dailySlogans = [
  "Sẵn sàng cho một ngày làm việc hiệu quả?",
  "Mỗi cải tiến nhỏ hôm nay tạo nên thành quả lớn ngày mai.",
  "Cùng học hỏi, cùng sẻ chia, cùng tiến về phía trước.",
  "Tư duy tích cực mở lối cho những ý tưởng sáng tạo.",
  "Bền bỉ mỗi ngày là cách chúng ta tạo nên khác biệt.",
  "Hợp tác chân thành giúp mọi mục tiêu trở nên gần hơn.",
  "Khởi đầu bằng nhiệt huyết, kết thúc bằng niềm tự hào.",
];

function WeatherGlyph({ code, isDay }) {
  if (code >= 51) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-cloud-rain"
      >
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="M16 14v6" />
        <path d="M8 14v6" />
        <path d="M12 16v6" />
      </svg>
    );
  }
  if (code >= 2) {
    return isDay ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-cloud-sun"
      >
        <path d="M12 2v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="M20 12h2" />
        <path d="m19.07 4.93-1.41 1.41" />
        <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
        <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-cloud"
      >
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.04-1.24.12A7 7 0 0 0 2 12c0 3.87 3.13 7 7 7h8.5Z" />
      </svg>
    );
  }
  return isDay ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-sun"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-moon"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function DashboardLivePanel() {
  const [clock, setClock] = useState({ time: "--:--:--", sloganIndex: 0 });
  const [weather, setWeather] = useState({
    temperature: 30,
    humidity: 72,
    code: 1,
    isDay: true,
    max: 33,
    min: 26,
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), 0, 0);
      const dayOfYear = Math.floor(
        (now.getTime() - firstDay.getTime()) / 86400000,
      );
      setClock({
        time: now.toLocaleTimeString("vi-VN", { hour12: false }),
        sloganIndex: dayOfYear % dailySlogans.length,
      });
    };
    queueMicrotask(tick);
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=10.695&longitude=106.738&current=temperature_2m,relative_humidity_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FBangkok&forecast_days=1",
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((data) =>
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          humidity: Math.round(data.current.relative_humidity_2m),
          code: data.current.weather_code,
          isDay: data.current.is_day === 1,
          max: Math.round(data.daily.temperature_2m_max[0]),
          min: Math.round(data.daily.temperature_2m_min[0]),
        }),
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <>
      <h2>{dailySlogans[clock.sloganIndex]}</h2>
      <div className="hero-live-info">
        <div className="hero-clock">
          <Clock3 />
          <span>
            <small>GIỜ HIỆN TẠI</small>
            <strong>{clock.time}</strong>
          </span>
        </div>
        <div className="hero-weather">
          <span className="weather-glyph">
            <WeatherGlyph code={weather.code} isDay={weather.isDay} />
          </span>
          <span>
            <small>THỜI TIẾT HÔM NAY</small>
            <strong>{weather.temperature}°C</strong>
            <em>
              {weather.min}° – {weather.max}°
            </em>
          </span>
        </div>
        <div className="hero-humidity">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-droplets"
          >
            <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05Z" />
            <path d="M17 18.5c1.37 0 2.5-1.14 2.5-2.51 0-.72-.35-1.4-.94-1.97-.58-.58-1.46-1.46-1.56-2.36-.1.9-.98 1.78-1.56 2.36-.59.57-.94 1.25-.94 1.97 0 1.37 1.13 2.51 2.5 2.51Z" />
          </svg>
          <span>
            <small>ĐỘ ẨM</small>
            <strong>{weather.humidity}%</strong>
          </span>
        </div>
      </div>
    </>
  );
}

export function Dashboard({
  goTo,
  avatarUrl,
  user,
  articles,
  documentCount,
  latestPayslip,
  todayShift,
  attendanceSummary,
  onOpenArticle,
  onNotifications,
  unreadCount,
  onSubmitFeedback,
  attendanceRecords,
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [salaryVisible, setSalaryVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(null);

  useEffect(() => {
    const tick = () => setCurrentDate(new Date());
    queueMicrotask(tick);
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);

  const workedDays = attendanceSummary
    ? attendanceSummary.workedDays
    : attendanceRecords.filter((record) => record.status !== "absent").length;
  const scheduledDays = attendanceSummary
    ? attendanceSummary.scheduledDays
    : attendanceRecords.length;
  const totalHours = attendanceSummary
    ? attendanceSummary.totalHours
    : attendanceRecords.reduce((sum, record) => sum + record.hours, 0);
  const expectedHours = attendanceSummary
    ? attendanceSummary.expectedHours
    : scheduledDays * 8;
  const lateDays = attendanceSummary
    ? attendanceSummary.lateDays
    : attendanceRecords.filter((record) => record.status === "late").length;
  const absentDays = attendanceSummary
    ? attendanceSummary.absentDays
    : attendanceRecords.filter((record) => record.status === "absent").length;
  const averageHours = attendanceSummary
    ? attendanceSummary.averageHoursPerDay
    : workedDays > 0
      ? totalHours / workedDays
      : 0;

  const netSalary = latestPayslip ? latestPayslip.netSalary : 0;
  const payslipMonth = latestPayslip ? latestPayslip.month : "--/----";
  const paidAt = latestPayslip ? latestPayslip.paidAt : null;

  const shiftName = todayShift ? todayShift.shiftName : "Ca ngày";
  const shiftTime = todayShift
    ? `${todayShift.startTime} — ${todayShift.endTime}`
    : "07:30 — 16:30";
  const breakTime =
    todayShift && todayShift.breakStart
      ? `Nghỉ ${todayShift.breakStart} - ${todayShift.breakEnd}`
      : "Nghỉ 12:00 - 13:00";
  const checkInTime =
    todayShift && todayShift.checkIn ? todayShift.checkIn : "—";
  const checkOutTime =
    todayShift && todayShift.checkOut ? todayShift.checkOut : "—";
  const checkInLabel =
    todayShift && todayShift.checkIn ? "Đúng giờ" : "Chưa check-in";
  const checkOutLabel =
    todayShift && todayShift.checkOut ? "Đã check-out" : "Dự kiến";
  const statusBadge =
    todayShift && todayShift.status === "full"
      ? "Đủ công"
      : todayShift && todayShift.status === "absent"
        ? "Vắng"
        : "Thiếu công";

  const greeting = currentDate
    ? `Chào ${getTimeGreeting(currentDate.getHours())}`
    : "Xin chào";
  const titleText = `${greeting}, ${user.name}`;

  return (
    <div className="page dashboard-page">
      <PageTitle
        title={titleText}
        subtitle={
          currentDate
            ? formatDashboardDate(currentDate)
            : "Đang cập nhật thời gian..."
        }
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="eyebrow">NHABE CORPORATION</span>
          <DashboardLivePanel />
          <p>{user.position}</p>
          <div className="status-pill">
            <span /> Đang làm việc
          </div>
        </div>
        <div className="welcome-profile">
          <Avatar large name={user.name} src={avatarUrl} />
          <div>
            <strong>{user.name}</strong>
            <span>{user.staffId}</span>
          </div>
        </div>
        <Leaf className="hero-leaf hero-leaf-one" />
        <Leaf className="hero-leaf hero-leaf-two" />
      </section>

      <section className="section-block overview-block">
        <div className="section-heading">
          <div>
            <span className="section-kicker">
              TỔNG QUAN THÁNG{" "}
              {currentDate
                ? String(currentDate.getMonth() + 1).padStart(2, "0")
                : "08"}
            </span>
            <h2>Dữ liệu từ đầu tháng đến nay</h2>
          </div>
          <span className="updated">Tự động tính từ bảng công</span>
        </div>
        <div className="stats-grid">
          <article className="stat-card blue">
            <div className="stat-icon">
              <CalendarDays size={20} />
            </div>
            <p>Ngày công</p>
            <strong>
              {workedDays} <small>/ {scheduledDays} ngày</small>
            </strong>
            <span>
              <Check size={13} /> {lateDays} trễ · {absentDays} vắng
            </span>
          </article>
          <article className="stat-card teal">
            <div className="stat-icon">
              <Clock3 size={20} />
            </div>
            <p>Tổng giờ làm</p>
            <strong>
              {totalHours.toFixed(1)} <small>/ {expectedHours} giờ</small>
            </strong>
            <span>
              <Check size={13} /> Bình quân {averageHours.toFixed(1)} giờ/ngày
            </span>
          </article>
          <article className="stat-card green">
            <div className="stat-icon">
              <FileText size={20} />
            </div>
            <p>Tổng số văn bản</p>
            <strong>{documentCount ?? 0}</strong>
            <span>
              Đã tạo trong năm{" "}
              {currentDate ? currentDate.getFullYear() : "2026"}
            </span>
          </article>
        </div>
      </section>

      <div className="dashboard-columns">
        <div className="column-stack">
          <section className="section-block quick-block">
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">TIỆN ÍCH</span>
                <h2>Truy cập nhanh</h2>
              </div>
            </div>
            <div className="quick-grid">
              {[
                {
                  icon: Clock3,
                  label: "Chấm công",
                  tab: "attendance",
                  tone: "blue",
                },
                {
                  icon: WalletCards,
                  label: "Phiếu lương",
                  tab: "payroll",
                  tone: "teal",
                },
                {
                  icon: FileText,
                  label: "Văn bản",
                  tab: "requests",
                  tone: "orange",
                },
                { icon: Bell, label: "Thông báo", tab: "news", tone: "red" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="quick-item"
                  onClick={() => goTo(item.tab)}
                >
                  <span className={`quick-icon ${item.tone}`}>
                    <item.icon size={22} />
                  </span>
                  <span>{item.label}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </section>

          <section className="section-block news-card">
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">NBC NEWS</span>
                <h2>Thông báo & Tin tức</h2>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => goTo("news")}
              >
                Xem tất cả <ChevronRight size={14} />
              </button>
            </div>
            {articles
              .filter((item) => item.status === "published")
              .slice()
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 1)
              .map((article) => (
                <article
                  className="news-item clickable"
                  key={article.id}
                  onClick={() => onOpenArticle(article.id)}
                >
                  <div className="news-visual">
                    {article.imageUrl ? (
                      <img src={article.imageUrl} alt="" />
                    ) : (
                      <>
                        <Leaf />
                        <Building2 />
                      </>
                    )}
                  </div>
                  <div>
                    <span>{article.category.toUpperCase()}</span>
                    <h3>{article.title}</h3>
                    <p>{article.summary}</p>
                    <time>
                      {new Date(article.updatedAt).toLocaleDateString("vi-VN")}
                    </time>
                  </div>
                </article>
              ))}
          </section>
        </div>

        <div className="column-stack">
          <section className="section-block attendance-today">
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">CHẤM CÔNG</span>
                <h2>Ca làm việc hôm nay</h2>
              </div>
              <span className="success-badge">{statusBadge}</span>
            </div>
            <div className="shift-time">
              <span>{shiftName}</span>
              <strong>{shiftTime}</strong>
              <small>{breakTime}</small>
            </div>
            <div className="time-log-row">
              <div>
                <LogIn size={18} />
                <span>
                  Check-in<small>{checkInLabel}</small>
                </span>
              </div>
              <strong>{checkInTime}</strong>
            </div>
            <div className="time-log-row">
              <div>
                <LogOut size={18} />
                <span>
                  Check-out<small>{checkOutLabel}</small>
                </span>
              </div>
              <strong>{checkOutTime}</strong>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => setFeedbackOpen(true)}
            >
              <Reply size={18} /> Phản hồi chấm công
            </button>
          </section>

          <section
            className="salary-preview"
            onClick={() => goTo("payroll")}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                goTo("payroll");
              }
            }}
          >
            <div>
              <span>THỰC LĨNH THÁNG {payslipMonth}</span>
              <strong>
                <SensitiveAmount
                  value={formatVnd(netSalary)}
                  visible={salaryVisible}
                  onToggle={() => setSalaryVisible((value) => !value)}
                  label={"thực lĩnh tháng " + payslipMonth}
                />
                <small> VND</small>
              </strong>
              <p>
                {paidAt ? `Đã thanh toán ngày ${paidAt}` : "Chưa thanh toán"}
              </p>
            </div>
            <div className="salary-arrow">
              <ChevronRight />
            </div>
            <Leaf className="salary-leaf one" />
            <Leaf className="salary-leaf two" />
          </section>
        </div>
      </div>
      {feedbackOpen && (
        <AttendanceFeedbackModal
          records={attendanceRecords}
          onClose={() => setFeedbackOpen(false)}
          onSubmit={(date, message) => {
            onSubmitFeedback(date, message);
            setFeedbackOpen(false);
          }}
        />
      )}
    </div>
  );
}
