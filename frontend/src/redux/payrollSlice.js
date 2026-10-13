import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";

import {
  compareMyPayslipVersions,
  confirmMyPayslip,
  createMyPayrollFeedback,
  getMyPayroll12MonthReport,
  getMyPayslipDetail,
  getMyPayslips,
  getMyPayslipVersions,
} from "@/api/payroll.api";
import {
  mapPayroll12MonthReport,
  mapPayslipDetail,
  mapPayslipList,
  mapPayslipVersions,
} from "@/page/Salary/payroll.mapper";

const currentYear = new Date().getFullYear();
const currentMonth = new Date()
  .toISOString()
  .slice(0, 7);

const getErrorMessage = (
  error,
  defaultMessage,
) =>
  error?.message ||
  error?.data?.message ||
  defaultMessage;

/**
 * GET /api/payroll/me
 */
export const fetchMyPayslips = createAsyncThunk(
  "payroll/fetchMyPayslips",
  async (
    {
      year = currentYear,
      page = 1,
      limit = 12,
    } = {},
    {
      rejectWithValue,
    },
  ) => {
    try {
      const result = await getMyPayslips({
        year,
        page,
        limit,
      });

      return {
        payslips: mapPayslipList(result.data ?? []),
        pagination: result.pagination ?? null,
        year,
      };
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(
          error,
          "Không thể tải danh sách phiếu lương.",
        ),
      );
    }
  },
);

/**
 * GET /api/payroll/me/:payslipId
 */
export const fetchMyPayslipDetail =
  createAsyncThunk(
    "payroll/fetchMyPayslipDetail",
    async (
      payslipId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        const result =
          await getMyPayslipDetail(
            payslipId,
          );

        return mapPayslipDetail(result.data ?? {});
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
            "Không thể tải chi tiết phiếu lương.",
          ),
        );
      }
    },
  );

/**
 * POST /api/payroll/me/:payslipId/confirm
 */
export const confirmPayslip =
  createAsyncThunk(
    "payroll/confirmPayslip",
    async (
      payslipId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        const result =
          await confirmMyPayslip(
            payslipId,
            true,
          );

        return {
          payslipId,
          data: result.data ?? null,
          message:
            result.message ??
            "Xác nhận phiếu lương thành công.",
        };
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
            "Không thể xác nhận phiếu lương.",
          ),
        );
      }
    },
  );

export const submitPayrollFeedback = createAsyncThunk(
  "payroll/submitPayrollFeedback",
  async (
    { payslipId, payload },
    { rejectWithValue },
  ) => {
    try {
      const result = await createMyPayrollFeedback(
        payslipId,
        payload,
      );

      return {
        payslipId,
        data: result.data,
        message: result.message ?? "Đã gửi phản hồi đến HR.",
      };
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Không thể gửi phản hồi phiếu lương."),
      );
    }
  },
);

/**
 * GET /api/payroll/me/:payslipId/versions
 */
export const fetchPayslipVersions =
  createAsyncThunk(
    "payroll/fetchPayslipVersions",
    async (
      payslipId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        const result =
          await getMyPayslipVersions(
            payslipId,
          );

        return mapPayslipVersions(result.data ?? {});
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
            "Không thể tải lịch sử phiếu lương.",
          ),
        );
      }
    },
  );

/**
 * GET /api/payroll/me/:payslipId/comparison
 */
export const fetchPayslipComparison =
  createAsyncThunk(
    "payroll/fetchPayslipComparison",
    async (
      {
        payslipId,
        fromVersion,
        toVersion,
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        const result =
          await compareMyPayslipVersions(
            payslipId,
            {
              fromVersion,
              toVersion,
            },
          );

        return result.data ?? null;
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
            "Không thể đối chiếu phiên bản phiếu lương.",
          ),
        );
      }
    },
  );

/**
 * GET /api/payroll/me/12-month
 */
export const fetchPayroll12MonthReport =
  createAsyncThunk(
    "payroll/fetchPayroll12MonthReport",
    async (
      {
        year = currentYear,
      } = {},
      {
        rejectWithValue,
      },
    ) => {
      try {
        const result =
          await getMyPayroll12MonthReport({
            year,
          });

        return {
          data: mapPayroll12MonthReport(result.data),
          endMonth: `${year}-12`,
        };
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
            "Không thể tải báo cáo lương 12 tháng.",
          ),
        );
      }
    },
  );

const initialState = {
  payslips: [],
  selectedPayslip: null,
  selectedPayslipId: null,

  versions: [],
  comparison: null,
  report12Month: null,

  pagination: null,
  selectedYear: currentYear,
  reportEndMonth: currentMonth,

  listStatus: "idle",
  detailStatus: "idle",
  confirmStatus: "idle",
  feedbackStatus: "idle",
  versionsStatus: "idle",
  comparisonStatus: "idle",
  reportStatus: "idle",

  error: null,
  listError: null,
  detailError: null,
  confirmError: null,
  feedbackError: null,
  versionsError: null,
  comparisonError: null,
  reportError: null,
  confirmMessage: null,
  feedbackMessage: null,
};

const payrollSlice = createSlice({
  name: "payroll",
  initialState,

  reducers: {
    setSelectedYear(state, action) {
      state.selectedYear =
        Number(action.payload);

      state.payslips = [];
      state.report12Month = null;
      state.pagination = null;
      state.listStatus = "idle";
      state.reportStatus = "idle";
      state.selectedPayslip = null;
      state.selectedPayslipId = null;
      state.detailStatus = "idle";
      state.listError = null;
      state.reportError = null;
      state.error = null;
    },

    setSelectedPayslipId(
      state,
      action,
    ) {
      state.selectedPayslipId =
        action.payload ?? null;

      if (!action.payload) {
        state.selectedPayslip = null;
        state.detailStatus = "idle";
      }

      state.versions = [];
      state.comparison = null;
      state.confirmMessage = null;
      state.feedbackMessage = null;
      state.feedbackError = null;
      state.error = null;
    },

    setReportEndMonth(
      state,
      action,
    ) {
      state.reportEndMonth =
        action.payload;
    },

    clearSelectedPayslip(state) {
      state.selectedPayslip = null;
      state.selectedPayslipId = null;
      state.versions = [];
      state.comparison = null;
      state.detailStatus = "idle";
      state.versionsStatus = "idle";
      state.comparisonStatus = "idle";
      state.confirmStatus = "idle";
      state.confirmMessage = null;
      state.error = null;
    },

    clearPayrollError(state) {
      state.error = null;
    },

    clearPayslipComparison(state) {
      state.comparison = null;
      state.comparisonStatus = "idle";
    },

    resetPayrollState() {
      return initialState;
    },
  },

  extraReducers: (builder) => {
    builder
      /*
       * Danh sách phiếu lương
       */
      .addCase(
        fetchMyPayslips.pending,
        (state) => {
          state.listStatus = "loading";
          state.error = null;
          state.listError = null;
        },
      )
      .addCase(
        fetchMyPayslips.fulfilled,
        (state, action) => {
          state.listStatus = "succeeded";
          state.listError = null;
          state.payslips =
            action.payload.payslips;
          state.pagination =
            action.payload.pagination;
          state.selectedYear =
            action.payload.year;
        },
      )
      .addCase(
        fetchMyPayslips.rejected,
        (state, action) => {
          state.listStatus = "failed";
          state.payslips = [];
          state.pagination = null;
          state.error =
            action.payload ||
            "Không thể tải danh sách phiếu lương.";
          state.listError = state.error;
        },
      )

      /*
       * Chi tiết phiếu lương
       */
      .addCase(
        fetchMyPayslipDetail.pending,
        (state, action) => {
          state.detailStatus = "loading";
          state.selectedPayslipId =
            action.meta.arg;
          state.selectedPayslip = null;
          state.error = null;
          state.detailError = null;
        },
      )
      .addCase(
        fetchMyPayslipDetail.fulfilled,
        (state, action) => {
          state.detailStatus = "succeeded";
          state.detailError = null;
          state.selectedPayslip =
            action.payload;
        },
      )
      .addCase(
        fetchMyPayslipDetail.rejected,
        (state, action) => {
          state.detailStatus = "failed";
          state.selectedPayslip = null;
          state.error =
            action.payload ||
            "Không thể tải chi tiết phiếu lương.";
          state.detailError = state.error;
        },
      )

      /*
       * Xác nhận phiếu lương
       */
      .addCase(
        confirmPayslip.pending,
        (state) => {
          state.confirmStatus = "loading";
          state.confirmMessage = null;
          state.error = null;
          state.confirmError = null;
        },
      )
      .addCase(
        confirmPayslip.fulfilled,
        (state, action) => {
          state.confirmStatus = "succeeded";
          state.confirmMessage =
            action.payload.message;
          state.confirmError = null;

          if (action.payload.data) {
            state.selectedPayslip = {
              ...state.selectedPayslip,
              ...action.payload.data,
            };
          }

          state.payslips =
            state.payslips.map(
              (payslip) => {
                const id =
                  payslip.id ??
                  payslip.payslip_id;

                if (
                  Number(id) !==
                  Number(
                    action.payload
                      .payslipId,
                  )
                ) {
                  return payslip;
                }

                return {
                  ...payslip,
                  status: "confirmed",
                  confirmed: true,
                  ...action.payload.data,
                };
              },
            );
        },
      )
      .addCase(
        confirmPayslip.rejected,
        (state, action) => {
          state.confirmStatus = "failed";
          state.error =
            action.payload ||
            "Không thể xác nhận phiếu lương.";
          state.confirmError = state.error;
        },
      )

      .addCase(submitPayrollFeedback.pending, (state) => {
        state.feedbackStatus = "loading";
        state.feedbackError = null;
        state.feedbackMessage = null;
      })
      .addCase(submitPayrollFeedback.fulfilled, (state, action) => {
        state.feedbackStatus = "succeeded";
        state.feedbackMessage = action.payload.message;
        state.feedbackError = null;

        if (state.selectedPayslip) {
          state.selectedPayslip = {
            ...state.selectedPayslip,
            status: "employee_feedback",
            feedbackSummary: {
              openCount: Number(state.selectedPayslip.feedbackSummary?.openCount ?? 0) + 1,
              latestStatus: action.payload.data?.status ?? "pending",
              latest: action.payload.data ?? null,
            },
          };
        }

        state.payslips = state.payslips.map((payslip) =>
          Number(payslip.id) === Number(action.payload.payslipId)
            ? { ...payslip, status: "employee_feedback" }
            : payslip,
        );
      })
      .addCase(submitPayrollFeedback.rejected, (state, action) => {
        state.feedbackStatus = "failed";
        state.feedbackError = action.payload || "Không thể gửi phản hồi phiếu lương.";
      })

      /*
       * Lịch sử phiên bản
       */
      .addCase(
        fetchPayslipVersions.pending,
        (state) => {
          state.versionsStatus = "loading";
          state.versions = [];
          state.error = null;
          state.versionsError = null;
        },
      )
      .addCase(
        fetchPayslipVersions.fulfilled,
        (state, action) => {
          state.versionsStatus =
            "succeeded";
          state.versions =
            action.payload.versions ?? [];
          state.versionsError = null;
        },
      )
      .addCase(
        fetchPayslipVersions.rejected,
        (state, action) => {
          state.versionsStatus = "failed";
          state.versions = [];
          state.error =
            action.payload ||
            "Không thể tải lịch sử phiếu lương.";
          state.versionsError = state.error;
        },
      )

      /*
       * Đối chiếu phiên bản
       */
      .addCase(
        fetchPayslipComparison.pending,
        (state) => {
          state.comparisonStatus =
            "loading";
          state.comparison = null;
          state.error = null;
          state.comparisonError = null;
        },
      )
      .addCase(
        fetchPayslipComparison.fulfilled,
        (state, action) => {
          state.comparisonStatus =
            "succeeded";
          state.comparison =
            action.payload;
          state.comparisonError = null;
        },
      )
      .addCase(
        fetchPayslipComparison.rejected,
        (state, action) => {
          state.comparisonStatus =
            "failed";
          state.comparison = null;
          state.error =
            action.payload ||
            "Không thể đối chiếu phiên bản.";
          state.comparisonError = state.error;
        },
      )

      /*
       * Báo cáo 12 tháng
       */
      .addCase(
        fetchPayroll12MonthReport.pending,
        (state) => {
          state.reportStatus = "loading";
          state.error = null;
          state.reportError = null;
        },
      )
      .addCase(
        fetchPayroll12MonthReport.fulfilled,
        (state, action) => {
          state.reportStatus =
            "succeeded";
          state.report12Month =
            action.payload.data;
          state.reportError = null;
          state.reportEndMonth =
            action.payload.endMonth;
        },
      )
      .addCase(
        fetchPayroll12MonthReport.rejected,
        (state, action) => {
          state.reportStatus = "failed";
          state.report12Month = null;
          state.error =
            action.payload ||
            "Không thể tải báo cáo lương 12 tháng.";
          state.reportError = state.error;
        },
      );
  },
});

export const {
  setSelectedYear,
  setSelectedPayslipId,
  setReportEndMonth,
  clearSelectedPayslip,
  clearPayrollError,
  clearPayslipComparison,
  resetPayrollState,
} = payrollSlice.actions;

export default payrollSlice.reducer;
