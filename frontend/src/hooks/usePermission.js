import { useCallback } from "react";
import { useSelector } from "react-redux";
import { hasPermission } from "@/utils/permission";

export default function usePermission() {
  const user = useSelector((state) => state.user.currentUser);
  return useCallback((permission) => hasPermission(user, permission), [user]);
}
