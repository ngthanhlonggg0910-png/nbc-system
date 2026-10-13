import { Router } from "express";
import {
  exportAnnualReport, exportPeriodEmployees, getDashboard, getMonthDetail, getPayslipDetail,
  getPeriodAnalytics, getPeriodEmployees, getPeriodHistory, getYearCalendar,
} from "../../controllers/payroll/payrollDashboard.controller.js";
import { authorizeRoles, isAuthenticated } from "../../middleware/authMiddleware.js";

const router = Router();
router.use(isAuthenticated);
router.use(authorizeRoles("admin", "hr"));
router.get("/", getDashboard);
router.get("/year", getYearCalendar);
router.get("/reports/annual", exportAnnualReport);
router.get("/periods/:periodId", getMonthDetail);
router.get("/periods/:periodId/employees", getPeriodEmployees);
router.get("/periods/:periodId/analytics", getPeriodAnalytics);
router.get("/periods/:periodId/history", getPeriodHistory);
router.get("/periods/:periodId/export", exportPeriodEmployees);
router.get("/payslips/:payslipId", getPayslipDetail);

export default router;
