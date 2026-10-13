import {
  BadgeCheck,
  CalendarDays,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

export const BOARD_ITEMS = [
  {
    key: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    key: "periods",
    label: "Kỳ lương",
    icon: CalendarDays,
  },
  {
    key: "import",
    label: "Import Excel",
    icon: FileSpreadsheet,
  },
  {
    key: "history",
    label: "Lịch sử Import",
    icon: History,
  },
  {
    key: "publish",
    label: "Phát hành lương",
    icon: BadgeCheck,
  },
  {
    key: "adjustment",
    label: "Điều chỉnh lương",
    icon: SlidersHorizontal,
  },
  {
    key: "thirteenth-month",
    label: "Chính sách T13",
    icon: Sparkles,
  },
];

const PayrollAdminBoard = ({
  activeBoard = "overview",
  onChange,
}) => {
  return (
    <nav
      className="payroll-board"
      aria-label="Chức năng quản lý lương"
    >
      {BOARD_ITEMS.map((item) => {
        const Icon = item.icon;

        const active =
          activeBoard === item.key;

        return (
          <button
            key={item.key}
            type="button"
            className={[
              "payroll-board__item",
              active
                ? "payroll-board__item--active"
                : "",
              item.disabled
                ? "payroll-board__item--disabled"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) {
                return;
              }

              onChange?.(item.key);
            }}
          >
            <span className="payroll-board__icon">
              <Icon />
            </span>

            <span className="payroll-board__label">
              {item.label}
            </span>

            {item.badge && (
              <span className="payroll-board__badge">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default PayrollAdminBoard;
