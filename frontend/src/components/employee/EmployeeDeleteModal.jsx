import React from "react";
import { Trash2, X } from "lucide-react";

export default function EmployeeDeleteModal({ employee, saving, error, onCancel, onConfirm }) {
  if (!employee) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#071c2f]/55 p-4 backdrop-blur-[2px]" onMouseDown={() => !saving && onCancel()}><section role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
    <div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ffeaec] text-[#d54858]"><Trash2 size={20} /></span><button type="button" disabled={saving} onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg text-[#7b8fa1]"><X size={18} /></button></div>
    <h2 className="mb-0 mt-4 text-lg font-bold text-[#173a57]">Xóa nhân viên?</h2><p className="mb-0 mt-2 text-sm leading-6 text-[#6f8497]">Bạn có chắc muốn xóa <strong className="text-[#173a57]">{employee.name}</strong> ({employee.id})?</p>
    {error && <p className="mb-0 mt-3 rounded-lg bg-[#fff0f1] px-3 py-2 text-xs text-[#c63d4c]">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={saving} onClick={onCancel} className="h-10 rounded-xl border border-[#d7e2e9] px-4 text-sm font-bold text-[#526f85]">Hủy</button><button type="button" disabled={saving} onClick={() => onConfirm(employee.id)} className="h-10 rounded-xl bg-[#d54858] px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? "Đang xóa..." : "Xác nhận xóa"}</button></div>
  </section></div>;
}
