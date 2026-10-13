import React, { useState } from "react";
import {
  ArrowLeft,
  Paperclip,
  FileText,
  Link2,
  ExternalLink,
  Search,
  Newspaper,
  Leaf,
  ChevronRight,
  Bell,
  Inbox,
  Filter,
  Calendar,
  RotateCcw,
  X
} from "lucide-react";
import { PageTitle } from "@/components/common/PageTitle";

function parseNoticeDate(notice) {
  if (notice.publishedAt) {
    const d = new Date(notice.publishedAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (notice.time) {
    const match = notice.time.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }
  if (notice.year) {
    return new Date(notice.year, 0, 1);
  }
  return null;
}

export function NewsPage({ articles, notices = [], selectedArticleId, onSelectArticle, onOpenNotification, onNotifications, unreadCount }) {
    const [activeTab, setActiveTab] = useState("notices"); // "notices" | "news"
    const [keyword, setKeyword] = useState("");

    // Notification search & filter states
    const [noticeKeyword, setNoticeKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // "all" | "unread" | "read"
    const [datePreset, setDatePreset] = useState("all"); // "all" | "today" | "7days" | "30days" | "custom"
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const recentNotices = notices.slice().sort((a, b) => new Date(b.publishedAt ?? 0) - new Date(a.publishedAt ?? 0));
    const published = articles.filter((item) => item.status === "published").slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const selected = published.find((item) => item.id === selectedArticleId);
    const visible = published.filter((item) => `${item.title} ${item.summary} ${item.category}`.toLocaleLowerCase("vi").includes(keyword.toLocaleLowerCase("vi")));

    const unreadNoticeCount = recentNotices.filter((n) => !n.read).length;

    // Filtered notices calculation
    const visibleNotices = recentNotices.filter((notice) => {
      // 1. Search keyword
      if (noticeKeyword.trim()) {
        const kw = noticeKeyword.trim().toLowerCase();
        const titleMatch = notice.title?.toLowerCase().includes(kw);
        const descMatch = notice.description?.toLowerCase().includes(kw);
        const timeMatch = notice.time?.toLowerCase().includes(kw);
        if (!titleMatch && !descMatch && !timeMatch) return false;
      }

      // 2. Status filter
      if (statusFilter === "unread" && notice.read) return false;
      if (statusFilter === "read" && !notice.read) return false;

      // 3. Date filter
      const nDate = parseNoticeDate(notice);
      if (nDate) {
        const now = new Date();
        if (datePreset === "today") {
          const isSameDay =
            nDate.getDate() === now.getDate() &&
            nDate.getMonth() === now.getMonth() &&
            nDate.getFullYear() === now.getFullYear();
          if (!isSameDay) return false;
        } else if (datePreset === "7days") {
          const diffDays = (now.getTime() - nDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        } else if (datePreset === "30days") {
          const diffDays = (now.getTime() - nDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        } else if (datePreset === "custom") {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (nDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (nDate > end) return false;
          }
        }
      }

      return true;
    });

    const hasActiveNoticeFilters =
      noticeKeyword.trim() !== "" ||
      statusFilter !== "all" ||
      datePreset !== "all" ||
      startDate !== "" ||
      endDate !== "";

    const resetNoticeFilters = () => {
      setNoticeKeyword("");
      setStatusFilter("all");
      setDatePreset("all");
      setStartDate("");
      setEndDate("");
    };

    if (selected) {
        return (
          <div className="page news-detail-page">
            <button className="back-button" onClick={() => onSelectArticle(undefined)}><ArrowLeft /> Quay lại danh sách</button>
            <article className="section-block news-detail">
              <div className="news-detail-meta">
                <span>{selected.category}</span>
                <time>Cập nhật {new Date(selected.updatedAt).toLocaleString("vi-VN")}</time>
              </div>
              <h1>{selected.title}</h1>
              <p className="news-lead">{selected.summary}</p>
              {selected.imageUrl && <img className="news-cover" src={selected.imageUrl} alt={selected.title}/>}
              <div className="rich-content" dangerouslySetInnerHTML={{ __html: selected.content }}/>
              {selected.attachments.length > 0 && (
                <section className="article-attachments">
                  <h2><Paperclip /> Tệp và liên kết đính kèm</h2>
                  {selected.attachments.map((file) => (
                    <a key={file.id} href={file.url} target="_blank" rel="noreferrer">
                      <span>{file.type === "pdf" ? <FileText /> : file.type === "link" ? <Link2 /> : <Paperclip />}</span>
                      <div>
                        <strong>{file.name}</strong>
                        <small>{file.type === "link" ? "Liên kết ngoài" : "Tệp đính kèm"}</small>
                      </div>
                      <ExternalLink />
                    </a>
                  ))}
                </section>
              )}
              <footer>Đăng bởi <strong>{selected.author}</strong></footer>
            </article>
          </div>
        );
    }

    return (
      <div className="page news-page">
        <PageTitle title="Thông báo & Tin tức" subtitle="Cập nhật thông tin mới nhất từ NBC" onNotifications={onNotifications} unreadCount={unreadCount}/>

        {/* 2 Sub-menu Tabs */}
        <div className="news-nav-tabs">
          <button
            type="button"
            className={`news-tab-btn ${activeTab === "notices" ? "active" : ""}`}
            onClick={() => setActiveTab("notices")}
          >
            <Bell size={18} />
            <span>Thông báo hệ thống</span>
            <span className={`tab-badge ${unreadNoticeCount > 0 ? "unread-badge" : ""}`}>
              {recentNotices.length}
            </span>
          </button>

          <button
            type="button"
            className={`news-tab-btn ${activeTab === "news" ? "active" : ""}`}
            onClick={() => setActiveTab("news")}
          >
            <Newspaper size={18} />
            <span>Tin tức & Bài viết</span>
            <span className="tab-badge">{published.length}</span>
          </button>
        </div>

        {/* Tab 1: Thông báo */}
        {activeTab === "notices" && (
          <section className="section-block notice-feed">
            <div className="notice-feed-head">
              <Bell />
              <h2>Danh sách thông báo</h2>
            </div>

            {/* Notification Search & Filter Toolbar */}
            <div className="notice-filter-toolbar">
              <div className="notice-search-box">
                <Search size={16} />
                <input
                  type="text"
                  value={noticeKeyword}
                  onChange={(e) => setNoticeKeyword(e.target.value)}
                  placeholder="Tìm kiếm thông báo theo tiêu đề, nội dung..."
                />
                {noticeKeyword && (
                  <button className="clear-btn" onClick={() => setNoticeKeyword("")} title="Xóa tìm kiếm">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="notice-filter-controls">
                <div className="filter-group">
                  <Filter size={14} />
                  <span className="filter-label">Trạng thái:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">Tất cả ({recentNotices.length})</option>
                    <option value="unread">Chưa đọc ({unreadNoticeCount})</option>
                    <option value="read">Đã đọc ({recentNotices.length - unreadNoticeCount})</option>
                  </select>
                </div>

                <div className="filter-group">
                  <Calendar size={14} />
                  <span className="filter-label">Thời gian:</span>
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">Tất cả thời gian</option>
                    <option value="today">Hôm nay</option>
                    <option value="7days">7 ngày gần nhất</option>
                    <option value="30days">30 ngày gần nhất</option>
                    <option value="custom">Tùy chọn khoảng ngày...</option>
                  </select>
                </div>

                {datePreset === "custom" && (
                  <div className="filter-custom-date">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="date-input"
                      title="Từ ngày"
                    />
                    <span>đến</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="date-input"
                      title="Đến ngày"
                    />
                  </div>
                )}

                {hasActiveNoticeFilters && (
                  <button
                    type="button"
                    className="reset-filter-btn"
                    onClick={resetNoticeFilters}
                  >
                    <RotateCcw size={13} />
                    <span>Xóa bộ lọc</span>
                  </button>
                )}
              </div>
            </div>

            {hasActiveNoticeFilters && (
              <div className="notice-filter-summary">
                <span>Tìm thấy <strong>{visibleNotices.length}</strong> / <strong>{recentNotices.length}</strong> thông báo</span>
              </div>
            )}

            {visibleNotices.length > 0 ? (
              <div className="notice-feed-list">
                {visibleNotices.map((notice) => (
                  <button key={notice.id} type="button" className={`notice-feed-item ${notice.read ? "" : "unread"}`} onClick={() => onOpenNotification?.(notice)}>
                    <span className={`notice-feed-icon ${notice.tone ?? "blue"}`}><Bell size={16} /></span>
                    <span className="notice-feed-copy">
                      <strong>{notice.title}</strong>
                      <p>{notice.description}</p>
                      <time>{notice.time}</time>
                    </span>
                    {!notice.read && <i className="notice-feed-dot" />}
                    <ChevronRight />
                  </button>
                ))}
              </div>
            ) : (
              <div className="section-block news-empty">
                <Inbox size={42} />
                <strong>{hasActiveNoticeFilters ? "Không tìm thấy thông báo phù hợp" : "Chưa có thông báo nào"}</strong>
                <p>{hasActiveNoticeFilters ? "Thử thay đổi từ khóa hoặc điều kiện lọc ngày." : "Bạn sẽ nhận được thông báo khi có cập nhật mới."}</p>
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Tin tức */}
        {activeTab === "news" && (
          <>
            <div className="news-list-toolbar">
              <div className="search-box">
                <Search />
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm bài viết, chủ đề..."/>
              </div>
              <span>{visible.length} bài viết</span>
            </div>
            <section className="news-feed">
              {visible.map((article, index) => (
                <article key={article.id} className={`section-block news-feed-item ${index === 0 ? "featured" : ""}`} onClick={() => onSelectArticle(article.id)}>
                  <div className="news-feed-visual">
                    {article.imageUrl ? <img src={article.imageUrl} alt=""/> : <><Newspaper /><Leaf /></>}
                  </div>
                  <div className="news-feed-copy">
                    <div>
                      <span>{article.category}</span>
                      {index === 0 && <i>Mới nhất</i>}
                    </div>
                    <h2>{article.title}</h2>
                    <p>{article.summary}</p>
                    <footer>
                      <time>{new Date(article.updatedAt).toLocaleDateString("vi-VN")}</time>
                      <span>{article.author}</span>
                      {article.attachments.length > 0 && <span><Paperclip /> {article.attachments.length}</span>}
                    </footer>
                  </div>
                  <ChevronRight />
                </article>
              ))}
              {visible.length === 0 && (
                <div className="section-block news-empty">
                  <Search />
                  <strong>Không tìm thấy bài viết</strong>
                  <p>Hãy thử một từ khóa khác.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    );
}


