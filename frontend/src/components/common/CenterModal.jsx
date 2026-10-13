import {
  useEffect,
} from "react";

import {
  X,
} from "lucide-react";

import "./CenterModal.css";

/**
 * Modal giữa màn hình kiểu Zalo:
 * - Nền mờ phía sau, hộp cố định ở giữa
 * - Đóng bằng nút ×, bấm ra ngoài hoặc Esc
 */
const CenterModal = ({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "Escape"
      ) {
        onClose?.();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        "";
    };
  }, [onClose]);

  return (
    <div
      className="center-modal__overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <section className="center-modal">
        <header className="center-modal__header">
          {Icon && (
            <Icon
              size={19}
              strokeWidth={2.2}
            />
          )}

          <div className="center-modal__heading">
            <span className="center-modal__title">
              {title}
            </span>

            {subtitle && (
              <span className="center-modal__subtitle">
                {subtitle}
              </span>
            )}
          </div>

          <button
            type="button"
            title="Đóng"
            className="center-modal__iconbtn center-modal__iconbtn--close"
            onClick={() =>
              onClose?.()
            }
          >
            <X size={18} />
          </button>
        </header>

        <div className="center-modal__body">
          {children}
        </div>
      </section>
    </div>
  );
};

export default CenterModal;
