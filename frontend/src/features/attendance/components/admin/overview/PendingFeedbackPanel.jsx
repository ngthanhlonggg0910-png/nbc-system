import { useState } from "react";
import { ChevronRight, Reply } from "lucide-react";

export default function PendingFeedbackPanel({ groups = [], onOpenFeedback }) {
  const [expandedEmployee, setExpandedEmployee] = useState(null);

  return (
    <section className="section-block admin-preview">
      <div className="section-heading compact">
        <div>
          <span className="section-kicker">CẦN XỬ LÝ</span>
          <h2>Phản hồi mới nhất</h2>
        </div>

        <button type="button" className="text-button" onClick={onOpenFeedback}>
          Xem tất cả <ChevronRight />
        </button>
      </div>

      {groups.map((group) => {
        const expanded = expandedEmployee === group.key;
        const latest = group.items[0];

        return (
          <div
            className={`admin-feedback-group${expanded ? " expanded" : ""}`}
            key={group.key}
          >
            <button
              type="button"
              className="admin-preview-row admin-feedback-group-toggle"
              aria-expanded={expanded}
              onClick={() => setExpandedEmployee(expanded ? null : group.key)}
            >
              <span>
                <Reply />
              </span>

              <div>
                <strong>
                  {group.employee}
                  {group.staffId && group.employee !== group.staffId
                    ? ` - ${group.staffId}`
                    : ""}
                </strong>
                <p>{latest?.message}</p>
                <small>{group.items.length} phản hồi đang chờ</small>
              </div>

              <span className="admin-feedback-count">{group.items.length}</span>

              <ChevronRight className="admin-feedback-chevron" />
            </button>

            {expanded && (
              <div className="admin-feedback-group-items">
                {group.items.map((item) => (
                  <div className="admin-feedback-item" key={item.id}>
                    <div>
                      <p>{item.message}</p>
                      <small>
                        {item.date} · {item.createdAt}
                      </small>
                    </div>

                    <button type="button" onClick={onOpenFeedback}>
                      Xem xử lý
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
