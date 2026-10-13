import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";

import {
  acceptPayrollFeedback,
  createPayrollAdjustment,
  getPayrollAdjustmentContext,
  getPayrollFeedbackAdjustments,
  getPayrollFeedbackDetail,
  getPayrollFeedbacks,
  getPayrollFeedbackStatistics,
  getPayrollPayslipAdjustments,
  compareAdminPayslipVersions,
  getAdminPayslipVersionDetail,
  getAdminPayslipVersions,
  previewPayrollAdjustment,
  rejectPayrollFeedback,
  republishPayrollPayslip,
  resolvePayrollFeedback,
  reviewPayrollFeedback,
} from "../../api/payroll/payrollAdjustment.api";

/**
 * ======================================
 * HELPERS
 * ======================================
 */

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Đã xảy ra lỗi"
  );
}

/**
 * API layer hiện return response.data:
 *
 * {
 *   success,
 *   message,
 *   data,
 *   pagination?
 * }
 *
 * Helper vẫn hỗ trợ trường hợp truyền
 * nguyên Axios response để tránh phụ thuộc.
 */
function getResponseBody(payload) {
  if (
    payload?.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data) &&
    "success" in payload.data
  ) {
    return payload.data;
  }

  return payload ?? null;
}

function getResponseData(payload) {
  const body = getResponseBody(payload);

  return body?.data ?? null;
}

function getResponsePagination(payload) {
  const body = getResponseBody(payload);

  return (
    body?.pagination ??
    body?.data?.pagination ??
    null
  );
}

function getResponseMessage(payload) {
  const body = getResponseBody(payload);

  return body?.message ?? "";
}

/**
 * Một số mutation trả:
 *
 * data: {
 *   feedback: {...},
 *   ...
 * }
 *
 * Trong khi GET detail trả thẳng:
 *
 * data: {...feedback}
 */
function getFeedbackFromPayload(payload) {
  const data = getResponseData(payload);

  return data?.feedback ?? data ?? null;
}

function getFeedbackId(feedback) {
  return (
    feedback?.id ??
    feedback?.feedbackId ??
    feedback?.feedback_id ??
    null
  );
}

function upsertFeedback(items, feedback) {
  const feedbackId =
    getFeedbackId(feedback);

  if (!feedbackId) {
    return;
  }

  const index = items.findIndex(
    (item) =>
      Number(getFeedbackId(item)) ===
      Number(feedbackId),
  );

  if (index === -1) {
    items.unshift(feedback);
    return;
  }

  items[index] = {
    ...items[index],
    ...feedback,
  };
}

function getFeedbackList(payload) {
  const data = getResponseData(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.feedbacks)) {
    return data.feedbacks;
  }

  return [];
}

function getAdjustmentsFromPayload(payload) {
  const data = getResponseData(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data?.adjustments,
    )
  ) {
    return data.adjustments;
  }

  return [];
}

/**
 * ======================================
 * FEEDBACK THUNKS
 * ======================================
 */

/**
 * GET /api/payroll/admin/feedbacks/statistics
 */
export const fetchPayrollFeedbackStatistics =
  createAsyncThunk(
    "payrollAdjustment/fetchFeedbackStatistics",
    async (_, { rejectWithValue }) => {
      try {
        return await getPayrollFeedbackStatistics();
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * GET /api/payroll/admin/feedbacks
 */
export const fetchPayrollFeedbacks =
  createAsyncThunk(
    "payrollAdjustment/fetchFeedbacks",
    async (
      params = {},
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollFeedbacks(
          params,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * GET /api/payroll/admin/feedbacks/:feedbackId
 */
export const fetchPayrollFeedbackDetail =
  createAsyncThunk(
    "payrollAdjustment/fetchFeedbackDetail",
    async (
      feedbackId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollFeedbackDetail(
          feedbackId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * POST review
 */
export const reviewPayrollFeedbackThunk =
  createAsyncThunk(
    "payrollAdjustment/reviewFeedback",
    async (
      feedbackId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await reviewPayrollFeedback(
          feedbackId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * POST accept
 *
 * dispatch:
 *
 * acceptPayrollFeedbackThunk({
 *   feedbackId,
 *   hrReply,
 * })
 */
export const acceptPayrollFeedbackThunk =
  createAsyncThunk(
    "payrollAdjustment/acceptFeedback",
    async (
      {
        feedbackId,
        hrReply = "",
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await acceptPayrollFeedback(
          feedbackId,
          {
            hrReply,
          },
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * POST reject
 */
export const rejectPayrollFeedbackThunk =
  createAsyncThunk(
    "payrollAdjustment/rejectFeedback",
    async (
      {
        feedbackId,
        hrReply = "",
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await rejectPayrollFeedback(
          feedbackId,
          {
            hrReply,
          },
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * POST resolve
 */
export const resolvePayrollFeedbackThunk =
  createAsyncThunk(
    "payrollAdjustment/resolveFeedback",
    async (
      {
        feedbackId,
        hrReply = "",
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await resolvePayrollFeedback(
          feedbackId,
          {
            hrReply,
          },
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

  /**
 * ======================================
 * ADJUSTMENT CONTEXT
 * ======================================
 */

/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/adjustment-context
 *
 * Lấy payslip + toàn bộ salary items hiện tại
 * để dựng form điều chỉnh.
 */
export const fetchPayrollAdjustmentContext =
  createAsyncThunk(
    "payrollAdjustment/fetchAdjustmentContext",
    async (
      payslipId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollAdjustmentContext(
          payslipId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * POST adjustment preview.
 *
 * Preview có transaction ngắn phía backend
 * nhưng rollback, không persist thay đổi.
 */
export const previewPayrollAdjustmentThunk =
  createAsyncThunk(
    "payrollAdjustment/previewAdjustment",
    async (
      {
        payslipId,
        adjustments = [],
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await previewPayrollAdjustment(
          payslipId,
          {
            adjustments,
          },
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * POST điều chỉnh thật.
 */
export const createPayrollAdjustmentThunk =
  createAsyncThunk(
    "payrollAdjustment/createAdjustment",
    async (
      {
        payslipId,
        feedbackId = null,
        changeReason = "",
        adjustments = [],
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await createPayrollAdjustment(
          payslipId,
          {
            feedbackId,
            changeReason,
            adjustments,
          },
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * GET adjustment history của payslip.
 */
export const fetchPayrollPayslipAdjustments =
  createAsyncThunk(
    "payrollAdjustment/fetchPayslipAdjustments",
    async (
      payslipId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollPayslipAdjustments(
          payslipId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * GET adjustment history theo feedback.
 */
export const fetchPayrollFeedbackAdjustments =
  createAsyncThunk(
    "payrollAdjustment/fetchFeedbackAdjustments",
    async (
      feedbackId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollFeedbackAdjustments(
          feedbackId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * ======================================
 * REPUBLISH
 * ======================================
 */

/**
 * POST phát hành lại payslip đã adjusted.
 */
export const republishPayrollPayslipThunk =
  createAsyncThunk(
    "payrollAdjustment/republishPayslip",
    async (
      {
        payslipId,
        message = "",
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await republishPayrollPayslip(
          payslipId,
          {
            message,
          },
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

/**
 * ======================================
 * STATE
 * ======================================
 */

const initialState = {
  feedbacks: [],

  feedbackPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  statistics: null,

  selectedFeedback: null,

  /**
 * Payslip + salary items thật dùng cho
 * màn hình điều chỉnh.
 */
adjustmentContext: null,

  /**
   * History theo payslip.
   */
  payslipAdjustments: [],

  payslipAdjustmentSummary: null,

  /**
   * History theo feedback.
   */
  feedbackAdjustments: [],

  feedbackAdjustmentSummary: null,

  payslipVersions: [],
  selectedPayslipVersion: null,
  versionComparison: null,
  /**
   * Kết quả POST preview.
   */
  adjustmentPreview: null,

  /**
   * Lưu response của mutation gần nhất:
   * adjust / republish...
   *
   * Có ích cho UI hiển thị nextAction.
   */
  lastActionResult: null,

  listLoading: false,
  detailLoading: false,
  statisticsLoading: false,
  contextLoading: false,
  adjustmentsLoading: false,
  previewLoading: false,
  versionsLoading: false,
  versionDetailLoading: false,
  comparisonLoading: false,
  actionLoading: false,

  successMessage: "",
  error: null,
};

/**
 * ======================================
 * SLICE
 * ======================================
 */


/**
 * ======================================
 * PAYSLIP VERSION - ADMIN / HR
 * ======================================
 */

export const fetchAdminPayslipVersions =
  createAsyncThunk(
    "payrollAdjustment/fetchAdminPayslipVersions",
    async (
      payslipId,
      { rejectWithValue },
    ) => {
      try {
        return await getAdminPayslipVersions(
          payslipId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

export const fetchAdminPayslipVersionDetail =
  createAsyncThunk(
    "payrollAdjustment/fetchAdminPayslipVersionDetail",
    async (
      {
        payslipId,
        versionNumber,
      },
      { rejectWithValue },
    ) => {
      try {
        return await getAdminPayslipVersionDetail(
          payslipId,
          versionNumber,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

export const compareAdminPayslipVersionsThunk =
  createAsyncThunk(
    "payrollAdjustment/compareAdminPayslipVersions",
    async (
      {
        payslipId,
        fromVersion,
        toVersion,
      },
      { rejectWithValue },
    ) => {
      try {
        return await compareAdminPayslipVersions(
          payslipId,
          {
            fromVersion,
            toVersion,
          },
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(error),
        );
      }
    },
  );

const payrollAdjustmentSlice =
  createSlice({
    name: "payrollAdjustment",

    initialState,

    reducers: {
      clearPayrollAdjustmentError(
        state,
      ) {
        state.error = null;
      },

      clearPayrollAdjustmentSuccess(
        state,
      ) {
        state.successMessage = "";
      },

      clearPayrollAdjustmentPreview(
        state,
      ) {
        state.adjustmentPreview = null;
      },

      clearSelectedPayrollFeedback(
        state,
      ) {
        state.selectedFeedback = null;
          state.adjustmentContext = null;


        state.payslipAdjustments = [];
        state.payslipAdjustmentSummary =
          null;

        state.feedbackAdjustments = [];
        state.feedbackAdjustmentSummary =
          null;

        state.adjustmentPreview = null;
        state.lastActionResult = null;

        state.adjustmentContext = null;
        state.contextLoading = false;
      },

      clearPayrollAdjustmentState(
        state,
      ) {
        state.feedbacks = [];

        state.feedbackPagination = {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        };

        state.statistics = null;
        state.selectedFeedback = null;

        state.payslipAdjustments = [];
        state.payslipAdjustmentSummary =
          null;

        state.feedbackAdjustments = [];
        state.feedbackAdjustmentSummary =
          null;

        state.adjustmentPreview = null;
        state.lastActionResult = null;

        state.listLoading = false;
        state.detailLoading = false;
        state.statisticsLoading = false;
        state.adjustmentsLoading = false;
        state.previewLoading = false;
        state.actionLoading = false;

        state.successMessage = "";
        state.error = null;
      },
    },

    extraReducers: (builder) => {
      /**
       * ==================================
       * FEEDBACK STATISTICS
       * ==================================
       */

      builder
        .addCase(
          fetchPayrollFeedbackStatistics.pending,
          (state) => {
            state.statisticsLoading = true;
            state.error = null;
          },
        )
        .addCase(
          fetchPayrollFeedbackStatistics.fulfilled,
          (
            state,
            action,
          ) => {
            state.statisticsLoading = false;

            state.statistics =
              getResponseData(
                action.payload,
              );
          },
        )
        .addCase(
          fetchPayrollFeedbackStatistics.rejected,
          (
            state,
            action,
          ) => {
            state.statisticsLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể tải thống kê phản hồi.";
          },
        );

      /**
       * ==================================
       * FEEDBACK LIST
       * ==================================
       */

      builder
        .addCase(
          fetchPayrollFeedbacks.pending,
          (state) => {
            state.listLoading = true;
            state.error = null;
          },
        )
        .addCase(
          fetchPayrollFeedbacks.fulfilled,
          (
            state,
            action,
          ) => {
            state.listLoading = false;

            state.feedbacks =
              getFeedbackList(
                action.payload,
              );

            const pagination =
              getResponsePagination(
                action.payload,
              );

            if (pagination) {
              state.feedbackPagination = {
                ...state.feedbackPagination,
                ...pagination,
              };
            }
          },
        )
        .addCase(
          fetchPayrollFeedbacks.rejected,
          (
            state,
            action,
          ) => {
            state.listLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể tải danh sách phản hồi.";
          },
        );

      /**
       * ==================================
       * FEEDBACK DETAIL
       * ==================================
       */

      builder
        .addCase(
          fetchPayrollFeedbackDetail.pending,
          (state) => {
            state.detailLoading = true;
            state.error = null;
          },
        )
        .addCase(
          fetchPayrollFeedbackDetail.fulfilled,
          (
            state,
            action,
          ) => {
            state.detailLoading = false;

            const feedback =
              getFeedbackFromPayload(
                action.payload,
              );

            state.selectedFeedback =
              feedback;

            if (feedback) {
              upsertFeedback(
                state.feedbacks,
                feedback,
              );
            }
          },
        )
        .addCase(
          fetchPayrollFeedbackDetail.rejected,
          (
            state,
            action,
          ) => {
            state.detailLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể tải chi tiết phản hồi.";
          },
        );

      /**
       * ==================================
       * REVIEW
       * ==================================
       */

      builder
        .addCase(
          reviewPayrollFeedbackThunk.pending,
          (state) => {
            state.actionLoading = true;
            state.error = null;
            state.successMessage = "";
          },
        )
        .addCase(
          reviewPayrollFeedbackThunk.fulfilled,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            const feedback =
              getFeedbackFromPayload(
                action.payload,
              );

            if (feedback) {
              state.selectedFeedback =
                feedback;

              upsertFeedback(
                state.feedbacks,
                feedback,
              );
            }

            state.successMessage =
              getResponseMessage(
                action.payload,
              );
          },
        )
        .addCase(
          reviewPayrollFeedbackThunk.rejected,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể tiếp nhận phản hồi.";
          },
        );

      /**
       * ==================================
       * ACCEPT
       * ==================================
       */

      builder
        .addCase(
          acceptPayrollFeedbackThunk.pending,
          (state) => {
            state.actionLoading = true;
            state.error = null;
            state.successMessage = "";
          },
        )
        .addCase(
          acceptPayrollFeedbackThunk.fulfilled,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            const feedback =
              getFeedbackFromPayload(
                action.payload,
              );

            if (feedback) {
              state.selectedFeedback =
                feedback;

              upsertFeedback(
                state.feedbacks,
                feedback,
              );
            }

            state.lastActionResult =
              getResponseData(
                action.payload,
              );

            state.successMessage =
              getResponseMessage(
                action.payload,
              );
          },
        )
        .addCase(
          acceptPayrollFeedbackThunk.rejected,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể xác nhận phản hồi.";
          },
        );

      /**
       * ==================================
       * REJECT
       * ==================================
       */

      builder
        .addCase(
          rejectPayrollFeedbackThunk.pending,
          (state) => {
            state.actionLoading = true;
            state.error = null;
            state.successMessage = "";
          },
        )
        .addCase(
          rejectPayrollFeedbackThunk.fulfilled,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            const feedback =
              getFeedbackFromPayload(
                action.payload,
              );

            if (feedback) {
              state.selectedFeedback =
                feedback;

              upsertFeedback(
                state.feedbacks,
                feedback,
              );
            }

            state.successMessage =
              getResponseMessage(
                action.payload,
              );
          },
        )
        .addCase(
          rejectPayrollFeedbackThunk.rejected,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể từ chối phản hồi.";
          },
        );

      /**
       * ==================================
       * RESOLVE
       * ==================================
       */

      builder
        .addCase(
          resolvePayrollFeedbackThunk.pending,
          (state) => {
            state.actionLoading = true;
            state.error = null;
            state.successMessage = "";
          },
        )
        .addCase(
          resolvePayrollFeedbackThunk.fulfilled,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            const feedback =
              getFeedbackFromPayload(
                action.payload,
              );

            if (feedback) {
              state.selectedFeedback =
                feedback;

              upsertFeedback(
                state.feedbacks,
                feedback,
              );
            }

            state.lastActionResult =
              getResponseData(
                action.payload,
              );

            state.successMessage =
              getResponseMessage(
                action.payload,
              );
          },
        )
        .addCase(
          resolvePayrollFeedbackThunk.rejected,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể hoàn tất phản hồi.";
          },
        );

        /**
 * ==================================
 * ADJUSTMENT CONTEXT
 * ==================================
 */

builder
  .addCase(
    fetchPayrollAdjustmentContext.pending,
    (state) => {
      state.contextLoading = true;

      /*
       * Xóa context cũ để tránh hiển thị
       * salary items của payslip trước.
       */
      state.adjustmentContext = null;

      state.error = null;
    },
  )
  .addCase(
    fetchPayrollAdjustmentContext.fulfilled,
    (
      state,
      action,
    ) => {
      state.contextLoading = false;

      state.adjustmentContext =
        getResponseData(
          action.payload,
        );
    },
  )
  .addCase(
    fetchPayrollAdjustmentContext.rejected,
    (
      state,
      action,
    ) => {
      state.contextLoading = false;
      state.adjustmentContext = null;

      state.error =
        action.payload ||
        action.error?.message ||
        "Không thể tải dữ liệu điều chỉnh phiếu lương.";
    },
  );

      /**
       * ==================================
       * ADJUSTMENT PREVIEW
       * ==================================
       */

      builder
        .addCase(
          previewPayrollAdjustmentThunk.pending,
          (state) => {
            state.previewLoading = true;
            state.adjustmentPreview = null;
            state.error = null;
          },
        )
        .addCase(
          previewPayrollAdjustmentThunk.fulfilled,
          (
            state,
            action,
          ) => {
            state.previewLoading = false;

            state.adjustmentPreview =
              getResponseData(
                action.payload,
              );
          },
        )
        .addCase(
          previewPayrollAdjustmentThunk.rejected,
          (
            state,
            action,
          ) => {
            state.previewLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể xem trước điều chỉnh.";
          },
        );

      /**
       * ==================================
       * CREATE ADJUSTMENT
       * ==================================
       */

      builder
        .addCase(
          createPayrollAdjustmentThunk.pending,
          (state) => {
            state.actionLoading = true;
            state.error = null;
            state.successMessage = "";
          },
        )
        .addCase(
          createPayrollAdjustmentThunk.fulfilled,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            const data =
              getResponseData(
                action.payload,
              );

            state.lastActionResult =
              data;

            state.adjustmentPreview =
              null;

            if (
              Array.isArray(
                data?.adjustments,
              )
            ) {
              state.payslipAdjustments =
                data.adjustments;

              state.feedbackAdjustments =
                data.adjustments;
            }

            state.successMessage =
              getResponseMessage(
                action.payload,
              );
          },
        )
        .addCase(
          createPayrollAdjustmentThunk.rejected,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể điều chỉnh phiếu lương.";
          },
        );

      /**
       * ==================================
       * PAYSLIP ADJUSTMENTS
       * ==================================
       */

      builder
        .addCase(
          fetchPayrollPayslipAdjustments.pending,
          (state) => {
            state.adjustmentsLoading = true;
            state.error = null;
          },
        )
        .addCase(
          fetchPayrollPayslipAdjustments.fulfilled,
          (
            state,
            action,
          ) => {
            state.adjustmentsLoading = false;

            const data =
              getResponseData(
                action.payload,
              );

            state.payslipAdjustments =
              getAdjustmentsFromPayload(
                action.payload,
              );

            state.payslipAdjustmentSummary =
              data?.summary ?? null;
          },
        )
        .addCase(
          fetchPayrollPayslipAdjustments.rejected,
          (
            state,
            action,
          ) => {
            state.adjustmentsLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể tải lịch sử điều chỉnh.";
          },
        );

      /**
       * ==================================
       * FEEDBACK ADJUSTMENTS
       * ==================================
       */

      builder
        .addCase(
          fetchPayrollFeedbackAdjustments.pending,
          (state) => {
            state.adjustmentsLoading = true;
            state.error = null;
          },
        )
        .addCase(
          fetchPayrollFeedbackAdjustments.fulfilled,
          (
            state,
            action,
          ) => {
            state.adjustmentsLoading = false;

            const data =
              getResponseData(
                action.payload,
              );

            state.feedbackAdjustments =
              getAdjustmentsFromPayload(
                action.payload,
              );

            state.feedbackAdjustmentSummary =
              data?.summary ?? null;
          },
        )
        .addCase(
          fetchPayrollFeedbackAdjustments.rejected,
          (
            state,
            action,
          ) => {
            state.adjustmentsLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể tải lịch sử điều chỉnh theo phản hồi.";
          },
        );

      /**
       * ==================================
       * REPUBLISH
       * ==================================
       */

      /**
       * ==================================
       * PAYSLIP VERSIONS
       * ==================================
       */

      builder
        .addCase(
          fetchAdminPayslipVersions.pending,
          (state) => {
            state.versionsLoading = true;

            state.payslipVersions = [];
            state.selectedPayslipVersion = null;
            state.versionComparison = null;

            state.error = null;
          },
        )
        .addCase(
          fetchAdminPayslipVersions.fulfilled,
          (
            state,
            action,
          ) => {
            state.versionsLoading = false;

            const data =
              getResponseData(
                action.payload,
              );

            state.payslipVersions =
              Array.isArray(data)
                ? data
                : [];
          },
        )
        .addCase(
          fetchAdminPayslipVersions.rejected,
          (
            state,
            action,
          ) => {
            state.versionsLoading = false;
            state.payslipVersions = [];

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể tải lịch sử phiên bản phiếu lương.";
          },
        );

      /**
       * ==================================
       * PAYSLIP VERSION DETAIL
       * ==================================
       */

      builder
        .addCase(
          fetchAdminPayslipVersionDetail.pending,
          (state) => {
            state.versionDetailLoading = true;
            state.selectedPayslipVersion = null;
            state.error = null;
          },
        )
        .addCase(
          fetchAdminPayslipVersionDetail.fulfilled,
          (
            state,
            action,
          ) => {
            state.versionDetailLoading = false;

            state.selectedPayslipVersion =
              getResponseData(
                action.payload,
              );
          },
        )
        .addCase(
          fetchAdminPayslipVersionDetail.rejected,
          (
            state,
            action,
          ) => {
            state.versionDetailLoading = false;
            state.selectedPayslipVersion = null;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể tải chi tiết phiên bản phiếu lương.";
          },
        );

      /**
       * ==================================
       * VERSION COMPARISON
       * ==================================
       */

      builder
        .addCase(
          compareAdminPayslipVersionsThunk.pending,
          (state) => {
            state.comparisonLoading = true;
            state.versionComparison = null;
            state.error = null;
          },
        )
        .addCase(
          compareAdminPayslipVersionsThunk.fulfilled,
          (
            state,
            action,
          ) => {
            state.comparisonLoading = false;

            state.versionComparison =
              getResponseData(
                action.payload,
              );
          },
        )
        .addCase(
          compareAdminPayslipVersionsThunk.rejected,
          (
            state,
            action,
          ) => {
            state.comparisonLoading = false;
            state.versionComparison = null;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể đối chiếu phiên bản phiếu lương.";
          },
        );



      builder
        .addCase(
          republishPayrollPayslipThunk.pending,
          (state) => {
            state.actionLoading = true;
            state.error = null;
            state.successMessage = "";
          },
        )
        .addCase(
          republishPayrollPayslipThunk.fulfilled,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            state.lastActionResult =
              getResponseData(
                action.payload,
              );

            state.successMessage =
              getResponseMessage(
                action.payload,
              );
          },
        )
        .addCase(
          republishPayrollPayslipThunk.rejected,
          (
            state,
            action,
          ) => {
            state.actionLoading = false;

            state.error =
              action.payload ||
              action.error?.message ||
              "Không thể phát hành lại phiếu lương.";
          },
        );
    },
  });

export const {
  clearPayrollAdjustmentError,
  clearPayrollAdjustmentSuccess,
  clearPayrollAdjustmentPreview,
  clearSelectedPayrollFeedback,
  clearPayrollAdjustmentState,
} = payrollAdjustmentSlice.actions;

export default payrollAdjustmentSlice.reducer;
