import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";

import {
  cancelPayrollPeriod,
  createPayrollPeriod,
  getPayrollPeriodDetail,
  getPayrollPeriods,
  getPayrollPeriodStatistics,
  getPayrollPublishPreview,
  lockPayrollPeriod,
  publishPayrollPeriod,
  updatePayrollPeriod,
} from "../../api/payroll/payrollPeriod.api";

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
 * Helper này lấy phần data.
 */
function getResponseBody(payload) {
  // Trường hợp apiClient trả nguyên Axios response:
  // response.data = { success, message, data, pagination }
  if (
    payload?.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data) &&
    "success" in payload.data
  ) {
    return payload.data;
  }

  // Trường hợp API layer đã return response.data
  return payload ?? null;
}

function getResponseData(payload) {
  const body = getResponseBody(payload);

  return body?.data ?? null;
}

function getResponsePagination(payload) {
  const body = getResponseBody(payload);

  return body?.pagination ?? null;
}

/**
 * Thay period trong danh sách sau create/update/cancel/lock.
 */
function upsertPeriod(items, period) {
  if (!period?.id) {
    return;
  }

  const index = items.findIndex(
    (item) => Number(item.id) === Number(period.id),
  );

  if (index === -1) {
    items.unshift(period);
    return;
  }

  items[index] = {
    ...items[index],
    ...period,
  };
}

/**
 * GET /api/payroll/admin/periods
 */
export const fetchPayrollPeriods = createAsyncThunk(
  "payrollPeriod/fetchPayrollPeriods",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await getPayrollPeriods(params);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error),
      );
    }
  },
);

/**
 * GET /api/payroll/admin/periods/:periodId
 */
export const fetchPayrollPeriodDetail = createAsyncThunk(
  "payrollPeriod/fetchPayrollPeriodDetail",
  async (periodId, { rejectWithValue }) => {
    try {
      return await getPayrollPeriodDetail(periodId);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error),
      );
    }
  },
);

/**
 * POST /api/payroll/admin/periods
 */
export const addPayrollPeriod = createAsyncThunk(
  "payrollPeriod/addPayrollPeriod",
  async (data, { rejectWithValue }) => {
    try {
      return await createPayrollPeriod(data);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error),
      );
    }
  },
);

/**
 * PATCH /api/payroll/admin/periods/:periodId
 *
 * dispatch:
 * updatePayrollPeriodThunk({
 *   periodId: 1,
 *   data: {...}
 * })
 */
export const updatePayrollPeriodThunk =
  createAsyncThunk(
    "payrollPeriod/updatePayrollPeriod",
    async (
      {
        periodId,
        data,
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await updatePayrollPeriod(
          periodId,
          data,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * POST /api/payroll/admin/periods/:periodId/cancel
 */
export const cancelPayrollPeriodThunk =
  createAsyncThunk(
    "payrollPeriod/cancelPayrollPeriod",
    async (
      {
        periodId,
        data = {},
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await cancelPayrollPeriod(
          periodId,
          data,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

  /**
 * GET /api/payroll/admin/periods/:periodId/publish-preview
 *
 * Kiểm tra điều kiện trước khi phát hành lương.
 */
export const fetchPayrollPublishPreview =
  createAsyncThunk(
    "payrollPeriod/fetchPayrollPublishPreview",
    async (
      periodId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollPublishPreview(
          periodId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * POST /api/payroll/admin/periods/:periodId/publish
 *
 * API layer tự gửi:
 * {
 *   confirmed: true
 * }
 */
export const publishPayrollPeriodThunk =
  createAsyncThunk(
    "payrollPeriod/publishPayrollPeriod",
    async (
      periodId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await publishPayrollPeriod(
          periodId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * POST /api/payroll/admin/periods/:periodId/lock
 */
export const lockPayrollPeriodThunk =
  createAsyncThunk(
    "payrollPeriod/lockPayrollPeriod",
    async (
      periodId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await lockPayrollPeriod(periodId);
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * GET /api/payroll/admin/periods/:periodId/statistics
 */
export const fetchPayrollPeriodStatistics =
  createAsyncThunk(
    "payrollPeriod/fetchPayrollPeriodStatistics",
    async (
      periodId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollPeriodStatistics(
          periodId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

const initialState = {
  items: [],

  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

selectedPeriod: null,
statistics: null,

publishPreview: null,

listLoading: false,
detailLoading: false,
actionLoading: false,
statisticsLoading: false,
publishPreviewLoading: false,

error: null,
};

const payrollPeriodSlice = createSlice({
  name: "payrollPeriod",

  initialState,

  reducers: {
    clearPayrollPeriodError(state) {
      state.error = null;
    },

  clearSelectedPayrollPeriod(state) {
  state.selectedPeriod = null;
  state.statistics = null;
  state.publishPreview = null;
},
  },

  extraReducers: (builder) => {
    builder

      /**
       * Danh sách kỳ lương
       */
      .addCase(
        fetchPayrollPeriods.pending,
        (state) => {
          state.listLoading = true;
          state.error = null;
        },
      )

      .addCase(
  fetchPayrollPeriods.fulfilled,
  (state, action) => {
    state.listLoading = false;

    const data =
      getResponseData(action.payload);

    const pagination =
      getResponsePagination(
        action.payload,
      );

    state.items =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];

    state.pagination = {
      page: Number(
        pagination?.page ?? 1,
      ),

      limit: Number(
        pagination?.limit ?? 20,
      ),

      total: Number(
        pagination?.totalItems ??
          pagination?.total ??
          0,
      ),

      totalPages: Number(
        pagination?.totalPages ??
          0,
      ),
    };
  },
)

      .addCase(
        fetchPayrollPeriods.rejected,
        (state, action) => {
          state.listLoading = false;

          state.error =
            action.payload ||
            "Không thể tải danh sách kỳ lương";
        },
      )

      /**
       * Chi tiết kỳ
       */
      .addCase(
        fetchPayrollPeriodDetail.pending,
        (state) => {
          state.detailLoading = true;
          state.error = null;
        },
      )

      .addCase(
        fetchPayrollPeriodDetail.fulfilled,
        (state, action) => {
          state.detailLoading = false;

          state.selectedPeriod =
            getResponseData(action.payload);
        },
      )

      .addCase(
        fetchPayrollPeriodDetail.rejected,
        (state, action) => {
          state.detailLoading = false;

          state.error =
            action.payload ||
            "Không thể tải chi tiết kỳ lương";
        },
      )

      /**
       * Tạo kỳ
       */
      .addCase(
        addPayrollPeriod.pending,
        (state) => {
          state.actionLoading = true;
          state.error = null;
        },
      )

      .addCase(
        addPayrollPeriod.fulfilled,
        (state, action) => {
          state.actionLoading = false;

          const period =
            getResponseData(action.payload);

          if (period) {
            upsertPeriod(
              state.items,
              period,
            );

            state.selectedPeriod =
              period;
          }
        },
      )

      .addCase(
        addPayrollPeriod.rejected,
        (state, action) => {
          state.actionLoading = false;

          state.error =
            action.payload ||
            "Không thể tạo kỳ lương";
        },
      )

      /**
       * Cập nhật kỳ
       */
      .addCase(
        updatePayrollPeriodThunk.pending,
        (state) => {
          state.actionLoading = true;
          state.error = null;
        },
      )

      .addCase(
        updatePayrollPeriodThunk.fulfilled,
        (state, action) => {
          state.actionLoading = false;

          const period =
            getResponseData(action.payload);

          if (period) {
            upsertPeriod(
              state.items,
              period,
            );

            state.selectedPeriod =
              period;
          }
        },
      )

      .addCase(
        updatePayrollPeriodThunk.rejected,
        (state, action) => {
          state.actionLoading = false;

          state.error =
            action.payload ||
            "Không thể cập nhật kỳ lương";
        },
      )

      /**
       * Hủy kỳ
       */
      .addCase(
        cancelPayrollPeriodThunk.pending,
        (state) => {
          state.actionLoading = true;
          state.error = null;
        },
      )

      .addCase(
        cancelPayrollPeriodThunk.fulfilled,
        (state, action) => {
          state.actionLoading = false;

          const period =
            getResponseData(action.payload);

          if (period) {
            upsertPeriod(
              state.items,
              period,
            );

            state.selectedPeriod =
              period;
          }
        },
      )

      .addCase(
        cancelPayrollPeriodThunk.rejected,
        (state, action) => {
          state.actionLoading = false;

          state.error =
            action.payload ||
            "Không thể hủy kỳ lương";
        },
      )
      /**
       * Xem trước phát hành lương
       */
     .addCase(
  fetchPayrollPublishPreview.pending,
  (state) => {
    state.publishPreviewLoading = true;
    state.publishPreview = null;
    state.error = null;
  },
)

      .addCase(
        fetchPayrollPublishPreview.fulfilled,
        (state, action) => {
          state.publishPreviewLoading = false;

          state.publishPreview =
            getResponseData(action.payload);
        },
      )

      .addCase(
        fetchPayrollPublishPreview.rejected,
        (state, action) => {
          state.publishPreviewLoading = false;

          state.publishPreview = null;

          state.error =
            action.payload ||
            "Không thể kiểm tra điều kiện phát hành lương";
        },
      )

      /**
       * Phát hành lương
       */
      .addCase(
        publishPayrollPeriodThunk.pending,
        (state) => {
          state.actionLoading = true;
          state.error = null;
        },
      )

      .addCase(
        publishPayrollPeriodThunk.fulfilled,
        (state, action) => {
          state.actionLoading = false;

          const result =
            getResponseData(action.payload);

          const publishedPeriod =
            result?.period ?? null;

          if (publishedPeriod?.id) {
            const periodId =
              Number(publishedPeriod.id);

            const index =
              state.items.findIndex(
                (item) =>
                  Number(item.id) ===
                  periodId,
              );

            const publication = {
              publishedAt:
                publishedPeriod.publishedAt ??
                null,

              publishedBy:
                publishedPeriod.publishedBy ??
                null,

              publishedByName:
                publishedPeriod.publishedByName ??
                null,
            };

            if (index !== -1) {
              state.items[index] = {
                ...state.items[index],

                status:
                  publishedPeriod.status,

                publication: {
                  ...state.items[index]
                    ?.publication,

                  ...publication,
                },
              };
            }

            if (
              Number(
                state.selectedPeriod?.id,
              ) === periodId
            ) {
              state.selectedPeriod = {
                ...state.selectedPeriod,

                status:
                  publishedPeriod.status,

                publication: {
                  ...state.selectedPeriod
                    ?.publication,

                  ...publication,
                },
              };
            }
          }

          /**
           * Preview cũ không còn hợp lệ
           * sau khi publish.
           *
           * UI sẽ fetch lại khi cần.
           */
          state.publishPreview = null;
        },
      )

      .addCase(
        publishPayrollPeriodThunk.rejected,
        (state, action) => {
          state.actionLoading = false;

          state.error =
            action.payload ||
            "Không thể phát hành lương";
        },
      )

      /**
       * Khóa kỳ
       */
      .addCase(
        lockPayrollPeriodThunk.pending,
        (state) => {
          state.actionLoading = true;
          state.error = null;
        },
      )

      .addCase(
        lockPayrollPeriodThunk.fulfilled,
        (state, action) => {
          state.actionLoading = false;

          const period =
            getResponseData(action.payload);

          if (period) {
            upsertPeriod(
              state.items,
              period,
            );

            state.selectedPeriod =
              period;
          }
        },
      )

      .addCase(
        lockPayrollPeriodThunk.rejected,
        (state, action) => {
          state.actionLoading = false;

          state.error =
            action.payload ||
            "Không thể khóa kỳ lương";
        },
      )

      /**
       * Thống kê kỳ
       */
      .addCase(
        fetchPayrollPeriodStatistics.pending,
        (state) => {
          state.statisticsLoading = true;
          state.error = null;
        },
      )

      .addCase(
        fetchPayrollPeriodStatistics.fulfilled,
        (state, action) => {
          state.statisticsLoading = false;

          state.statistics =
            getResponseData(action.payload);
        },
      )

      .addCase(
        fetchPayrollPeriodStatistics.rejected,
        (state, action) => {
          state.statisticsLoading = false;

          state.error =
            action.payload ||
            "Không thể tải thống kê kỳ lương";
        },
      );
  },
});

export const {
  clearPayrollPeriodError,
  clearSelectedPayrollPeriod,
} = payrollPeriodSlice.actions;

export default payrollPeriodSlice.reducer;