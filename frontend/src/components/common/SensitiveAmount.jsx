import React from "react";
import { Eye, EyeOff } from "lucide-react";
export function SensitiveAmount({ value, visible, onToggle, label }) {
    return (<span className="sensitive-amount">
      <span>{visible ? value : "**********"}</span>
      <button type="button" aria-label={visible ? `Ẩn ${label}` : `Xem ${label}`} title={visible ? "Ẩn số tiền" : "Xem số tiền"} onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle();
        }}>
        {visible ? <EyeOff size={16}/> : <Eye size={16}/>}
      </button>
    </span>);
}
