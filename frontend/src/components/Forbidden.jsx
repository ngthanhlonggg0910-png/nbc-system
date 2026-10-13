import React from "react";
import { ShieldX } from "lucide-react";

export default function Forbidden() {
  return <section className="grid min-h-[65vh] place-items-center p-5"><div className="max-w-md rounded-2xl border border-[#dce6ed] bg-white p-8 text-center shadow-sm"><ShieldX className="mx-auto text-[#d54858]" size={42} /><strong className="mt-4 block text-3xl text-[#173f5e]">403</strong><h1 className="mt-2 text-lg text-[#173f5e]">Bạn không có quyền truy cập trang này.</h1><p className="mb-0 text-sm text-[#718597]">Vui lòng liên hệ quản trị viên nếu bạn cần được cấp thêm quyền.</p></div></section>;
}
