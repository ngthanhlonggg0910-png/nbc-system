import React, { useState, useRef, useMemo } from "react";
import {
  TreePalm,
  AlarmClock,
  HeartPulse,
  FileText,
  X,
  Paperclip,
  Plus,
  ChevronRight,
  Check,
  UserCheck,
  Eye,
  UploadCloud,
  Send,
  CircleCheckBig,
} from "lucide-react";

import usePermission from "@/hooks/usePermission";
import { AttachmentPreviewModal } from "@/components/document/AttachmentPreviewModal";
import { formatVietnamDate } from "@/utils/formatVietnamDate";
import { getAttachmentUrl } from "@/api/attendance.api";

function DocumentIcon({ kind }) {
  if (kind === "leave") return <TreePalm />;
  if (kind === "overtime") return <AlarmClock />;
  if (kind === "sick") return <HeartPulse />;
  return <FileText />;
}

function getDocumentStaffId(document) {
  return document.staff_id ?? document.staffId;
}

function getDocumentDate(document) {
  const start = document.start_date ?? document.date;
  const end = document.end_date;
  if (!start) return "Chưa xác định thời gian";
  const formatDate = (value) => {
    const text = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [year, month, day] = text.split("-");
      return `${day}/${month}/${year}`;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime())
      ? text
      : new Intl.DateTimeFormat("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(parsed);
  };
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  return end && endLabel !== startLabel
    ? `${startLabel} – ${endLabel}`
    : startLabel;
}

function getDocumentCreatedDate(document) {
  const value = document.created_at ?? document.createdAt ?? document.created;
  if (!value) return "Chưa cập nhật";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(parsed);
}

function getEmployeeDocumentStatus(document) {
  if (document.status === "Từ chối") return "Đã từ chối";
  if (document.status === "Đã duyệt" || Number(document.current_step) >= 3)
    return "Đã hoàn tất";
  if (Number(document.current_step) === 2) return "Chờ Nhân sự duyệt";
  return "Chờ quản lý duyệt";
}

function getApprovalSteps(document) {
  if (Array.isArray(document.approvalSteps)) return document.approvalSteps;
  const step = Number(document.current_step ?? 1);
  const rejected = document.status === "Từ chối";
  return [
    { id: 1, label: "Quản lý trực tiếp" },
    { id: 2, label: "Nhân sự phê duyệt" },
    { id: 3, label: "Hoàn tất" },
  ].map((item) => ({
    ...item,
    status:
      rejected && step === item.id
        ? "rejected"
        : step > item.id || (document.status === "Đã duyệt" && item.id === 3)
          ? "approved"
          : "pending",
  }));
}

function DocumentCreateModal({ user, managerName, onClose, onCreate }) {
  const [type, setType] = useState("Nghỉ phép");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [attachments, setAttachments] = useState([]);
  const fileInput = useRef(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  function addAttachments(event) {
    const files = Array.from(event.target.files ?? []);

    setAttachments((items) => [
      ...items,
      ...files.map((file) => ({
        id: Date.now() + Math.random(),
        file,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      })),
    ]);

    event.target.value = "";
  }

  function submit(event) {
    event.preventDefault();

    const formData = new FormData();

    formData.append("type", type);
    formData.append("reason", reason.trim());
    formData.append("start_date", from);
    formData.append("end_date", to);

    if (type === "Làm thêm giờ") {
      formData.append("start_time", startTime);
      formData.append("end_time", endTime);
    }

    attachments.forEach((item) => {
      formData.append("attachments", item.file);
    });

    onCreate(formData);
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="request-modal document-create-modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          <X />
        </button>
        <span className="modal-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-file-check-2"
          >
            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
            <path d="M14 2v6h6" />
            <path d="m3 15 2 2 4-4" />
          </svg>
        </span>
        <h2>Tạo văn bản mới</h2>
        <p>
          Văn bản sẽ được chuyển qua quy trình xét duyệt của bộ phận liên quan.
        </p>
        <label>
          Loại văn bản
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
            }}
          >
            <option>Nghỉ ốm</option>
            <option>Nghỉ phép</option>
            <option>Làm thêm giờ</option>
            <option>Đề nghị công tác</option>
            {/* <option>Văn bản khác</option> */}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Từ ngày
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              required
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              required
            />
          </label>
        </div>
        {type === "Làm thêm giờ" && (
          <div className="form-grid">
            <label>
              Giờ bắt đầu
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </label>

            <label>
              Giờ kết thúc
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
              />
            </label>
          </div>
        )}
        <label>
          Nội dung / Lý do
          <textarea
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Nhập nội dung cần phê duyệt..."
          />
        </label>
        <div className="document-upload">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={addAttachments}
          />
          <button type="button" onClick={() => fileInput.current?.click()}>
            <UploadCloud />
            <span>
              <strong>Đính kèm file hoặc hình ảnh</strong>
              <small>PDF, Word, Excel, JPG, PNG · Có thể chọn nhiều tệp</small>
            </span>
          </button>
          {attachments.length > 0 && (
            <div>
              {attachments.map((file) => (
                <span key={file.id}>
                  <Paperclip /> <b>{file.name}</b>
                  <small>{(file.size / 1024).toFixed(0)} KB</small>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((items) =>
                        items.filter((item) => item.id !== file.id),
                      )
                    }
                  >
                    <X />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <section className="approval-preview">
          <strong>Quy trình xét duyệt</strong>
          <div>
            <span className="done">
              <Check />
            </span>
            <p>
              <b>1. Nhân viên gửi</b>
              <small>Ghi nhận ngay khi tạo</small>
            </p>
            <i />
            <span>2</span>
            <p>
              <b>2. Quản lý trực tiếp</b>
              <small>{managerName || "Chưa thiết lập quản lý"}</small>
            </p>
            <i />
            <span>3</span>
            <p>
              <b>3. Bộ phận Nhân sự</b>
              <small>Phê duyệt cuối cùng</small>
            </p>
          </div>
        </section>
        <button
          className="primary-button"
          // disabled={!reason.trim() || !managerName}
        >
          <Send /> Gửi xét duyệt
        </button>
      </form>
    </div>
  );
}

export function RequestsPage({
  managerDocuments = [],
  onNotifications,
  unreadCount,
  documents,
  user,
  managerName,
  managedEmployees,
  onCreate,
  onManagerReview,
  loading = false,
  loadError = "",
  reviewingId,
  successMessage,
  onDismissSuccess,
}) {
  const can = usePermission();
  const [filter, setFilter] = useState("Tất cả");
  const [modal, setModal] = useState(false);
  const [workspace, setWorkspace] = useState("mine");
  const [previewAttachment, setPreviewAttachment] = useState();

  const role = String(user?.role ?? "")
    .trim()
    .toLowerCase();

  const isManager = can("approve_document") || can("reject_document");

  const ownDocuments = documents.filter(
    (item) => String(item.staff_id ?? item.staffId) === String(user?.staffId),
  );
  const visible = useMemo(
    () =>
      filter === "Tất cả"
        ? ownDocuments
        : ownDocuments.filter((item) => item.status === filter),
    [filter, ownDocuments],
  );

  const approvalDocuments = isManager ? managerDocuments : [];

  const canManageDocuments = isManager;
  React.useEffect(() => {
    if (!canManageDocuments && workspace === "approval") setWorkspace("mine");
  }, [canManageDocuments, workspace]);

  return (
    <div className="page">
      {successMessage && (
        <div
          className={`document-success-toast ${successMessage.type ?? "success"}`}
          role="status"
          aria-live="polite"
        >
          <span className="document-success-icon">
            <CircleCheckBig />
          </span>

          <div>
            <strong>{successMessage.title}</strong>

            {successMessage.message && <p>{successMessage.message}</p>}

            {successMessage.description && (
              <small>{successMessage.description}</small>
            )}
          </div>

          <button
            type="button"
            onClick={onDismissSuccess}
            aria-label="Đóng thông báo"
          >
            <X />
          </button>

          <i aria-hidden="true" />
        </div>
      )}
      <div className="page-title request-title">
        <div>
          <p>Tạo, theo dõi và lưu trữ văn bản điện tử</p>
          <h1>Văn bản</h1>
        </div>
        <div className="request-page-actions">
          <button
            className="primary-button add-request"
            onClick={() => setModal(true)}
          >
            <Plus size={18} /> Tạo văn bản mới
          </button>
        </div>
      </div>
      <div className="document-workspace-tabs">
        <button
          className={workspace === "mine" ? "active" : ""}
          onClick={() => setWorkspace("mine")}
        >
          <FileText /> Văn bản của tôi <span>{ownDocuments.length}</span>
        </button>
        {canManageDocuments && (
          <button
            className={workspace === "approval" ? "active" : ""}
            onClick={() => setWorkspace("approval")}
          >
            <UserCheck /> Đơn chờ tôi duyệt{" "}
            <span>{approvalDocuments.length}</span>
          </button>
        )}
      </div>

      {loadError && (
        <div className="document-load-message error" role="alert">
          <strong>Không thể tải danh sách văn bản</strong>
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="document-load-message">Đang tải danh sách văn bản…</div>
      ) : workspace === "mine" ? (
        <section className="section-block request-section">
          <div className="request-tabs">
            {["Tất cả", "Chờ duyệt", "Đã duyệt", "Từ chối"].map((label) => (
              <button
                className={filter === label ? "active" : ""}
                onClick={() => setFilter(label)}
                key={label}
              >
                {label}
                <span>
                  {label === "Tất cả"
                    ? ownDocuments.length
                    : ownDocuments.filter((item) => item.status === label)
                        .length}
                </span>
              </button>
            ))}
          </div>
          <div className="request-list">
            {visible.map((item) => (
              <article className="request-item document-item" key={item.id}>
                <span
                  className={`request-icon ${
                    item.status === "Đã duyệt"
                      ? "approved"
                      : item.status === "Từ chối"
                        ? "rejected"
                        : "pending"
                  }`}
                >
                  <DocumentIcon
                    kind={
                      item.type === "Nghỉ phép"
                        ? "leave"
                        : item.type === "Làm thêm giờ"
                          ? "overtime"
                          : "document"
                    }
                  />
                </span>
                <div className="request-main">
                  <div>
                    <strong>{item.type}</strong>
                    <span
                      className={`request-status ${
                        item.status === "Đã duyệt"
                          ? "approved"
                          : item.status === "Từ chối"
                            ? "rejected"
                            : "pending"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p>
                    {item.type === "Làm thêm giờ" ? (
                      <>
                        {formatVietnamDate(item.start_date)}
                        {new Date(item.end_date) >
                          new Date(item.start_date) && (
                          <> - {formatVietnamDate(item.end_date)}</>
                        )}
                        {" · "}
                        {item.start_time} - {item.end_time}
                      </>
                    ) : (
                      <>
                        {formatVietnamDate(item.start_date)}
                        {new Date(item.end_date) >
                          new Date(item.start_date) && (
                          <> - {formatVietnamDate(item.end_date)}</>
                        )}
                      </>
                    )}
                  </p>
                  <small>Lý do: {item.reason}</small>
                  {(item.attachments ?? []).length > 0 ? (
                    <div className="document-attachment-buttons">
                      {(item.attachments ?? []).map((file) => (
                        <button
                          key={file.id}
                          onClick={async () => {
                            try {
                              console.log("FILE CLICK:", file);

                              const attachment = await getAttachmentUrl(
                                file.id,
                              );

                              console.log("ATTACHMENT RESULT:", attachment);

                              setPreviewAttachment(attachment);
                            } catch (error) {
                              console.error("LỖI MỞ FILE:", error);
                              console.error("RESPONSE:", error.response?.data);

                              alert(error.message || "Không thể mở file");
                            }
                          }}
                        >
                          <Eye /> Xem {file.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="no-attachment">
                      <Paperclip /> Không có tệp đính kèm
                    </span>
                  )}
                  <div className="document-progress">
                    {/* BƯỚC 1: QUẢN LÝ */}
                    <span
                      className={
                        item.status === "Từ chối" &&
                        Number(item.current_step) === 1
                          ? "rejected"
                          : Number(item.current_step) > 1
                            ? "approved"
                            : "pending"
                      }
                    >
                      <i>
                        {item.status === "Từ chối" &&
                        Number(item.current_step) === 1 ? (
                          <X size={10} />
                        ) : Number(item.current_step) > 1 ? (
                          <Check size={10} />
                        ) : (
                          1
                        )}
                      </i>

                      <small>Quản lý trực tiếp</small>
                    </span>

                    {/* BƯỚC 2: HR */}
                    <span
                      className={
                        item.status === "Từ chối" &&
                        Number(item.current_step) === 1
                          ? "disabled"
                          : item.status === "Từ chối" &&
                              Number(item.current_step) === 2
                            ? "rejected"
                            : Number(item.current_step) > 2
                              ? "approved"
                              : "pending"
                      }
                    >
                      <i>
                        {item.status === "Từ chối" &&
                        Number(item.current_step) === 1 ? (
                          2
                        ) : item.status === "Từ chối" &&
                          Number(item.current_step) === 2 ? (
                          <X size={10} />
                        ) : Number(item.current_step) > 2 ? (
                          <Check size={10} />
                        ) : (
                          2
                        )}
                      </i>

                      <small>Nhân sự phê duyệt</small>
                    </span>

                    {/* BƯỚC 3: HOÀN TẤT */}
                    <span
                      className={
                        item.status === "Từ chối"
                          ? "disabled"
                          : item.status === "Đã duyệt" &&
                              Number(item.current_step) === 3
                            ? "approved"
                            : "pending"
                      }
                    >
                      <i>
                        {item.status === "Đã duyệt" &&
                        Number(item.current_step) === 3 ? (
                          <Check size={10} />
                        ) : (
                          3
                        )}
                      </i>

                      <small>Hoàn tất</small>
                    </span>
                  </div>
                </div>
                <div className="request-created">
                  <small>Ngày tạo</small>
                  <span>{getDocumentCreatedDate(item)}</span>
                  <ChevronRight size={17} />
                </div>
              </article>
            ))}
            {visible.length === 0 && (
              <div className="approval-empty document-mine-empty">
                <FileText />
                <strong>Chưa có văn bản phù hợp</strong>
                <p>Tạo văn bản mới hoặc chọn một trạng thái khác để xem.</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="section-block manager-approval-section">
          <div className="section-heading compact">
            <div>
              <span className="section-kicker">QUẢN LÝ TRỰC TIẾP</span>
              <h2>Cần phê duyệt</h2>
              <p>Các văn bản đang chờ quản lý phê duyệt</p>{" "}
            </div>
            <span className="list-summary">
              {approvalDocuments.length} chờ xử lý
            </span>
          </div>
          {approvalDocuments.length === 0 ? (
            <div className="approval-empty">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-circle-check"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <strong>Không có văn bản chờ phê duyệt</strong>
              <p>
                Các văn bản mới của nhân viên bạn quản lý sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="manager-approval-list">
              {approvalDocuments.map((item) => (
                <article key={item.id}>
                  <span
                    className={`request-icon ${
                      item.status === "Đã duyệt"
                        ? "approved"
                        : item.status === "Từ chối"
                          ? "rejected"
                          : "pending"
                    }`}
                  >
                    <DocumentIcon
                      kind={
                        item.type === "Nghỉ phép"
                          ? "leave"
                          : item.type === "Làm thêm giờ"
                            ? "overtime"
                            : "document"
                      }
                    />
                  </span>

                  <div className="manager-document-copy">
                    <div>
                      <strong>{item.type}</strong>

                      <span className="request-status pending">
                        Chờ quản lý
                      </span>
                    </div>

                    <p>Mã nhân viên: {getDocumentStaffId(item)}</p>

                    <small>
                      {getDocumentDate(item)} · {item.reason}
                    </small>

                    {/* FILE ĐÍNH KÈM */}
                    {item.attachments?.length > 0 ? (
                      <div className="document-attachment-buttons">
                        {item.attachments.map((file) => (
                          <button
                            key={file.id}
                            onClick={async () => {
                              try {
                                console.log("FILE CLICK:", file);

                                const attachment = await getAttachmentUrl(
                                  file.id,
                                );

                                console.log("ATTACHMENT RESULT:", attachment);

                                setPreviewAttachment(attachment);
                              } catch (error) {
                                console.error("LỖI MỞ FILE:", error);
                                console.error(
                                  "RESPONSE:",
                                  error.response?.data,
                                );

                                alert(error.message || "Không thể mở file");
                              }
                            }}
                          >
                            <Eye /> Xem {file.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="no-attachment">
                        <Paperclip /> Không có tệp đính kèm
                      </span>
                    )}

                    {/* TIẾN TRÌNH DUYỆT */}
                    <div className="document-progress">
                      {/* BƯỚC 1: QUẢN LÝ */}
                      <span
                        className={
                          item.status === "Từ chối" &&
                          Number(item.current_step) === 1
                            ? "rejected"
                            : Number(item.current_step) > 1
                              ? "approved"
                              : "pending"
                        }
                      >
                        <i>
                          {item.status === "Từ chối" &&
                          Number(item.current_step) === 1 ? (
                            <X size={10} />
                          ) : Number(item.current_step) > 1 ? (
                            <Check size={10} />
                          ) : (
                            1
                          )}
                        </i>

                        <small>Quản lý trực tiếp</small>
                      </span>

                      {/* BƯỚC 2: HR */}
                      <span
                        className={
                          item.status === "Từ chối" &&
                          Number(item.current_step) === 2
                            ? "rejected"
                            : Number(item.current_step) > 2
                              ? "approved"
                              : "pending"
                        }
                      >
                        <i>
                          {item.status === "Từ chối" &&
                          Number(item.current_step) === 2 ? (
                            <X size={10} />
                          ) : Number(item.current_step) > 2 ? (
                            <Check size={10} />
                          ) : (
                            2
                          )}
                        </i>

                        <small>Nhân sự phê duyệt</small>
                      </span>

                      {/* BƯỚC 3: HOÀN TẤT */}
                      <span
                        className={
                          item.status === "Đã duyệt" &&
                          Number(item.current_step) === 3
                            ? "approved"
                            : "pending"
                        }
                      >
                        <i>
                          {item.status === "Đã duyệt" &&
                          Number(item.current_step) === 3 ? (
                            <Check size={10} />
                          ) : (
                            3
                          )}
                        </i>

                        <small>Hoàn tất</small>
                      </span>
                    </div>
                  </div>

                  <div className="document-review-actions">
                    <button
                      className="reject"
                      onClick={() => onManagerReview(item.id, false)}
                      disabled={
                        reviewingId === item.id ||
                        !can("reject_document") ||
                        Number(item.current_step) !== 1
                      }
                      title="Từ chối đơn"
                    >
                      <X /> Từ chối
                    </button>

                    <button
                      onClick={() => onManagerReview(item.id, true)}
                      disabled={
                        reviewingId === item.id ||
                        !can("approve_document") ||
                        Number(item.current_step) !== 1
                      }
                    >
                      <Check size={16} />

                      {reviewingId === item.id
                        ? "Đang xử lý…"
                        : "Phê duyệt & chuyển HR"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {modal && (
        <DocumentCreateModal
          user={user}
          managerName={managerName}
          onClose={() => setModal(false)}
          onCreate={(document) => {
            onCreate(document);
            setModal(false);
          }}
        />
      )}
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(undefined)}
        />
      )}
    </div>
  );
}
