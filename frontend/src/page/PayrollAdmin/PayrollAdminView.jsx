import {
  useEffect,
  useState,
} from "react";

import {
  Download,
  Plus,
} from "lucide-react";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import PayrollAdminBoard, {
  BOARD_ITEMS,
} from "@/components/payroll/admin/PayrollAdminBoard";

import CenterModal from "@/components/common/CenterModal";
import PayrollOverviewDashboard from "@/components/payroll/admin/PayrollOverviewDashboard";

import PayrollPeriodWorkspace from "@/components/payroll/periods/PayrollPeriodWorkspace";

import PayrollImportWorkspace from "@/components/payroll/import/PayrollImportWorkspace";
import PayrollImportHistoryWorkspace from "@/components/payroll/import/PayrollImportHistoryWorkspace";
import PayrollPublishWorkspace from "@/components/payroll/publish/PayrollPublishWorkspace";
import PayrollAdjustmentWorkspace from "@/components/payroll/adjustments/PayrollAdjustmentWorkspace";
import ThirteenthMonthPolicyWorkspace from "@/components/payroll/admin/ThirteenthMonthPolicyWorkspace";

import {
  fetchPayrollDashboard,
} from "@/redux/payroll/payrollDashboardSlice";

import {
  addPayrollPeriod,
  fetchPayrollPeriodDetail,
  fetchPayrollPeriods,
  fetchPayrollPeriodStatistics,
  fetchPayrollPublishPreview,
  lockPayrollPeriodThunk,
  publishPayrollPeriodThunk,
} from "@/redux/payroll/payrollPeriodSlice";

import {
  cancelPayrollImportThunk,
  clearPayrollImportError,
  commitPayrollImportThunk,
  fetchPayrollImportDetail,
  fetchPayrollImportErrors,
  fetchPayrollImportPreview,
  fetchPayrollImports,
  uploadPayrollImportThunk,
} from "@/redux/payroll/payrollImportSlice";

import {
  acceptPayrollFeedbackThunk,
  compareAdminPayslipVersionsThunk,
  createPayrollAdjustmentThunk,
  clearPayrollAdjustmentPreview,
  clearSelectedPayrollFeedback,
  fetchPayrollAdjustmentContext,
  fetchAdminPayslipVersions,
  fetchPayrollFeedbackAdjustments,
  fetchPayrollFeedbackDetail,
  fetchPayrollFeedbacks,
  fetchPayrollFeedbackStatistics,
  previewPayrollAdjustmentThunk,
  republishPayrollPayslipThunk,
  resolvePayrollFeedbackThunk,
  reviewPayrollFeedbackThunk,
  rejectPayrollFeedbackThunk,
} from "@/redux/payroll/payrollAdjustmentSlice";

import {
  downloadPayrollImportTemplate,
  getPayrollImports,
} from "@/api/payroll/payrollImport.api";

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

/**
 * ======================================
 * PERIOD HELPERS
 * ======================================
 */

const getPeriodId = (
  period,
) => {
  return (
    period?.id ??
    period?.periodId ??
    period?.period_id ??
    null
  );
};

/**
 * ======================================
 * IMPORT HELPERS
 * ======================================
 */

const getImportId = (
  payrollImport,
) => {
  return (
    payrollImport?.id ??
    payrollImport?.importId ??
    payrollImport?.import_id ??
    null
  );
};

const getImportPeriodId = (
  payrollImport,
) => {
  return (
    payrollImport?.period?.id ??
    payrollImport?.payrollPeriodId ??
    payrollImport?.payroll_period_id ??
    null
  );
};

const getImportItemsFromResponse = (
  response,
) => {
  if (!response) {
    return [];
  }

  if (Array.isArray(response)) {
    return response;
  }

  if (
    Array.isArray(
      response?.items,
    )
  ) {
    return response.items;
  }

  if (
    Array.isArray(
      response?.imports,
    )
  ) {
    return response.imports;
  }

  if (
    Array.isArray(
      response?.data,
    )
  ) {
    return response.data;
  }

  if (
    Array.isArray(
      response?.data?.items,
    )
  ) {
    return response.data.items;
  }

  if (
    Array.isArray(
      response?.data?.imports,
    )
  ) {
    return response.data.imports;
  }

  if (
    Array.isArray(
      response?.data?.data,
    )
  ) {
    return response.data.data;
  }

  if (
    Array.isArray(
      response?.data?.data?.items,
    )
  ) {
    return response.data.data.items;
  }

  if (
    Array.isArray(
      response?.data?.data?.imports,
    )
  ) {
    return response.data.data.imports;
  }

  return [];
};

const getErrorMessage = (
  error,
) => {
  return (
    error?.response?.data?.message ??
    error?.message ??
    "Không thể tải file mẫu Excel."
  );
};

const getDownloadFileName = (
  response,
) => {
  const disposition =
    response?.headers?.[
      "content-disposition"
    ] ??
    response?.headers?.get?.(
      "content-disposition",
    );

  if (!disposition) {
    return (
      "NBC-payroll-import-template.xlsx"
    );
  }

  const utf8Match =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i,
    );

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(
        utf8Match[1],
      );
    } catch {
      return utf8Match[1];
    }
  }

  const normalMatch =
    disposition.match(
      /filename="?([^";]+)"?/i,
    );

  return (
    normalMatch?.[1] ??
    "NBC-payroll-import-template.xlsx"
  );
};

/**
 * ======================================
 * COMPONENT
 * ======================================
 */

const PayrollAdminView = () => {
  const dispatch =
    useDispatch();

  /**
   * ======================================
   * BOARD STATE
   * ======================================
   */

  const [
    activeBoard,
    setActiveBoard,
  ] = useState(
    "overview",
  );

  /**
   * ======================================
   * OVERVIEW MODAL
   * Muc con cua Tong quan mo duoi dang
   * modal giua man hinh (periods/import/
   * publish/adjustment).
   * ======================================
   */

  const [
    overviewModalBoard,
    setOverviewModalBoard,
  ] = useState(
    null,
  );

  /**
   * Tab duoc mo truc tiep thi tu dong
   * dong modal cung loai de tranh trung.
   */
  useEffect(() => {
    if (
      overviewModalBoard &&
      overviewModalBoard === activeBoard
    ) {
      setOverviewModalBoard(null);
    }
  }, [activeBoard, overviewModalBoard]);

  const openOverviewModal = (
    boardKey,
    period,
  ) => {
    if (
      period?.id
    ) {
      const url = new URL(window.location.href);
      url.searchParams.set("periodId", period.id);
      window.history.replaceState({}, "", url);
    }

    if (
      boardKey === "periods" &&
      period
    ) {
      handleSelectPeriod(period);
    }

    setOverviewModalBoard(
      boardKey,
    );
  };

  /**
   * ======================================
   * PERIOD STATE
   * ======================================
   */

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  /**
   * ======================================
   * IMPORT STATE
   * ======================================
   */

  const [
    importPeriodId,
    setImportPeriodId,
  ] = useState("");

  const [
    importFile,
    setImportFile,
  ] = useState(null);

  const [importSourceType, setImportSourceType] = useState("excel");
  const [importManualRows, setImportManualRows] = useState([
    { staffId: "", grossIncome: "", taxableIncome: "", totalDeductions: "", netSalary: "" },
  ]);

  const [
    templateLoading,
    setTemplateLoading,
  ] = useState(false);

  const [
    templateError,
    setTemplateError,
  ] = useState("");

  const [
    restoringImport,
    setRestoringImport,
  ] = useState(false);

  /**
   * Khi bấm "Xem" từ History,
   * không cho restore validated import
   * ghi đè import đang xem.
   */
  const [
    historyViewMode,
    setHistoryViewMode,
  ] = useState(false);

  /**
   * ======================================
   * HISTORY FILTER STATE
   * ======================================
   */

  const [
    importHistoryPeriodId,
    setImportHistoryPeriodId,
  ] = useState("");

  const [
    importHistoryStatus,
    setImportHistoryStatus,
  ] = useState("");

  /**
   * ======================================
   * ADJUSTMENT FILTER STATE
   * ======================================
   */

  const [
    adjustmentStatusFilter,
    setAdjustmentStatusFilter,
  ] = useState("");

  const [adjustmentPeriodFilter, setAdjustmentPeriodFilter] = useState("");

  const [
    adjustmentCategoryFilter,
    setAdjustmentCategoryFilter,
  ] = useState("");


  const [
    adjustmentHrReply,
    setAdjustmentHrReply,
  ] = useState("");


  const [
    adjustmentSalaryItemId,
    setAdjustmentSalaryItemId,
  ] = useState("");

  const [
    adjustmentNewAmount,
    setAdjustmentNewAmount,
  ] = useState("");

  const [
    adjustmentReason,
    setAdjustmentReason,
  ] = useState("");


  const [
    adjustmentRepublishMessage,
    setAdjustmentRepublishMessage,
  ] = useState("");


  const [
    adjustmentResolveReply,
    setAdjustmentResolveReply,
  ] = useState("");

  /**
   * ======================================
   * REDUX
   * ======================================
   */

  const payrollPeriodState =
    useSelector(
      (state) =>
        state.payrollPeriod,
    ) ?? {};

  const payrollImportState =
    useSelector(
      (state) =>
        state.payrollImport,
    ) ?? {};

  const payrollDashboardState =
    useSelector(
      (state) =>
        state.payrollDashboard,
    ) ?? {};

  const payrollAdjustmentState =
    useSelector(
      (state) =>
        state.payrollAdjustment,
    ) ?? {};

  const {
  items = [],

  pagination =
    DEFAULT_PAGINATION,

  selectedPeriod = null,

  statistics = null,

  publishPreview = null,

  listLoading = false,

  detailLoading = false,

  actionLoading = false,

  statisticsLoading = false,

  publishPreviewLoading = false,

  error = null,
} = payrollPeriodState;

  const {
    data: dashboardData = null,
    loading: dashboardLoading = false,
    error: dashboardError = null,
  } = payrollDashboardState;

  const selectedPeriodCode =
    String(
      selectedPeriod?.periodCode ??
        selectedPeriod?.period_code ??
        selectedPeriod?.code ??
        "",
    ).trim();



  const {
    items:
      importHistory = [],

    pagination:
      importPagination =
        DEFAULT_PAGINATION,

    currentImport = null,

    preview = [],

    errors:
      importErrors = [],

    listLoading:
      importListLoading = false,

    uploadLoading = false,

    previewLoading = false,

    errorsLoading = false,

    commitLoading = false,

    cancelLoading = false,

    successMessage = "",

    error:
      importError = null,
  } = payrollImportState;


  const {
    feedbacks:
      adjustmentFeedbacks = [],

    feedbackPagination:
      adjustmentPagination =
        DEFAULT_PAGINATION,

    statistics:
      adjustmentStatistics = null,

    selectedFeedback:
      adjustmentSelectedFeedback =
        null,

    adjustmentContext = null,

    feedbackAdjustments = [],

    payslipVersions:
      adjustmentPayslipVersions = [],

    versionComparison:
      adjustmentVersionComparison = null,

    adjustmentPreview = null,

    listLoading:
      adjustmentListLoading = false,

    detailLoading:
      adjustmentDetailLoading = false,

    statisticsLoading:
      adjustmentStatisticsLoading =
        false,

    contextLoading:
      adjustmentContextLoading =
        false,

    adjustmentsLoading:
      adjustmentHistoryLoading =
        false,

    versionsLoading:
      adjustmentVersionsLoading =
        false,

    comparisonLoading:
      adjustmentComparisonLoading =
        false,

    previewLoading:
      adjustmentPreviewLoading =
        false,

    actionLoading:
      adjustmentActionLoading =
        false,

    error:
      adjustmentError = null,
  } = payrollAdjustmentState;

  /**
   * ======================================
   * LOAD ADJUSTMENT BOARD
   * ======================================
   *
   * READ ONLY:
   * - GET feedback statistics.
   * - GET feedback list.
   */

  useEffect(() => {
    if (
      activeBoard !==
      "adjustment"
    ) {
      return;
    }

    setAdjustmentStatusFilter("");
    setAdjustmentCategoryFilter("");

    dispatch(
      clearSelectedPayrollFeedback(),
    );

    dispatch(
      fetchPayrollFeedbackStatistics(),
    );

    dispatch(
      fetchPayrollFeedbacks({
        page: 1,
        limit: 20,
        ...(adjustmentPeriodFilter ? { periodId: Number(adjustmentPeriodFilter) } : {}),
      }),
    );
  }, [
    activeBoard,
    adjustmentPeriodFilter,
    dispatch,
  ]);

    /**
   * ======================================
   * LOAD PAYROLL DASHBOARD
   * ======================================
   *
   * READ ONLY:
   * GET /api/payroll/admin/dashboard
   */
  useEffect(() => {
    if (
      activeBoard !== "overview" ||
      !selectedPeriodCode
    ) {
      return;
    }

    dispatch(
      fetchPayrollDashboard({
        periodCode:
          selectedPeriodCode,
      }),
    );
  }, [
    activeBoard,
    dispatch,
    selectedPeriodCode,
  ]);

/**
   * ======================================
   * LOAD PERIODS
   * ======================================
   */

  useEffect(() => {
    dispatch(
      fetchPayrollPeriods({
        page: 1,
        limit: 20,
      }),
    );
  }, [dispatch]);

  /**
   * ======================================
   * AUTO SELECT LATEST PERIOD
   * ======================================
   */

  useEffect(() => {
    if (
      selectedPeriod ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return;
    }

    const latestPeriod =
      [...items].sort(
        (a, b) => {
          const codeA =
            String(
              a?.periodCode ??
                a?.period_code ??
                a?.code ??
                "",
            );

          const codeB =
            String(
              b?.periodCode ??
                b?.period_code ??
                b?.code ??
                "",
            );

          return codeB.localeCompare(
            codeA,
          );
        },
      )[0];

    const periodId =
      getPeriodId(
        latestPeriod,
      );

    if (!periodId) {
      return;
    }

    dispatch(
      fetchPayrollPeriodDetail(
        periodId,
      ),
    );

    dispatch(
      fetchPayrollPeriodStatistics(
        periodId,
      ),
    );
  }, [
    dispatch,
    items,
    selectedPeriod,
  ]);

  /**
   * ======================================
   * LOAD IMPORT HISTORY + FILTERS
   * ======================================
   */

  useEffect(() => {
    const params = {
      page: 1,
      limit: 10,
    };

    if (
      importHistoryPeriodId
    ) {
      params.payrollPeriodId =
        Number(
          importHistoryPeriodId,
        );
    }

    if (
      importHistoryStatus
    ) {
      params.status =
        importHistoryStatus;
    }

    dispatch(
      fetchPayrollImports(
        params,
      ),
    );
  }, [
    dispatch,
    importHistoryPeriodId,
    importHistoryStatus,
  ]);

  /**
   * ======================================
   * RESTORE VALIDATED IMPORT
   * ======================================
   */

  useEffect(() => {
    let cancelled =
      false;

    const restoreImport =
      async () => {
        if (
          activeBoard !==
            "import" ||
          !importPeriodId ||
          historyViewMode
        ) {
          return;
        }

        const periodId =
          Number(
            importPeriodId,
          );

        if (
          !Number.isInteger(
            periodId,
          ) ||
          periodId <= 0
        ) {
          return;
        }

        setRestoringImport(
          true,
        );

        dispatch(
          clearPayrollImportError(),
        );

        try {
          /**
           * Dùng API trực tiếp.
           *
           * Không dispatch
           * fetchPayrollImports
           * vì Redux items đang dành
           * cho bảng History.
           */
          const response =
            await getPayrollImports({
              page: 1,
              limit: 20,

              payrollPeriodId:
                periodId,

              status:
                "validated",
            });

          if (cancelled) {
            return;
          }

          const imports =
            getImportItemsFromResponse(
              response,
            );

          const candidates =
            imports
              .filter(
                (
                  payrollImport,
                ) => {
                  const status =
                    payrollImport
                      ?.status;

                  const itemPeriodId =
                    Number(
                      getImportPeriodId(
                        payrollImport,
                      ),
                    );

                  const samePeriod =
                    !Number.isInteger(
                      itemPeriodId,
                    ) ||
                    itemPeriodId ===
                      periodId;

                  return (
                    status ===
                      "validated" &&
                    samePeriod
                  );
                },
              )
              .sort(
                (a, b) =>
                  Number(
                    getImportId(
                      b,
                    ) ?? 0,
                  ) -
                  Number(
                    getImportId(
                      a,
                    ) ?? 0,
                  ),
              );

          const latestImport =
            candidates[0] ??
            null;

          if (!latestImport) {
            return;
          }

          const importId =
            Number(
              getImportId(
                latestImport,
              ),
            );

          if (
            !Number.isInteger(
              importId,
            ) ||
            importId <= 0
          ) {
            return;
          }

          if (cancelled) {
            return;
          }

          await Promise.all([
            dispatch(
              fetchPayrollImportDetail(
                importId,
              ),
            ).unwrap(),

            dispatch(
              fetchPayrollImportPreview({
                importId,

                params: {
                  page: 1,
                  limit: 50,
                },
              }),
            ).unwrap(),

            dispatch(
              fetchPayrollImportErrors({
                importId,

                params: {
                  page: 1,
                  limit: 50,
                },
              }),
            ).unwrap(),
          ]);
        } catch {
          // Redux thunk đã lưu lỗi.
        } finally {
          if (!cancelled) {
            setRestoringImport(
              false,
            );
          }
        }
      };

    restoreImport();

    return () => {
      cancelled =
        true;
    };
  }, [
    dispatch,
    activeBoard,
    importPeriodId,
    historyViewMode,
  ]);

  /**
   * ======================================
   * DERIVED IMPORT
   * ======================================
   */

  const displayedImportError =
    importError ||
    templateError;

  const currentImportPeriodId =
    Number(
      getImportPeriodId(
        currentImport,
      ),
    );

  const selectedImportPeriodId =
    Number(
      importPeriodId,
    );

  const currentImportMatchesPeriod =
    Boolean(
      currentImport,
    ) &&
    (
      !Number.isInteger(
        currentImportPeriodId,
      ) ||
      !Number.isInteger(
        selectedImportPeriodId,
      ) ||
      currentImportPeriodId ===
        selectedImportPeriodId
    );

  const activeImport =
    currentImportMatchesPeriod
      ? currentImport
      : null;

  const currentImportId =
    getImportId(
      activeImport,
    );

  const importCounts =
    activeImport?.counts ??
    {};

  const importTotal =
    Number(
      importCounts.total ??
        importCounts.totalRows ??
        importCounts.total_rows ??
        0,
    );

  const importValid =
    Number(
      importCounts.valid ??
        importCounts.validRows ??
        importCounts.valid_rows ??
        0,
    );

  const importInvalid =
    Number(
      importCounts.invalid ??
        importCounts.invalidRows ??
        importCounts.invalid_rows ??
        0,
    );

  const importHasErrors =
    importInvalid > 0 ||
    importErrors.length > 0;

  const importStatus =
    activeImport?.status ??
    "";

  const importCommitted =
    importStatus ===
    "committed";

  const importCancelled =
    importStatus ===
    "cancelled";

  const canCommitImport =
    Boolean(
      currentImportId,
    ) &&
    importValid > 0 &&
    !importHasErrors &&
    !importCommitted &&
    !importCancelled;

  const canCancelImport =
    Boolean(
      currentImportId,
    ) &&
    !importCommitted &&
    !importCancelled;

  const importStatusLabel =
    importCommitted
      ? "Đã lưu"
      : importCancelled
        ? "Đã hủy"
        : importHasErrors
          ? "Có lỗi"
          : activeImport
            ? "Hợp lệ"
            : "—";

  /**
   * ======================================
   * BOARD
   * ======================================
   */

  const handleBoardChange =
    (boardKey) => {
      if (
        uploadLoading ||
        commitLoading ||
        cancelLoading
      ) {
        return;
      }

      setActiveBoard(
        boardKey,
      );

      /**
       * Form tạo kỳ chỉ thuộc
       * tab Kỳ lương.
       */
      if (
        boardKey !==
        "periods"
      ) {
        setShowCreateForm(
          false,
        );
      }

      /**
       * Khi người dùng vào Import
       * bằng navigation thông thường,
       * thoát chế độ xem History.
       */
      if (
        boardKey ===
        "import"
      ) {
        setHistoryViewMode(
          false,
        );

        const selectedId =
          getPeriodId(
            selectedPeriod,
          );

        if (
          !importPeriodId &&
          selectedId &&
          selectedPeriod
            ?.status ===
            "draft"
        ) {
          setImportPeriodId(
            String(
              selectedId,
            ),
          );
        }
      }

      /**
 * Khi mở tab Phát hành lương,
 * nếu đã có kỳ đang được chọn thì
 * tải lại detail + statistics + preview.
 */
if (
  boardKey ===
  "publish"
) {
  const selectedId =
    getPeriodId(
      selectedPeriod,
    );

  if (selectedId) {
    dispatch(
      fetchPayrollPeriodDetail(
        selectedId,
      ),
    );

    dispatch(
      fetchPayrollPeriodStatistics(
        selectedId,
      ),
    );

    dispatch(
      fetchPayrollPublishPreview(
        selectedId,
      ),
    );
  }
}

      /**
       * Overview cần lịch sử tổng quát,
       * không nên dùng danh sách đang
       * bị filter.
       */
      if (
        boardKey ===
          "overview" &&
        (
          importHistoryPeriodId ||
          importHistoryStatus
        )
      ) {
        setImportHistoryPeriodId(
          "",
        );

        setImportHistoryStatus(
          "",
        );
      }
    };

  /**
   * ======================================
   * PERIOD HANDLERS
   * ======================================
   */

  const handleImportFromPeriod =
    (period) => {
      const periodId =
        getPeriodId(
          period,
        );

      if (!periodId) {
        return;
      }

      setHistoryViewMode(
        false,
      );

      setImportPeriodId(
        String(
          periodId,
        ),
      );

      setImportFile(
        null,
      );

      dispatch(
        clearPayrollImportError(),
      );

      setTemplateError("");

      setActiveBoard(
        "import",
      );
    };

  const handlePublishFromPeriod = (period) => {
    const periodId = getPeriodId(period);
    if (!periodId) return;
    handlePublishPeriodSelect(periodId);
    setActiveBoard("publish");
  };

  const handleAdjustmentFromPeriod = (period) => {
    const periodId = getPeriodId(period);
    setAdjustmentPeriodFilter(periodId ? String(periodId) : "");
    setActiveBoard("adjustment");
  };

  const handlePageChange = (
    page,
  ) => {
    dispatch(
      fetchPayrollPeriods({
        page,

        limit:
          pagination.limit ||
          20,
      }),
    );
  };

  const handleSelectPeriod = (
    period,
  ) => {
    const periodId =
      getPeriodId(
        period,
      );

    if (!periodId) {
      return;
    }

    dispatch(
      fetchPayrollPeriodDetail(
        periodId,
      ),
    );

    dispatch(
      fetchPayrollPeriodStatistics(
        periodId,
      ),
    );
  };

  const handleCreatePeriod =
    async (payload) => {
      try {
        await dispatch(
          addPayrollPeriod(
            payload,
          ),
        ).unwrap();

        setShowCreateForm(
          false,
        );

        await dispatch(
          fetchPayrollPeriods({
            page: 1,

            limit:
              pagination.limit ||
              20,
          }),
        );
      } catch (error) {
        // Redux đã lưu lỗi.
        throw error;
      }
    };

  const handleToggleCreateForm =
    () => {
   if (
  actionLoading ||
  uploadLoading ||
  commitLoading ||
  cancelLoading
) {
  return;
}

      setShowCreateForm(
        (current) =>
          !current,
      );
    };

    /**
 * ======================================
 * PUBLISH
 * ======================================
 */

const handlePublishPeriodSelect = (
  periodId,
) => {
  const normalizedPeriodId =
    Number(periodId);

  if (
    !Number.isInteger(
      normalizedPeriodId,
    ) ||
    normalizedPeriodId <= 0
  ) {
    return;
  }

  dispatch(
    fetchPayrollPeriodDetail(
      normalizedPeriodId,
    ),
  );

  dispatch(
    fetchPayrollPeriodStatistics(
      normalizedPeriodId,
    ),
  );

  dispatch(
    fetchPayrollPublishPreview(
      normalizedPeriodId,
    ),
  );
};

const handleRefreshPublishPreview =
  () => {
    const periodId =
      getPeriodId(
        selectedPeriod,
      );

    if (!periodId) {
      return;
    }

    dispatch(
      fetchPayrollPeriodDetail(
        periodId,
      ),
    );

    dispatch(
      fetchPayrollPeriodStatistics(
        periodId,
      ),
    );

    dispatch(
      fetchPayrollPublishPreview(
        periodId,
      ),
    );
  };

const refreshPeriodAfterAction =
  async (periodId) => {
    await Promise.all([
      dispatch(
        fetchPayrollPeriodDetail(
          periodId,
        ),
      ),

      dispatch(
        fetchPayrollPeriodStatistics(
          periodId,
        ),
      ),

      dispatch(
        fetchPayrollPeriods({
          page:
            pagination.page ||
            1,

          limit:
            pagination.limit ||
            20,
        }),
      ),
    ]);
  };

const handlePublishPayroll =
  async () => {
    const periodId =
      getPeriodId(
        selectedPeriod,
      );

    if (
      !periodId ||
      actionLoading
    ) {
      return;
    }

    try {
      await dispatch(
        publishPayrollPeriodThunk(
          periodId,
        ),
      ).unwrap();

      await refreshPeriodAfterAction(
        periodId,
      );
    } catch {
      // Redux đã lưu lỗi.
    }
  };

const handleLockPayroll =
  async () => {
    const periodId =
      getPeriodId(
        selectedPeriod,
      );

    if (
      !periodId ||
      actionLoading
    ) {
      return;
    }

    try {
      await dispatch(
        lockPayrollPeriodThunk(
          periodId,
        ),
      ).unwrap();

      await refreshPeriodAfterAction(
        periodId,
      );
    } catch {
      // Redux đã lưu lỗi.
    }
  };

  /**
   * ======================================
   * IMPORT HISTORY PARAMS
   * ======================================
   */

  const buildImportHistoryParams =
    (
      page = 1,
      limit =
        importPagination.limit ||
        10,
    ) => {
      const params = {
        page,
        limit,
      };

      if (
        importHistoryPeriodId
      ) {
        params.payrollPeriodId =
          Number(
            importHistoryPeriodId,
          );
      }

      if (
        importHistoryStatus
      ) {
        params.status =
          importHistoryStatus;
      }

      return params;
    };

  /**
   * ======================================
   * IMPORT HISTORY HANDLERS
   * ======================================
   */

  const handleImportHistoryPageChange =
    (page) => {
      dispatch(
        fetchPayrollImports(
          buildImportHistoryParams(
            page,
          ),
        ),
      );
    };

  const refreshImportHistory =
    async () => {
      await dispatch(
        fetchPayrollImports(
          buildImportHistoryParams(
            importPagination.page ||
              1,
          ),
        ),
      );
    };

  const handleImportHistoryPeriodChange =
    (value) => {
      setImportHistoryPeriodId(
        value,
      );
    };

  const handleImportHistoryStatusChange =
    (value) => {
      setImportHistoryStatus(
        value,
      );
    };

  const handleResetImportHistoryFilters =
    () => {
      setImportHistoryPeriodId(
        "",
      );

      setImportHistoryStatus(
        "",
      );
    };

  /**
   * ======================================
   * VIEW IMPORT FROM HISTORY
   * ======================================
   */

  const handleViewImportHistory =
    async (item) => {
      const importId =
        Number(
          getImportId(
            item,
          ),
        );

      const periodId =
        Number(
          getImportPeriodId(
            item,
          ),
        );

      if (
        !Number.isInteger(
          importId,
        ) ||
        importId <= 0
      ) {
        return;
      }

      /**
       * Bật History mode trước
       * khi chuyển tab Import.
       */
      setHistoryViewMode(
        true,
      );

      setActiveBoard(
        "import",
      );

      setShowCreateForm(
        false,
      );

      if (
        Number.isInteger(
          periodId,
        ) &&
        periodId > 0
      ) {
        setImportPeriodId(
          String(
            periodId,
          ),
        );
      }

      setImportFile(
        null,
      );

      dispatch(
        clearPayrollImportError(),
      );

      setTemplateError("");

      try {
        await Promise.all([
          dispatch(
            fetchPayrollImportDetail(
              importId,
            ),
          ).unwrap(),

          dispatch(
            fetchPayrollImportPreview({
              importId,

              params: {
                page: 1,
                limit: 50,
              },
            }),
          ).unwrap(),

          dispatch(
            fetchPayrollImportErrors({
              importId,

              params: {
                page: 1,
                limit: 50,
              },
            }),
          ).unwrap(),
        ]);

        window.requestAnimationFrame(
          () => {
            document
              .getElementById(
                "payroll-import-panel",
              )
              ?.scrollIntoView({
                behavior:
                  "smooth",

                block:
                  "start",
              });
          },
        );
      } catch {
        // Redux đã lưu lỗi.
      }
    };

  /**
   * ======================================
   * IMPORT HANDLERS
   * ======================================
   */

  const handleImportPeriodChange =
    (value) => {
      if (
        uploadLoading ||
        commitLoading ||
        cancelLoading ||
        restoringImport
      ) {
        return;
      }

      setHistoryViewMode(
        false,
      );

      setImportPeriodId(
        value,
      );

      setImportFile(
        null,
      );

      dispatch(
        clearPayrollImportError(),
      );

      setTemplateError("");
    };

  const handleImportFileChange =
    (file) => {
      if (
        uploadLoading ||
        commitLoading ||
        cancelLoading
      ) {
        return;
      }

      setHistoryViewMode(
        false,
      );

      setImportFile(
        file,
      );

      dispatch(
        clearPayrollImportError(),
      );

      setTemplateError("");
    };

  const handleImportSourceChange = (sourceType) => {
    if (uploadLoading || commitLoading || cancelLoading) return;
    setImportSourceType(sourceType);
    setImportFile(null);
    setHistoryViewMode(false);
    dispatch(clearPayrollImportError());
    setTemplateError("");
  };

  /**
   * ======================================
   * UPLOAD IMPORT
   * ======================================
   */

  const handleUploadPayroll =
    async () => {
      if (
        uploadLoading ||
        commitLoading ||
        cancelLoading ||
        restoringImport ||
        !importPeriodId ||
        (importSourceType !== "manual" && !importFile) ||
        (importSourceType === "manual" && !importManualRows.some((row) => String(row.staffId || "").trim()))
      ) {
        return;
      }

      setHistoryViewMode(
        false,
      );

      try {
        await dispatch(
          uploadPayrollImportThunk({
            payrollPeriodId:
              Number(
                importPeriodId,
              ),

            file:
              importFile,
            sourceType: importSourceType,
            rows: importManualRows,
          }),
        ).unwrap();

        await refreshImportHistory();
      } catch {
        // Redux đã lưu lỗi upload.
      }
    };

  /**
   * ======================================
   * CANCEL IMPORT
   * ======================================
   */

  const handleCancelPayrollImport =
    async () => {
      if (
        cancelLoading ||
        commitLoading ||
        restoringImport ||
        !canCancelImport ||
        !currentImportId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Bạn có chắc muốn hủy Import #${currentImportId}?\n\n` +
            "Lần import này sẽ không thể dùng để lưu bảng lương.",
        );

      if (!confirmed) {
        return;
      }

      const reason =
        window.prompt(
          "Lý do hủy import (không bắt buộc):",
          "",
        );

      if (reason === null) {
        return;
      }

      try {
        await dispatch(
          cancelPayrollImportThunk({
            importId:
              currentImportId,

            data: {
              reason:
                reason.trim(),
            },
          }),
        ).unwrap();

        setImportFile(
          null,
        );

        await refreshImportHistory();
      } catch {
        // Redux đã lưu lỗi cancel.
      }
    };

  /**
   * ======================================
   * COMMIT IMPORT
   * ======================================
   */

  const handleCommitPayroll =
    async () => {
      if (
        commitLoading ||
        cancelLoading ||
        restoringImport ||
        !canCommitImport ||
        !currentImportId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Xác nhận lưu chính thức Import #${currentImportId}?\n\n` +
            `${importValid} phiếu lương hợp lệ sẽ được ghi vào dữ liệu bảng lương.`,
        );

      if (!confirmed) {
        return;
      }

      try {
        await dispatch(
          commitPayrollImportThunk({
            importId:
              currentImportId,

            data: {
              confirmed: true,
            },
          }),
        ).unwrap();

        await refreshImportHistory();

        const periodId =
          Number(
            getImportPeriodId(
              activeImport,
            ) ??
              importPeriodId,
          );

        await dispatch(
          fetchPayrollPeriods({
            page:
              pagination.page ||
              1,

            limit:
              pagination.limit ||
              20,
          }),
        );

        if (
          Number.isInteger(
            periodId,
          ) &&
          periodId > 0
        ) {
          await Promise.all([
            dispatch(
              fetchPayrollPeriodDetail(
                periodId,
              ),
            ),

            dispatch(
              fetchPayrollPeriodStatistics(
                periodId,
              ),
            ),
          ]);
        }
      } catch {
        // Redux đã lưu lỗi commit.
      }
    };

  /**
   * ======================================
   * DOWNLOAD TEMPLATE
   * ======================================
   */

  const handleDownloadTemplate =
    async (sourceType = "excel") => {
      if (
        templateLoading ||
        uploadLoading ||
        commitLoading ||
        cancelLoading
      ) {
        return;
      }

      setTemplateLoading(
        true,
      );

      setTemplateError("");

      try {
        const response =
          await downloadPayrollImportTemplate(
            sourceType === "html"
              ? "html"
              : "excel",
          );

        const blob =
          response.data instanceof
          Blob
            ? response.data
            : new Blob([
                response.data,
              ]);

        const fallbackName =
          sourceType === "html"
            ? "payroll-import-template.html"
            : "NBC-payroll-import-template.xlsx";

        const fileName =
          getDownloadFileName(
            response,
          ) || fallbackName;

        const safeName =
          fileName.endsWith(".xlsx") &&
          sourceType === "html"
            ? fallbackName
            : fileName;

        const url =
          URL.createObjectURL(
            blob,
          );

        const anchor =
          document.createElement(
            "a",
          );

        anchor.href =
          url;

        anchor.download =
          safeName;

        document.body.appendChild(
          anchor,
        );

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(
          url,
        );
      } catch (
        downloadError
      ) {
        setTemplateError(
          getErrorMessage(
            downloadError,
          ),
        );
      } finally {
        setTemplateLoading(
          false,
        );
      }
    };

  /**
   * ======================================
   * JSX
   * ======================================
   */

  /**
   * ======================================
   * ADJUSTMENT READ-ONLY HANDLERS
   * ======================================
   */

  const getAdjustmentListParams = ({
    page =
      adjustmentPagination?.page ||
      1,

    status =
      adjustmentStatusFilter,

    category =
      adjustmentCategoryFilter,
  } = {}) => {
    const params = {
      page,
      limit:
        adjustmentPagination?.limit ||
        20,
    };

    if (status) {
      params.status = status;
    }

    if (category) {
      params.category = category;
    }

    if (adjustmentPeriodFilter) {
      params.periodId = Number(adjustmentPeriodFilter);
    }

    return params;
  };

  const handleAdjustmentSelectFeedback =
    async (feedbackId) => {
      if (!feedbackId) {
        return;
      }

      dispatch(
        clearSelectedPayrollFeedback(),
      );

      setAdjustmentHrReply("");

      setAdjustmentSalaryItemId("");
      setAdjustmentNewAmount("");
      setAdjustmentReason("");
      setAdjustmentRepublishMessage("");
      setAdjustmentResolveReply("");

      dispatch(
        clearPayrollAdjustmentPreview(),
      );

      try {
        const response =
          await dispatch(
            fetchPayrollFeedbackDetail(
              feedbackId,
            ),
          ).unwrap();

        /*
         * API thunk trả body:
         * {
         *   success,
         *   message,
         *   data
         * }
         *
         * Nhưng vẫn fallback nếu sau này
         * thunk trả feedback trực tiếp.
         */
        const feedback =
          response?.data ??
          response ??
          null;

        setAdjustmentHrReply(
          feedback?.hrReply ??
          feedback?.hr_reply ??
          "",
        );

        const payslipId =
          feedback?.payslip?.id ??
          feedback?.payslipId ??
          feedback?.payslip_id ??
          null;

        const requests = [
          dispatch(
            fetchPayrollFeedbackAdjustments(
              feedbackId,
            ),
          ),
        ];

        if (payslipId) {
          requests.push(
            dispatch(
              fetchPayrollAdjustmentContext(
                payslipId,
              ),
            ),

            dispatch(
              fetchAdminPayslipVersions(
                payslipId,
              ),
            ),
          );
        }

        await Promise.all(
          requests,
        );
      } catch {
        /*
         * Error đã được Redux lưu.
         */
      }
    };

  const handleAdjustmentStatusChange =
    (value) => {
      setAdjustmentStatusFilter(
        value,
      );

      dispatch(
        clearSelectedPayrollFeedback(),
      );

      dispatch(
        fetchPayrollFeedbacks(
          getAdjustmentListParams({
            page: 1,
            status: value,
          }),
        ),
      );
    };

  const handleAdjustmentCategoryChange =
    (value) => {
      setAdjustmentCategoryFilter(
        value,
      );

      dispatch(
        clearSelectedPayrollFeedback(),
      );

      dispatch(
        fetchPayrollFeedbacks(
          getAdjustmentListParams({
            page: 1,
            category: value,
          }),
        ),
      );
    };

  const handleResetAdjustmentFilters =
    () => {
      setAdjustmentStatusFilter("");
      setAdjustmentCategoryFilter("");

      dispatch(
        clearSelectedPayrollFeedback(),
      );

      dispatch(
        fetchPayrollFeedbacks({
          page: 1,
          limit:
            adjustmentPagination
              ?.limit ||
            20,
        }),
      );
    };

  const handleAdjustmentPageChange =
    (page) => {
      dispatch(
        clearSelectedPayrollFeedback(),
      );

      dispatch(
        fetchPayrollFeedbacks(
          getAdjustmentListParams({
            page,
          }),
        ),
      );
    };

  const handleRefreshAdjustment =
    () => {
      dispatch(
        fetchPayrollFeedbackStatistics(),
      );

      dispatch(
        fetchPayrollFeedbacks(
          getAdjustmentListParams(),
        ),
      );

      const feedbackId =
        adjustmentSelectedFeedback
          ?.id ??
        adjustmentSelectedFeedback
          ?.feedbackId ??
        adjustmentSelectedFeedback
          ?.feedback_id ??
        null;

      if (feedbackId) {
        handleAdjustmentSelectFeedback(
          feedbackId,
        );
      }
    };

  /**
   * ======================================
   * ADJUSTMENT PREVIEW FORM
   * ======================================
   */

  const handleAdjustmentSalaryItemChange =
    (value) => {
      setAdjustmentSalaryItemId(
        value,
      );

      /*
       * Tự điền số tiền hiện tại.
       */
      const item =
        adjustmentContext?.items?.find(
          (entry) =>
            Number(
              entry.salaryItemId ??
                entry.salary_item_id ??
                entry.id,
            ) === Number(value),
        );

      setAdjustmentNewAmount(
        item?.amount != null
          ? String(item.amount)
          : "",
      );

      dispatch(
        clearPayrollAdjustmentPreview(),
      );
    };

  const handleAdjustmentNewAmountChange =
    (value) => {
      setAdjustmentNewAmount(
        value,
      );

      dispatch(
        clearPayrollAdjustmentPreview(),
      );
    };

  const handleAdjustmentReasonChange =
    (value) => {
      setAdjustmentReason(
        value,
      );

      dispatch(
        clearPayrollAdjustmentPreview(),
      );
    };

  const handlePreviewPayrollAdjustment =
    async () => {
      const payslipId =
        adjustmentContext?.payslip
          ?.id ??
        adjustmentSelectedFeedback
          ?.payslip?.id ??
        adjustmentSelectedFeedback
          ?.payslipId ??
        null;

      const salaryItemId =
        Number(
          adjustmentSalaryItemId,
        );

      const newAmount =
        Number(
          adjustmentNewAmount,
        );

      const reason =
        adjustmentReason.trim();

      if (
        !payslipId ||
        !Number.isInteger(
          salaryItemId,
        ) ||
        salaryItemId <= 0 ||
        !Number.isFinite(
          newAmount,
        ) ||
        newAmount < 0 ||
        !reason
      ) {
        return;
      }

      try {
        await dispatch(
          previewPayrollAdjustmentThunk({
            payslipId,
            adjustments: [
              {
                salaryItemId,
                newAmount,
                reason,
              },
            ],
          }),
        ).unwrap();
      } catch {
        /*
         * Error đã được Redux lưu.
         */
      }
    };


  /**
   * ======================================
   * CREATE ADJUSTMENT
   * ======================================
   *
   * MUTATION thật:
   *
   * feedback: accepted -> adjusted
   * payslip: employee_feedback -> adjusted
   * version: vN -> vN+1
   */

  /**
   * ======================================
   * COMPARE PAYSLIP VERSIONS
   * ======================================
   *
   * READ-ONLY:
   * GET /api/payroll/admin/payslips/:payslipId/comparison
   */
  const handleComparePayslipVersions =
    async ({
      fromVersion,
      toVersion,
    }) => {
      const payslipId =
        adjustmentContext?.payslip?.id ??
        adjustmentSelectedFeedback
          ?.payslip?.id ??
        adjustmentSelectedFeedback
          ?.payslipId ??
        adjustmentSelectedFeedback
          ?.payslip_id ??
        null;

      if (!payslipId) {
        return;
      }

      try {
        await dispatch(
          compareAdminPayslipVersionsThunk({
            payslipId,
            fromVersion,
            toVersion,
          }),
        ).unwrap();
      } catch {
        /*
         * Redux đã lưu lỗi.
         */
      }
    };

  const handleCreatePayrollAdjustment =
    async () => {
      if (
        adjustmentActionLoading ||
        adjustmentPreviewLoading
      ) {
        return;
      }

      const feedbackId =
        Number(
          adjustmentSelectedFeedback
            ?.id,
        );

      const payslipId =
        Number(
          adjustmentContext?.payslip
            ?.id ??
            adjustmentSelectedFeedback
              ?.payslip?.id ??
            adjustmentSelectedFeedback
              ?.payslipId,
        );

      const previewItems =
        Array.isArray(
          adjustmentPreview
            ?.adjustments,
        )
          ? adjustmentPreview
              .adjustments
          : [];

      const changeReason =
        adjustmentReason.trim();

      if (
        !Number.isInteger(
          feedbackId,
        ) ||
        feedbackId <= 0 ||
        !Number.isInteger(
          payslipId,
        ) ||
        payslipId <= 0 ||
        previewItems.length === 0 ||
        !changeReason
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Lưu điều chỉnh cho phiếu lương #${payslipId}?\n\nThao tác này sẽ tạo phiên bản lương mới và chuyển phản hồi #${feedbackId} sang trạng thái đã điều chỉnh.`,
        );

      if (!confirmed) {
        return;
      }

      const adjustments =
        previewItems.map(
          (item) => ({
            salaryItemId:
              Number(
                item.salaryItemId,
              ),

            newAmount:
              Number(
                item.newAmount,
              ),

            reason:
              item.reason ||
              changeReason,
          }),
        );

      try {
        await dispatch(
          createPayrollAdjustmentThunk({
            payslipId,
            feedbackId,
            changeReason,
            adjustments,
          }),
        ).unwrap();

        /*
         * Form cũ không còn hợp lệ
         * sau khi tạo version mới.
         */
        setAdjustmentSalaryItemId("");
        setAdjustmentNewAmount("");
        setAdjustmentReason("");

        await Promise.all([
          dispatch(
            fetchPayrollFeedbackStatistics(),
          ),

          dispatch(
            fetchPayrollFeedbacks(
              getAdjustmentListParams(),
            ),
          ),

          dispatch(
            fetchPayrollFeedbackDetail(
              feedbackId,
            ),
          ),

          dispatch(
            fetchPayrollAdjustmentContext(
              payslipId,
            ),
          ),

          dispatch(
            fetchAdminPayslipVersions(
              payslipId,
            ),
          ),

          dispatch(
            fetchPayrollFeedbackAdjustments(
              feedbackId,
            ),
          ),
        ]);
      } catch {
        /*
         * Error đã được Redux lưu.
         */
      }
    };


  /**
   * ======================================
   * REPUBLISH ADJUSTED PAYSLIP
   * ======================================
   *
   * MUTATION thật:
   *
   * payslip: adjusted -> published
   * feedback: vẫn adjusted
   * version: giữ nguyên
   */

  const handleRepublishAdjustedPayslip =
    async () => {
      if (adjustmentActionLoading) {
        return;
      }

      const feedbackId =
        Number(
          adjustmentSelectedFeedback
            ?.id,
        );

      const payslipId =
        Number(
          adjustmentContext?.payslip
            ?.id ??
            adjustmentSelectedFeedback
              ?.payslip?.id ??
            adjustmentSelectedFeedback
              ?.payslipId,
        );

      const feedbackStatus =
        adjustmentSelectedFeedback
          ?.status;

      const payslipStatus =
        adjustmentContext?.payslip
          ?.status ??
        adjustmentSelectedFeedback
          ?.payslip?.status;

      if (
        !Number.isInteger(
          feedbackId,
        ) ||
        feedbackId <= 0 ||
        !Number.isInteger(
          payslipId,
        ) ||
        payslipId <= 0 ||
        feedbackStatus !==
          "adjusted" ||
        payslipStatus !==
          "adjusted"
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Phát hành lại phiếu lương #${payslipId}?\n\nPhiếu v${adjustmentContext?.payslip?.currentVersion ?? "—"} sẽ được gửi lại cho nhân viên.`,
        );

      if (!confirmed) {
        return;
      }

      try {
        await dispatch(
          republishPayrollPayslipThunk({
            payslipId,
            message:
              adjustmentRepublishMessage
                .trim(),
          }),
        ).unwrap();

        setAdjustmentRepublishMessage("");

        await Promise.all([
          dispatch(
            fetchPayrollFeedbackStatistics(),
          ),

          dispatch(
            fetchPayrollFeedbacks(
              getAdjustmentListParams(),
            ),
          ),

          dispatch(
            fetchPayrollFeedbackDetail(
              feedbackId,
            ),
          ),

          dispatch(
            fetchPayrollAdjustmentContext(
              payslipId,
            ),
          ),

          dispatch(
            fetchAdminPayslipVersions(
              payslipId,
            ),
          ),

          dispatch(
            fetchPayrollFeedbackAdjustments(
              feedbackId,
            ),
          ),
        ]);
      } catch {
        /*
         * Error đã được Redux lưu.
         */
      }
    };


  /**
   * ======================================
   * RESOLVE FEEDBACK
   * ======================================
   *
   * Điều kiện:
   *
   * feedback = adjusted
   * payslip  = published
   *
   * MUTATION:
   *
   * feedback: adjusted -> resolved
   * payslip : giữ published
   * version : giữ nguyên
   */

  const handleResolveAdjustmentFeedback =
    async () => {
      if (adjustmentActionLoading) {
        return;
      }

      const feedbackId =
        Number(
          adjustmentSelectedFeedback
            ?.id,
        );

      const payslipId =
        Number(
          adjustmentContext?.payslip
            ?.id ??
            adjustmentSelectedFeedback
              ?.payslip?.id ??
            adjustmentSelectedFeedback
              ?.payslipId,
        );

      const feedbackStatus =
        adjustmentSelectedFeedback
          ?.status;

      const payslipStatus =
        adjustmentContext?.payslip
          ?.status ??
        adjustmentSelectedFeedback
          ?.payslip?.status;

      const hrReply =
        adjustmentResolveReply.trim();

      if (
        !Number.isInteger(
          feedbackId,
        ) ||
        feedbackId <= 0 ||
        !Number.isInteger(
          payslipId,
        ) ||
        payslipId <= 0 ||
        feedbackStatus !==
          "adjusted" ||
        payslipStatus !==
          "published" ||
        !hrReply
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Hoàn tất phản hồi #${feedbackId}?\n\nPhiếu lương #${payslipId} đã được điều chỉnh và phát hành lại. Phản hồi sẽ được đóng.`,
        );

      if (!confirmed) {
        return;
      }

      try {
        await dispatch(
          resolvePayrollFeedbackThunk({
            feedbackId,
            hrReply,
          }),
        ).unwrap();

        setAdjustmentResolveReply("");

        await Promise.all([
          dispatch(
            fetchPayrollFeedbackStatistics(),
          ),

          dispatch(
            fetchPayrollFeedbacks(
              getAdjustmentListParams(),
            ),
          ),

          dispatch(
            fetchPayrollFeedbackDetail(
              feedbackId,
            ),
          ),

          dispatch(
            fetchPayrollAdjustmentContext(
              payslipId,
            ),
          ),

          dispatch(
            fetchPayrollFeedbackAdjustments(
              feedbackId,
            ),
          ),
        ]);
      } catch {
        /*
         * Redux đã lưu lỗi.
         */
      }
    };


  /**
   * ======================================
   * REVIEW FEEDBACK
   * ======================================
   *
   * MUTATION:
   * pending -> reviewing
   */

  const handleReviewAdjustmentFeedback =
    async (feedbackId) => {
      if (
        !feedbackId ||
        adjustmentActionLoading
      ) {
        return;
      }

      try {
        await dispatch(
          reviewPayrollFeedbackThunk(
            feedbackId,
          ),
        ).unwrap();

        /*
         * Sau mutation, làm mới các dữ liệu
         * GET liên quan.
         */
        await Promise.all([
          dispatch(
            fetchPayrollFeedbackStatistics(),
          ),
          dispatch(
            fetchPayrollFeedbacks(
              getAdjustmentListParams(),
            ),
          ),
          dispatch(
            fetchPayrollFeedbackDetail(
              feedbackId,
            ),
          ),
        ]);
      } catch {
        /*
         * Error đã được Redux lưu.
         */
      }
    };

  /**
   * ======================================
   * ACCEPT FEEDBACK
   * ======================================
   *
   * MUTATION:
   * reviewing -> accepted
   */

  const handleAcceptAdjustmentFeedback =
    async (
      feedbackId,
      hrReply = "",
    ) => {
      if (
        !feedbackId ||
        adjustmentActionLoading
      ) {
        return;
      }

      try {
        await dispatch(
          acceptPayrollFeedbackThunk({
            feedbackId,
            hrReply,
          }),
        ).unwrap();

        await Promise.all([
          dispatch(
            fetchPayrollFeedbackStatistics(),
          ),
          dispatch(
            fetchPayrollFeedbacks(
              getAdjustmentListParams(),
            ),
          ),
          dispatch(
            fetchPayrollFeedbackDetail(
              feedbackId,
            ),
          ),
        ]);
      } catch {
        /*
         * Error đã được Redux lưu.
         */
      }
    };


  /**
   * ======================================
   * REJECT FEEDBACK
   * ======================================
   *
   * MUTATION:
   * reviewing -> rejected
   */

  const handleRejectAdjustmentFeedback =
    async (
      feedbackId,
      hrReply = "",
    ) => {
      if (
        !feedbackId ||
        adjustmentActionLoading
      ) {
        return;
      }

      try {
        await dispatch(
          rejectPayrollFeedbackThunk({
            feedbackId,
            hrReply,
          }),
        ).unwrap();

        await Promise.all([
          dispatch(
            fetchPayrollFeedbackStatistics(),
          ),
          dispatch(
            fetchPayrollFeedbacks(
              getAdjustmentListParams(),
            ),
          ),
          dispatch(
            fetchPayrollFeedbackDetail(
              feedbackId,
            ),
          ),
        ]);
      } catch {
        /*
         * Error đã được Redux lưu.
         */
      }
    };


  const renderPeriodsBoard = () => (
        <div className="payroll-board-content">
          <PayrollPeriodWorkspace
            items={
              items
            }
            loading={
              listLoading
            }
            pagination={
              pagination
            }
            selectedPeriod={
              selectedPeriod
            }
            detailLoading={
              detailLoading
            }
            statistics={
              statistics
            }
            statisticsLoading={
              statisticsLoading
            }
            showCreateForm={
              showCreateForm
            }
            actionLoading={
              actionLoading
            }
            onSelect={
              handleSelectPeriod
            }
            onPageChange={
              handlePageChange
            }
            onToggleCreate={
              handleToggleCreateForm
            }
            onCreate={
              handleCreatePeriod
            }
            onCancelCreate={() =>
              setShowCreateForm(
                false,
              )
            }
            onGoImport={
              handleImportFromPeriod
            }
            onGoPublish={
              handlePublishFromPeriod
            }
            onGoAdjustment={
              handleAdjustmentFromPeriod
            }
          />
        </div>
  );

  const renderImportBoard = () => (
        <div
          id="payroll-import-panel"
          className="payroll-board-content"
        >
          <PayrollImportWorkspace
            periods={
              items
            }
            payrollPeriodId={
              importPeriodId
            }
            file={
              importFile
            }
            sourceType={importSourceType}
            manualRows={importManualRows}
            activeImport={
              activeImport
            }
            currentImportId={
              currentImportId
            }
            importTotal={
              importTotal
            }
            importValid={
              importValid
            }
            importInvalid={
              importInvalid
            }
            importHasErrors={
              importHasErrors
            }
            importStatus={
              importStatus
            }
            importStatusLabel={
              importStatusLabel
            }
            importCommitted={
              importCommitted
            }
            importCancelled={
              importCancelled
            }
            canCommitImport={
              canCommitImport
            }
            canCancelImport={
              canCancelImport
            }
            preview={
              preview
            }
            errors={
              importErrors
            }
            successMessage={
              successMessage
            }
            error={
              displayedImportError
            }
            uploadLoading={
              uploadLoading
            }
            templateLoading={
              templateLoading
            }
            previewLoading={
              previewLoading
            }
            errorsLoading={
              errorsLoading
            }
            commitLoading={
              commitLoading
            }
            cancelLoading={
              cancelLoading
            }
            restoringImport={
              restoringImport
            }
            historyViewMode={
              historyViewMode
            }
            onPeriodChange={
              handleImportPeriodChange
            }
            onFileChange={
              handleImportFileChange
            }
            onSourceTypeChange={handleImportSourceChange}
            onManualRowsChange={setImportManualRows}
            onUpload={
              handleUploadPayroll
            }
            onDownloadTemplate={
              handleDownloadTemplate
            }
            onCancel={
              handleCancelPayrollImport
            }
            onCommit={
              handleCommitPayroll
            }
          />
        </div>
  );

  const renderPublishBoard = () => (
  <div className="payroll-board-content">
    <PayrollPublishWorkspace
      periods={
        items
      }
      selectedPeriod={
        selectedPeriod
      }
      publishPreview={
        publishPreview
      }
      statistics={
        statistics
      }
      previewLoading={
        publishPreviewLoading
      }
      actionLoading={
        actionLoading
      }
      error={
        error
      }
      onSelectPeriod={
        handlePublishPeriodSelect
      }
      onRefreshPreview={
        handleRefreshPublishPreview
      }
      onPublish={
        handlePublishPayroll
      }
      onLock={
        handleLockPayroll
      }
    />
  </div>
  );

  const renderAdjustmentBoard = () => (
        <div className="payroll-board-content">
          <PayrollAdjustmentWorkspace
            feedbacks={
              adjustmentFeedbacks
            }
            pagination={
              adjustmentPagination
            }
            statistics={
              adjustmentStatistics
            }
            selectedFeedback={
              adjustmentSelectedFeedback
            }
            adjustmentContext={
              adjustmentContext
            }
            feedbackAdjustments={
              feedbackAdjustments
            }
            payslipVersions={
              adjustmentPayslipVersions
            }
            versionComparison={
              adjustmentVersionComparison
            }
            adjustmentPreview={
              adjustmentPreview
            }
            adjustmentSalaryItemId={
              adjustmentSalaryItemId
            }
            adjustmentNewAmount={
              adjustmentNewAmount
            }
            adjustmentReason={
              adjustmentReason
            }
            republishMessageValue={
              adjustmentRepublishMessage
            }
            resolveReplyValue={
              adjustmentResolveReply
            }
            statusFilter={
              adjustmentStatusFilter
            }
            categoryFilter={
              adjustmentCategoryFilter
            }
            listLoading={
              adjustmentListLoading
            }
            detailLoading={
              adjustmentDetailLoading
            }
            statisticsLoading={
              adjustmentStatisticsLoading
            }
            contextLoading={
              adjustmentContextLoading
            }
            adjustmentsLoading={
              adjustmentHistoryLoading
            }
            versionsLoading={
              adjustmentVersionsLoading
            }
            comparisonLoading={
              adjustmentComparisonLoading
            }
            previewLoading={
              adjustmentPreviewLoading
            }
            actionLoading={
              adjustmentActionLoading
            }
            hrReplyValue={
              adjustmentHrReply
            }
            onHrReplyChange={
              setAdjustmentHrReply
            }
            error={
              adjustmentError
            }
            onStatusFilterChange={
              handleAdjustmentStatusChange
            }
            onCategoryFilterChange={
              handleAdjustmentCategoryChange
            }
            onResetFilters={
              handleResetAdjustmentFilters
            }
            onSelectFeedback={
              handleAdjustmentSelectFeedback
            }
            onPageChange={
              handleAdjustmentPageChange
            }
            onRefresh={
              handleRefreshAdjustment
            }
            onAdjustmentSalaryItemChange={
              handleAdjustmentSalaryItemChange
            }
            onAdjustmentNewAmountChange={
              handleAdjustmentNewAmountChange
            }
            onAdjustmentReasonChange={
              handleAdjustmentReasonChange
            }
            onRepublishMessageChange={
              setAdjustmentRepublishMessage
            }
            onResolveReplyChange={
              setAdjustmentResolveReply
            }
            onPreviewAdjustment={
              handlePreviewPayrollAdjustment
            }
            onCreateAdjustment={
              handleCreatePayrollAdjustment
            }
            onCompareVersions={
              handleComparePayslipVersions
            }
            onRepublish={
              handleRepublishAdjustedPayslip
            }
            onResolve={
              handleResolveAdjustmentFeedback
            }
            onReview={
              handleReviewAdjustmentFeedback
            }
            onAccept={
              handleAcceptAdjustmentFeedback
            }
            onReject={
              handleRejectAdjustmentFeedback
            }
          />
        </div>
  );

  const centerModalProps = (boardKey) => {
    const meta = BOARD_ITEMS.find(
      (item) => item.key === boardKey,
    );

    return {
      title:
        meta?.label ?? boardKey,
      icon: meta?.icon,
      onClose: () =>
        setOverviewModalBoard(null),
    };
  };

  const renderOverviewModalBoard = () => {
    switch (overviewModalBoard) {
      case "periods":
        return renderPeriodsBoard();

      case "import":
        return renderImportBoard();

      case "publish":
        return renderPublishBoard();

      case "adjustment":
        return renderAdjustmentBoard();

      default:
        return null;
    }
  };

  return (
    <div className="page payroll-admin-page">
      {/* ==================================
          PAGE HEADER
          ================================== */}

      <div className="page-title payroll-page-title">
        <div>
          <p className="payroll-page-title__breadcrumb">
            <span>Quản trị hệ thống</span>
            {activeBoard !== "overview" && <><b>›</b><span>Quản lý lương</span></>}
          </p>

          <h1>
            {activeBoard === "periods"
              ? "Kỳ lương"
              : activeBoard === "import"
                ? "Import dữ liệu lương"
                : activeBoard === "history"
                  ? "Lịch sử Import"
                  : activeBoard === "publish"
                    ? "Phát hành lương"
                  : activeBoard === "thirteenth-month"
                    ? "Chính sách lương tháng 13"
                  : activeBoard === "adjustment"
                    ? "Điều chỉnh lương"
                    : "Quản lý lương"}
          </h1>

          <span className="payroll-page-title__description">
            {activeBoard === "periods"
              ? "Quản lý vòng đời, cấu hình và tiến độ xử lý của từng kỳ lương trong toàn doanh nghiệp."
              : activeBoard === "import"
                ? "Tiếp nhận dữ liệu từ Excel, bảng HTML hoặc cập nhật thủ công với kiểm tra trước khi lưu."
                : activeBoard === "history"
                  ? "Tra cứu phiên nhập, theo dõi chất lượng dữ liệu và truy vết đầy đủ lịch sử xử lý."
                  : activeBoard === "publish"
                    ? "Đối soát điều kiện, kiểm soát quỹ lương và phát hành phiếu an toàn đến toàn bộ nhân viên."
                  : activeBoard === "thirteenth-month"
                    ? "Thiết lập hệ số mặc định theo năm và quản lý ngoại lệ có kiểm soát cho từng nhân viên."
                  : activeBoard === "adjustment"
                    ? "Tiếp nhận phản hồi, điều chỉnh theo phiên bản và phát hành lại phiếu lương với nhật ký kiểm toán đầy đủ."
                    : "Tổng quan quỹ lương, nhân sự và tình trạng phát hành lương toàn doanh nghiệp."}
          </span>
        </div>

        {activeBoard === "overview" && (
          <div className="payroll-page-title__actions">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("nbc:payroll-export-year"))}
            >
              <Download />
              Xuất báo cáo
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveBoard("periods");
                setShowCreateForm(true);
              }}
            >
              <Plus />
              Tạo kỳ lương
            </button>
          </div>
        )}
      </div>

      {/* ==================================
          BOARD NAVIGATION
          ================================== */}

      <PayrollAdminBoard
        activeBoard={
          activeBoard
        }
        onChange={
          handleBoardChange
        }
      />

      {/* GLOBAL PERIOD ERROR */}

      {error && (
        <div
          className="hr-data-message"
          role="alert"
        >
          <span>
            {error}
          </span>
        </div>
      )}


      {/* ==================================
          OVERVIEW BOARD
          ================================== */}

      {activeBoard ===
        "overview" && (
        <div className="payroll-board-content">
          <PayrollOverviewDashboard
            selectedPeriod={
              selectedPeriod
            }
            statistics={
              statistics
            }
            importHistory={
              importHistory
            }
            dashboardData={
              dashboardData
            }
            dashboardLoading={
              dashboardLoading
            }
            dashboardError={
              dashboardError
            }
            onOpenBoard={openOverviewModal}
            onCreatePeriod={handleCreatePeriod}
          />
        </div>
      )}

      {/* ==================================
          PERIODS BOARD
          ================================== */}

            {activeBoard === "periods" &&
        renderPeriodsBoard()}


      {/* ==================================
          IMPORT BOARD
          ================================== */}

            {activeBoard === "import" &&
        renderImportBoard()}


{/* ==================================
    PUBLISH BOARD
    ================================== */}

      {activeBoard === "publish" &&
        renderPublishBoard()}


      {/* ==================================
          ADJUSTMENT BOARD
          ================================== */}

            {activeBoard === "adjustment" &&
        renderAdjustmentBoard()}


      {activeBoard === "thirteenth-month" && (
        <div className="payroll-board-content">
          <ThirteenthMonthPolicyWorkspace />
        </div>
      )}

      {/* ==================================
          HISTORY BOARD
          ================================== */}

      {activeBoard ===
        "history" && (
        <div className="payroll-board-content">
          <PayrollImportHistoryWorkspace
            onGoImport={() => setActiveBoard("import")}
            periods={
              items
            }
            items={
              importHistory
            }
            loading={
              importListLoading
            }
            pagination={
              importPagination
            }
            periodFilter={
              importHistoryPeriodId
            }
            statusFilter={
              importHistoryStatus
            }
            onPeriodFilterChange={
              handleImportHistoryPeriodChange
            }
            onStatusFilterChange={
              handleImportHistoryStatusChange
            }
            onResetFilters={
              handleResetImportHistoryFilters
            }
            onPageChange={
              handleImportHistoryPageChange
            }
            onView={
              handleViewImportHistory
            }
          />
        </div>
      )}

      {/* ==================================
          OVERVIEW MODAL (giua man hinh)
          ================================== */}

      {overviewModalBoard && (
        <CenterModal
          {...centerModalProps(
            overviewModalBoard,
          )}
        >
          {renderOverviewModalBoard()}
        </CenterModal>
      )}
    </div>
  );
};

export default PayrollAdminView;
