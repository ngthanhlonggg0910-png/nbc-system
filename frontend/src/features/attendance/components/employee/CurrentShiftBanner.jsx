import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Clock3 } from "lucide-react";
import { getCurrentShift } from "../../api/shiftApi";
import {
  formatEffectiveDate,
  formatShiftTime,
} from "../../utils/attendance-shift.utils";

export default function CurrentShiftBanner({ date, onShiftLoaded }) {
  const [state, setState] = useState({
    status: "loading",
    data: null,
    error: "",
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: "" });
    getCurrentShift(date, controller.signal)
      .then((shift) => {
        setState({
          status: shift ? "success" : "unassigned",
          data: shift,
          error: "",
        });
        onShiftLoaded?.(shift);
      })
      .catch((error) => {
        if (error?.code === "ERR_CANCELED") return;
        setState({
          status: "error",
          data: null,
          error: error?.message || "Không thể tải ca làm việc.",
        });
        onShiftLoaded?.(null);
      });
    return () => controller.abort();
  }, [date, reloadKey, onShiftLoaded]);

  const shift = state.data;
  const sourceLabel =
    shift?.source === "default" ? "Ca mặc định" : "Ca được phân";

  return (
    <section className="attendance-shift-banner">
      <span>{state.status === "error" ? <CircleAlert /> : <Clock3 />}</span>
      <div>
        <small>CA LÀM VIỆC HIỆN TẠI</small>
        {state.status === "loading" && <strong>Đang tải ca làm việc…</strong>}
        {state.status === "unassigned" && <strong>Chưa được phân ca</strong>}
        {state.status === "error" && (
          <>
            <strong>Không thể tải ca làm việc</strong>
            <p>{state.error}</p>
          </>
        )}
        {state.status === "success" && (
          <>
            <strong>
              {shift.name}: {formatShiftTime(shift.startTime)} -{" "}
              {formatShiftTime(shift.endTime)}
            </strong>
            <p>
              Nghỉ trưa {formatShiftTime(shift.breakStart)} -{" "}
              {formatShiftTime(shift.breakEnd)} · {sourceLabel}
              {shift.effectiveDate
                ? ` · Từ ${formatEffectiveDate(shift.effectiveDate)}`
                : ""}
            </p>
          </>
        )}
      </div>
      {state.status === "success" && (
        <i>
          <CircleCheck /> {shift.isActive ? "Đang áp dụng" : "Ngừng áp dụng"}
        </i>
      )}
      {state.status === "error" && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Thử lại
        </button>
      )}
    </section>
  );
}
