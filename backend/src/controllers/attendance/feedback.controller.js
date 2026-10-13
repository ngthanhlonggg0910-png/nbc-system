import * as service from "../../services/attendance/feedback.service.js";

function sendError(res, error) {
  return res.status(error.statusCode || 400).json({ success: false, message: error.message });
}

export async function list(req, res) {
  try { return res.json({ success: true, data: await service.listFeedbacks(req.user) }); }
  catch (error) { return sendError(res, error); }
}
export async function detail(req, res) {
  try { return res.json({ success: true, data: await service.getFeedback(req.params.id, req.user) }); }
  catch (error) { return sendError(res, error); }
}
export async function create(req, res) {
  try { return res.status(201).json({ success: true, message: "Gửi phản hồi thành công", data: await service.createFeedback(req.body, req.user) }); }
  catch (error) { return sendError(res, error); }
}
export async function resolve(req, res) {
  try { return res.json({ success: true, message: "Xử lý phản hồi thành công", data: await service.resolveFeedback(req.params.id, req.body, req.user) }); }
  catch (error) { return sendError(res, error); }
}
