import React from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { hasPermission } from "@/utils/permission";
import Forbidden from "./Forbidden";

export default function PermissionRoute({ permission }) {
  const user = useSelector((state) => state.user.currentUser);
  return hasPermission(user, permission) ? <Outlet /> : <Forbidden />;
}
