import {
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

/**
 * =====================================
 * STATUS
 * =====================================
 */

const getStatusMeta = (
  status,
) => {
  const map = {
    uploaded: {
      label: "Đã upload",
      className: "pending",
    },

    processing: {
      label: "Đang xử lý",
      className: "pending",
    },

    validated: {
      label: "Hợp lệ",
      className: "ready",
    },

    failed: {
      label: "Có lỗi",
      className: "pending",
    },

    committed: {
      label: "Đã lưu",
      className: "ready",
    },

    cancelled: {
      label: "Đã hủy",
      className: "pending",
    },
  };

  return (
    map[status] ?? {
      label:
        status || "—",

      className:
        "pending",
    }
  );
};

/**
 * =====================================
 * HELPERS
 * =====================================
 */

const formatDateTime = (
  value,
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

const getImportId = (
  item,
) => {
  return (
    item?.id ??
    item?.importId ??
    item?.import_id ??
    null
  );
};

const getCounts = (
  item,
) => {
  const counts =
    item?.counts ??
    {};

  return {
    total:
      Number(
        counts.total ??
          counts.totalRows ??
          counts.total_rows ??
          0,
      ),

    valid:
      Number(
        counts.valid ??
          counts.validRows ??
          counts.valid_rows ??
          0,
      ),

    invalid:
      Number(
        counts.invalid ??
          counts.invalidRows ??
          counts.invalid_rows ??
          0,
      ),

    errors:
      Number(
        counts.errors ??
          counts.errorCount ??
          counts.error_count ??
          0,
      ),
  };
};

/**
 * =====================================
 * COMPONENT
 * =====================================
 */

const PayrollImportHistory = ({
  items = [],
  loading = false,

  pagination = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  onPageChange,
  onView,
}) => {
  const page =
    Number(
      pagination?.page,
    ) || 1;

  const total =
    Number(
      pagination?.total,
    ) || 0;

  const totalPages =
    Math.max(
      1,
      Number(
        pagination?.totalPages,
      ) || 1,
    );

  const canPrevious =
    page > 1 &&
    !loading;

  const canNext =
    page < totalPages &&
    !loading;

  /**
   * LOADING
   */

  if (
    loading &&
    items.length === 0
  ) {
    return (
      <div className="hr-empty">
        Đang tải lịch sử
        import bảng lương...
      </div>
    );
  }

  /**
   * EMPTY
   */

  if (
    !loading &&
    items.length === 0
  ) {
    return (
      <div className="hr-empty">
        Chưa có lần import
        bảng lương nào.
      </div>
    );
  }

  return (
    <div>
      {/*
       * ===========================
       * TABLE
       * ===========================
       */}

      <div
        style={{
          width: "100%",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "1120px",

            borderCollapse:
              "collapse",

            fontSize:
              "12px",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom:
                  "1px solid #e7e9ee",
              }}
            >
              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "left",

                  whiteSpace:
                    "nowrap",
                }}
              >
                Mã
              </th>

              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "left",

                  whiteSpace:
                    "nowrap",
                }}
              >
                Kỳ lương
              </th>

              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "left",
                }}
              >
                File Excel
              </th>

              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "center",

                  whiteSpace:
                    "nowrap",
                }}
              >
                Tổng dòng
              </th>

              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "center",

                  whiteSpace:
                    "nowrap",
                }}
              >
                Hợp lệ
              </th>

              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "center",

                  whiteSpace:
                    "nowrap",
                }}
              >
                Dòng lỗi
              </th>

              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "left",

                  whiteSpace:
                    "nowrap",
                }}
              >
                Trạng thái
              </th>

              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "left",

                  whiteSpace:
                    "nowrap",
                }}
              >
                Người upload
              </th>

              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "left",

                  whiteSpace:
                    "nowrap",
                }}
              >
                Thời gian
              </th>

              <th
                style={{
                  padding:
                    "13px 14px",

                  textAlign:
                    "right",

                  whiteSpace:
                    "nowrap",
                }}
              >
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map(
              (item) => {
                const importId =
                  getImportId(
                    item,
                  );

                const counts =
                  getCounts(
                    item,
                  );

                const statusMeta =
                  getStatusMeta(
                    item?.status,
                  );

                const periodCode =
                  item?.period
                    ?.code ??
                  item
                    ?.periodCode ??
                  item
                    ?.period_code ??
                  "—";

                const periodName =
                  item?.period
                    ?.name ??
                  item
                    ?.periodName ??
                  item
                    ?.period_name ??
                  "";

                const fileName =
                  item?.file
                    ?.name ??
                  item
                    ?.fileName ??
                  item
                    ?.file_name ??
                  "—";

                const uploaderName =
                  item?.uploadedBy
                    ?.fullName ??
                  item
                    ?.uploaded_by
                    ?.full_name ??
                  "—";

                const uploaderStaffId =
                  item?.uploadedBy
                    ?.staffId ??
                  item
                    ?.uploaded_by
                    ?.staff_id ??
                  "";

                return (
                  <tr
                    key={
                      importId ??
                      `${fileName}-${item?.createdAt}`
                    }
                    style={{
                      borderBottom:
                        "1px solid #f0f1f4",
                    }}
                  >
                    {/*
                     * ID
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        fontWeight:
                          700,

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      #
                      {importId ??
                        "—"}
                    </td>

                    {/*
                     * PERIOD
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        minWidth:
                          "145px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight:
                            700,
                        }}
                      >
                        {
                          periodCode
                        }
                      </div>

                      {periodName && (
                        <div
                          style={{
                            marginTop:
                              "4px",

                            color:
                              "#757b86",

                            fontSize:
                              "10px",

                            lineHeight:
                              1.4,
                          }}
                        >
                          {
                            periodName
                          }
                        </div>
                      )}
                    </td>

                    {/*
                     * FILE
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        maxWidth:
                          "260px",
                      }}
                    >
                      <div
                        title={
                          fileName
                        }
                        style={{
                          maxWidth:
                            "260px",

                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis",

                          whiteSpace:
                            "nowrap",

                          fontWeight:
                            600,
                        }}
                      >
                        {
                          fileName
                        }
                      </div>
                    </td>

                    {/*
                     * TOTAL
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        textAlign:
                          "center",

                        fontWeight:
                          700,
                      }}
                    >
                      {
                        counts.total
                      }
                    </td>

                    {/*
                     * VALID
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        textAlign:
                          "center",
                      }}
                    >
                      <span className="data-status ready">
                        {
                          counts.valid
                        }
                      </span>
                    </td>

                    {/*
                     * INVALID
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        textAlign:
                          "center",
                      }}
                    >
                      {counts.invalid >
                      0 ? (
                        <div>
                          <span className="data-status pending">
                            {
                              counts.invalid
                            }
                          </span>

                          {counts.errors >
                            0 && (
                            <div
                              style={{
                                marginTop:
                                  "5px",

                                color:
                                  "#9b5d30",

                                fontSize:
                                  "9px",

                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                counts.errors
                              }{" "}
                              lỗi dữ liệu
                            </div>
                          )}
                        </div>
                      ) : (
                        <span>
                          0
                        </span>
                      )}
                    </td>

                    {/*
                     * STATUS
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      <span
                        className={`data-status ${statusMeta.className}`}
                      >
                        {
                          statusMeta.label
                        }
                      </span>
                    </td>

                    {/*
                     * UPLOADER
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        minWidth:
                          "155px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight:
                            600,
                        }}
                      >
                        {
                          uploaderName
                        }
                      </div>

                      {uploaderStaffId && (
                        <div
                          style={{
                            marginTop:
                              "4px",

                            color:
                              "#757b86",

                            fontSize:
                              "10px",
                          }}
                        >
                          {
                            uploaderStaffId
                          }
                        </div>
                      )}
                    </td>

                    {/*
                     * CREATED AT
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        whiteSpace:
                          "nowrap",

                        color:
                          "#656b75",
                      }}
                    >
                      {formatDateTime(
                        item?.createdAt ??
                          item?.created_at,
                      )}
                    </td>

                    {/*
                     * ACTION
                     */}

                    <td
                      style={{
                        padding:
                          "14px",

                        verticalAlign:
                          "top",

                        textAlign:
                          "right",
                      }}
                    >
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={
                          loading
                        }
                        onClick={() =>
                          onView?.(
                            item,
                          )
                        }
                        style={{
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        <Eye />

                        Xem
                      </button>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      {/*
       * ===========================
       * PAGINATION
       * ===========================
       */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            "12px",

          flexWrap:
            "wrap",

          padding:
            "18px 14px 4px",

          borderTop:
            "1px solid #f0f1f4",
        }}
      >
        <div
          style={{
            color:
              "#6f7480",

            fontSize:
              "11px",
          }}
        >
          Tổng{" "}
          <strong>
            {total}
          </strong>{" "}
          lần import
        </div>

        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "8px",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            disabled={
              !canPrevious
            }
            onClick={() =>
              onPageChange?.(
                page - 1,
              )
            }
          >
            <ChevronLeft />

            Trước
          </button>

          <span
            style={{
              minWidth:
                "90px",

              textAlign:
                "center",

              fontSize:
                "11px",

              fontWeight:
                700,
            }}
          >
            Trang {page}/
            {totalPages}
          </span>

          <button
            type="button"
            className="secondary-button"
            disabled={
              !canNext
            }
            onClick={() =>
              onPageChange?.(
                page + 1,
              )
            }
          >
            Sau

            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollImportHistory;