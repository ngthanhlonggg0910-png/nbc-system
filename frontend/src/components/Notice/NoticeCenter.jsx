import React, { useState } from "react";
import { X, Search, ChevronRight, Bell, Plus, History } from "lucide-react";
export function NoticeCenter({ notices, onClose, onOpen, onMarkAll, onCreate, onViewSent }) {
    const [filter, setFilter] = useState("all");
    const [keyword, setKeyword] = useState("");
    const years = Array.from(new Set(notices.map((item) => item.year))).sort((a, b) => b - a);
    const [year, setYear] = useState(String(years[0] ?? new Date().getFullYear()));
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi");
    const visible = (filter === "all" ? notices : notices.filter((item) => !item.read))
        .filter((item) => year === "all" || item.year === Number(year))
        .filter((item) => !normalizedKeyword || `${item.title} ${item.description}`.toLocaleLowerCase("vi").includes(normalizedKeyword))
        .slice().sort((a, b) => Number(a.read) - Number(b.read));
    const unread = notices.filter((item) => !item.read).length;
    const hasManagementActions = Boolean(onCreate || onViewSent);
    return (<>
      <button className="notification-scrim" aria-label="Đóng thông báo" onClick={onClose}/>
      <aside className="notification-panel" aria-label="Trung tâm thông báo">
        <div className="notification-head">
          <div>
            <span>TRUNG TÂM THÔNG BÁO</span>
            <h2>Thông báo</h2>
          </div>
          <button onClick={onClose} aria-label="Đóng"><X /></button>
        </div>
        {hasManagementActions && (
          <div className="notification-admin-actions">
            <div><strong>Quản trị thông báo</strong><span>Gửi thông báo mới hoặc theo dõi các thông báo đã gửi</span></div>
            {onViewSent && <button className="notification-sent-action" onClick={onViewSent}><History /> Đã gửi</button>}
            {onCreate && <button className="notification-create-action" onClick={onCreate}><Plus /> Tạo thông báo</button>}
          </div>
        )}
        <div className="notification-toolbar">
          <div>
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tất cả</button>
            <button className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>Chưa đọc <span>{unread}</span></button>
          </div>
          <button className="mark-all" onClick={onMarkAll} disabled={unread === 0}><CheckCheckIcon /> Đánh dấu đã đọc</button>
        </div>
        <div className="notification-search">
          <label>
            <Search />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo nội dung thông báo..."/>
          </label>
          <select aria-label="Lọc thông báo theo năm" value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">Tất cả năm</option>
            {years.map((item) => <option key={item} value={item}>Năm {item}</option>)}
          </select>
        </div>
        <div className="notification-list">
          {visible.length === 0 ? (<div className="empty-notifications">
              <Search />
              <strong>{notices.length === 0 ? "Chưa có thông báo nhận được" : "Không tìm thấy thông báo phù hợp"}</strong>
              <span>{notices.length === 0 && hasManagementActions ? "Các thông báo gửi đến tài khoản quản trị sẽ xuất hiện tại đây." : "Thử thay đổi từ khóa, năm hoặc trạng thái đã đọc."}</span>
            </div>) : (visible.map((notice, index) => (<div key={notice.id}>
                {(index === 0 || (visible[index - 1].read !== notice.read)) && (<div className="notification-group-label">{notice.read ? "Trước đó" : "Mới"}</div>)}
                <button className={`notification-item ${notice.read ? "read" : "unread"}`} onClick={() => onOpen(notice)}>
                  <span className={`notice-icon ${notice.tone}`}><notice.icon /></span>
                  <span className="notice-copy">
                    <strong>{notice.title}</strong>
                    <span>{notice.description}</span>
                    <time>{notice.time}</time>
                  </span>
                  {!notice.read && <i className="unread-dot"/>}
                  <ChevronRight className="notice-arrow"/>
                </button>
              </div>)))}
        </div>
        <div className="notification-foot"><Bell /><span>Bạn sẽ nhận thông báo về chấm công, lương và văn bản.</span></div>
      </aside>
    </>);
}
function CheckCheckIcon() {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-check">
      <path d="M18 6 7 17l-5-5"/>
      <path d="m22 10-7.5 7.5L13 16"/>
    </svg>);
}
