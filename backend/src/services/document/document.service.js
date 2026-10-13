import pool from "../../config/db.js";

import * as documentRepository from "../../repositories/document/document.repository.js";

import { applyApprovedLeave } from "../attendance/leave.service.js";
import { calculateEmployeeOvertime } from "../attendance/overtime.service.js";
import { uploadDocumentFile } from "../storage/r2.service.js";

export async function approveDocumentRequest(id, role, approverStaffId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lấy đơn hiện tại, chưa update gì
    const request = await documentRepository.findDocumentById(id, client);

    if (!request) {
      throw new Error("Không tìm thấy đơn");
    }

    if (request.status !== "Chờ duyệt") {
      throw new Error("Đơn không ở trạng thái chờ duyệt");
    }

    const currentStep = Number(request.current_step);

    let updatedRequest;

    // =========================
    // BƯỚC 1: QUẢN LÝ DUYỆT
    // =========================
    if (currentStep === 1) {
      if (role !== "manager") {
        throw new Error("Chỉ quản lý mới được duyệt bước này");
      }

      const isManaged = await documentRepository.isEmployeeManagedBy(
        request.staff_id,
        approverStaffId,
        client,
      );

      if (!isManaged) {
        throw new Error("Bạn không có quyền duyệt đơn của nhân viên này");
      }

      updatedRequest = await documentRepository.updateApprovalState(
        id,
        {
          status: "Chờ duyệt",
          current_step: 2,
        },
        client,
      );
    }

    // =========================
    // BƯỚC 2: HR DUYỆT
    // =========================
    else if (currentStep === 2) {
      if (role !== "hr" && role !== "admin") {
        throw new Error("Chỉ HR mới được duyệt bước này");
      }
      updatedRequest = await documentRepository.updateApprovalState(
        id,
        {
          status: "Đã duyệt",
          current_step: 3,
        },
        client,
      );

      console.log("[Document] HR đã duyệt:", updatedRequest);

      // Chỉ khi HR duyệt xong mới áp dụng nghiệp vụ
      if (updatedRequest.type === "Làm thêm giờ") {
        await calculateEmployeeOvertime(
          updatedRequest.staff_id,
          updatedRequest.start_date,
          client,
        );
      } else if (updatedRequest.type === "Nghỉ phép") {
        await applyApprovedLeave(updatedRequest, client);
      }
    }

    // =========================
    // STEP KHÔNG HỢP LỆ
    // =========================
    else {
      throw new Error("Đơn đã hoàn tất hoặc bước duyệt không hợp lệ");
    }

    await client.query("COMMIT");

    return updatedRequest;
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("[Document Approve] Lỗi:", error);

    throw error;
  } finally {
    client.release();
  }
}

export async function getDocuments() {
  return await documentRepository.getDocuments();
}

export async function createDocumentRequest(data, files = []) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const hasManager = await documentRepository.hasDirectManager(
      data.staff_id,
      client,
    );

    // 1. Tạo document trước
    const document = await documentRepository.createDocumentRequest(
      {
        ...data,
        current_step: hasManager ? 1 : 2,
      },
      client,
    );

    // 2. Upload từng file lên R2
    for (const file of files) {
      const uploaded = await uploadDocumentFile(file);

      // 3. Lưu metadata / storage key vào PostgreSQL
      await documentRepository.createDocumentAttachment(client, {
        document_id: document.id,
        name: uploaded.name,
        type: uploaded.type,
        size: uploaded.size,
        url: uploaded.url,
      });
    }

    await client.query("COMMIT");

    return document;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectDocumentRequest(id, role) {
  const request = await documentRepository.findDocumentById(id);

  if (!request) {
    throw new Error("Không tìm thấy đơn");
  }

  return await documentRepository.rejectDocumentRequest(id);
}

export async function getPendingDocumentsForManager(managerStaffId) {
  return await documentRepository.getPendingDocumentsForManager(managerStaffId);
}
