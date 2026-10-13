import React from "react";
import { LogOut } from "lucide-react";
export function LogoutModal({ onClose, onConfirm }) {
    return (<div className="modal-backdrop" onMouseDown={onClose}>
      <div className="logout-modal" onMouseDown={(e) => e.stopPropagation()}>
        <span className="logout-icon"><LogOut /></span>
        <h2>Đăng xuất khỏi NBC Portal?</h2>
        <p>Bạn cần đăng nhập lại để tiếp tục xem thông tin cá nhân.</p>
        <div>
          <button onClick={onClose}>Ở lại</button>
          <button className="danger-button" onClick={onConfirm}><LogOut /> Đăng xuất</button>
        </div>
      </div>
    </div>);
}
