import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FileCheck2 } from "lucide-react";

import { RequestsPage } from "./DocumentView";

import {
  setDocuments,
  setNotices,
  setNotificationsOpen,
} from "../../redux/userSlice";

import {
  createDocumentRequest,
  approveDocument,
  getDocuments,
  rejectDocument,
  getManagerPendingDocuments,
} from "@/api/attendance.api";

export default function Requests() {
  const dispatch = useDispatch();

  const session = useSelector((state) => state.user.session);
  const profileUser = useSelector((state) => state.user.currentUser);
  const employees = useSelector((state) => state.user.employees);
  const documents = useSelector((state) => state.user.documents);
  const notices = useSelector((state) => state.user.notices);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reviewingId, setReviewingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [managerDocuments, setManagerDocuments] = useState([]);

  const role = String(profileUser?.role?.code ?? "employee")
    .trim()
    .toLowerCase();

  const currentStaffId = profileUser?.staff_id || session?.staffId || "";

  const account = useMemo(
    () =>
      employees.find((item) => String(item.staffId) === String(currentStaffId)),
    [employees, currentStaffId],
  );

  const directManager = useMemo(
    () =>
      employees.find(
        (item) => String(item.staffId) === String(account?.managerId),
      ),
    [employees, account?.managerId],
  );

  const managedEmployees = useMemo(
    () =>
      employees.filter(
        (item) => String(item.managerId) === String(currentStaffId),
      ),
    [employees, currentStaffId],
  );

  const currentUser = useMemo(
    () => ({
      name: account?.name ?? "Nhân viên NBC",
      staffId: currentStaffId,
      email: account?.email ?? `${currentStaffId.toLowerCase()}@nbc.com.vn`,
      department: account?.department ?? "Nhabe Corporation",
      position: account?.position ?? account?.access ?? "Nhân viên",
      workplace: account?.workplace ?? "Nhabe Corporation",
      role,
    }),
    [account, currentStaffId, role],
  );

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setLoadError("");

      const result = await getDocuments();

      dispatch(
        setDocuments(
          Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result)
              ? result
              : [],
        ),
      );
    } catch (error) {
      console.error("Lỗi lấy documents:", error);
      setLoadError(error.message || "Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const loadManagerDocuments = async () => {
    if (role !== "manager") {
      setManagerDocuments([]);
      return;
    }

    try {
      const result = await getManagerPendingDocuments();

      console.log("MANAGER API RESULT:", result);

      const data = Array.isArray(result?.data?.data) ? result.data.data : [];

      console.log("MANAGER DOC DATA:", data);

      setManagerDocuments(data);
    } catch (error) {
      console.error("Lỗi lấy đơn chờ quản lý duyệt:", error);
      console.error("ERROR RESPONSE:", error?.response?.data);

      setManagerDocuments([]);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    loadManagerDocuments();
  }, [role]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const roleNotices =
    import.meta.env.VITE_ENABLE_API === "true"
      ? notices
      : notices.filter(
          (notice) =>
            notice.audience === role &&
            (!notice.staffId || notice.staffId === currentStaffId),
        );

  const unreadCount = roleNotices.filter((notice) => !notice.read).length;

  const createDocument = async (formData) => {
    try {
      const result = await createDocumentRequest(formData);

      setSuccessMessage({
        type: "success",
        title: "Tạo đơn thành công!",
        message: result.message || "Đơn đã được tạo thành công.",
        description: "Đơn đã được chuyển đến cấp phê duyệt tiếp theo.",
      });

      await loadDocuments();
    } catch (error) {
      console.error("Lỗi tạo đơn:", error);

      setSuccessMessage({
        type: "error",
        title: "Tạo đơn thất bại!",
        message: error.message || "Không thể tạo đơn.",
        description: "Vui lòng kiểm tra lại và thử lại.",
      });
    }
  };

  const reviewManagerDocument = async (id, approved) => {
    const documentVal =
      managerDocuments.find((item) => item.id === id) ??
      documents.find((item) => item.id === id);

    if (!documentVal) return;

    try {
      setReviewingId(id);

      const reviewResult = approved
        ? await approveDocument(id)
        : await rejectDocument(id);

      setSuccessMessage({
        type: "success",
        title: approved ? "Phê duyệt thành công!" : "Từ chối đơn thành công!",
        message:
          reviewResult.message ||
          (approved ? "Quản lý đã phê duyệt đơn." : "Quản lý đã từ chối đơn."),
        description: approved
          ? "Đơn đã được chuyển đến HR để phê duyệt cuối cùng."
          : "Nhân viên sẽ được thông báo về kết quả xử lý.",
      });

      await Promise.all([loadDocuments(), loadManagerDocuments()]);

      const employeeNotice = {
        id: Date.now() + 12,
        title: approved
          ? "Quản lý đã phê duyệt văn bản"
          : "Quản lý đã từ chối văn bản",
        description: `${documentVal.type}: ${documentVal.start_date ?? ""}.`,
        time: "Vừa xong",
        read: false,
        target: "requests",
        tone: approved ? "green" : "orange",
        icon: FileCheck2,
        audience: "employee",
        year: 2026,
        staffId: documentVal.staff_id,
      };

      if (approved) {
        const hrNotice = {
          id: Date.now() + 13,
          title: "Văn bản đã được quản lý phê duyệt",
          description: `${documentVal.staff_id} · ${documentVal.type} đang chờ HR phê duyệt cuối cùng.`,
          time: "Vừa xong",
          read: false,
          target: "adminhr",
          tone: "blue",
          icon: FileCheck2,
          audience: "admin",
          year: 2026,
        };

        dispatch(setNotices([hrNotice, employeeNotice, ...notices]));
      } else {
        dispatch(setNotices([employeeNotice, ...notices]));
      }
    } catch (error) {
      console.error("Lỗi quản lý xử lý đơn:", error);

      setSuccessMessage({
        type: "error",
        title: "Không thể xử lý đơn!",
        message: error.message || "Đã xảy ra lỗi.",
        description: "Vui lòng thử lại.",
      });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <RequestsPage
      documents={documents}
      managerDocuments={managerDocuments}
      user={currentUser}
      managerName={
        directManager ? `${directManager.name} · ${directManager.staffId}` : ""
      }
      managedEmployees={managedEmployees}
      onCreate={createDocument}
      onManagerReview={reviewManagerDocument}
      loading={loading}
      loadError={loadError}
      reviewingId={reviewingId}
      successMessage={successMessage}
      onDismissSuccess={() => setSuccessMessage(null)}
      onNotifications={() => dispatch(setNotificationsOpen(true))}
      unreadCount={unreadCount}
    />
  );
}
