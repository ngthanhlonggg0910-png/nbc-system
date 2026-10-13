import { createInitialAdminPayrollRows } from "@/utils/payroll";
import { initialEmployees } from "./employees";
export const initialAdminPayrollRows = createInitialAdminPayrollRows(initialEmployees);
