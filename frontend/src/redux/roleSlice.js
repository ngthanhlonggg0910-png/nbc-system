import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { deleteData, getData, patchData, postData } from "@/utils/api";

const normalizeRole = (role) => ({
  id: role.id,
  code: role.code ?? "",
  name: role.name ?? role.code ?? "Nhóm quyền",
  description: role.description ?? "",
  permissions: Array.isArray(role.permissions) ? role.permissions : [],
  createdAt: role.created_at ?? null,
  userCount: Number(role.user_count ?? role.userCount ?? 0),
});

const responseData = (response) => {
  const body = response?.data;
  if (body?.error || body?.success === false) throw new Error(body?.message || "Yêu cầu không thành công.");
  return body;
};

const errorMessage = (error) => error?.response?.data?.message || error?.message || "Không thể kết nối đến máy chủ.";

export const fetchRoles = createAsyncThunk("roles/fetch", async (_, { rejectWithValue }) => {
  try {
    const body = responseData(await getData("/api/role"));
    return (Array.isArray(body?.data) ? body.data : []).map(normalizeRole);
  } catch (error) { return rejectWithValue(errorMessage(error)); }
});

export const createRole = createAsyncThunk("roles/create", async (payload, { rejectWithValue }) => {
  try {
    const body = responseData(await postData("/api/role/create", payload));
    return { role: normalizeRole(body.data), message: body.message };
  } catch (error) { return rejectWithValue(errorMessage(error)); }
});

export const editRole = createAsyncThunk("roles/edit", async ({ id, data }, { rejectWithValue }) => {
  try {
    const body = responseData(await patchData(`/api/role/edit/${id}`, data));
    return { role: normalizeRole(body.data), message: body.message };
  } catch (error) { return rejectWithValue(errorMessage(error)); }
});

export const removeRole = createAsyncThunk("roles/delete", async (id, { rejectWithValue }) => {
  try {
    const body = responseData(await deleteData(`/api/role/deleted/${id}`));
    return { id, message: body.message };
  } catch (error) { return rejectWithValue(errorMessage(error)); }
});

export const saveRolePermissions = createAsyncThunk("roles/permissions", async (roles, { rejectWithValue }) => {
  try {
    const payload = roles.map(({ id, permissions }) => ({ id, permissions }));
    const body = responseData(await patchData("/api/role/permissions", payload));
    return { payload, message: body.message };
  } catch (error) { return rejectWithValue(errorMessage(error)); }
});

const roleSlice = createSlice({
  name: "roles",
  initialState: { items: [], loading: false, loaded: false, saving: false, error: null },
  reducers: {
    updateRolePermissionsLocal: (state, action) => {
      const role = state.items.find((item) => item.id === action.payload.roleId);
      if (role) role.permissions = action.payload.permissions;
    },
    clearRoleError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRoles.fulfilled, (state, action) => { state.loading = false; state.loaded = true; state.items = action.payload; })
      .addCase(fetchRoles.rejected, (state, action) => { state.loading = false; state.loaded = true; state.error = action.payload; });
    for (const thunk of [createRole, editRole, removeRole, saveRolePermissions]) {
      builder.addCase(thunk.pending, (state) => { state.saving = true; state.error = null; });
      builder.addCase(thunk.rejected, (state, action) => { state.saving = false; state.error = action.payload; });
    }
    builder
      .addCase(createRole.fulfilled, (state, action) => { state.saving = false; state.items.push(action.payload.role); })
      .addCase(editRole.fulfilled, (state, action) => { state.saving = false; const index = state.items.findIndex((item) => item.id === action.payload.role.id); if (index !== -1) state.items[index] = action.payload.role; })
      .addCase(removeRole.fulfilled, (state, action) => { state.saving = false; state.items = state.items.filter((item) => item.id !== action.payload.id); })
      .addCase(saveRolePermissions.fulfilled, (state) => { state.saving = false; });
  },
});

export const { updateRolePermissionsLocal, clearRoleError } = roleSlice.actions;
export default roleSlice.reducer;
