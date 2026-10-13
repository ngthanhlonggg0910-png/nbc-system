"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HashRouter } from "react-router-dom";
import AppRoutes from "./router";
import { Brand } from "@/components/common/Brand";
import { fetchRoles } from "./redux/roleSlice";
import {
  clearAuth,
  setAuthError,
  setAuthLoading,
  setUser,
} from "./redux/userSlice";
import { getData } from "./utils/api";

export default function App() {
  const dispatch = useDispatch();
  const session = useSelector((state) => state.user.session);
  const authLoading = useSelector((state) => state.user.authLoading);
  const currentUser = useSelector((state) => state.user.currentUser);
  const authError = useSelector((state) => state.user.authError);
  const [mounted, setMounted] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);

  useEffect(() => {
    // The router reads the browser location and must only render client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!session?.authenticated) return;
    if (!localStorage.getItem("nbc-access-token")) {
      dispatch(clearAuth());
      return;
    }
    let active = true;
    dispatch(setAuthLoading(true));
    getData("/api/user/profile")
      .then((response) => {
        if (!active) return;
        if (!response.data?.success || !response.data?.user)
          throw new Error(response.data?.message || "Không thể tải hồ sơ.");
        dispatch(setUser(response.data.user));
        dispatch(fetchRoles());
      })
      .catch((error) => {
        if (!active) return;
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem("nbc-access-token");
          localStorage.removeItem("nbc-portal-session");
          sessionStorage.removeItem("nbc-portal-session");
          dispatch(clearAuth());
        } else
          dispatch(
            setAuthError(
              error?.response?.data?.message ||
                error.message ||
                "Không thể tải hồ sơ.",
            ),
          );
      })
      .finally(() => {
        if (active) dispatch(setAuthLoading(false));
      });
    return () => {
      active = false;
    };
  }, [dispatch, session?.authenticated, session?.staffId, profileAttempt]);

  if (mounted && session?.authenticated && authError && !authLoading) {
    return (
      <main className="auth-loading">
        <Brand />
        <p>{authError}</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => setProfileAttempt((value) => value + 1)}
        >
          Thử lại
        </button>
      </main>
    );
  }

  if (!mounted || authLoading || (session?.authenticated && !currentUser)) {
    return (
      <main className="auth-loading">
        <Brand />
        <span />
        <p>Đang tải NBC Employee Portal...</p>
      </main>
    );
  }

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
