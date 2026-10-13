import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  LayoutDashboard,
  Reply,
  KeyRound,
  TreePalm,
  FileText,
  AlarmClock,
  HeartPulse,
  Clock3,
  Users,
  ChevronRight,
  RotateCcw,
  Eye,
  X,
  EyeOff,
  Send,
  Paperclip,
  Search,
  UserRoundSearch,
  CheckCircle2,
  CalendarDays,
  SlidersHorizontal,
  CircleCheckBig,
  Check,
  CircleEllipsis,
  ShieldCheck,
} from "lucide-react";
import { PageTitle } from "@/components/common/PageTitle";
import { AttachmentPreviewModal } from "@/components/document";
import { formatVietnamDate } from "@/utils/formatVietnamDate";
import { getAttachmentUrl } from "@/api/attendance.api";
import { getData, patchData } from "@/utils/api";
import AttendanceFeedbackAdminPanel from "@/features/attendance/components/admin/feedback/AttendanceFeedbackAdminPanel";
import usePermission from "@/hooks/usePermission";
import { getAttendanceOverviewData } from "@/features/attendance/utils/attendance-admin.utils";
import AttendanceTrendPanel from "@/features/attendance/components/admin/overview/AttendanceTrendPanel";
import PendingFeedbackPanel from "@/features/attendance/components/admin/overview/PendingFeedbackPanel";
export function AdminHRPage({
  embedded = false,
  initialTab = "overview",
  feedbacks,
  attendanceEntries = [],
  documents,
  employees,
  onReply,
  onStartConversation,
  onReviewFeedback,
  onReviewDocument,
  onNotifications,
  unreadCount,
  reviewingDocumentId,
  documentSuccess,
  onDismissDocumentSuccess,
}) {
  const can = usePermission();
  const [documentType, setDocumentType] = useState("all");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [resetRequests, setResetRequests] = useState([]);
  const [resetError, setResetError] = useState("");
  const [tab, setTab] = useState(initialTab);
  const [replying, setReplying] = useState();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const attendanceOverview = useMemo(
    () => getAttendanceOverviewData(attendanceEntries, feedbacks, employees),
    [attendanceEntries, feedbacks, employees],
  );

  const [conversationComposer, setConversationComposer] = useState();
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState();
  const [activityFilter, setActivityFilter] = useState("all");
  const [activitySearch, setActivitySearch] = useState("");
  const session = useSelector((state) => state.user.session);
  const role = String(session?.role ?? "")
    .trim()
    .toLowerCase();

  const canApproveDocument = can("approve_document");

  const pendingFeedback = feedbacks.filter(
    (item) => item.status === "pending",
  ).length;

  useEffect(() => {
    const fetchResetRequests = async () => {
      try {
        const res = await getData("/api/user/reset-pass/all");

        if (res.data.success) {
          setResetRequests(res.data.data);
        }
      } catch (err) {
        console.error(
          err.response?.data?.message || "Lỗi lấy danh sách reset mật khẩu!",
        );
      }
    };

    fetchResetRequests();
  }, []);

  const matchingEmployees = conversationComposer
    ? employees
        .filter((employee) => {
          const keyword = conversationComposer.employeeQuery
            .trim()
            .toLocaleLowerCase("vi");
          return (
            !keyword ||
            `${employee.name} ${employee.staffId} ${employee.department || ""}`
              .toLocaleLowerCase("vi")
              .includes(keyword)
          );
        })
        .slice(0, 8)
    : [];

  const pendingPassword = resetRequests.filter(
    (item) => item.status === "pending",
  ).length;
  const handleResetPassword = async () => {
    setResetError("");

    if (!newPassword) {
      setResetError("Vui lòng nhập mật khẩu mới.");
      return;
    }

    if (newPassword.length < 6) {
      setResetError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      const res = await patchData(
        `/api/user/reset-pass/${selectedRequest.id}`,
        {
          password: newPassword,
        },
      );

      if (res.data.success) {
        setResetRequests((prev) =>
          prev.map((item) =>
            item.id === selectedRequest.id
              ? { ...item, status: "approved" }
              : item,
          ),
        );

        setSelectedRequest(null);
        setNewPassword("");
        setConfirmPassword("");
        setResetError("");
      }
    } catch (err) {
      setResetError(err.response?.data?.message || "Reset mật khẩu thất bại.");
    }
  };
  const isReadyForHr = (item) => {
    return item.status === "Chờ duyệt" && Number(item.current_step) === 2;
  };
  const pendingDocuments = documents.filter(isReadyForHr).length;

  const approvalProgress = [
    {
      label: "Phản hồi công",
      pending: pendingFeedback,
      total: feedbacks.length,
      tab: "feedback",
    },
    {
      label: "Văn bản",
      pending: pendingDocuments,
      total: documents.length,
      tab: "documents",
    },
    {
      label: "Mật khẩu",
      pending: pendingPassword,
      total: resetRequests.length,
      tab: "password",
    },
  ];

  const activityItems = [
    ...feedbacks.map((item) => ({
      id: `feedback-${item.id}`,
      type: "attendance",
      icon: Reply,
      actor: item.status === "pending" ? item.employee : "Bộ phận Nhân sự",
      title:
        item.status === "pending"
          ? `Gửi phản hồi chấm công · ${item.employee || item.staffId}`
          : `Cập nhật phản hồi của ${item.employee || item.staffId}`,
      detail: `${item.date} · ${item.message}`,
      time:
        item.processedAt || item.updatedAt || item.createdAt || "Chưa xác định",
      result:
        item.status === "rejected"
          ? "rejected"
          : item.status === "pending"
            ? "pending"
            : "success",
    })),
    ...documents.map((item) => ({
      id: `document-${item.id}`,
      type: "document",
      icon: FileText,
      actor: "Quy trình phê duyệt",
      title: `${item.status || "Cập nhật"} ${item.type || "văn bản"} · ${item.employee_name || item.staff_id || item.staffId}`,
      detail: item.reason || "Không có lý do",
      time: item.updated_at || item.created_at || "Chưa xác định",
      result:
        item.status === "Từ chối"
          ? "rejected"
          : item.status === "Đã duyệt"
            ? "success"
            : "pending",
    })),
    ...resetRequests.map((item) => ({
      id: `password-${item.id}`,
      type: "account",
      icon: KeyRound,
      actor: "Quản trị tài khoản",
      title: `${item.status === "pending" ? "Yêu cầu" : "Đã xử lý"} cấp lại mật khẩu · ${item.employee || item.staffId}`,
      detail: item.staffId || "Tài khoản nhân viên",
      time: item.requestedAt || "Chưa xác định",
      result: item.status === "pending" ? "pending" : "success",
    })),
  ];

  const visibleActivities = activityItems.filter((item) => {
    const keyword = activitySearch.trim().toLocaleLowerCase("vi");
    return (
      (activityFilter === "all" || item.type === activityFilter) &&
      (!keyword ||
        `${item.actor} ${item.title} ${item.detail}`
          .toLocaleLowerCase("vi")
          .includes(keyword))
    );
  });

  const activityTypes = [
    { id: "all", label: "Tất cả", icon: Clock3 },
    { id: "attendance", label: "Chấm công", icon: Reply },
    { id: "document", label: "Văn bản", icon: FileText },
    { id: "account", label: "Tài khoản", icon: KeyRound },
  ];

  const visibleDocuments = [...documents]
    .filter((item) => {
      const matchesStatus =
        documentFilter === "pending"
          ? isReadyForHr(item)
          : documentFilter === "completed"
            ? ["Đã duyệt", "Từ chối"].includes(item.status)
            : true;
      const staffId = item.staff_id ?? item.staffId ?? "";
      const employee = employees.find((person) => person.staffId === staffId);
      const keyword = documentSearch.trim().toLocaleLowerCase("vi");
      const matchesSearch =
        !keyword ||
        `${employee?.name ?? item.employee ?? ""} ${staffId} ${item.reason ?? ""}`
          .toLocaleLowerCase("vi")
          .includes(keyword);
      const matchesType = documentType === "all" || item.type === documentType;
      return matchesStatus && matchesSearch && matchesType;
    })
    .sort((a, b) => {
      const priority = Number(isReadyForHr(b)) - Number(isReadyForHr(a));
      if (priority) return priority;
      return Number(b.id) - Number(a.id);
    });
  const documentTypes = [
    ...new Set(documents.map((item) => item.type).filter(Boolean)),
  ].sort();
  const formatDocumentTime = (value) => {
    if (!value) return "Chưa xác định";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };
  const tabs = [
    { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
    {
      id: "feedback",
      label: "Phản hồi chấm công",
      icon: Reply,
      count: pendingFeedback,
    },
    {
      id: "password",
      label: "Yêu cầu mật khẩu",
      icon: KeyRound,
      count: pendingPassword,
    },
    {
      id: "documents",
      label: "Duyệt văn bản",
      icon: FileCheck2Icon,
      count: pendingDocuments,
    },
    { id: "activity", label: "Hoạt động", icon: Clock3 },
  ];
  const getStatusClass = (status) => {
    switch (status) {
      case "Đã duyệt":
        return "approved";

      case "Từ chối":
        return "rejected";

      case "Chờ duyệt":
        return "pending";

      default:
        return "pending";
    }
  };
  return (
    <div
      className={
        embedded ? "admin-page admin-page-embedded" : "page admin-page"
      }
    >
      {documentSuccess && (
        <div
          className="document-success-toast"
          role="status"
          aria-live="polite"
        >
          <span className="document-success-icon">
            <CircleCheckBig />
          </span>
          <div>
            <strong>Phê duyệt thành công!</strong>
            <p>{documentSuccess}</p>
            <small>Trạng thái văn bản đã được cập nhật.</small>
          </div>
          <button
            type="button"
            onClick={onDismissDocumentSuccess}
            aria-label="Đóng thông báo"
          >
            <X />
          </button>
          <i aria-hidden="true" />
        </div>
      )}
      {!embedded && (
        <PageTitle
          title="Admin-HR"
          subtitle="Trung tâm xử lý nghiệp vụ Nhân sự"
          onNotifications={onNotifications}
          unreadCount={unreadCount}
        />
      )}
      {!embedded && (
        <div className="admin-tabs">
          {tabs
            .filter((item) => !["feedback", "documents"].includes(item.id))
            .map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? "active" : ""}
                onClick={() => setTab(item.id)}
              >
                <item.icon />
                <span>{item.label}</span>
                {Boolean(item.count) && <i>{item.count}</i>}
              </button>
            ))}
        </div>
      )}

      {tab === "overview" && (
        <>
          <section className="admin-kpi-grid">
            <article>
              <span className="admin-kpi-icon blue">
                <Reply />
              </span>
              <div>
                <small>CHỜ TRẢ LỜI</small>
                <strong>{pendingFeedback}</strong>
                <p>Phản hồi chấm công</p>
              </div>
            </article>
            <article>
              <span className="admin-kpi-icon green">
                <Users />
              </span>
              <div>
                <small>NHÂN VIÊN</small>
                <strong>{employees.length}</strong>
                <p>
                  {
                    employees.filter((item) => item.status === "Đang hoạt động")
                      .length
                  }{" "}
                  đang hoạt động
                </p>
              </div>
            </article>
            <article>
              <span className="admin-kpi-icon purple">
                <FileCheck2Icon />
              </span>
              <div>
                <small>VĂN BẢN CHỜ DUYỆT</small>
                <strong>{pendingDocuments}</strong>
                <p>Cần HR xử lý</p>
              </div>
            </article>
            <article>
              <span className="admin-kpi-icon red">
                <AlarmClock />
              </span>
              <div>
                <small>BẤT THƯỜNG CÔNG</small>
                <strong>{attendanceOverview.exceptionCount}</strong>
                <p>Đi trễ, vắng hoặc thiếu lượt</p>
              </div>
            </article>
          </section>
          <div className="admin-insight-grid">
            <AttendanceTrendPanel
              trendDays={attendanceOverview.trendDays}
              trendMax={attendanceOverview.trendMax}
            />
            <section className="section-block admin-insight-panel admin-approval-summary">
              <div className="section-heading compact">
                <div>
                  <span className="section-kicker">TIẾN ĐỘ</span>
                  <h2>Hàng đợi phê duyệt</h2>
                </div>
              </div>
              <div className="admin-approval-panel">
                {approvalProgress.map((item) => {
                  const completed = Math.max(0, item.total - item.pending);
                  const percent = item.total
                    ? (completed / item.total) * 100
                    : 100;
                  return (
                    <button
                      type="button"
                      key={item.label}
                      onClick={() => setTab(item.tab)}
                    >
                      <span>
                        <strong>{item.label}</strong>
                        <small>
                          {item.pending} chờ · {completed} hoàn tất
                        </small>
                      </span>
                      <div>
                        <i style={{ width: `${percent}%` }} />
                      </div>
                      <ChevronRight />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
          <div className="admin-overview-grid">
            <PendingFeedbackPanel
              groups={attendanceOverview.pendingFeedbackGroups}
              onOpenFeedback={() => setTab("feedback")}
            />
            <section className="section-block admin-preview">
              <div className="section-heading compact">
                <div>
                  <span className="section-kicker">ƯU TIÊN</span>
                  <h2>Việc cần xử lý</h2>
                </div>
              </div>
              <button
                type="button"
                className="admin-task-summary"
                onClick={() => setTab("password")}
              >
                <span className="orange">
                  <KeyRound />
                </span>
                <div>
                  <strong>Yêu cầu cấp lại mật khẩu</strong>
                  <small>{pendingPassword} yêu cầu đang chờ</small>
                </div>
                <b>{pendingPassword}</b>
                <ChevronRight />
              </button>
              <button
                type="button"
                className="admin-task-summary"
                onClick={() => setTab("documents")}
              >
                <span className="purple">
                  <FileCheck2Icon />
                </span>
                <div>
                  <strong>Văn bản cần phê duyệt</strong>
                  <small>{pendingDocuments} văn bản chờ HR</small>
                </div>
                <b>{pendingDocuments}</b>
                <ChevronRight />
              </button>
              <button
                type="button"
                className="admin-task-summary"
                onClick={() => setTab("feedback")}
              >
                <span className="red">
                  <AlarmClock />
                </span>
                <div>
                  <strong>Bất thường chấm công</strong>
                  <small>Đi trễ, vắng hoặc thiếu lượt</small>
                </div>
                <b>{attendanceOverview.exceptionCount}</b>
                <ChevronRight />
              </button>
            </section>
          </div>
        </>
      )}

      {tab === "feedback" && (
        <AttendanceFeedbackAdminPanel
          feedbacks={feedbacks}
          attendanceEntries={attendanceEntries}
          onReply={onReply}
          onReviewFeedback={onReviewFeedback}
          onOpenConversation={() => {
            setConversationComposer({
              staffId: "",
              employeeQuery: "",
              date: "",
              message: "",
            });
            setEmployeePickerOpen(false);
          }}
        />
      )}

      {tab === "password" && (
        <section className="section-block hr-list-card">
          <div className="list-card-head">
            <div>
              <span>HỖ TRỢ TÀI KHOẢN</span>
              <h2>Yêu cầu quên mật khẩu</h2>
            </div>
            <span className="list-summary">{pendingPassword} chờ xử lý</span>
          </div>
          <div className="reset-request-list">
            {resetRequests.map((item) => (
              <article key={item.id}>
                <span className={`reset-avatar ${item.status}`}>
                  <KeyRound />
                </span>
                <div>
                  <strong>{item.employee}</strong>
                  <p>
                    {item.staff_id} ·{" "}
                    {new Date(item.requested_at).toLocaleDateString("vi-VN")}
                  </p>
                  <small>Yêu cầu được tạo từ chức năng Quên mật khẩu</small>
                </div>
                <span
                  className={`request-status ${
                    item.status === "pending" ? "pending" : "approved"
                  }`}
                >
                  {item.status === "pending" ? "Chờ reset" : "Đã reset"}
                </span>
                <button
                  disabled={item.status === "approved"}
                  onClick={() => setSelectedRequest(item)}
                >
                  <RotateCcw /> Reset mật khẩu
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {conversationComposer && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setConversationComposer(undefined)}
        >
          <form
            className="reply-modal attendance-new-chat"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              const employee = employees.find(
                (item) => item.staffId === conversationComposer.staffId,
              );
              if (
                !employee ||
                !conversationComposer.date ||
                !conversationComposer.message.trim()
              )
                return;
              const [year, month, day] = conversationComposer.date.split("-");
              onStartConversation({
                employee,
                date: `${day}/${month}/${year}`,
                message: conversationComposer.message.trim(),
              });
              setConversationComposer(undefined);
            }}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setConversationComposer(undefined)}
            >
              <X />
            </button>
            <span className="modal-icon">
              <Send />
            </span>
            <h2>Nhắn tin</h2>
            <label className="attendance-employee-picker">
              Nhân viên
              <span className="attendance-employee-search">
                <Search />
                <input
                  value={conversationComposer.employeeQuery}
                  onFocus={() => setEmployeePickerOpen(true)}
                  onChange={(event) => {
                    setConversationComposer((current) => ({
                      ...current,
                      employeeQuery: event.target.value,
                      staffId: "",
                    }));
                    setEmployeePickerOpen(true);
                  }}
                  placeholder="Tìm tên, mã nhân viên, phòng ban..."
                  autoComplete="off"
                />
                {conversationComposer.staffId && <CheckCircle2 />}
              </span>
              {employeePickerOpen && (
                <span className="attendance-employee-results">
                  {matchingEmployees.map((employee) => (
                    <button
                      key={employee.staffId}
                      type="button"
                      onClick={() => {
                        setConversationComposer((current) => ({
                          ...current,
                          staffId: employee.staffId,
                          employeeQuery: `${employee.name} · ${employee.staffId}`,
                        }));
                        setEmployeePickerOpen(false);
                      }}
                    >
                      <i>
                        {employee.name
                          .split(" ")
                          .slice(-2)
                          .map((word) => word[0])
                          .join("")}
                      </i>
                      <span>
                        <strong>{employee.name}</strong>
                        <small>
                          {employee.staffId}
                          {employee.department
                            ? ` · ${employee.department}`
                            : ""}
                        </small>
                      </span>
                    </button>
                  ))}
                  {matchingEmployees.length === 0 && (
                    <em>Không tìm thấy nhân viên phù hợp.</em>
                  )}
                </span>
              )}
            </label>
            <label>
              Ngày công
              <input
                type="date"
                value={conversationComposer.date}
                onChange={(event) =>
                  setConversationComposer((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Nội dung
              <textarea
                value={conversationComposer.message}
                onChange={(event) =>
                  setConversationComposer((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder="Nhập nội dung cần trao đổi..."
              />
            </label>
            <button
              className="primary-button"
              disabled={
                !conversationComposer.staffId ||
                !conversationComposer.date ||
                !conversationComposer.message.trim()
              }
            >
              <Send /> Gửi tin nhắn
            </button>
          </form>
        </div>
      )}

      {tab === "documents" && (
        <section className="section-block hr-list-card document-approval-card">
          <div className="list-card-head">
            <div>
              <span>QUY TRÌNH PHÊ DUYỆT</span>
              <h2>Danh sách văn bản nhân viên</h2>
            </div>
            <span className="list-summary">
              {pendingDocuments} chờ HR duyệt
            </span>
          </div>
          <div
            className="document-approval-filters"
            role="tablist"
            aria-label="Lọc văn bản"
          >
            <button
              type="button"
              className={documentFilter === "pending" ? "active" : ""}
              onClick={() => setDocumentFilter("pending")}
            >
              Chờ HR duyệt <span>{pendingDocuments}</span>
            </button>
            <button
              type="button"
              className={documentFilter === "completed" ? "active" : ""}
              onClick={() => setDocumentFilter("completed")}
            >
              Đã xử lý
            </button>
            <button
              type="button"
              className={documentFilter === "all" ? "active" : ""}
              onClick={() => setDocumentFilter("all")}
            >
              Tất cả
            </button>
          </div>
          <div className="document-search-toolbar">
            <label>
              <Search />
              <input
                value={documentSearch}
                onChange={(event) => setDocumentSearch(event.target.value)}
                placeholder="Tìm tên, mã nhân viên hoặc lý do..."
              />
            </label>
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              aria-label="Lọc theo loại đơn"
            >
              <option value="all">Tất cả loại đơn</option>
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setDocumentSearch("");
                setDocumentType("all");
              }}
              disabled={!documentSearch && documentType === "all"}
            >
              <RotateCcw /> Xóa bộ lọc
            </button>
          </div>
          <div className="document-approval-list">
            {visibleDocuments.map((item) => {
              const readyForHr = isReadyForHr(item);
              const waitingForManager =
                item.status === "Chờ duyệt" && Number(item.current_step) === 1;
              const staffId = item.staff_id ?? item.staffId;
              const employee = employees.find(
                (person) => person.staffId === staffId,
              );
              const tone =
                item.status === "Đã duyệt"
                  ? "approved"
                  : item.status === "Từ chối"
                    ? "rejected"
                    : "pending";
              const iconKind = item.type?.includes("Nghỉ")
                ? "leave"
                : item.type?.includes("thêm") || item.type?.includes("Tăng ca")
                  ? "overtime"
                  : "document";
              return (
                <article key={item.id}>
                  <span
                    className={`request-icon ${
                      item.status === "Đã duyệt"
                        ? "approved"
                        : item.status === "Từ chối"
                          ? "rejected"
                          : "pending"
                    }`}
                  >
                    <DocumentIcon
                      kind={
                        item.type === "Nghỉ phép"
                          ? "leave"
                          : item.type === "Nghỉ ốm"
                            ? "sick"
                            : item.type === "Làm thêm giờ" ||
                                item.type === "Tăng ca"
                              ? "overtime"
                              : "document"
                      }
                    />
                  </span>
                  <div>
                    <div className="document-employee-heading">
                      <strong>
                        {item.employee_name ||
                          employee?.name ||
                          item.employee ||
                          "Nhân viên"}
                        {staffId ? ` - ${staffId}` : ""}
                      </strong>
                      <span
                        className={`request-status ${getStatusClass(item.status)}`}
                      >
                        {waitingForManager
                          ? "Chờ quản lý trực tiếp"
                          : item.status}
                      </span>
                    </div>
                    <p className="document-approval-type">
                      <b>Loại đơn:</b> {item.type}
                    </p>
                    <small className="document-approval-time">
                      {item.type === "Tăng ca"
                        ? `${formatVietnamDate(item.start_date)} · ${item.start_time} - ${item.end_time}`
                        : `${formatVietnamDate(item.start_date)} - ${formatVietnamDate(item.end_date)}`}
                    </small>
                    <p className="document-approval-reason">
                      <b>Lý do:</b> {item.reason || "Không có lý do"}
                    </p>
                    {(item.attachments ?? []).length > 0 ? (
                      <div className="document-attachment-buttons">
                        {(item.attachments ?? []).map((file) => (
                          <button
                            key={file.id}
                            onClick={async () => {
                              try {
                                const attachment = await getAttachmentUrl(
                                  file.id,
                                );

                                setPreviewAttachment(attachment);
                              } catch (error) {
                                alert("Không thể mở file");
                              }
                            }}
                          >
                            <Eye /> Xem {file.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="no-attachment">
                        <Paperclip /> Không có tệp đính kèm
                      </span>
                    )}
                    <div className="document-progress">
                      {/* BƯỚC 1: QUẢN LÝ */}
                      <span
                        className={
                          item.status === "Từ chối" &&
                          Number(item.current_step) === 1
                            ? "rejected"
                            : Number(item.current_step) > 1
                              ? "approved"
                              : "pending"
                        }
                      >
                        <i>
                          {item.status === "Từ chối" &&
                          Number(item.current_step) === 1 ? (
                            <X size={10} />
                          ) : Number(item.current_step) > 1 ? (
                            <Check size={10} />
                          ) : (
                            1
                          )}
                        </i>

                        <small>Quản lý trực tiếp</small>
                      </span>

                      {/* BƯỚC 2: HR */}
                      <span
                        className={
                          item.status === "Từ chối" &&
                          Number(item.current_step) === 1
                            ? "disabled"
                            : item.status === "Từ chối" &&
                                Number(item.current_step) === 2
                              ? "rejected"
                              : Number(item.current_step) > 2
                                ? "approved"
                                : "pending"
                        }
                      >
                        <i>
                          {item.status === "Từ chối" &&
                          Number(item.current_step) === 1 ? (
                            2
                          ) : item.status === "Từ chối" &&
                            Number(item.current_step) === 2 ? (
                            <X size={10} />
                          ) : Number(item.current_step) > 2 ? (
                            <Check size={10} />
                          ) : (
                            2
                          )}
                        </i>

                        <small>Nhân sự phê duyệt</small>
                      </span>

                      {/* BƯỚC 3: HOÀN TẤT */}
                      <span
                        className={
                          item.status === "Từ chối"
                            ? "disabled"
                            : item.status === "Đã duyệt" &&
                                Number(item.current_step) === 3
                              ? "approved"
                              : "pending"
                        }
                      >
                        <i>
                          {item.status === "Đã duyệt" &&
                          Number(item.current_step) === 3 ? (
                            <Check size={10} />
                          ) : (
                            3
                          )}
                        </i>

                        <small>Hoàn tất</small>
                      </span>
                    </div>
                  </div>
                  <div className="document-review-actions">
                    <button
                      disabled
                      className="reject"
                      title="Chức năng từ chối đang được hoàn thiện"
                      onClick={(event) => {
                        event.stopPropagation();
                        onReviewDocument(item.id, false);
                      }}
                    >
                      <XIcon /> Từ chối
                    </button>
                    <button
                      disabled={
                        !canApproveDocument ||
                        !readyForHr ||
                        reviewingDocumentId === item.id
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        onReviewDocument(item.id, true);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 7 17l-5-5" />
                        <path d="m22 10-7.5 7.5L13 16" />
                      </svg>

                      {reviewingDocumentId === item.id
                        ? "Đang duyệt…"
                        : "Phê duyệt"}
                    </button>
                  </div>
                </article>
              );
            })}
            {visibleDocuments.length === 0 && (
              <div className="approval-empty document-approval-empty">
                <CircleCheckBig />
                <strong>Không có văn bản chờ HR duyệt</strong>
                <p>
                  Các văn bản đã được quản lý xác nhận sẽ xuất hiện tại đây.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "activity" && (
        <div className="admin-audit-workspace">
          <section className="section-block admin-audit-main">
            <header>
              <div>
                <span className="section-kicker">DÒNG THỜI GIAN</span>
                <h2>Nhật ký nghiệp vụ</h2>
                <p>Theo dõi thay đổi chấm công, văn bản và tài khoản.</p>
              </div>
              <label>
                <Search />
                <input
                  value={activitySearch}
                  onChange={(event) => setActivitySearch(event.target.value)}
                  placeholder="Tìm người thực hiện, nhân viên, nội dung..."
                />
              </label>
            </header>
            <div className="admin-audit-date">
              <span>HOẠT ĐỘNG GẦN ĐÂY</span>
              <b>{visibleActivities.length}</b>
            </div>
            <div className="admin-audit-timeline">
              {visibleActivities.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.id} className={`is-${item.result}`}>
                    <i>
                      <Icon />
                    </i>
                    <div>
                      <span>
                        <strong>{item.title}</strong>
                        <em>
                          {item.result === "success"
                            ? "Thành công"
                            : item.result === "rejected"
                              ? "Từ chối"
                              : "Đang xử lý"}
                        </em>
                      </span>
                      <p>{item.detail}</p>
                      <small>
                        {item.actor} · {item.time}
                      </small>
                    </div>
                    <button type="button" aria-label="Xem hoạt động">
                      <ChevronRight />
                    </button>
                  </article>
                );
              })}
              {!visibleActivities.length && (
                <div className="admin-dashboard-empty">
                  Không có hoạt động phù hợp với bộ lọc.
                </div>
              )}
            </div>
          </section>
          <aside className="section-block admin-audit-sidebar">
            <div>
              <span className="section-kicker">PHÂN LOẠI</span>
              <h2>Lọc hoạt động</h2>
            </div>
            <nav>
              {activityTypes.map((item) => {
                const Icon = item.icon;
                const count =
                  item.id === "all"
                    ? activityItems.length
                    : activityItems.filter(
                        (activity) => activity.type === item.id,
                      ).length;
                return (
                  <button
                    type="button"
                    className={activityFilter === item.id ? "active" : ""}
                    onClick={() => setActivityFilter(item.id)}
                    key={item.id}
                  >
                    <i>
                      <Icon />
                    </i>
                    <span>
                      {item.label}
                      <small>{count} hoạt động</small>
                    </span>
                    <b>{count}</b>
                  </button>
                );
              })}
            </nav>
            <div className="admin-audit-note">
              <ShieldCheck />
              <span>
                <strong>Nhật ký kiểm toán</strong>
                <small>
                  Các thao tác nghiệp vụ được lưu để phục vụ đối chiếu.
                </small>
              </span>
            </div>
          </aside>
        </div>
      )}

      {replying && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setReplying(undefined)}
        >
          <form
            className="reply-modal"
            onSubmit={(event) => {
              event.preventDefault();
              if (replyText.trim()) {
                onReply(replying.id, replyText.trim());
                setReplying(undefined);
              }
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setReplying(undefined)}
            >
              <X />
            </button>
            <span className="modal-icon">
              <Reply />
            </span>
            <h2>Trả lời nhân viên</h2>
            <div className="reply-context">
              <strong>
                {replying.employee} · {replying.staffId}
              </strong>
              <span>Phản hồi ngày {replying.date}</span>
              <p>{replying.message}</p>
            </div>
            <label>
              Nội dung trả lời
              <textarea
                autoFocus
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Nhập kết quả kiểm tra hoặc hướng xử lý..."
              />
            </label>
            <div className="feedback-note">
              <Clock3 /> Câu trả lời sẽ được gửi đến Thông báo của nhân viên.
            </div>
            <button className="primary-button" disabled={!replyText.trim()}>
              <Send /> Gửi trả lời
            </button>
          </form>
        </div>
      )}

      {selectedDocument && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSelectedDocument(undefined)}
        >
          <section
            className="document-detail-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setSelectedDocument(undefined)}
              aria-label="Đóng"
            >
              <X />
            </button>
            <header>
              <span className="document-detail-icon">
                <DocumentIcon
                  kind={
                    selectedDocument.type?.includes("Nghỉ")
                      ? "leave"
                      : "document"
                  }
                />
              </span>
              <div>
                <small>CHI TIẾT VĂN BẢN</small>
                <h2>{selectedDocument.type}</h2>
                <p>
                  {selectedDocument.employeeName} ·{" "}
                  {selectedDocument.staff_id ?? selectedDocument.staffId}
                </p>
              </div>
            </header>
            <div className="document-detail-grid">
              <div>
                <small>Trạng thái</small>
                <strong>{selectedDocument.status}</strong>
              </div>
              <div>
                <small>Thời gian bắt đầu</small>
                <strong>
                  {formatDocumentTime(
                    selectedDocument.start_date ?? selectedDocument.date,
                  )}
                </strong>
              </div>
              <div>
                <small>Thời gian kết thúc</small>
                <strong>
                  {formatDocumentTime(
                    selectedDocument.end_date ??
                      selectedDocument.start_date ??
                      selectedDocument.date,
                  )}
                </strong>
              </div>
              <div>
                <small>Ngày tạo đơn</small>
                <strong>
                  {formatDocumentTime(
                    selectedDocument.created_at ?? selectedDocument.created,
                  )}
                </strong>
              </div>
            </div>
            <div className="document-detail-reason">
              <small>LÝ DO / NỘI DUNG ĐƠN</small>
              <p>{selectedDocument.reason || "Không có nội dung"}</p>
            </div>
            <div className="document-detail-manager">
              <UserRoundSearch />
              <div>
                <small>Quy trình hiện tại</small>
                <strong>
                  {Number(selectedDocument.current_step) === 2
                    ? "Quản lý đã duyệt, đang chờ HR"
                    : selectedDocument.status}
                </strong>
              </div>
            </div>
            {isReadyForHr(selectedDocument) && (
              <footer>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSelectedDocument(undefined)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="document-detail-reject"
                  disabled
                  title="Backend chưa hỗ trợ API từ chối văn bản"
                >
                  <X /> Từ chối
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={reviewingDocumentId === selectedDocument.id}
                  onClick={() => {
                    onReviewDocument(selectedDocument.id, true);
                    setSelectedDocument(undefined);
                  }}
                >
                  <CheckCircle2 /> Phê duyệt văn bản
                </button>
              </footer>
            )}
          </section>
        </div>
      )}

      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(undefined)}
        />
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              onClick={() => {
                setSelectedRequest(null);
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Reset mật khẩu
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Thiết lập mật khẩu mới cho nhân viên
              </p>
            </div>

            <div className="mb-5 rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Nhân viên:
                <strong className="ml-1 text-gray-900">
                  {selectedRequest.employee}
                </strong>
              </p>
              <p className="text-sm text-gray-600">
                Mã nhân viên:
                <strong className="ml-1 text-gray-900">
                  {selectedRequest.staff_id}
                </strong>
              </p>
            </div>
            {resetError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {resetError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Mật khẩu mới
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 pr-11 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Xác nhận mật khẩu
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                onClick={() => {
                  setSelectedRequest(null);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Hủy
              </button>

              <button
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                onClick={handleResetPassword}
              >
                Xác nhận reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function DocumentIcon({ kind }) {
  if (kind === "leave") return <TreePalm />;
  if (kind === "overtime") return <AlarmClock />;
  if (kind === "sick") return <HeartPulse />;
  return <FileText />;
}
function FileCheck2Icon() {
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
      className="lucide lucide-file-check-2"
    >
      <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
      <path d="M14 2v6h6" />
      <path d="m3 15 2 2 4-4" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-check"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-x"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
