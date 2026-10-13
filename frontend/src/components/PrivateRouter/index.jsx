import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function PrivateRouter() {
  const session = useSelector((state) => state.user.session);
  const currentUser = useSelector((state) => state.user.currentUser);
  const authLoading = useSelector((state) => state.user.authLoading);

  if (session === null || authLoading) {
    return (
      <main className="auth-loading">
        <div className="brand-logo" />
        <span />
        <p>Đang tải NBC Employee Portal...</p>
      </main>
    );
  }

  if (!session.authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  return <Outlet />;
}
