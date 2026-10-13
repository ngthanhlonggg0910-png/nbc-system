import { Router } from "express";

import userRouter from "./user/user.router.js";
import roleRouter from "./user/role.router.js";
import employeesRouter from "./employees/employees.router.js";
import * as middleware from "../middleware/authMiddleware.js";

import attendanceDeviceRoutes from "./attendance/device.routes.js";
import attendanceSyncSchedules from "./attendance/sync-schedule.routes.js";
import attendanceLog from "./attendance/log.routes.js";
import attendanceDeviceSyncRoutes from "./attendance/device-sync.routes.js";
import attendanceEntryRoutes from "./attendance/entry.routes.js";
import attendanceFeedbackRoutes from "./attendance/feedback.routes.js";
import documentRoutes from "./document/document.routes.js";
import companySettingsRoutes from "./company-settings.routes.js";

import payrollDashboardRoutes from "./payroll/payrollDashboard.routes.js";
import payrollPeriodRoutes from "./payroll/payrollPeriod.routes.js";
import payrollAdminRoutes from "./payroll/payrollAdmin.routes.js";
import payrollImportRoutes from "./payroll/payrollImport.routes.js";
import payrollFeedbackRoutes from "./payroll/payrollFeedback.routes.js";
import payrollAdjustmentRoutes from "./payroll/payrollAdjustment.routes.js";
import payrollEmployeeRoutes from "./payroll/payrollEmployee.routes.js";

import notificationRoutes from "./notification/notification.routes.js";
import dashboardRoutes from "./dashboard/dashboard.routes.js";

const router = Router();
//user
router.use("/user", userRouter);
router.use("/role", middleware.isAuthenticated, roleRouter);

//employees
router.use("/employees", employeesRouter);

router.use(
  "/attendance-devices",
  middleware.isAuthenticated,
  attendanceDeviceRoutes,
);
router.use(
  "/attendance-devices",
  middleware.isAuthenticated,
  attendanceDeviceSyncRoutes,
);
router.use(
  "/attendance-entry",
  middleware.isAuthenticated,
  attendanceEntryRoutes,
);
router.use(
  "/attendance-feedbacks",
  middleware.isAuthenticated,
  attendanceFeedbackRoutes,
);
router.use(
  "/attendance-sync-schedules",
  middleware.isAuthenticated,
  attendanceSyncSchedules,
);
router.use("/attendance-log", middleware.isAuthenticated, attendanceLog);
router.use("/document-requests", middleware.isAuthenticated, documentRoutes);
router.use("/company-settings", companySettingsRoutes);

// Register specific payroll routes before the general employee routes.
router.use(
  "/payroll/admin/dashboard",
  middleware.isAuthenticated,
  payrollDashboardRoutes,
);
router.use(
  "/payroll/admin/periods",
  middleware.isAuthenticated,
  payrollPeriodRoutes,
);
router.use("/payroll/admin", middleware.isAuthenticated, payrollAdminRoutes);
router.use("/payroll/imports", middleware.isAuthenticated, payrollImportRoutes);
router.use("/payroll", middleware.isAuthenticated, payrollFeedbackRoutes);
router.use("/payroll", middleware.isAuthenticated, payrollAdjustmentRoutes);
router.use("/payroll", middleware.isAuthenticated, payrollEmployeeRoutes);

router.use("/notifications", middleware.isAuthenticated, notificationRoutes);
router.use("/dashboard", middleware.isAuthenticated, dashboardRoutes);

export default router;
