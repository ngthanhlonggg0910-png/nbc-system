import { Download, ExternalLink, FileText, FileUp, Paperclip, X } from "lucide-react";
export function AttachmentPreviewModal({ attachment, onClose }) {
    const hasContent = Boolean(attachment.url && attachment.url !== "#");
    const isImage = attachment.type.startsWith("image/");
    const isPdf = attachment.type.includes("pdf");
    return (<div className="modal-backdrop attachment-preview-backdrop" onMouseDown={onClose}>
      <section className="attachment-preview-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="modal-icon"><Paperclip /></span>
            <div>
              <h2>{attachment.name}</h2>
              <p>{attachment.type || "Tệp đính kèm"} · {(attachment.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
          <button aria-label="Đóng xem trước" onClick={onClose}><X /></button>
        </header>
        <div className="attachment-preview-content">
          {!hasContent ? (<div className="attachment-placeholder">
              <FileText />
              <strong>Tệp minh họa quy trình</strong>
              <p>Tệp demo chưa chứa dữ liệu nhị phân. Tệp do nhân viên tải lên thực tế sẽ được hiển thị trực tiếp tại đây.</p>
            </div>) : isImage ? (<img src={attachment.url} alt={attachment.name}/>) : isPdf ? (<iframe title={attachment.name} src={attachment.url}/>) : (<div className="attachment-placeholder">
              <FileUp />
              <strong>{attachment.name}</strong>
              <p>Định dạng này được mở bằng ứng dụng tương ứng trên thiết bị.</p>
            </div>)}
        </div>
        {hasContent && (<footer>
            <a href={attachment.url} target="_blank" rel="noreferrer"><ExternalLink /> Mở tệp trong cửa sổ mới</a>
            <a href={attachment.url} download={attachment.name}><Download /> Tải tệp</a>
          </footer>)}
      </section>
    </div>);
}
