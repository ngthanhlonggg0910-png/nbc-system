import React from "react";
import { Bell } from "lucide-react";
export function PageTitle({ title, subtitle }) {
    return (<div className="page-title">
      <div>
        <p>{subtitle}</p>
        <h1>{title}</h1>
      </div>
    </div>);
}
