import React from "react";

export default function AttendanceTrendPanel({ trendDays = [], trendMax = 1 }) {
  return (
    <section className="section-block admin-insight-panel">
      <div className="section-heading compact">
        <div>
          <span className="section-kicker">7 NGÀY GẦN NHẤT</span>
          <h2>Xu hướng chấm công</h2>
        </div>
        <div className="admin-chart-legend">
          <span>
            <i className="full" />
            Đủ công
          </span>
          <span>
            <i className="issue" />
            Bất thường
          </span>
        </div>
      </div>
      {trendDays.length ? (
        <div
          className="admin-attendance-chart"
          aria-label="Biểu đồ xu hướng chấm công"
        >
          {trendDays.map((day) => (
            <div
              className="admin-chart-day"
              key={day.date}
              title={`${day.date}: ${day.full} đủ công, ${day.issue} bất thường`}
            >
              <div>
                <i
                  className="full"
                  style={{
                    height: `${Math.max(4, (day.full / trendMax) * 100)}%`,
                  }}
                />
                <i
                  className="issue"
                  style={{
                    height: `${Math.max(4, (day.issue / trendMax) * 100)}%`,
                  }}
                />
              </div>
              <strong>{day.label}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-dashboard-empty">
          Chưa có dữ liệu chấm công để vẽ biểu đồ.
        </div>
      )}
    </section>
  );
}
