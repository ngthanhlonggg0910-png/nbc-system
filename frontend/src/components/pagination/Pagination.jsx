import React from "react";
import "../../styles/globals/pagination.css";

export default function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    onPageChange(nextPage);
  };

  return (
    <div className="pagination">
      <button
        className="pagination-button"
        onClick={() => goToPage(page - 1)}
        disabled={page === 1}
      >
        ← Trước
      </button>

      <div className="pagination-info">
        Trang <strong>{page}</strong> / {totalPages}
      </div>

      <button
        className="pagination-button"
        onClick={() => goToPage(page + 1)}
        disabled={page === totalPages}
      >
        Sau →
      </button>
    </div>
  );
}
