export function buildPayrollIncomeBreakdown(gross) {
    const rounded = (rate) => Math.round(gross * rate / 1000) * 1000;
    const income = {
        base_salary: rounded(.58),
        responsibility_allowance: rounded(.1),
        attendance_allowance: rounded(.06),
        housing_allowance: rounded(.04),
        fuel_allowance: rounded(.03),
        phone_allowance: rounded(.02),
        overtime: rounded(.08),
        performance_bonus: rounded(.07),
        other_income: 0,
    };
    income.other_income = gross - Object.values(income).reduce((sum, value) => sum + value, 0);
    return income;
}
export function buildPayrollHistory(year, monthlyNetAmounts) {
    const pad = (value) => String(value).padStart(2, "0");
    return monthlyNetAmounts.map((amount, monthIndex) => {
        const month = monthIndex + 1;
        const days = new Date(year, month, 0).getDate();
        const paidMonth = month === 12 ? 1 : month + 1;
        const paidYear = month === 12 ? year + 1 : year;
        return {
            month: `${pad(month)}/${year}`,
            period: `01/${pad(month)} - ${pad(days)}/${pad(month)}/${year}`,
            paid: `05/${pad(paidMonth)}/${paidYear}`,
            amount: new Intl.NumberFormat("vi-VN").format(amount),
        };
    }).reverse();
}
export function normalizeSalaryItems(items, salaryMaster) {
    const defaults = new Map(salaryMaster.map((item) => [item.code, item.includeIn12MonthAverage]));
    return items.map((item) => ({ ...item, includeIn12MonthAverage: item.category === "income" ? item.includeIn12MonthAverage ?? defaults.get(item.code) ?? false : false }));
}
export function payrollEligibleIncome(row, salaryItems) {
    const codes = salaryItems.filter((item) => item.category === "income" && item.includeIn12MonthAverage).map((item) => item.code);
    if (!row.income || !Object.keys(row.income).length)
        return row.gross;
    return codes.reduce((sum, code) => sum + Number(row.income[code] || 0), 0);
}
export function payrollYearMonths(selectedMonth) {
    const year = Number(selectedMonth.slice(0, 4));
    if (!year)
        return [];
    return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
}
export function formatPayrollMonth(month) {
    const [year, number] = month.split("-");
    return `${number}/${year}`;
}
export function createPayroll12MonthReport(payrollRows, employees, salaryItems, endMonth, keyword = "") {
    const months = payrollYearMonths(endMonth);
    const elapsedMonths = new Set(months.filter((month) => month <= endMonth));
    const rows = payrollRows.filter((row) => elapsedMonths.has(row.month));
    let cumulativeIncome = 0;
    let cumulativeRecords = 0;
    const monthlyProgress = months.map((month) => {
        const monthRows = rows.filter((row) => row.month === month);
        const eligibleIncome = monthRows.reduce((sum, row) => sum + payrollEligibleIncome(row, salaryItems), 0);
        cumulativeIncome += eligibleIncome;
        cumulativeRecords += monthRows.length;
        return { month, recordCount: monthRows.length, eligibleIncome, cumulativeIncome, cumulativeAverage: cumulativeRecords ? Math.round(cumulativeIncome / cumulativeRecords) : 0 };
    });
    const needle = keyword.trim().toLocaleLowerCase("vi");
    const reportEmployees = employees.filter((employee) => !needle || `${employee.staffId} ${employee.name} ${employee.department}`.toLocaleLowerCase("vi").includes(needle)).map((employee) => {
        const employeeRows = rows.filter((row) => row.staffId === employee.staffId);
        const employeeCumulativeIncome = employeeRows.reduce((sum, row) => sum + payrollEligibleIncome(row, salaryItems), 0);
        const average12Months = employeeRows.length ? Math.round(employeeCumulativeIncome / employeeRows.length) : 0;
        return { ...employee, monthsWithData: employeeRows.length, cumulativeIncome: employeeCumulativeIncome, average12Months };
    });
    return {
        months,
        eligibleCriteria: salaryItems.filter((item) => item.category === "income" && item.includeIn12MonthAverage).length,
        monthlyProgress,
        employees: reportEmployees,
        totalEligibleIncome: rows.reduce((sum, row) => sum + payrollEligibleIncome(row, salaryItems), 0),
    };
}
export function formatVnd(value) {
    return new Intl.NumberFormat("vi-VN").format(value);
}
