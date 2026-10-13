import React from "react";
import { Pencil, Trash2 } from "lucide-react";

export default function EmployeeActions({ employee, canEdit = true, canDelete = true, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1.5">
      {canEdit && <button
        type="button"
        onClick={() => onEdit(employee)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#cfe0eb] bg-[#f4f8fb] text-[#0879b9] transition hover:border-[#0879b9] hover:bg-[#e8f4fb]"
        aria-label={`Cập nhật ${employee.name}`}
        title="Cập nhật"
      >
        <Pencil size={14} />
      </button>}
      {canDelete && <button
        type="button"
        onClick={() => onDelete(employee)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#f1d2d6] bg-[#fff7f7] text-[#d54858] transition hover:border-[#d54858] hover:bg-[#ffeaec]"
        aria-label={`Xóa ${employee.name}`}
        title="Xóa"
      >
        <Trash2 size={14} />
      </button>}
    </div>
  );
}
