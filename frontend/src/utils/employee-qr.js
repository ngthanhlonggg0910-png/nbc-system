export function parseEmployeeQrValue(rawValue) {
    const raw = rawValue.trim();
    try {
        const parsed = JSON.parse(raw);
        const value = parsed.staffId || parsed.employeeCode;
        if (value)
            return value.trim().toUpperCase();
    }
    catch {
        // QR có thể chỉ chứa mã nhân viên hoặc đường dẫn.
    }
    try {
        const url = new URL(raw);
        const value = url.searchParams.get("staffId") || url.searchParams.get("employeeCode");
        if (value)
            return value.trim().toUpperCase();
    }
    catch {
        // Không phải URL.
    }
    const match = raw.toUpperCase().match(/\b(?:NBC|HR|ADMIN)[A-Z0-9-]*\d+\b/);
    return match?.[0] ?? (raw.length <= 30 ? raw.toUpperCase() : "");
}
