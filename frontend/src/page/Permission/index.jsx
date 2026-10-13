import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Check, Save } from "lucide-react";
import { permissionGroups } from "@/utils/data/roles";

import {
  saveRolePermissions,
  updateRolePermissionsLocal,
} from "@/redux/roleSlice";

export default function Permissions() {
  const dispatch = useDispatch();
  const {
    items: roles,
    loading,
    saving,
    error,
  } = useSelector((state) => state.roles);
  const [saved, setSaved] = useState(false);
  const togglePermission = (role, code) =>
    dispatch(
      updateRolePermissionsLocal({
        roleId: role.id,
        permissions: role.permissions.includes(code)
          ? role.permissions.filter((item) => item !== code)
          : [...role.permissions, code],
      }),
    );
  const save = async () => {
    setSaved(false);
    const result = await dispatch(saveRolePermissions(roles));
    if (saveRolePermissions.fulfilled.match(result)) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  };
  const columns = `minmax(280px, 1.45fr) repeat(${roles.length}, minmax(160px, 1fr))`;

  return (
    <section className="min-h-full px-4 pb-28 pt-5 text-[#183e5b] sm:px-6 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-[1450px]">
        <header className="grid gap-4 sm:grid-cols-3 sm:items-center">
          <div>
            <p className="m-0 text-xs text-[#718597]">
              Gán các quyền chức năng cho từng nhóm quyền
            </p>
            <h1 className="mb-0 mt-2 text-xl font-medium text-[#173f5e]">
              Phân quyền
            </h1>
          </div>
          <button
            disabled={!roles.length || saving}
            onClick={save}
            className="inline-flex h-11 items-center justify-center gap-2 justify-self-center rounded-xl bg-gradient-to-r from-[#0874bd] to-[#18a357] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={17} /> {saving ? "Đang lưu..." : "Lưu phân quyền"}
          </button>
          <span className="hidden sm:block" />
        </header>
        {saved && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#cce9dd] bg-[#e9f8f1] px-4 py-3 text-sm font-bold text-[#087d5a]">
            <Check size={17} /> Đã lưu cấu hình phân quyền thành công.
          </div>
        )}
        {!loading && error && (
          <div className="mt-5 rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-[#c63d4c]">
            {error}
          </div>
        )}
        <div className="mt-7 overflow-x-auto rounded-2xl border border-[#dce7ed] bg-white p-4 shadow-[0_8px_28px_rgba(31,70,96,.04)] sm:p-5">
          {loading && (
            <p className="m-0 py-10 text-center text-sm text-[#718597]">
              Đang tải dữ liệu phân quyền...
            </p>
          )}
          {!loading && roles.length > 0 && (
            <div
              style={{
                minWidth: `${Math.max(880, 300 + roles.length * 180)}px`,
              }}
            >
              <div
                className="grid bg-[#f4f7f9] px-3 text-xs font-bold text-[#657a8b]"
                style={{ gridTemplateColumns: columns }}
              >
                <div className="px-2 py-3">Quyền / Chức năng</div>
                {roles.map((role) => (
                  <div key={role.id} className="px-2 py-3 text-center">
                    {role.name}
                  </div>
                ))}
              </div>
              {permissionGroups.map((group) => (
                <div key={group.module}>
                  <div className="border-y border-[#dbe7ed] bg-[#edf5f7] px-5 py-2.5 text-xs font-extrabold uppercase tracking-[.05em] text-[#087f82]">
                    {group.module}
                  </div>
                  {group.permissions.map((permission) => (
                    <article
                      key={permission.code}
                      className="grid min-h-[54px] items-center border-b border-[#e5ecf1] px-3 text-xs last:border-0"
                      style={{ gridTemplateColumns: columns }}
                    >
                      <strong className="px-2 text-[#17394f]">
                        {permission.label}
                      </strong>
                      {roles.map((role) => (
                        <div key={role.id} className="grid place-items-center">
                          <label className="relative grid h-6 w-6 cursor-pointer place-items-center">
                            <input
                              type="checkbox"
                              checked={role.permissions.includes(
                                permission.code,
                              )}
                              onChange={() =>
                                togglePermission(role, permission.code)
                              }
                              className="peer h-[18px] w-[18px] appearance-none rounded-[3px] border border-[#8a999f] checked:border-[#15998e] checked:bg-[#15998e]"
                            />
                            <Check
                              size={14}
                              strokeWidth={3}
                              className="pointer-events-none absolute hidden text-white peer-checked:block"
                            />
                          </label>
                        </div>
                      ))}
                    </article>
                  ))}
                </div>
              ))}
            </div>
          )}
          {!loading && roles.length === 0 && (
            <p className="m-0 py-10 text-center text-sm text-[#718597]">
              Chưa có nhóm quyền.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
