import React from "react";
import { Camera } from "lucide-react";
export function Avatar({ large = false, src, name = "Nguyễn Văn An" }) {
    const initials = name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
    return (<div className={`avatar ${large ? "avatar-large" : ""}`} aria-label={`Ảnh đại diện ${name}`}>
      {src ? <img className="avatar-image" src={src} alt={`Ảnh đại diện ${name}`}/> : <><div className="avatar-hair"/><div className="avatar-face">{initials}</div></>}
      {large && (<span className="camera-badge">
          <Camera size={15}/>
        </span>)}
    </div>);
}
