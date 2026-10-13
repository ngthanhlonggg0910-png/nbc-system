import { buildPayrollIncomeBreakdown } from "./payroll";
const payrollMonthSeeds = [
    { month: "2026-01", factor: .96 },
    { month: "2026-02", factor: .98 },
    { month: "2026-03", factor: .97 },
    { month: "2026-04", factor: .99 },
    { month: "2026-05", factor: 1.01 },
    { month: "2026-06", factor: 1 },
];
const baseGrossByEmployee = [15200000, 16800000, 17400000, 18600000, 23500000, 14800000];
const baseDeductionsByEmployee = [2350000, 2710000, 2860000, 3050000, 4100000, 2210000];
export function createInitialAdminPayrollRows(employees) {
    return employees.flatMap((employee, employeeIndex) => {
        const baseGross = baseGrossByEmployee[employeeIndex];
        const baseDeductions = baseDeductionsByEmployee[employeeIndex];
        return payrollMonthSeeds.map((period) => {
            const gross = Math.round(baseGross * period.factor / 1000) * 1000;
            const deductions = Math.round(baseDeductions * period.factor / 1000) * 1000;
            const id = Number(`${period.month.replace("-", "")}${String(employeeIndex + 1).padStart(2, "0")}`);
            return {
                id,
                month: period.month,
                staffId: employee.staffId,
                name: employee.name,
                department: employee.department,
                gross,
                taxable: Math.round(gross * .91 / 1000) * 1000,
                deductions,
                net: gross - deductions,
                income: buildPayrollIncomeBreakdown(gross),
                status: "Đã phát hành",
            };
        });
    });
}
