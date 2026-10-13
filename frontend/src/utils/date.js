export function getTimeGreeting(hour) {
    if (hour >= 5 && hour < 11)
        return "buổi sáng";
    if (hour >= 11 && hour < 14)
        return "buổi trưa";
    if (hour >= 14 && hour < 18)
        return "buổi chiều";
    return "buổi tối";
}
export function formatDashboardDate(date) {
    const formatted = new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
