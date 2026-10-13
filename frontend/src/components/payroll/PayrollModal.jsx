import React, {
  createElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Surface modal dùng chung cho nghiệp vụ phiếu lương.
 * Backdrop và dialog là hai layer độc lập để opacity không truyền vào nội dung.
 */
export default function PayrollModal({
  as = "section",
  ariaLabelledBy,
  busy = false,
  className = "",
  initialFocusRef,
  onClose,
  children,
  ...surfaceProps
}) {
  const surfaceRef = useRef(null);
  const returnFocusRef = useRef(null);
  const busyRef = useRef(busy);
  const closeRef = useRef(onClose);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    busyRef.current = busy;
    closeRef.current = onClose;
  }, [busy, onClose]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const preferred = initialFocusRef?.current;
      const firstFocusable = surfaceRef.current?.querySelector(FOCUSABLE_SELECTOR);
      (preferred || firstFocusable || surfaceRef.current)?.focus?.();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        closeRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = [...(surfaceRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [])]
        .filter((element) => element.offsetParent !== null);

      if (!focusable.length) {
        event.preventDefault();
        surfaceRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [initialFocusRef]);

  if (typeof document === "undefined") return null;

  const maximizeButton = (
    <button
      key="payroll-modal-maximize"
      type="button"
      className="payroll-modal-maxbtn"
      title={maximized ? "Thu nhỏ" : "Phóng toàn màn hình"}
      onClick={() => setMaximized((value) => !value)}
    >
      {maximized ? <Minimize2 size={15} /> : <Maximize2 size={14} />}
    </button>
  );

  const surface = createElement(
    as,
    {
      ...surfaceProps,
      ref: surfaceRef,
      className: `payroll-modal-surface ${maximized ? "payroll-modal-surface--max" : ""} ${className}`.trim(),
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": ariaLabelledBy,
      "aria-busy": busy || undefined,
      tabIndex: -1,
    },
    [maximizeButton, children],
  );

  return createPortal(
    <div className="payroll-modal-root">
      <div
        className="payroll-modal-backdrop"
        aria-hidden="true"
        onMouseDown={() => !busy && onClose?.()}
      />
      {surface}
    </div>,
    document.body,
  );
}
