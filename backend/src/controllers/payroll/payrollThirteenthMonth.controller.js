import * as service from "../../services/payroll/payrollThirteenthMonth.service.js";

export async function getThirteenthMonthPolicy(req, res, next) {
  try {
    const data = await service.getPolicyWorkspace(req.query.year ?? new Date().getFullYear());
    return res.status(200).json({ success: true, message: "Lấy chính sách lương tháng 13 thành công", data });
  } catch (error) { return next(error); }
}

export async function putThirteenthMonthPolicy(req, res, next) {
  try {
    const data = await service.savePolicy({
      year: req.params.year,
      payload: req.body,
      actorStaffId: req.user.staff_id,
    });
    return res.status(200).json({ success: true, message: data.status === "published" ? "Đã ban hành chính sách lương tháng 13" : "Đã lưu bản nháp chính sách", data });
  } catch (error) { return next(error); }
}

export async function putThirteenthMonthOverride(req, res, next) {
  try {
    const data = await service.saveEmployeeOverride({
      year: req.params.year,
      staffId: req.params.staffId,
      payload: req.body,
      actorStaffId: req.user.staff_id,
    });
    return res.status(200).json({ success: true, message: "Đã lưu hệ số ngoại lệ cho nhân viên", data });
  } catch (error) { return next(error); }
}

export async function deleteThirteenthMonthOverride(req, res, next) {
  try {
    const data = await service.removeEmployeeOverride({ year: req.params.year, staffId: req.params.staffId });
    return res.status(200).json({ success: true, message: "Đã chuyển nhân viên về hệ số mặc định", data });
  } catch (error) { return next(error); }
}
