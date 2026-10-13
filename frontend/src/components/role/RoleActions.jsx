import React from "react";
import { Pencil, Trash2 } from "lucide-react";

export default function RoleActions({
  role,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  return (
    <div className="flex gap-2 px-2">
      {canEdit && (
        <button
          type="button"
          onClick={() => onEdit(role)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dde6eb] bg-[#f5f8f9] px-3 font-bold text-[#536d80]"
        >
          <Pencil size={13} /> Sửa
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(role)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#fff3f4] px-3 font-bold text-[#d54a59]"
        >
          <Trash2 size={13} /> Xóa
        </button>
      )}
    </div>
  );
}
