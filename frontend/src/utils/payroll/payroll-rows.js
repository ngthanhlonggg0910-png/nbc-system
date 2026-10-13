import { buildPayrollIncomeBreakdown } from "./payroll";
export function withPayrollDemoRows(rows, initialEmployees, initialAdminPayrollRows) {
    const normalizedRows = rows.map((row) => ({
        ...row,
        income: row.income ?? buildPayrollIncomeBreakdown(row.gross),
    }));
    const existingPeriods = new Set(normalizedRows.map((row) => `${row.staffId}:${row.month}`));
    return [
        ...normalizedRows,
        ...initialAdminPayrollRows.filter((row) => !existingPeriods.has(`${row.staffId}:${row.month}`)),
    ];
}
