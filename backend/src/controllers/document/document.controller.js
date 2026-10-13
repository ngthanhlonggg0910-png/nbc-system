import * as documentService from "../../services/document/document.service.js";
import * as documentRepository from "../../repositories/document/document.repository.js";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "../../config/r2.js";

// =========================
// DUYỆT ĐƠN
// =========================
export async function approveDocumentRequest(req, res) {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    const approverStaffId = req.user?.staff_id;

    const result = await documentService.approveDocumentRequest(
      id,
      role,
      approverStaffId,
    );

    return res.status(200).json({
      success: true,
      message:
        Number(result.current_step) === 2
          ? "Quản lý đã duyệt đơn"
          : "HR đã duyệt đơn hoàn tất",
      data: result,
    });
  } catch (error) {
    console.error("[Document Controller] approve lỗi:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Không thể duyệt đơn",
    });
  }
}

// =========================
// LẤY DANH SÁCH ĐƠN
// =========================
export const getDocuments = async (req, res) => {
  try {
    const documents = await documentService.getDocuments();

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("[Document Controller] Get documents error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách đơn",
    });
  }
};

// =========================
// TẠO ĐƠN
// =========================
export async function createDocumentRequest(req, res) {
  try {
    const data = {
      ...req.body,
      staff_id: req.user.staff_id,
    };

    console.log("[Document Create] BODY:", req.body);
    console.log("[Document Create] FILES:", req.files);

    const result = await documentService.createDocumentRequest(
      data,
      req.files ?? [],
    );

    return res.status(201).json({
      success: true,
      message: "Tạo đơn thành công",
      data: result,
    });
  } catch (error) {
    console.error("[Document Create] Lỗi:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Không thể tạo đơn",
    });
  }
}

// =========================
// TỪ CHỐI ĐƠN
// =========================
export async function rejectDocumentRequest(req, res) {
  try {
    const { id } = req.params;
    const role = req.user?.role;

    const result = await documentService.rejectDocumentRequest(id, role);

    return res.status(200).json({
      success: true,
      message: "Từ chối đơn thành công",
      data: result,
    });
  } catch (error) {
    console.error("[Document Controller] reject lỗi:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Không thể từ chối đơn",
    });
  }
}

export async function getAttachmentUrl(req, res) {
  try {
    const attachment = await documentRepository.findDocumentAttachmentById(
      req.params.id,
    );

    if (!attachment) {
      return res.status(404).json({
        message: "Không tìm thấy file",
      });
    }

    const url = await getSignedUrl(
      r2Client,
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: attachment.url,
      }),
      {
        expiresIn: 300,
      },
    );

    res.json({
      ...attachment,
      url,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Không thể mở file",
    });
  }
}

export async function getPendingDocumentsForManager(req, res) {
  try {
    const managerStaffId = req.user?.staff_id;
    const role = req.user?.role;

    if (!managerStaffId) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được người dùng",
      });
    }

    if (role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Chỉ quản lý mới được xem danh sách này",
      });
    }

    const documents =
      await documentService.getPendingDocumentsForManager(managerStaffId);

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("[Get Manager Pending Documents] Lỗi:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Không thể lấy danh sách đơn chờ quản lý duyệt",
    });
  }
}
