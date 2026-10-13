import { KeyRound, Newspaper, Reply } from "lucide-react";
import { normalizeSalaryItems, salaryMaster, withPayrollDemoRows } from "@/utils/payroll";
import { initialAdminPayrollRows, initialArticles, initialDocuments, initialEmployees, initialFeedbacks, initialHrAdminState, initialResetRequests, } from "@/utils/data";
const apiEnabled = import.meta.env.VITE_ENABLE_API === "true";
function loadResetRequests(savedResetRequests) {
    return savedResetRequests ? JSON.parse(savedResetRequests) : initialResetRequests;
}
export function readPersistedPortalState() {
    const savedSession = localStorage.getItem("nbc-portal-session") ?? sessionStorage.getItem("nbc-portal-session");
    const savedFeedbacks = localStorage.getItem("nbc-attendance-feedbacks");
    const savedResetRequests = localStorage.getItem("nbc-reset-requests");
    const savedEmployees = localStorage.getItem("nbc-employees");
    const savedArticles = localStorage.getItem("nbc-news-articles");
    const savedAvatars = localStorage.getItem("nbc-user-avatars");
    const savedDocuments = localStorage.getItem("nbc-documents");
    const savedSystemConfig = localStorage.getItem("nbc-system-config");
    const savedSalaryItems = localStorage.getItem("nbc-salary-master");
    const savedHrAdminData = localStorage.getItem("nbc-hr-admin-data");
    const savedSidebarHidden = localStorage.getItem("nbc-desktop-sidebar-hidden") === "true";
    const parsedFeedbacks = savedFeedbacks ? JSON.parse(savedFeedbacks) : initialFeedbacks;
    const loadedFeedbacks = Array.isArray(parsedFeedbacks) ? parsedFeedbacks : initialFeedbacks;
    const loadedResetRequests = loadResetRequests(savedResetRequests);
    const savedEmployeeRows = savedEmployees ? JSON.parse(savedEmployees) : initialEmployees;
    const parsedEmployees = Array.isArray(savedEmployeeRows) ? savedEmployeeRows : initialEmployees;
    const loadedEmployees = parsedEmployees.map(({ thirteenthMonthCoefficient: _removedDemoCoefficient, ...item }) => ({ ...initialEmployees.find((employee) => employee.staffId === item.staffId), ...item, managerId: item.managerId ?? initialEmployees.find((employee) => employee.staffId === item.staffId)?.managerId ?? "" }));
    const parsedArticles = savedArticles ? JSON.parse(savedArticles) : initialArticles;
    const loadedArticles = Array.isArray(parsedArticles) ? parsedArticles : initialArticles;
    const loadedSalaryItems = normalizeSalaryItems(savedSalaryItems ? JSON.parse(savedSalaryItems) : salaryMaster, salaryMaster);
    const parsedHrAdminData = savedHrAdminData ? { ...initialHrAdminState, ...JSON.parse(savedHrAdminData) } : initialHrAdminState;
    const loadedHrAdminData = { ...parsedHrAdminData, payrollRows: withPayrollDemoRows(parsedHrAdminData.payrollRows, initialEmployees, initialAdminPayrollRows), salaryItems: loadedSalaryItems };
    const savedDocumentRows = savedDocuments ? JSON.parse(savedDocuments) : initialDocuments;
    const parsedDocuments = Array.isArray(savedDocumentRows) ? savedDocumentRows : initialDocuments;
    const loadedDocuments = parsedDocuments.map((item) => {
        if (item.workflowVersion || item.status !== "Chờ duyệt")
            return item;
        return { ...item, workflowVersion: 2, approvalSteps: item.approvalSteps.map((step) => step.label === "Quản lý trực tiếp" ? { ...step, status: "pending", actedAt: undefined } : step.label === "Nhân sự phê duyệt" ? { ...step, status: "waiting", actedAt: undefined } : step) };
    });
    const restoredNotices = [
        ...loadedResetRequests.filter((item) => item.id !== 1 && item.status === "pending").map((item) => ({ id: item.id + 500000, title: "Yêu cầu cấp lại mật khẩu", description: `${item.employee} (${item.staffId}) đang chờ reset mật khẩu.`, time: item.requestedAt, read: false, target: "adminhr", tone: "orange", icon: KeyRound, audience: "admin", year: 2026 })),
        ...loadedFeedbacks.filter((item) => item.id > 3 && item.status === "pending").map((item) => ({ id: item.id + 600000, title: "Phản hồi chấm công mới", description: `${item.employee} gửi ý kiến về ngày ${item.date}.`, time: item.createdAt, read: false, target: "adminhr", tone: "blue", icon: Reply, audience: "admin", year: 2026, attendanceDate: item.date })),
        ...loadedFeedbacks.filter((item) => item.id > 3 && item.status === "answered").map((item) => ({ id: item.id + 700000, title: "HR đã trả lời phản hồi chấm công", description: `${item.date}: ${item.reply}`, time: "Đã xử lý", read: false, target: "attendance", tone: "green", icon: Reply, audience: "employee", year: 2026, attendanceDate: item.date, staffId: item.staffId })),
        ...loadedArticles.filter((item) => item.id > 103 && item.status === "published").map((item) => ({ id: item.id + 800000, title: item.title, description: item.summary, time: new Date(item.updatedAt).toLocaleDateString("vi-VN"), read: false, target: "news", tone: "blue", icon: Newspaper, audience: "employee", year: new Date(item.updatedAt).getFullYear(), articleId: item.id })),
    ];
    return {
        savedSession,
        savedAvatars,
        savedSystemConfig,
        loadedFeedbacks,
        loadedResetRequests,
        loadedEmployees,
        loadedArticles,
        loadedSalaryItems,
        loadedHrAdminData,
        loadedDocuments,
        restoredNotices,
        savedSidebarHidden,
    };
}
export function persistHrAdminState(data, employeeRows, salaryRows) {
    if (!apiEnabled)
        return;
    void fetch("/api/hr-admin-state", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, employees: employeeRows, salaryItems: salaryRows })
    }).catch(() => undefined);
}
export function persistPortalSnapshot({ feedbacks, resetRequests, employees, articles, avatarByUser, documents, systemConfig, salaryItems, hrAdminData, }) {
    localStorage.setItem("nbc-attendance-feedbacks", JSON.stringify(feedbacks));
    localStorage.setItem("nbc-reset-requests", JSON.stringify(resetRequests));
    localStorage.setItem("nbc-employees", JSON.stringify(employees));
    localStorage.setItem("nbc-news-articles", JSON.stringify(articles));
    localStorage.setItem("nbc-user-avatars", JSON.stringify(avatarByUser));
    localStorage.setItem("nbc-documents", JSON.stringify(documents));
    localStorage.setItem("nbc-system-config", JSON.stringify(systemConfig));
    localStorage.setItem("nbc-salary-master", JSON.stringify(salaryItems));
    localStorage.setItem("nbc-hr-admin-data", JSON.stringify(hrAdminData));
}
