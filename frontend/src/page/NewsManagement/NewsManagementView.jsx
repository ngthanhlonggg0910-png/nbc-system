import React, { useState, useRef, useEffect } from "react";
import { Newspaper, Edit3, Plus, Trash2, Save, Send, Bold, Italic, List, Link2, ImageIcon, ImagePlus, Paperclip, FileUp, Megaphone, X, History, MessageSquareReply, UserRound, Building2, UsersRound, Clock3, Smile, RotateCcw, Search, BellRing, ShieldAlert, Eye, Filter, Calendar } from "lucide-react";
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_FILE_EXTENSIONS = new Set(["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg", "webp"]);
const EMOJI_CATEGORIES = [
    {
        id: "smileys",
        label: "Mặt cười",
        icon: "😀",
        emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🥳", "🥺", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "🤡", "👻", "👽"]
    },
    {
        id: "gestures",
        label: "Cử chỉ",
        icon: "👋",
        emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "👀", "👁️", "👅", "👄", "🫦", "🫡", "🫂"]
    },
    {
        id: "hearts",
        label: "Trái tim",
        icon: "❤️",
        emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️"]
    },
    {
        id: "people",
        label: "Con người",
        icon: "🧑",
        emojis: ["👶", "🧒", "👦", "👧", "🧑", "👨", "👩", "🧓", "👴", "👵", "👮", "🕵️", "💂", "👷", "🤴", "👸", "👳", "👲", "🧕", "🤵", "👰", "🤰", "🤱", "👼", "🎅", "🤶", "🦸", "🦹", "🧙", "🧚", "🧛", "🧟", "💆", "💇", "🚶", "🧍", "🧎", "🏃", "💃", "🕺", "👯", "🧘", "🛀", "🛌"]
    },
    {
        id: "animals",
        label: "Động vật",
        icon: "🐶",
        emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🐢", "🐍", "🦎", "🦖", "🐙", "🦑", "🦐", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐑", "🐐", "🦌", "🐕", "🐩", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿️"]
    },
    {
        id: "food",
        label: "Đồ ăn",
        icon: "🍕",
        emojis: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "☕", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾"]
    },
    {
        id: "activities",
        label: "Hoạt động",
        icon: "⚽",
        emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚵", "🚴", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎗️", "🎫", "🎟️", "🎪", "🤹", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩"]
    },
    {
        id: "travel",
        label: "Du lịch",
        icon: "✈️",
        emojis: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🦯", "🦽", "🦼", "🛵", "🏍️", "🛺", "🚲", "🛴", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢", "⚓", "⛽", "🚧", "🚦", "🚥", "🚏", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🏠", "🏡", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🏛️", "⛪", "🕌", "🕍", "🛕", "🕋"]
    },
    {
        id: "objects",
        label: "Đồ vật",
        icon: "💡",
        emojis: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🔩", "⚙️", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "🪦", "⚱️", "🏺", "🔮", "📿", "🧿", "💈", "⚗️", "🔭", "🔬", "🕳️", "💊", "💉", "🩸", "🩹", "🩺", "🚪", "🛗", "🪞", "🪟", "🛏️", "🛋️", "🪑", "🚽", "🚿", "🛁", "🪒", "🧴", "🧷", "🧹", "🧺", "🧻", "🧼", "🪣", "🧽", "🧯", "🛒"]
    },
    {
        id: "symbols",
        label: "Ký hiệu",
        icon: "✅",
        emojis: ["✅", "☑️", "✔️", "❌", "❎", "➕", "➖", "➗", "✖️", "♾️", "‼️", "⁉️", "❓", "❔", "❕", "❗", "〰️", "💱", "💲", "⚕️", "♻️", "⚜️", "🔱", "📛", "🔰", "⭕", "✅", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📵", "🚭", "🔞", "☑️", "🔃", "🔄", "🔙", "🔚", "🔛", "🔜", "🔝", "🔥", "✨", "🌟", "⭐", "🌠", "💫", "💥", "💢", "💦", "💨", "🕳️", "💬", "🗨️", "🗯️", "💭", "💤", "👁️‍🗨️", "🔔", "🔕", "📢", "📣", "📯", "📌", "📍", "📎", "🖇️", "📏", "📐", "✂️", "🗑️"]
    },
];
function formatFileSize(bytes) {
    if (bytes < 1024 * 1024)
        return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function NewsEditor({ article, onClose, onSave, notificationMode = false, departments = [] }) {
    const [draft, setDraft] = useState(article ?? { id: 0, title: "", summary: "", content: "<p>Nhập nội dung bài viết tại đây...</p>", category: "Thông báo nội bộ", updatedAt: "", author: "Admin-HR", status: "draft", attachments: [], priority: false, audienceMode: "employee", recipientStaffId: "", departmentId: "", sendMode: "now", scheduledAt: "", allowReply: true });
    const [linkName, setLinkName] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [emojiCategory, setEmojiCategory] = useState(EMOJI_CATEGORIES[0].id);
    const editorRef = useRef(null);
    const imageInput = useRef(null);
    const fileInput = useRef(null);
    const emojiPickerRef = useRef(null);
    useEffect(() => {
        if (editorRef.current) editorRef.current.innerHTML = draft.content;
        // Only set the initial content once on mount — re-applying innerHTML on
        // every keystroke breaks the cursor and Vietnamese IME composition.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (!emojiPickerOpen) return undefined;
        function handleClickOutside(event) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) setEmojiPickerOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [emojiPickerOpen]);
    function format(command, value) {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        setDraft((item) => ({ ...item, content: editorRef.current?.innerHTML ?? item.content }));
    }
    function insertEmoji(emoji) {
        format("insertText", emoji);
        setEmojiPickerOpen(false);
    }
    function readImage(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            setError("Ảnh phải có định dạng PNG, JPG hoặc WEBP.");
            event.target.value = "";
            return;
        }
        if (file.size > MAX_UPLOAD_SIZE) {
            setError("Ảnh đại diện không được vượt quá 10 MB.");
            event.target.value = "";
            return;
        }
        setError("");
        setDraft((item) => ({ ...item, imageUrl: URL.createObjectURL(file), imageFile: file }));
        event.target.value = "";
    }
    function addFiles(event) {
        const selected = Array.from(event.target.files ?? []);
        const valid = selected.filter((file) => {
            const extension = file.name.split(".").pop()?.toLowerCase();
            return ALLOWED_FILE_EXTENSIONS.has(extension) && file.size <= MAX_UPLOAD_SIZE;
        });
        const rejected = selected.length - valid.length;
        if (rejected)
            setError(`${rejected} tệp không hợp lệ. Chỉ nhận PNG, JPG, WEBP, PDF, DOCX, XLSX, PPTX và tối đa 10 MB/tệp.`);
        else
            setError("");
        setDraft((item) => ({
            ...item,
            attachments: [...item.attachments, ...valid.map((file) => ({
                    id: `${Date.now()}-${file.name}-${Math.random()}`,
                    name: file.name,
                    type: file.type.startsWith("image/") ? "image" : (file.type === "application/pdf" ? "pdf" : "document"),
                    size: file.size,
                    file
                }))]
        }));
        event.target.value = "";
    }
    async function save(status) {
        const container = document.createElement("div");
        container.innerHTML = editorRef.current?.innerHTML ?? draft.content;
        container.querySelectorAll("script,style,iframe,object").forEach((node) => node.remove());
        container.querySelectorAll("*").forEach((node) => Array.from(node.attributes).forEach((attribute) => {
            if (attribute.name.startsWith("on") || attribute.value.trim().toLowerCase().startsWith("javascript:"))
                node.removeAttribute(attribute.name);
        }));
        const payload = {
            ...draft,
            id: draft.id || Date.now(),
            title: draft.title.trim(),
            summary: draft.summary.trim(),
            content: container.innerHTML,
            status,
            updatedAt: new Date().toISOString(),
            priority: draft.category === "Thông báo ưu tiên"
        };
        if (status === "published" && payload.category.startsWith("Thông báo") && payload.audienceMode === "employee" && !payload.recipientStaffId?.trim()) {
            setError("Vui lòng nhập mã nhân viên nhận thông báo.");
            return;
        }
        if (status === "published" && payload.audienceMode === "department" && !payload.departmentId) {
            setError("Vui lòng chọn phòng ban nhận thông báo.");
            return;
        }
        if (status === "published" && payload.sendMode === "scheduled" && (!payload.scheduledAt || new Date(payload.scheduledAt) <= new Date())) {
            setError("Thời gian gửi phải lớn hơn thời điểm hiện tại.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave(payload);
        } catch (requestError) {
            setError(requestError.message || "Không thể đăng nội dung.");
        } finally {
            setSaving(false);
        }
    }
    return (<div className="modal-backdrop news-editor-backdrop" onMouseDown={onClose}>
      <div className="news-editor" onMouseDown={(event) => event.stopPropagation()}>
        <div className="news-editor-head">
          <div>
            <span>TRÌNH SOẠN THẢO</span>
            <h2>{article ? "Cập nhật bài viết" : "Đăng thông báo & tin tức"}</h2>
          </div>
          <button onClick={onClose} aria-label="Đóng"><X /></button>
        </div>
        <div className="news-editor-body">
          <div className="editor-main">
            <label>Tiêu đề<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Nhập tiêu đề bài viết..."/></label>
            <label>Mô tả ngắn<textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="Tóm tắt nội dung hiển thị trên danh sách..."/></label>
            <div className="rich-editor-wrap">
              <span>Nội dung bài viết</span>
              <div className="rich-toolbar">
                <button type="button" title="In đậm" onClick={() => format("bold")}><Bold /></button>
                <button type="button" title="In nghiêng" onClick={() => format("italic")}><Italic /></button>
                <button type="button" title="Tiêu đề" onClick={() => format("formatBlock", "h2")}><Newspaper /></button>
                <button type="button" title="Danh sách" onClick={() => format("insertUnorderedList")}><List /></button>
                <button type="button" title="Chèn liên kết" onClick={() => { const url = window.prompt("Nhập liên kết https://..."); if (url)
        format("createLink", url); }}><Link2 /></button>
                <button type="button" title="Xóa định dạng" onClick={() => format("removeFormat")}><Trash2 /></button>
                <div className="rich-toolbar-emoji" ref={emojiPickerRef}>
                  <button type="button" title="Chèn biểu tượng cảm xúc" className={emojiPickerOpen ? "active" : ""} onClick={() => setEmojiPickerOpen((open) => !open)}><Smile /></button>
                  {emojiPickerOpen && (
                    <div className="emoji-picker-popover" role="menu">
                      <div className="emoji-picker-tabs">
                        {EMOJI_CATEGORIES.map((category) => (
                          <button key={category.id} type="button" title={category.label} className={emojiCategory === category.id ? "active" : ""} onClick={() => setEmojiCategory(category.id)}>{category.icon}</button>
                        ))}
                      </div>
                      <div className="emoji-picker-grid">
                        {EMOJI_CATEGORIES.find((category) => category.id === emojiCategory)?.emojis.map((emoji, index) => (
                          <button key={`${emoji}-${index}`} type="button" onClick={() => insertEmoji(emoji)}>{emoji}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <small>Có thể dán trực tiếp nội dung đã định dạng từ Word</small>
              </div>
              <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning onInput={(event) => setDraft({ ...draft, content: event.currentTarget.innerHTML })}/>
            </div>
          </div>
          <aside className="editor-sidebar">
            <label>Loại thông báo
              <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value, priority: event.target.value === "Thông báo ưu tiên" })}>
                <option>Thông báo ưu tiên</option>
                <option>Thông báo nội bộ</option>
                <option>Thông báo hệ thống</option>
                {!notificationMode && <option>Tin nội bộ</option>}
                {!notificationMode && <option>Đào tạo</option>}
                {!notificationMode && <option>Chính sách</option>}
              </select>
            </label>
            {draft.category.startsWith("Thông báo") && (<>
              <div className="notification-target-field">
                <span>Đối tượng nhận</span>
                <div className="notification-choice-grid">
                  {[{ id: "employee", label: "Cá nhân", icon: UserRound }, { id: "department", label: "Phòng ban", icon: Building2 }, { id: "all", label: "Tất cả", icon: UsersRound }].map((option) => {
                    const Icon = option.icon;
                    return <button type="button" key={option.id} className={draft.audienceMode === option.id ? "active" : ""} onClick={() => setDraft({ ...draft, audienceMode: option.id })}><Icon /><b>{option.label}</b></button>;
                  })}
                </div>
              </div>
              {draft.audienceMode === "employee" && <label>Mã nhân viên
                <input value={draft.recipientStaffId ?? ""} onChange={(event) => setDraft({ ...draft, recipientStaffId: event.target.value })} maxLength={30} placeholder="Ví dụ: NV002" />
              </label>}
              {draft.audienceMode === "department" && <label>Phòng ban
                <select value={draft.departmentId ?? ""} onChange={(event) => setDraft({ ...draft, departmentId: event.target.value })}>
                  <option value="">Chọn phòng ban</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </label>}
              <div className="notification-target-field">
                <span>Thời điểm gửi</span>
                <div className="notification-choice-grid send-time">
                  <button type="button" className={draft.sendMode !== "scheduled" ? "active" : ""} onClick={() => setDraft({ ...draft, sendMode: "now" })}><Send /><b>Gửi ngay</b></button>
                  <button type="button" className={draft.sendMode === "scheduled" ? "active" : ""} onClick={() => setDraft({ ...draft, sendMode: "scheduled" })}><Clock3 /><b>Hẹn giờ</b></button>
                </div>
              </div>
              {draft.sendMode === "scheduled" && (<>
                <label>Ngày và giờ gửi bắt đầu
                  <input type="datetime-local" value={draft.scheduledAt ?? ""} onChange={(event) => setDraft({ ...draft, scheduledAt: event.target.value })} />
                </label>

                <label>Tần suất lặp lại
                  <select value={draft.repeatMode ?? "none"} onChange={(event) => setDraft({ ...draft, repeatMode: event.target.value })}>
                    <option value="none">Chỉ gửi 1 lần (Không lặp lại)</option>
                    <option value="hourly">Lặp lại hàng giờ</option>
                    <option value="daily">Lặp lại hàng ngày</option>
                    <option value="weekly">Lặp lại hàng tuần</option>
                    <option value="monthly">Lặp lại hàng tháng</option>
                    <option value="yearly">Lặp lại hàng năm</option>
                    <option value="custom">⚙️ Tùy chỉnh lịch lặp (Tùy chọn)</option>
                  </select>
                </label>

                {draft.repeatMode && draft.repeatMode !== "none" && (<>
                  {draft.repeatMode === "custom" ? (
                    <div className="custom-repeat-box">
                      <div className="custom-repeat-row">
                        <label>Lặp lại mỗi
                          <div className="custom-repeat-inputs">
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={draft.customInterval ?? 1}
                              onChange={(event) => setDraft({ ...draft, customInterval: Math.max(1, Number(event.target.value)) })}
                            />
                            <select
                              value={draft.customUnit ?? "weeks"}
                              onChange={(event) => setDraft({ ...draft, customUnit: event.target.value })}
                            >
                              <option value="hours">Giờ</option>
                              <option value="days">Ngày</option>
                              <option value="weeks">Tuần</option>
                              <option value="months">Tháng</option>
                              <option value="years">Năm</option>
                            </select>
                          </div>
                        </label>
                      </div>

                      {draft.customUnit === "weeks" && (
                        <div className="custom-days-selector">
                          <span>Các ngày trong tuần:</span>
                          <div className="day-chips-group">
                            {[
                              { id: "Mon", label: "T2" },
                              { id: "Tue", label: "T3" },
                              { id: "Wed", label: "T4" },
                              { id: "Thu", label: "T5" },
                              { id: "Fri", label: "T6" },
                              { id: "Sat", label: "T7" },
                              { id: "Sun", label: "CN" }
                            ].map((day) => {
                              const selected = (draft.customDaysOfWeek ?? ["Mon", "Wed", "Fri"]).includes(day.id);
                              return (
                                <button
                                  key={day.id}
                                  type="button"
                                  className={`day-chip${selected ? " active" : ""}`}
                                  onClick={() => {
                                    const current = draft.customDaysOfWeek ?? ["Mon", "Wed", "Fri"];
                                    const updated = selected
                                      ? current.filter((d) => d !== day.id)
                                      : [...current, day.id];
                                    setDraft({ ...draft, customDaysOfWeek: updated });
                                  }}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <label>Khung giờ thực hiện
                        <input
                          type="time"
                          value={draft.customTime ?? "08:00"}
                          onChange={(event) => setDraft({ ...draft, customTime: event.target.value })}
                        />
                      </label>
                    </div>
                  ) : (
                    <label>Khoảng thời gian lặp
                      <select value={draft.repeatInterval ?? 1} onChange={(event) => setDraft({ ...draft, repeatInterval: Number(event.target.value) })}>
                        <option value={1}>Mỗi 1 {draft.repeatMode === "hourly" ? "giờ" : draft.repeatMode === "daily" ? "ngày" : draft.repeatMode === "weekly" ? "tuần" : draft.repeatMode === "monthly" ? "tháng" : "năm"}</option>
                        <option value={2}>Mỗi 2 {draft.repeatMode === "hourly" ? "giờ" : draft.repeatMode === "daily" ? "ngày" : draft.repeatMode === "weekly" ? "tuần" : draft.repeatMode === "monthly" ? "tháng" : "năm"}</option>
                        <option value={3}>Mỗi 3 {draft.repeatMode === "hourly" ? "giờ" : draft.repeatMode === "daily" ? "ngày" : draft.repeatMode === "weekly" ? "tuần" : draft.repeatMode === "monthly" ? "tháng" : "năm"}</option>
                        <option value={5}>Mỗi 5 {draft.repeatMode === "hourly" ? "giờ" : draft.repeatMode === "daily" ? "ngày" : draft.repeatMode === "weekly" ? "tuần" : draft.repeatMode === "monthly" ? "tháng" : "năm"}</option>
                      </select>
                    </label>
                  )}

                  <label>Điều kiện kết thúc lặp
                    <select value={draft.repeatEndMode ?? "forever"} onChange={(event) => setDraft({ ...draft, repeatEndMode: event.target.value })}>
                      <option value="forever">Vô thời hạn (Không giới hạn)</option>
                      <option value="until_date">Kết thúc vào ngày cụ thể</option>
                      <option value="count">Kết thúc sau số lần lặp</option>
                    </select>
                  </label>

                  {draft.repeatEndMode === "until_date" && (
                    <label>Ngày kết thúc lặp
                      <input type="date" value={draft.repeatEndDate ?? ""} onChange={(event) => setDraft({ ...draft, repeatEndDate: event.target.value })} />
                    </label>
                  )}

                  {draft.repeatEndMode === "count" && (
                    <label>Số lần lặp tối đa
                      <input type="number" min={1} max={1000} value={draft.repeatCount ?? 5} onChange={(event) => setDraft({ ...draft, repeatCount: Math.max(1, Number(event.target.value)) })} placeholder="Nhập số lần (VD: 5, 10...)" />
                    </label>
                  )}

                  <div className="repeat-schedule-summary">
                    <RotateCcw size={14} />
                    <span>
                      {draft.repeatMode === "custom" ? (
                        <>
                          Thông báo lặp tùy chỉnh <strong>{draft.customInterval ?? 1 > 1 ? `mỗi ${draft.customInterval} ${draft.customUnit === "hours" ? "giờ" : draft.customUnit === "weeks" ? "tuần" : draft.customUnit === "months" ? "tháng" : draft.customUnit === "years" ? "năm" : "ngày"}` : `hàng ${draft.customUnit === "hours" ? "giờ" : draft.customUnit === "weeks" ? "tuần" : draft.customUnit === "months" ? "tháng" : draft.customUnit === "years" ? "năm" : "ngày"}`}</strong>
                          {draft.customUnit === "weeks" && draft.customDaysOfWeek?.length > 0 && ` vào ${draft.customDaysOfWeek.map((d) => ({ Mon: "Thứ 2", Tue: "Thứ 3", Wed: "Thứ 4", Thu: "Thứ 5", Fri: "Thứ 6", Sat: "Thứ 7", Sun: "Chủ nhật" }[d] || d)).join(", ")}`}
                          {draft.customTime && ` lúc ${draft.customTime}`}
                          {draft.repeatEndMode === "until_date" && draft.repeatEndDate && ` cho đến ngày ${new Date(draft.repeatEndDate).toLocaleDateString("vi-VN")}`}
                          {draft.repeatEndMode === "count" && ` (tối đa ${draft.repeatCount ?? 5} lần)`}.
                        </>
                      ) : (
                        <>
                          Thông báo sẽ tự động lặp lại <strong>{draft.repeatMode === "hourly" ? "hàng giờ" : draft.repeatMode === "daily" ? "hàng ngày" : draft.repeatMode === "weekly" ? "hàng tuần" : draft.repeatMode === "monthly" ? "hàng tháng" : "hàng năm"}</strong>
                          {draft.repeatEndMode === "until_date" && draft.repeatEndDate && ` cho đến ngày ${new Date(draft.repeatEndDate).toLocaleDateString("vi-VN")}`}
                          {draft.repeatEndMode === "count" && ` (tối đa ${draft.repeatCount ?? 5} lần)`}.
                        </>
                      )}
                    </span>
                  </div>
                </>)}
              </>)}
              <button type="button" role="switch" aria-checked={draft.allowReply !== false} className={`notification-reply-switch${draft.allowReply !== false ? " active" : ""}`} onClick={() => setDraft({ ...draft, allowReply: draft.allowReply === false })}>
                <span aria-hidden="true"><i /></span><div><b>Cho phép phản hồi</b><small>Người nhận có thể gửi nội dung phản hồi cho HR.</small></div>
              </button>
            </>)}
            {draft.category === "Thông báo ưu tiên" && (<div className="priority-editor-note">
                <Megaphone />
                <span><strong>Bắt buộc người dùng đọc</strong><small>Bài đã đăng sẽ hiện dạng popup ở lần đăng nhập tiếp theo cho đến khi người dùng xác nhận.</small></span>
              </div>)}
            <section>
              <div className="editor-asset-heading"><h3><ImageIcon /> Ảnh thông báo</h3><small>Tối đa 10 MB</small></div>
              <div className={`upload-drop${draft.imageUrl ? " has-preview" : ""}`}>
                {draft.imageUrl ? <><img src={draft.imageUrl} alt="Xem trước ảnh thông báo"/><span className="upload-preview-info"><b>{draft.imageFile?.name || "Ảnh hiện tại"}</b><small>{draft.imageFile ? formatFileSize(draft.imageFile.size) : "Ảnh đã tải lên"}</small></span><button type="button" className="asset-remove" aria-label="Xóa ảnh" onClick={() => setDraft({ ...draft, imageUrl: "", imageFile: null })}><X /></button></> : <button type="button" className="upload-drop-trigger" onClick={() => imageInput.current?.click()}><ImagePlus /><span>Thêm ảnh thông báo</span><small>PNG, JPG hoặc WEBP</small></button>}
              </div>
              {draft.imageUrl && <button type="button" className="asset-change-button" onClick={() => imageInput.current?.click()}><ImagePlus /> Thay ảnh khác</button>}
              <input ref={imageInput} hidden type="file" accept=".png,.jpg,.jpeg,.webp" onChange={readImage}/>
            </section>
            <section>
              <div className="editor-asset-heading"><h3><Paperclip /> Tệp đính kèm</h3><small>{draft.attachments.filter((item) => item.type !== "link").length} tệp</small></div>
              <button className="attach-button attachment-picker" type="button" onClick={() => fileInput.current?.click()}><FileUp /><span><b>Chọn tệp từ thiết bị</b><small>PDF, DOCX, XLSX, PPTX hoặc hình ảnh · tối đa 10 MB</small></span></button>
              <input ref={fileInput} hidden multiple type="file" accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp" onChange={addFiles}/>
              <div className="attachment-drafts">
                {draft.attachments.filter((item) => item.type !== "link").map((file) => (<div key={file.id}>
                    <Paperclip />
                    <span><b>{file.name}</b><small>{formatFileSize(file.size || 0)} · {file.type === "image" ? "Hình ảnh" : file.type === "pdf" ? "PDF" : "Tài liệu"}</small></span>
                    <button onClick={() => setDraft({ ...draft, attachments: draft.attachments.filter((item) => item.id !== file.id) })}><X /></button>
                  </div>))}
              </div>
            </section>
            <section>
              <h3><Link2 /> Đính kèm liên kết</h3>
              <input value={linkName} onChange={(event) => setLinkName(event.target.value)} placeholder="Tên liên kết"/>
              <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://..."/>
              <button type="button" className="attach-button" disabled={!linkName || !linkUrl} onClick={() => { setDraft({ ...draft, attachments: [...draft.attachments, { id: Date.now(), name: linkName, type: "link", url: linkUrl }] }); setLinkName(""); setLinkUrl(""); }}><Plus /> Thêm liên kết</button>
            </section>
          </aside>
        </div>
        <div className="news-editor-actions">
          {error && <span className="news-editor-error">{error}</span>}
          <button onClick={onClose}>Hủy</button>
          {!notificationMode && <button disabled={saving || !draft.title.trim()} onClick={() => save("draft")}><Save /> Lưu nháp</button>}
          <button className="primary-button" disabled={saving || !draft.title.trim() || !draft.summary.trim()} onClick={() => save("published")}><Send /> {saving ? "Đang đăng..." : "Đăng tin & gửi thông báo"}</button>
        </div>
      </div>
    </div>);
}
export function NewsAdminPage({ articles, onSave, onDelete, onOpen, onNotifications, unreadCount, notificationMode = false, loading = false, error = "", responseInbox = [], onOpenResponse, departments = [] }) {
    const [editorArticle, setEditorArticle] = useState(undefined);
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [audienceFilter, setAudienceFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const responseMode = notificationMode && filter === "responses";

    const isFilterActive = searchTerm || statusFilter !== "all" || audienceFilter !== "all" || dateFilter !== "all" || fromDate || toDate || sortBy !== "newest";

    const resetFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setAudienceFilter("all");
        setDateFilter("all");
        setFromDate("");
        setToDate("");
        setSortBy("newest");
    };

    const visible = articles.filter((item) => {
        // Category tab filter
        const matchesCategory = filter === "all" || (notificationMode ? item.category === filter : item.status === filter);
        if (!matchesCategory) return false;

        // Search keyword
        const searchLower = searchTerm.trim().toLowerCase();
        const matchesSearch = !searchLower ||
            item.title?.toLowerCase().includes(searchLower) ||
            item.summary?.toLowerCase().includes(searchLower) ||
            item.author?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;

        // Status filter
        if (statusFilter !== "all" && item.status !== statusFilter) return false;

        // Audience mode filter
        if (audienceFilter !== "all" && item.audienceMode !== audienceFilter) return false;

        // Date range filter
        if (dateFilter !== "all") {
            const itemDate = new Date(item.updatedAt || item.createdAt || Date.now());
            const now = new Date();
            if (dateFilter === "today") {
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (itemDate < todayStart) return false;
            } else if (dateFilter === "7days") {
                const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (itemDate < past7) return false;
            } else if (dateFilter === "30days") {
                const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                if (itemDate < past30) return false;
            } else if (dateFilter === "custom") {
                if (fromDate && itemDate < new Date(fromDate)) return false;
                if (toDate && itemDate > new Date(`${toDate}T23:59:59`)) return false;
            }
        }

        return true;
    }).slice().sort((a, b) => {
        if (sortBy === "oldest") return a.updatedAt.localeCompare(b.updatedAt);
        if (sortBy === "most_read") return (b.readCount || 0) - (a.readCount || 0);
        if (sortBy === "most_replied") return (b.responseCount || 0) - (a.responseCount || 0);
        return b.updatedAt.localeCompare(a.updatedAt);
    });

    const pendingResponses = responseInbox.filter((item) => item.pending).length;
    const totalReadCount = articles.reduce((sum, item) => sum + (item.readCount || 0), 0);
    const totalRecipientCount = articles.reduce((sum, item) => sum + (item.recipientCount || 0), 0);
    const readPercent = totalRecipientCount > 0 ? Math.round((totalReadCount / totalRecipientCount) * 100) : 0;

    return (<div className="page news-admin-page">
      <div className="page-title">
        <div>
          <p>{notificationMode ? "Soạn thảo, gửi và theo dõi thông báo nhân viên" : "Soạn thảo, đính kèm và phát hành nội dung"}</p>
          <h1>{notificationMode ? "Quản lý Thông báo" : "Quản lý Thông báo & Tin tức"}</h1>
        </div>
        <div className="news-admin-actions">
          <button className="primary-button" onClick={() => setEditorArticle(null)}><Plus /> {notificationMode ? "Gửi thông báo mới" : "Đăng tin mới"}</button>
        </div>
      </div>

      <section className="news-admin-summary">
        <article className="summary-card total">
          <div className="summary-icon blue"><Newspaper /></div>
          <div className="summary-data">
            <strong>{articles.length}</strong>
            <span>{notificationMode ? "Tổng thông báo đã gửi" : "Tổng bài viết"}</span>
          </div>
        </article>
        <article className="summary-card read">
          <div className="summary-icon green"><CheckCheckIcon /></div>
          <div className="summary-data">
            <div className="summary-value-group">
              <strong>{notificationMode ? totalReadCount : articles.filter((item) => item.status === "published").length}</strong>
              {notificationMode && totalRecipientCount > 0 && <span className="read-rate-badge">{readPercent}% đã đọc</span>}
            </div>
            <span>{notificationMode ? "Lượt đã đọc" : "Đã đăng"}</span>
          </div>
        </article>
        <article className={`summary-card responses${responseMode ? " active" : ""}`} onClick={() => notificationMode && setFilter("responses")}>
          <div className="summary-icon orange"><Edit3 /></div>
          <div className="summary-data">
            <strong>{notificationMode ? articles.reduce((sum, item) => sum + (item.responseCount || 0), 0) : articles.filter((item) => item.status === "draft").length}</strong>
            <span>{notificationMode ? `Phản hồi${pendingResponses ? ` · ${pendingResponses} chờ trả lời` : ""}` : "Bản nháp"}</span>
          </div>
        </article>
      </section>

      <section className="section-block news-admin-list">
        <div className="admin-list-toolbar-wrap">
          <div className="admin-search-filter-row">
            <div className="admin-search-box">
              <Search size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm thông báo theo tiêu đề, nội dung, tác giả..."
              />
              {searchTerm && <button type="button" onClick={() => setSearchTerm("")}><X size={14} /></button>}
            </div>

            <button
              type="button"
              className={`filter-toggle-button${showAdvancedFilters || isFilterActive ? " active" : ""}`}
              onClick={() => setShowAdvancedFilters((open) => !open)}
            >
              <Filter size={14} /> Bộ lọc nâng cao {isFilterActive && <i className="filter-active-dot" />}
            </button>
          </div>

          {(showAdvancedFilters || isFilterActive) && (
            <div className="admin-filter-controls-bar">
              <label>Trạng thái
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">Tất cả trạng thái</option>
                  <option value="published">Đã gửi</option>
                  <option value="scheduled">Đã hẹn giờ</option>
                  <option value="draft">Bản nháp</option>
                </select>
              </label>

              {notificationMode && (
                <label>Đối tượng nhận
                  <select value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)}>
                    <option value="all">Tất cả đối tượng</option>
                    <option value="employee">Cá nhân</option>
                    <option value="department">Phòng ban</option>
                    <option value="all_staff">Toàn công ty</option>
                  </select>
                </label>
              )}

              <label>Thời gian
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  <option value="all">Tất cả thời gian</option>
                  <option value="today">Hôm nay</option>
                  <option value="7days">7 ngày qua</option>
                  <option value="30days">30 ngày qua</option>
                  <option value="custom">Tùy chọn khoảng ngày</option>
                </select>
              </label>

              {dateFilter === "custom" && (
                <div className="custom-date-inputs">
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="Từ ngày" />
                  <span>-</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} title="Đến ngày" />
                </div>
              )}

              <label>Sắp xếp
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Mới nhất trước</option>
                  <option value="oldest">Cũ nhất trước</option>
                  {notificationMode && <option value="most_read">Lượt đọc nhiều nhất</option>}
                  {notificationMode && <option value="most_replied">Nhiều phản hồi nhất</option>}
                </select>
              </label>

              {isFilterActive && (
                <button type="button" className="reset-filter-button" onClick={resetFilters}>
                  <RotateCcw size={13} /> Đặt lại
                </button>
              )}
            </div>
          )}

          <div className="admin-list-toolbar">
            <div className="admin-tab-group">
              {(notificationMode ? [{ id: "all", label: "Tất cả" }, { id: "Thông báo ưu tiên", label: "Ưu tiên" }, { id: "Thông báo hệ thống", label: "Hệ thống" }, { id: "Thông báo nội bộ", label: "Nội bộ" }, { id: "responses", label: `Phản hồi${pendingResponses ? ` (${pendingResponses})` : ""}` }] : [{ id: "all", label: "Tất cả" }, { id: "published", label: "Đã đăng" }, { id: "draft", label: "Bản nháp" }]).map((item) => (<button key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>))}
            </div>
            <span className="admin-count-info">Hiển thị {visible.length} / {articles.length} thông báo</span>
          </div>
        </div>

        {loading && <div className="news-admin-state">Đang tải dữ liệu thông báo...</div>}
        {error && <div className="news-admin-state error">{error}</div>}
        {!loading && !error && responseMode && responseInbox.length === 0 && <div className="news-admin-state">Chưa có nhân viên phản hồi thông báo.</div>}
        {!loading && !error && !responseMode && visible.length === 0 && <div className="news-admin-state">{searchTerm ? "Không tìm thấy thông báo phù hợp với từ khóa." : "Chưa có thông báo nào được gửi."}</div>}

        {!loading && !error && responseMode && responseInbox.map((item) => (<article key={item.notification_id} className="news-admin-row notification-response-row">
            <div className="admin-news-thumb response-thumb"><MessageSquareReply size={22} /></div>
            <div className="news-admin-row-content">
              <div className="news-row-top-line">
                <span className="news-category-badge response">PHẢN HỒI MỚI</span>
                {item.pending && <span className="article-status pending">Chờ trả lời</span>}
              </div>
              <strong className="news-row-title">{item.latest_response?.last_name} {item.latest_response?.first_name} · {item.latest_response?.sender_staff_id}</strong>
              <p className="news-row-summary">{item.latest_response?.message}</p>
              <div className="news-row-meta">
                <span className="meta-item"><Clock3 size={12} /> {new Date(item.latest_response?.created_at).toLocaleString("vi-VN")}</span>
                <span className="meta-divider">•</span>
                <span className="meta-item">Thông báo: <b>{item.title}</b></span>
                <span className="meta-divider">•</span>
                <span className="meta-item"><b>{item.response_count}</b> tin nhắn</span>
              </div>
            </div>
            <div className="admin-news-buttons">
              <button type="button" className="btn-view" onClick={() => onOpenResponse(item)}><MessageSquareReply size={13} /> {item.pending ? "Trả lời" : "Xem lại"}</button>
            </div>
          </article>))}

        {!loading && !error && !responseMode && visible.map((article) => {
            const isPriority = article.category === "Thông báo ưu tiên";
            const isSystem = article.category === "Thông báo hệ thống";
            const tone = isPriority ? "priority" : isSystem ? "system" : "internal";
            const readPct = article.recipientCount > 0 ? Math.round((article.readCount / article.recipientCount) * 100) : 0;

            return (
              <article key={article.id} className="news-admin-row">
                <div className={`admin-news-thumb ${article.imageUrl ? "has-image" : tone}`}>
                  {article.imageUrl ? (
                    <img src={article.imageUrl} alt="Ảnh thông báo" />
                  ) : isPriority ? (
                    <ShieldAlert size={22} />
                  ) : isSystem ? (
                    <BellRing size={22} />
                  ) : (
                    <Building2 size={22} />
                  )}
                </div>

                <div className="news-admin-row-content">
                  <div className="news-row-top-line">
                    <span className={`news-category-badge ${tone}`}>{article.category}</span>
                    {article.status !== "published" && (
                      <span className={`article-status ${article.status}`}>
                        {article.status === "scheduled" ? "Đã hẹn giờ" : "Bản nháp"}
                      </span>
                    )}
                  </div>
                  <strong className="news-row-title">{article.title}</strong>

                  <p className="news-row-summary">{article.summary}</p>

                  <div className="news-row-meta">
                    <span className="meta-item">
                      <Clock3 size={12} />
                      {article.status === "scheduled" ? "Hẹn giờ gửi: " : "Gửi lúc: "}
                      {new Date(article.updatedAt).toLocaleString("vi-VN")}
                    </span>
                    <span className="meta-divider">•</span>
                    <span className="meta-item">Tác giả: <b>{article.author}</b></span>

                    {notificationMode && article.recipientCount > 0 && (
                      <>
                        <span className="meta-divider">•</span>
                        <span className="news-read-pill" title={`${article.readCount}/${article.recipientCount} đã đọc`}>
                          <span className="mini-progress-bar"><i style={{ width: `${Math.min(100, readPct)}%` }} /></span>
                          <b>{article.readCount}/{article.recipientCount} đã đọc ({readPct}%)</b>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="admin-news-buttons">
                  <button type="button" className="btn-view" onClick={() => onOpen(article)}>
                    <Eye size={13} /> Xem chi tiết
                  </button>
                  <button type="button" className="btn-edit" title="Sửa thông báo" onClick={() => setEditorArticle(article)}>
                    <Edit3 size={13} /> Sửa
                  </button>
                  <button type="button" className="btn-delete" title="Xóa thông báo" onClick={() => onDelete(article.id)}>
                    <Trash2 size={13} /> Xóa
                  </button>
                </div>
              </article>
            );
          })}
      </section>

      {editorArticle !== undefined && (<NewsEditor notificationMode={notificationMode} article={editorArticle ?? undefined} onClose={() => setEditorArticle(undefined)} onSave={async (article) => {
                await onSave(article);
                setEditorArticle(undefined);
            }} departments={departments}/>)}
    </div>);
}
function CheckCheckIcon() {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-check">
      <path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>
    </svg>);
}
