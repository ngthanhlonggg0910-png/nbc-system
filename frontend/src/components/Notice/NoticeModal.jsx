import React, { useEffect, useState } from "react";
import { Download, FileText, Link2, Megaphone, Paperclip } from "lucide-react";
import { downloadNotificationAttachment, fetchNotificationDetail, getNotificationAttachmentObjectUrl } from "@/utils/notification-api";

export function NoticeModal({ article, remaining, onAcknowledge, token }) {
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [attachments, setAttachments] = useState(article.attachments ?? []);
    const [uploadedImageUrl, setUploadedImageUrl] = useState("");

    useEffect(() => {
        let active = true;
        let objectUrl = "";
        if (!token)
            return undefined;
        fetchNotificationDetail(article.id, token).then(async (detail) => {
            if (!active)
                return;
            const nextAttachments = detail.attachments ?? [];
            setAttachments(nextAttachments);
            const image = nextAttachments.find((item) => item.mime_type?.startsWith("image/"));
            if (image) {
                objectUrl = await getNotificationAttachmentObjectUrl(image, token);
                if (active)
                    setUploadedImageUrl(objectUrl);
                else
                    URL.revokeObjectURL(objectUrl);
            }
        }).catch((requestError) => {
            if (active)
                setError(requestError.message);
        });
        return () => {
            active = false;
            if (objectUrl)
                URL.revokeObjectURL(objectUrl);
        };
    }, [article.id, token]);

    const acknowledge = async () => {
        if (!confirmed || submitting)
            return;
        setSubmitting(true);
        setError("");
        try {
            await onAcknowledge();
        }
        catch (requestError) {
            setError(requestError.message || "Không thể xác nhận đã đọc. Vui lòng thử lại.");
        }
        finally {
            setSubmitting(false);
        }
    };

    return (<div className="priority-notice-backdrop">
      <section className="priority-notice-modal" role="dialog" aria-modal="true" aria-labelledby="priority-notice-title">
        <header>
          <span><Megaphone /></span>
          <div>
            <small>THÔNG BÁO ƯU TIÊN · BẮT BUỘC ĐỌC</small>
            <h2 id="priority-notice-title">{article.title}</h2>
            <p>Cập nhật {new Date(article.updatedAt).toLocaleString("vi-VN")} · {article.author}</p>
          </div>
          {remaining > 1 && <i>{remaining} thông báo chưa đọc</i>}
        </header>
        <div className="priority-notice-body">
          {(article.imageUrl || uploadedImageUrl) && <img src={article.imageUrl || uploadedImageUrl} alt={article.title}/>}
          <p className="priority-notice-lead">{article.summary}</p>
          {article.content && (
            <div className="rich-content" dangerouslySetInnerHTML={{ __html: article.content }}/>
          )}
          {attachments.length > 0 && (<section className="priority-attachments">
              <strong><Paperclip /> Tệp và liên kết đính kèm</strong>
              {attachments.map((file) => (<button type="button" key={file.id} onClick={() => file.file_url ? downloadNotificationAttachment(file, token).catch((requestError) => setError(requestError.message)) : window.open(file.url, "_blank", "noopener,noreferrer")}>
                  <span>{file.type === "link" ? <Link2 /> : <FileText />}</span>
                  <div><b>{file.original_name || file.name}</b><small>{file.mime_type || (file.type === "link" ? "Liên kết" : "Tệp đính kèm")}</small></div>
                  <Download />
                </button>))}
            </section>)}
        </div>
        <footer>
          {error && <p className="priority-notice-error" role="alert">{error}</p>}
          <label>
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/>
            <span><strong>Tôi xác nhận đã đọc và hiểu nội dung thông báo</strong><small>Thông báo sẽ không hiển thị lại cho đến khi nội dung được cập nhật.</small></span>
          </label>
          <button className="primary-button" disabled={!confirmed || submitting} onClick={acknowledge}><CheckCheckIcon /> {submitting ? "Đang xác nhận..." : "Xác nhận và tiếp tục"}</button>
        </footer>
      </section>
    </div>);
}

function CheckCheckIcon() {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-check"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>);
}
