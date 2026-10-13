import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HrDataPage } from "./EmployeeView";
import {
  mergeHrAdminData,
  setHrAdminData,
  setEmployees,
  setNotificationsOpen,
} from "../../redux/userSlice";

import {
  getSchedules,
  getAttendanceDevices,
  getAttendanceLogsDetails,
  getAttendanceSyncSchedules,
} from "@/api/attendance.api";

export default function HrData() {
  const dispatch = useDispatch();

  // Redux Selectors
  const session = useSelector((state) => state.user.session);
  const hrAdminData = useSelector((state) => state.user.hrAdminData);
  const employees = useSelector((state) => state.user.employees);
  const salaryItems = useSelector((state) => state.user.salaryItems);
  const notices = useSelector((state) => state.user.notices);

  const [page, setPage] = useState(1);
  const [attendanceLoadState, setAttendanceLoadState] = useState({
    status: "loading",
    error: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const limit = 10;

  // Lấy dl
  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setAttendanceLoadState({ status: "loading", error: "" });
      try {
        const [deviceResult, logResult, logSchedules] = await Promise.all([
          getAttendanceDevices(controller.signal),
          getAttendanceLogsDetails(page, limit, controller.signal),
          getSchedules(controller.signal),
        ]);

        dispatch(
          mergeHrAdminData({
            devices: Array.isArray(deviceResult.data) ? deviceResult.data : [],
            rawLogs: Array.isArray(logResult.data) ? logResult.data : [],
            schedules: Array.isArray(logSchedules.data)
              ? logSchedules.data
              : [],
          }),
        );

        setPagination(
          logResult.pagination ?? {
            page,
            limit,
            total: 0,
            totalPages: 1,
          },
        );
        setAttendanceLoadState({ status: "success", error: "" });
      } catch (error) {
        if (error?.code === "ERR_CANCELED" || error?.name === "AbortError")
          return;
        setAttendanceLoadState({
          status: "error",
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Không thể tải dữ liệu chấm công.",
        });
      }
    }

    loadData();
    return () => controller.abort();
  }, [page, dispatch]);

  const role = session?.role ?? "employee";
  const currentStaffId = session?.staffId || "";
  const account = employees.find((item) => item.staffId === currentStaffId);

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

  const handleDataChange = useCallback(
    (next) => {
      dispatch(setHrAdminData(next));
    },
    [dispatch],
  );

  const handleEmployeesChange = useCallback(
    (next) => {
      dispatch(setEmployees(next));
    },
    [dispatch],
  );

  return (
    <HrDataPage
      data={hrAdminData}
      employees={employees}
      salaryItems={salaryItems}
      onDataChange={handleDataChange}
      onEmployeesChange={handleEmployeesChange}
      onNotifications={() => dispatch(setNotificationsOpen(true))}
      unreadCount={unreadCount}
      logPage={page}
      logPagination={pagination}
      onLogPageChange={setPage}
      attendanceLoadState={attendanceLoadState}
    />
  );
}
