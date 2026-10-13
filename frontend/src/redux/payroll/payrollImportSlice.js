import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";

import {
  cancelPayrollImport,
  commitPayrollImport,
  getPayrollImportDetail,
  getPayrollImportErrors,
  getPayrollImportPreview,
  getPayrollImports,
  uploadPayrollImport,
} from "../../api/payroll/payrollImport.api";

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
 * Hỗ trợ cả 2 trường hợp:
 *
 * 1. API layer return response.data
 * 2. API layer trả nguyên Axios response
 */
function getResponseBody(payload) {
  if (
    payload?.data &&
    typeof payload.data ===
      "object" &&
    !Array.isArray(
      payload.data,
    ) &&
    "success" in
      payload.data
  ) {
    return payload.data;
  }

  return payload ?? null;
}

/**
 * Lấy phần data nghiệp vụ.
 *
 * Ví dụ backend:
 *
 * {
 *   success: true,
 *   message: "...",
 *   data: {
 *     items: [],
 *     pagination: {}
 *   }
 * }
 */
function getResponseData(payload) {
  const body =
    getResponseBody(
      payload,
    );

  return body?.data ?? null;
}

/**
 * Lấy pagination.
 *
 * Hỗ trợ các response shape:
 *
 * 1.
 * {
 *   pagination: {}
 * }
 *
 * 2.
 * {
 *   data: {
 *     pagination: {}
 *   }
 * }
 *
 * 3. Axios response:
 * {
 *   data: {
 *     success: true,
 *     data: {
 *       pagination: {}
 *     }
 *   }
 * }
 */
function getResponsePagination(
  payload,
) {
  const body =
    getResponseBody(
      payload,
    );

  return (
    body?.pagination ??
    body?.data
      ?.pagination ??
    null
  );
}

/**
 * Lấy message thành công.
 */
function getResponseMessage(
  payload,
) {
  const body =
    getResponseBody(
      payload,
    );

  return (
    body?.message ??
    ""
  );
}

/**
 * Chuẩn hóa pagination để dùng chung
 * cho list / preview / errors.
 */
function normalizePagination(
  pagination,
  defaults = {
    page: 1,
    limit: 20,
  },
) {
  return {
    page:
      Number(
        pagination?.page ??
          defaults.page,
      ) || defaults.page,

    limit:
      Number(
        pagination?.limit ??
          defaults.limit,
      ) || defaults.limit,

    total:
      Number(
        pagination
          ?.totalItems ??
          pagination
            ?.total ??
          0,
      ) || 0,

    totalPages:
      Number(
        pagination
          ?.totalPages ??
          pagination
            ?.total_pages ??
          0,
      ) || 0,
  };
}

/**
 * Backend có thể dùng:
 *
 * id
 * importId
 * import_id
 */
function getImportId(
  payrollImport,
) {
  return (
    payrollImport?.id ??
    payrollImport
      ?.importId ??
    payrollImport
      ?.import_id ??
    null
  );
}

/**
 * Thêm hoặc cập nhật một lần import
 * trong danh sách Redux.
 */
function upsertImport(
  items,
  payrollImport,
) {
  const importId =
    getImportId(
      payrollImport,
    );

  if (!importId) {
    return;
  }

  const index =
    items.findIndex(
      (item) =>
        Number(
          getImportId(
            item,
          ),
        ) ===
        Number(
          importId,
        ),
    );

  if (index === -1) {
    items.unshift(
      payrollImport,
    );

    return;
  }

  items[index] = {
    ...items[index],
    ...payrollImport,
  };
}

/**
 * Một số endpoint list có thể trả:
 *
 * data: [...]
 *
 * hoặc:
 *
 * data: {
 *   items: [...]
 * }
 */
function getArrayData(
  data,
  possibleKeys = [],
) {
  if (
    Array.isArray(
      data,
    )
  ) {
    return data;
  }

  for (
    const key of
      possibleKeys
  ) {
    if (
      Array.isArray(
        data?.[key],
      )
    ) {
      return data[key];
    }
  }

  return [];
}

/**
 * ==========================================
 * GET /api/payroll/imports
 * ==========================================
 */
export const fetchPayrollImports =
  createAsyncThunk(
    "payrollImport/fetchPayrollImports",

    async (
      params = {},
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollImports(
          params,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
          ),
        );
      }
    },
  );

/**
 * ==========================================
 * POST /api/payroll/imports
 * ==========================================
 *
 * payload:
 * {
 *   payrollPeriodId,
 *   file,
 * }
 */
export const uploadPayrollImportThunk =
  createAsyncThunk(
    "payrollImport/uploadPayrollImport",

    async (
      payload,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await uploadPayrollImport(
          payload,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
          ),
        );
      }
    },
  );

/**
 * ==========================================
 * GET /api/payroll/imports/:importId
 * ==========================================
 */
export const fetchPayrollImportDetail =
  createAsyncThunk(
    "payrollImport/fetchPayrollImportDetail",

    async (
      importId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollImportDetail(
          importId,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
          ),
        );
      }
    },
  );

/**
 * ==========================================
 * GET /api/payroll/imports/:importId/preview
 * ==========================================
 *
 * dispatch:
 *
 * fetchPayrollImportPreview({
 *   importId: 14,
 *   params: {
 *     page: 1,
 *     limit: 50,
 *   },
 * })
 */
export const fetchPayrollImportPreview =
  createAsyncThunk(
    "payrollImport/fetchPayrollImportPreview",

    async (
      {
        importId,
        params = {},
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollImportPreview(
          importId,
          params,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
          ),
        );
      }
    },
  );

/**
 * ==========================================
 * GET /api/payroll/imports/:importId/errors
 * ==========================================
 */
export const fetchPayrollImportErrors =
  createAsyncThunk(
    "payrollImport/fetchPayrollImportErrors",

    async (
      {
        importId,
        params = {},
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getPayrollImportErrors(
          importId,
          params,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
          ),
        );
      }
    },
  );

/**
 * ==========================================
 * POST /api/payroll/imports/:importId/commit
 * ==========================================
 */
export const commitPayrollImportThunk =
  createAsyncThunk(
    "payrollImport/commitPayrollImport",

    async (
      {
        importId,
        data = {
          confirmed:
            true,
        },
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await commitPayrollImport(
          importId,
          data,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
          ),
        );
      }
    },
  );

/**
 * ==========================================
 * POST /api/payroll/imports/:importId/cancel
 * ==========================================
 */
export const cancelPayrollImportThunk =
  createAsyncThunk(
    "payrollImport/cancelPayrollImport",

    async (
      {
        importId,
        data = {},
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await cancelPayrollImport(
          importId,
          data,
        );
      } catch (error) {
        return rejectWithValue(
          getErrorMessage(
            error,
          ),
        );
      }
    },
  );

/**
 * ==========================================
 * INITIAL STATE
 * ==========================================
 */

const initialState = {
  /**
   * Danh sách lịch sử import.
   */
  items: [],

  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  /**
   * Import đang được HR thao tác.
   */
  currentImport: null,

  /**
   * Các dòng Excel preview.
   */
  preview: [],

  previewPagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },

  /**
   * Các dòng Excel bị lỗi.
   */
  errors: [],

  errorPagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },

  /**
   * Loading states.
   */
  listLoading: false,
  uploadLoading: false,
  detailLoading: false,
  previewLoading: false,
  errorsLoading: false,
  commitLoading: false,
  cancelLoading: false,

  /**
   * Message thành công gần nhất.
   */
  successMessage: "",

  /**
   * Message lỗi gần nhất.
   */
  error: null,
};

/**
 * ==========================================
 * SLICE
 * ==========================================
 */

const payrollImportSlice =
  createSlice({
    name:
      "payrollImport",

    initialState,

    reducers: {
      /**
       * Xóa message lỗi.
       */
      clearPayrollImportError(
        state,
      ) {
        state.error =
          null;
      },

      /**
       * Xóa message thành công.
       */
      clearPayrollImportMessage(
        state,
      ) {
        state.successMessage =
          "";
      },

      /**
       * Xóa import hiện tại
       * nhưng giữ lại history.
       */
      clearCurrentPayrollImport(
        state,
      ) {
        state.currentImport =
          null;

        state.preview = [];

        state.errors = [];

        state.previewPagination =
          {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
          };

        state.errorPagination =
          {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
          };

        state.successMessage =
          "";

        state.error =
          null;
      },

      /**
       * Reset workflow import.
       */
      resetPayrollImportWorkflow(
        state,
      ) {
        state.currentImport =
          null;

        state.preview = [];

        state.errors = [];

        state.previewPagination =
          {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
          };

        state.errorPagination =
          {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
          };

        state.uploadLoading =
          false;

        state.detailLoading =
          false;

        state.previewLoading =
          false;

        state.errorsLoading =
          false;

        state.commitLoading =
          false;

        state.cancelLoading =
          false;

        state.successMessage =
          "";

        state.error =
          null;
      },
    },

    extraReducers: (
      builder,
    ) => {
      builder

        /**
         * ==================================
         * DANH SÁCH IMPORT
         * ==================================
         */

        .addCase(
          fetchPayrollImports.pending,

          (state) => {
            state.listLoading =
              true;

            state.error =
              null;
          },
        )

        .addCase(
          fetchPayrollImports.fulfilled,

          (
            state,
            action,
          ) => {
            state.listLoading =
              false;

            const data =
              getResponseData(
                action.payload,
              );

            /**
             * FIX:
             *
             * Backend:
             *
             * {
             *   success: true,
             *   data: {
             *     items: [],
             *     pagination: {
             *       page,
             *       limit,
             *       total,
             *       totalPages
             *     }
             *   }
             * }
             */
            const pagination =
              getResponsePagination(
                action.payload,
              );

            state.items =
              getArrayData(
                data,
                [
                  "items",
                  "imports",
                ],
              );

            state.pagination =
              normalizePagination(
                pagination,
                {
                  page: 1,
                  limit: 20,
                },
              );
          },
        )

        .addCase(
          fetchPayrollImports.rejected,

          (
            state,
            action,
          ) => {
            state.listLoading =
              false;

            state.error =
              action.payload ||
              "Không thể tải danh sách import lương";
          },
        )

        /**
         * ==================================
         * UPLOAD EXCEL
         * ==================================
         */

        .addCase(
          uploadPayrollImportThunk.pending,

          (state) => {
            state.uploadLoading =
              true;

            state.error =
              null;

            state.successMessage =
              "";

            /**
             * Khi upload file mới,
             * xóa preview/errors cũ.
             */
            state.currentImport =
              null;

            state.preview = [];

            state.errors = [];
          },
        )

        .addCase(
          uploadPayrollImportThunk.fulfilled,

          (
            state,
            action,
          ) => {
            state.uploadLoading =
              false;

            const data =
              getResponseData(
                action.payload,
              );

            const payrollImport =
              data?.import ??
              data ??
              null;

            state.currentImport =
              payrollImport;

            state.preview =
              Array.isArray(
                data?.rows,
              )
                ? data.rows
                : [];

            state.errors =
              Array.isArray(
                data?.errors,
              )
                ? data.errors
                : [];

            const pagination =
              data?.pagination ??
              null;

            state.previewPagination =
              normalizePagination(
                pagination,
                {
                  page: 1,
                  limit: 50,
                },
              );

            state.errorPagination =
              normalizePagination(
                pagination,
                {
                  page: 1,
                  limit: 50,
                },
              );

            state.successMessage =
              getResponseMessage(
                action.payload,
              );

            if (
              payrollImport
            ) {
              upsertImport(
                state.items,
                payrollImport,
              );
            }
          },
        )

        .addCase(
          uploadPayrollImportThunk.rejected,

          (
            state,
            action,
          ) => {
            state.uploadLoading =
              false;

            state.error =
              action.payload ||
              "Không thể upload file Excel";
          },
        )

        /**
         * ==================================
         * CHI TIẾT IMPORT
         * ==================================
         */

        .addCase(
          fetchPayrollImportDetail.pending,

          (state) => {
            state.detailLoading =
              true;

            state.error =
              null;
          },
        )

        .addCase(
          fetchPayrollImportDetail.fulfilled,

          (
            state,
            action,
          ) => {
            state.detailLoading =
              false;

            const data =
              getResponseData(
                action.payload,
              );

            state.currentImport =
              data;

            if (data) {
              upsertImport(
                state.items,
                data,
              );
            }
          },
        )

        .addCase(
          fetchPayrollImportDetail.rejected,

          (
            state,
            action,
          ) => {
            state.detailLoading =
              false;

            state.error =
              action.payload ||
              "Không thể tải chi tiết import";
          },
        )

        /**
         * ==================================
         * PREVIEW
         * ==================================
         */

        .addCase(
          fetchPayrollImportPreview.pending,

          (state) => {
            state.previewLoading =
              true;

            state.error =
              null;
          },
        )

        .addCase(
          fetchPayrollImportPreview.fulfilled,

          (
            state,
            action,
          ) => {
            state.previewLoading =
              false;

            const data =
              getResponseData(
                action.payload,
              );

            const pagination =
              getResponsePagination(
                action.payload,
              );

            state.preview =
              getArrayData(
                data,
                [
                  "items",
                  "rows",
                  "preview",
                ],
              );

            state.previewPagination =
              normalizePagination(
                pagination,
                {
                  page: 1,
                  limit: 50,
                },
              );
          },
        )

        .addCase(
          fetchPayrollImportPreview.rejected,

          (
            state,
            action,
          ) => {
            state.previewLoading =
              false;

            state.error =
              action.payload ||
              "Không thể tải bản xem trước";
          },
        )

        /**
         * ==================================
         * DANH SÁCH DÒNG LỖI
         * ==================================
         */

        .addCase(
          fetchPayrollImportErrors.pending,

          (state) => {
            state.errorsLoading =
              true;

            state.error =
              null;
          },
        )

        .addCase(
          fetchPayrollImportErrors.fulfilled,

          (
            state,
            action,
          ) => {
            state.errorsLoading =
              false;

            const data =
              getResponseData(
                action.payload,
              );

            const pagination =
              getResponsePagination(
                action.payload,
              );

            state.errors =
              getArrayData(
                data,
                [
                  "items",
                  "rows",
                  "errors",
                ],
              );

            state.errorPagination =
              normalizePagination(
                pagination,
                {
                  page: 1,
                  limit: 50,
                },
              );
          },
        )

        .addCase(
          fetchPayrollImportErrors.rejected,

          (
            state,
            action,
          ) => {
            state.errorsLoading =
              false;

            state.error =
              action.payload ||
              "Không thể tải danh sách dòng lỗi";
          },
        )

        /**
         * ==================================
         * COMMIT IMPORT
         * ==================================
         */

        .addCase(
          commitPayrollImportThunk.pending,

          (state) => {
            state.commitLoading =
              true;

            state.error =
              null;

            state.successMessage =
              "";
          },
        )

        .addCase(
          commitPayrollImportThunk.fulfilled,

          (
            state,
            action,
          ) => {
            state.commitLoading =
              false;

            const data =
              getResponseData(
                action.payload,
              );

            /**
             * Không thay currentImport
             * hoàn toàn vì response commit
             * có thể chỉ trả một phần dữ liệu.
             */
            if (data) {
              state.currentImport =
                {
                  ...(
                    state.currentImport ??
                    {}
                  ),

                  ...data,
                };

              upsertImport(
                state.items,
                state.currentImport,
              );
            }

            state.successMessage =
              getResponseMessage(
                action.payload,
              );
          },
        )

        .addCase(
          commitPayrollImportThunk.rejected,

          (
            state,
            action,
          ) => {
            state.commitLoading =
              false;

            state.error =
              action.payload ||
              "Không thể lưu chính thức bảng lương";
          },
        )

        /**
         * ==================================
         * HỦY IMPORT
         * ==================================
         */

        .addCase(
          cancelPayrollImportThunk.pending,

          (state) => {
            state.cancelLoading =
              true;

            state.error =
              null;

            state.successMessage =
              "";
          },
        )

        .addCase(
          cancelPayrollImportThunk.fulfilled,

          (
            state,
            action,
          ) => {
            state.cancelLoading =
              false;

            const data =
              getResponseData(
                action.payload,
              );

            if (data) {
              state.currentImport =
                {
                  ...(
                    state.currentImport ??
                    {}
                  ),

                  ...data,
                };

              upsertImport(
                state.items,
                state.currentImport,
              );
            }

            state.successMessage =
              getResponseMessage(
                action.payload,
              );
          },
        )

        .addCase(
          cancelPayrollImportThunk.rejected,

          (
            state,
            action,
          ) => {
            state.cancelLoading =
              false;

            state.error =
              action.payload ||
              "Không thể hủy lần import";
          },
        );
    },
  });

/**
 * ==========================================
 * ACTIONS
 * ==========================================
 */

export const {
  clearPayrollImportError,
  clearPayrollImportMessage,
  clearCurrentPayrollImport,
  resetPayrollImportWorkflow,
} =
  payrollImportSlice.actions;

/**
 * ==========================================
 * REDUCER
 * ==========================================
 */

export default payrollImportSlice.reducer;