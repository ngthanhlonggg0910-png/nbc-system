import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { PayrollPage } from "./SalaryView";
import {
  confirmPayslip,
  submitPayrollFeedback,
  fetchMyPayslipDetail,
  fetchMyPayslips,
  fetchPayroll12MonthReport,
  setSelectedPayslipId,
  setSelectedYear,
} from "@/redux/payrollSlice";
import { setNotificationsOpen } from "@/redux/userSlice";

export default function Payroll() {
  const dispatch = useDispatch();
  const userState = useSelector((state) => state.user);
  const payroll = useSelector((state) => state.payroll);

  const {
    session,
    avatarByUser = {},
    employees = [],
    systemConfig = {},
    notices = [],
  } = userState;

  const {
    payslips,
    selectedPayslip,
    selectedPayslipId,
    selectedYear,
    report12Month,
    listStatus,
    detailStatus,
    confirmStatus,
    reportStatus,
    listError,
    detailError,
    confirmError,
    reportError,
    confirmMessage,
    feedbackStatus,
    feedbackError,
    feedbackMessage,
  } = payroll;

  const currentStaffId = session?.staffId ?? "";
  const account = useMemo(
    () => employees.find((item) => item.staffId === currentStaffId),
    [employees, currentStaffId],
  );

  const currentUser = useMemo(() => ({
    name: account?.name ?? session?.name ?? "Nhân viên NBC",
    staffId: currentStaffId,
    email: account?.email ?? session?.email ?? "",
    department: account?.department ?? session?.department ?? "Nhabe Corporation",
    position: account?.position ?? account?.access ?? session?.position ?? "Nhân viên",
    workplace: account?.workplace ?? "Nhabe Corporation",
  }), [account, currentStaffId, session]);

  const unreadCount = useMemo(() => {
    if (import.meta.env.VITE_ENABLE_API === "true") {
      return notices.filter((notice) => !notice.read).length;
    }
    const role = session?.role ?? "employee";
    return notices.filter((notice) =>
      notice.audience === role &&
      (!notice.staffId || notice.staffId === currentStaffId) &&
      !notice.read
    ).length;
  }, [notices, session?.role, currentStaffId]);

  useEffect(() => {
    if (!currentStaffId) return;

    dispatch(fetchMyPayslips({ year: selectedYear, page: 1, limit: 20 }));
    dispatch(fetchPayroll12MonthReport({
      year: selectedYear,
    }));
  }, [dispatch, currentStaffId, selectedYear]);

  useEffect(() => {
    if (selectedPayslipId) {
      dispatch(fetchMyPayslipDetail(selectedPayslipId));
    }
  }, [dispatch, selectedPayslipId]);

  const handleSelectYear = (year) => {
    dispatch(setSelectedYear(Number(year)));
  };

  const handleSelectPayslip = (payslipId) => {
    dispatch(setSelectedPayslipId(payslipId));
  };

  const handleRefresh = () => {
    dispatch(fetchMyPayslips({ year: selectedYear, page: 1, limit: 20 }));
    dispatch(fetchPayroll12MonthReport({
      year: selectedYear,
    }));

    if (selectedPayslipId) {
      dispatch(fetchMyPayslipDetail(selectedPayslipId));
    }
  };

  const handleConfirmPayslip = async (payslipId) => {
    await dispatch(confirmPayslip(payslipId)).unwrap();
    await dispatch(fetchMyPayslipDetail(payslipId)).unwrap();
    dispatch(fetchMyPayslips({ year: selectedYear, page: 1, limit: 20 }));
  };

  const handleSubmitFeedback = async (payslipId, payload) => {
    await dispatch(submitPayrollFeedback({ payslipId, payload })).unwrap();
    await dispatch(fetchMyPayslipDetail(payslipId)).unwrap();
    dispatch(fetchMyPayslips({ year: selectedYear, page: 1, limit: 20 }));
  };

  return (
    <PayrollPage
      user={currentUser}
      avatarUrl={avatarByUser[currentStaffId]}
      systemConfig={systemConfig}
      payrollRows={payslips}
      selectedPayslip={selectedPayslip}
      selectedPayslipId={selectedPayslipId}
      selectedYear={selectedYear}
      report12Month={report12Month}
      listLoading={listStatus === "loading"}
      detailLoading={detailStatus === "loading"}
      reportLoading={reportStatus === "loading"}
      confirmLoading={confirmStatus === "loading"}
      listError={listError}
      detailError={detailError}
      reportError={reportError}
      confirmError={confirmError}
      confirmMessage={confirmMessage}
      feedbackLoading={feedbackStatus === "loading"}
      feedbackError={feedbackError}
      feedbackMessage={feedbackMessage}
      thirteenthMonthCoefficient={report12Month?.thirteenthMonth?.coefficient ?? null}
      onSelectYear={handleSelectYear}
      onSelectPayslip={handleSelectPayslip}
      onConfirmPayslip={handleConfirmPayslip}
      onSubmitFeedback={handleSubmitFeedback}
      onRefresh={handleRefresh}
      onNotifications={() => dispatch(setNotificationsOpen(true))}
      unreadCount={unreadCount}
    />
  );
}
