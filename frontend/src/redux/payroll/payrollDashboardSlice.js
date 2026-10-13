import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";

import {
  getPayrollDashboard,
} from "../../api/payroll/payrollDashboard.api";

/**
 * Lấy message lỗi từ Axios/backend.
 */
function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Đã xảy ra lỗi"
  );
}

/**
 * Backend trả:
 * {
 *   success,
 *   message,
 *   data
 * }
 *
 * Helper này lấy response body theo cùng pattern
 * với các payroll slice hiện tại.
 */
function getResponseBody(payload) {
  // Trường hợp nhận nguyên Axios response.
  if (
    payload?.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data) &&
    "success" in payload.data
  ) {
    return payload.data;
  }

  // API layer hiện return response.data.
  return payload ?? null;
}

function getResponseData(payload) {
  const body = getResponseBody(payload);

  return body?.data ?? null;
}

/**
 * GET /api/payroll/admin/dashboard
 *
 * params:
 * {
 *   periodCode
 * }
 */
export const fetchPayrollDashboard =
  createAsyncThunk(
    "payrollDashboard/fetchPayrollDashboard",
    async (
      params = {},
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollDashboard(
          params,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

const initialState = {
  data: null,

  loading: false,

  error: null,
};

const payrollDashboardSlice = createSlice({
  name: "payrollDashboard",

  initialState,

  reducers: {
    clearPayrollDashboardError(state) {
      state.error = null;
    },

    clearPayrollDashboard(state) {
      state.data = null;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(
        fetchPayrollDashboard.pending,
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )

      .addCase(
        fetchPayrollDashboard.fulfilled,
        (state, action) => {
          state.loading = false;

          state.data =
            getResponseData(action.payload);

          state.error = null;
        },
      )

      .addCase(
        fetchPayrollDashboard.rejected,
        (state, action) => {
          state.loading = false;

          state.error =
            action.payload ||
            "Không thể tải tổng quan quản lý lương";
        },
      );
  },
});

export const {
  clearPayrollDashboard,
  clearPayrollDashboardError,
} = payrollDashboardSlice.actions;

export default payrollDashboardSlice.reducer;
