import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRouter from "../components/PrivateRouter";
import Layout from "../layout";

// Import pages
import Login from "../page/Login";
import Home from "../page/Home";
import Profile from "../page/Profile";
import AttendanceRoute from "../features/attendance/pages/employee";
import Salary from "../page/Salary";
import Document from "../page/Document";
import Notification from "../page/Notification";
import AdminHR from "../page/AdminHR";
import Employee from "../page/Employee";
import Permission from "../page/Permission";
import Role from "../page/Role";
import NewsManagement from "../page/NewsManagement";
import SystemConfig from "../page/SystemConfig";
import PayrollAdmin from "../page/PayrollAdmin";
import ListEmploy from "@/page/ListEmploy";
import PermissionRoute from "@/components/PermissionRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route element={<PrivateRouter />}>
        <Route element={<Layout />}>
          <Route element={<PermissionRoute permission="view_home" />}>
            <Route path="/" element={<Home />} />
          </Route>
          <Route element={<PermissionRoute permission="view_attendance" />}>
            <Route path="/cham-cong" element={<AttendanceRoute />} />
          </Route>
          <Route element={<PermissionRoute permission="view_salary" />}>
            <Route path="/phieu-luong" element={<Salary />} />
          </Route>
          <Route element={<PermissionRoute permission="view_document" />}>
            <Route path="/van-ban" element={<Document />} />
          </Route>
          <Route element={<PermissionRoute permission="view_news" />}>
            <Route path="/thong-bao" element={<Notification />} />
          </Route>
          <Route path="/ca-nhan" element={<Profile />} />
          <Route element={<PermissionRoute permission="view_hr_data" />}>
            <Route path="/admin-hr" element={<AdminHR />} />
            <Route path="/du-lieu-cong" element={<Employee />} />
          </Route>
          <Route element={<PermissionRoute permission="view_employee" />}>
            <Route path="/nhan-vien" element={<ListEmploy />} />
          </Route>
          <Route element={<PermissionRoute permission="view_role" />}>
            <Route path="/nhom-quyen" element={<Role />} />
          </Route>
          <Route element={<PermissionRoute permission="permission_role" />}>
            <Route path="/phan-quyen" element={<Permission />} />
          </Route>
          <Route element={<PermissionRoute permission="view_news" />}>
            <Route path="/quan-ly-tin-tuc" element={<NewsManagement />} />
          </Route>
          <Route element={<PermissionRoute permission="view_setting" />}>
            <Route path="/cau-hinh" element={<SystemConfig />} />
          </Route>
          <Route element={<PermissionRoute permission="manage_payroll" />}>
            <Route path="/quan-ly-luong" element={<PayrollAdmin />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
