import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { AdminHRPage } from "./AdminHRView";
import { Reply, KeyRound, FileCheck2 } from "lucide-react";
import {
  setFeedbacks,
  setNotices,
  setResetRequests,
  setDocuments,
  setNotificationsOpen,
  setHrAdminData,
  mergeHrAdminData,
} from "../../redux/userSlice";
import { calculateAdjustedAttendance } from "@/utils/attendance-adjustment";

import {
  rejectDocument,
  getDocuments,
  approveDocument,
  resolveAttendanceFeedback,
  getAttendanceFeedbacks,
  createAttendanceFeedback,
  getAttendanceLogsDetails,
} from "@/api/attendance.api";

import { attendanceEntriesFromRaw } from "@/utils/attendance";

const apiEnabled = import.meta.env.VITE_ENABLE_API === "true";

export default function AdminHR({ embedded = false, initialTab = "overview" }) {
  const dispatch = useDispatch();
  const [reviewingDocumentId, setReviewingDocumentId] = useState(null);
  const [documentSuccess, setDocumentSuccess] = useState("");

  useEffect(() => {
    if (!documentSuccess) return undefined;
    const timer = window.setTimeout(() => setDocumentSuccess(""), 4000);
    return () => window.clearTimeout(timer);
  }, [documentSuccess]);

  // Redux Selectors
  const session = useSelector((state) => state.user.session);
  const feedbacks = useSelector((state) => state.user.feedbacks);
  const resetRequests = useSelector((state) => state.user.resetRequests);
  const documents = useSelector((state) => state.user.documents);
  const employees = useSelector((state) => state.user.employees);
  const notices = useSelector((state) => state.user.notices);
  const hrAdminData = useSelector((state) => state.user.hrAdminData);
  const systemConfig = useSelector((state) => state.user.systemConfig);
  const role = session?.role ?? "employee";
  const currentStaffId =
    session?.staffId || "";
  const account = employees.find((item) => item.staffId === currentStaffId);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const result = await getDocuments();

        console.log("Documents API:", result);

        dispatch(setDocuments(result.data ?? result));
      } catch (error) {
        console.error("Lỗi lấy documents:", error);
      }
    };

    fetchDocuments();
  }, [dispatch]);

  useEffect(() => {
    let active = true;
    getAttendanceFeedbacks()
      .then((rows) => {
        if (!active) return;
        dispatch(
          setFeedbacks(
            rows.map((item) => ({
              ...item,
              employee:
                employees.find((employee) => employee.staffId === item.staffId)
                  ?.name ?? item.employee ?? item.staffId,
            })),
          ),
        );
      })
      .catch((error) => console.error("Lỗi lấy phản hồi chấm công:", error));
    return () => {
      active = false;
    };
  }, [dispatch, employees]);

  useEffect(() => {
    let active = true;
    getAttendanceLogsDetails(1, 100)
      .then((result) => {
        if (!active) return;
        const rawLogs = Array.isArray(result?.data) ? result.data : [];
        dispatch(
          mergeHrAdminData({
            rawLogs,
            attendanceEntries: attendanceEntriesFromRaw(rawLogs, employees),
          }),
        );
      })
      .catch((error) =>
        console.error("Không thể tải dữ liệu máy chấm công:", error),
      );
    return () => {
      active = false;
    };
  }, [dispatch, employees]);

  const currentUser = {
    name: account?.name ?? "Nhân viên NBC",
    staffId: currentStaffId,
    email: account?.email ?? `${currentStaffId.toLowerCase()}@nbc.com.vn`,
    department: account?.department ?? "Nhabe Corporation",
    position: account?.position ?? account?.access ?? "Nhân viên",
    workplace: account?.workplace ?? "Nhabe Corporation",
  };

  const roleNotices = import.meta.env.VITE_ENABLE_API === "true"
    ? notices
    : notices.filter(
        (notice) =>
          notice.audience === role &&
          (!notice.staffId || notice.staffId === currentUser.staffId),
      );
  const unreadCount = roleNotices.filter((notice) => !notice.read).length;

  const replyFeedback = async (id, adjustment) => {
    const feedback = feedbacks.find((item) => item.id === id);
    if (typeof adjustment !== "string") {
      const [day, month, year] = String(feedback?.date || "").split("/");
      const attendanceDate = year ? `${year}-${month}-${day}` : feedback?.date;
      if (apiEnabled) {
        await resolveAttendanceFeedback(id, {
          ...adjustment,
          staffId: feedback?.staffId,
          date: attendanceDate,
        });
      }
      return;
    }
    const replyText = adjustment;
    let persistedFeedback;
    if (apiEnabled) {
      try {
        const response = await resolveAttendanceFeedback(id, {
          status:
            feedback?.status === "pending"
              ? "reviewing"
              : feedback?.status || "reviewing",
          reply: replyText,
        });
        persistedFeedback = response?.data;
      } catch (error) {
        console.error("Không thể lưu tin nhắn HR:", error);
        alert(error.message || "Không thể gửi phản hồi đến nhân viên.");
        return;
      }
    }
    const legacyMessages = feedback?.messages?.length
      ? feedback.messages
      : [
          {
            id: `${id}-employee`,
            sender: "employee",
            text: feedback?.message || "",
            createdAt: feedback?.createdAt || "",
          },
          ...(feedback?.reply
            ? [
                {
                  id: `${id}-hr`,
                  sender: "hr",
                  text: feedback.reply,
                  createdAt: feedback.processedAt || "Đã trả lời",
                },
              ]
            : []),
        ];
    const nextFeedbacks = feedbacks.map((item) =>
      item.id === id
        ? {
            ...item,
            ...persistedFeedback,
            status: item.status === "pending" ? "reviewing" : item.status,
            reply: replyText,
            messages: persistedFeedback?.messages ?? [
              ...legacyMessages,
              {
                id: Date.now(),
                sender: "hr",
                text: replyText,
                createdAt: new Date().toLocaleString("vi-VN"),
              },
            ],
          }
        : item,
    );
    dispatch(setFeedbacks(nextFeedbacks));

    const nextNotices = [
      {
        id: Date.now(),
        title: "HR đã trả lời phản hồi chấm công",
        description: `${feedback?.date ?? "Ngày chấm công"}: ${replyText}`,
        time: "Vừa xong",
        read: false,
        target: "attendance",
        tone: "green",
        icon: Reply,
        audience: "employee",
        year: 2026,
        attendanceDate: feedback?.date,
        staffId: feedback?.staffId,
      },
      ...notices,
    ];
    dispatch(setNotices(nextNotices));
  };

  const startAttendanceConversation = async ({ employee, date, message }) => {
    let conversation;
    if (apiEnabled) {
      try {
        conversation = await createAttendanceFeedback({
          staffId: employee.staffId,
          date,
          message,
          requestType: "conversation",
        });
      } catch (error) {
        console.error("Không thể lưu cuộc trò chuyện:", error);
        alert(error.message || "Không thể gửi tin nhắn đến nhân viên.");
        return;
      }
    } else {
      const id = Date.now();
      const createdAt = new Date().toLocaleString("vi-VN");
      conversation = {
        id,
        date,
        message,
        createdAt,
        status: "reviewing",
        requestType: "conversation",
        initiatedBy: "hr",
        messages: [{ id: `${id}-hr`, sender: "hr", text: message, createdAt }],
      };
    }
    conversation = {
      ...conversation,
      employee: employee.name,
      staffId: employee.staffId,
    };
    dispatch(setFeedbacks([conversation, ...feedbacks]));
    dispatch(
      setNotices([
        {
          id: Date.now(),
          title: "Nhân sự trao đổi về chấm công",
          description: `${date}: ${message}`,
          time: "Vừa xong",
          read: false,
          target: "attendance",
          tone: "blue",
          icon: Reply,
          audience: "employee",
          year: 2026,
          attendanceDate: date,
          staffId: employee.staffId,
        },
        ...notices,
      ]),
    );
  };

  const reviewFeedback = async (id, changes) => {
    const feedback = feedbacks.find((item) => item.id === id);
    if (!feedback) return;
    const calculation =
      changes.status === "approved"
        ? calculateAdjustedAttendance(
            changes.adjustedCheckIn,
            changes.adjustedCheckOut,
          )
        : undefined;
    if (calculation && !calculation.valid) return;

    let persistedChanges = changes;
    if (apiEnabled) {
      try {
        const response = await resolveAttendanceFeedback(id, changes);
        persistedChanges = { ...changes, ...(response?.data ?? {}) };
      } catch (error) {
        console.error("Không thể lưu xử lý phản hồi:", error);
        alert(error.message || "Không thể lưu xử lý phản hồi.");
        return;
      }
    }

    const processedAt = new Date().toLocaleString("vi-VN");
    const nextFeedbacks = feedbacks.map((item) =>
      item.id === id
        ? {
            ...item,
            ...persistedChanges,
            processedAt: persistedChanges.processedAt || processedAt,
          }
        : item,
    );
    dispatch(setFeedbacks(nextFeedbacks));

    if (changes.status === "approved") {
      let matchedEntry = false;
      const attendanceEntries = (hrAdminData.attendanceEntries || []).map(
        (entry) => {
          if (
            entry.staffId !== feedback.staffId ||
            entry.date !== feedback.date
          )
            return entry;
          matchedEntry = true;
          const checkIn = changes.adjustedCheckIn || entry.checkIn;
          const checkOut = changes.adjustedCheckOut || entry.checkOut;
          return {
            ...entry,
            checkIn,
            checkOut,
            hours: calculation.hours,
            status: calculation.status,
            note: calculation.note,
            lateMinutes: calculation.lateMinutes,
            earlyLeaveMinutes: calculation.earlyLeaveMinutes,
            adjustmentReason: changes.reply,
            originalCheckIn: entry.originalCheckIn || entry.checkIn,
            originalCheckOut: entry.originalCheckOut || entry.checkOut,
            adjustedByHr: true,
          };
        },
      );
      if (!matchedEntry) {
        const [, month, year] = feedback.date.split("/");
        attendanceEntries.push({
          id: Date.now(),
          date: feedback.date,
          month: `${year}-${month}`,
          staffId: feedback.staffId,
          name: feedback.employee,
          checkIn: changes.adjustedCheckIn,
          checkOut: changes.adjustedCheckOut,
          hours: calculation.hours,
          status: calculation.status,
          note: calculation.note,
          lateMinutes: calculation.lateMinutes,
          earlyLeaveMinutes: calculation.earlyLeaveMinutes,
          adjustmentReason: changes.reply,
          originalCheckIn: "—",
          originalCheckOut: "—",
          adjustedByHr: true,
        });
      }
      dispatch(setHrAdminData({ ...hrAdminData, attendanceEntries }));
    }

    if (changes.status !== "reviewing") {
      const approved = changes.status === "approved";
      dispatch(
        setNotices([
          {
            id: Date.now(),
            title: approved
              ? "Điều chỉnh chấm công đã được xác nhận"
              : "Phản hồi chấm công đã bị từ chối",
            description: `${feedback.date}: ${changes.reply}`,
            time: "Vừa xong",
            read: false,
            target: "attendance",
            tone: approved ? "green" : "orange",
            icon: Reply,
            audience: "employee",
            year: 2026,
            attendanceDate: feedback.date,
            staffId: feedback.staffId,
          },
          ...notices,
        ]),
      );
    }
  };

  const resetPasswordRequest = (request) => {
    const nextNotices = [
      {
        id: Date.now(),
        title: "Mật khẩu đã được cấp lại",
        description: `Tài khoản ${request.staffId} đã được reset. Mật khẩu tạm thời: ${systemConfig.defaultPassword || "123456"}.`,
        time: "Vừa xong",
        read: false,
        target: "profile",
        tone: "green",
        icon: KeyRound,
        audience: "employee",
        year: 2026,
        staffId: request.staffId,
      },
      ...notices,
    ];
    dispatch(setNotices(nextNotices));
  };

  const reviewDocument = async (id, approved) => {
    try {
      // Tìm đơn đang xử lý
      const documentVal = documents.find((item) => item.id === id);

      if (!documentVal) return;

      // Duyệt / Từ chối
      let reviewResult;

      if (approved) {
        reviewResult = await approveDocument(id);
      } else {
        reviewResult = await rejectDocument(id);
      }

      alert(
        reviewResult.message ||
          (approved ? "Duyệt đơn thành công!" : "Từ chối đơn thành công!"),
      );

      // Lấy lại danh sách đơn mới nhất từ BE
      const result = await getDocuments();

      dispatch(setDocuments(result.data));

      // Tạo thông báo cho nhân viên
      const nextNotices = [
        {
          id: Date.now() + 11,
          title: `Văn bản ${approved ? "đã được duyệt" : "bị từ chối"}`,
          description: `${documentVal.type}: ${documentVal.start_date ?? ""}.`,
          time: "Vừa xong",
          read: false,
          target: "requests",
          tone: approved ? "green" : "orange",
          icon: FileCheck2,
          audience: "employee",
          year: 2026,
          staffId: documentVal.staff_id,
        },
        ...notices,
      ];

      dispatch(setNotices(nextNotices));
    } catch (error) {
      console.error("Lỗi xử lý đơn:", error);

      alert(error.message || "Không thể xử lý đơn");
    }
  };

  return (
    <AdminHRPage
      embedded={embedded}
      initialTab={initialTab}
      feedbacks={feedbacks}
      attendanceEntries={hrAdminData.attendanceEntries || []}
      resetRequests={resetRequests}
      documents={documents}
      employees={employees}
      onReply={replyFeedback}
      onStartConversation={startAttendanceConversation}
      onReviewFeedback={reviewFeedback}
      onResetRequest={resetPasswordRequest}
      onReviewDocument={reviewDocument}
      reviewingDocumentId={reviewingDocumentId}
      documentSuccess={documentSuccess}
      onDismissDocumentSuccess={() => setDocumentSuccess("")}
      onNotifications={() => dispatch(setNotificationsOpen(true))}
      unreadCount={unreadCount}
    />
  );
}
