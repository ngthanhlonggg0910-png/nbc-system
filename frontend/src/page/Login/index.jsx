import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LoginPage } from "./LoginView";
import {
  setSession,
  setNotices,
  setResetRequests,
} from "../../redux/userSlice";
import { KeyRound } from "lucide-react";
import { postData } from "../../utils/api";

function normalizePortalRole(role) {
  return String(role ?? "")
    .toLowerCase()
    .includes("admin")
    ? "admin"
    : "employee";
}

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const session = useSelector((state) => state.user.session);
  const employees = useSelector((state) => state.user.employees);
  const resetRequests = useSelector((state) => state.user.resetRequests);
  const notices = useSelector((state) => state.user.notices);

  useEffect(() => {
    if (session?.authenticated) {
      navigate("/", { replace: true });
    }
  }, [session, navigate]);

  const login = async (staffId, remember, password, role) => {
    try {
      if (password) {
        const response = await postData("/api/user/login", {
          staffId,
          password,
        });
        if (response.data.token) {
          localStorage.setItem("nbc-access-token", response.data.token);
          const nextSession = {
            authenticated: true,
            staffId: response.data.user.staff_id,
            token: response.data.token,
            role: normalizePortalRole(response.data.user.role),
          };
          const storage = remember ? localStorage : sessionStorage;
          const otherStorage = remember ? sessionStorage : localStorage;
          storage.setItem("nbc-portal-session", JSON.stringify(nextSession));
          otherStorage.removeItem("nbc-portal-session");
          dispatch(setSession(nextSession));
          navigate("/");
        }
      } else {
        const nextSession = {
          authenticated: true,
          staffId,
          token: localStorage.getItem("nbc-access-token"),
          role: normalizePortalRole(role),
        };
        const storage = remember ? localStorage : sessionStorage;
        const otherStorage = remember ? sessionStorage : localStorage;
        storage.setItem("nbc-portal-session", JSON.stringify(nextSession));
        otherStorage.removeItem("nbc-portal-session");
        dispatch(setSession(nextSession));
        navigate("/");
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  if (session?.authenticated) {
    return null;
  }

  return <LoginPage onLogin={login} />;
}
