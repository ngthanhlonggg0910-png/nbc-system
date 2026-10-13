import { catchAsyncError } from "../../middleware/catchAsyncError.js";
import { getDashboardSummary } from "../../services/dashboard/dashboard.service.js";

export const getSummary = catchAsyncError(async (req, res, next) => {
    const staffId = req.user.staff_id;
    const summary = await getDashboardSummary(staffId);

    res.status(200).json({
        success: true,
        data: summary,
    });
});
