import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ProfilePage } from "./ProfileView";
import {
  setNotificationsOpen,
  setPasswordModal,
  setAvatarByUser,
  setUser,
} from "@/redux/userSlice";
import { patchData, postData } from "@/utils/api";
import { useBiometricLogin } from "@/hooks/useBiometricLogin";

const fullAssetUrl = (path) => {
  if (!path || path.startsWith("http") || path.startsWith("data:"))
    return path || null;
  const base = (import.meta.env.VITE_API_URL || "")
    .replace(/\/$/, "")
    .replace(/\/api$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

export default function Profile() {
  const dispatch = useDispatch();
  const dbUser = useSelector((state) => state.user.currentUser);
  const avatarByUser = useSelector((state) => state.user.avatarByUser);
  const notices = useSelector((state) => state.user.notices);
  const [regCount, setRegCount] = useState(0);
  const {
    isSupported: biometricSupported,
    hasBiometricRegistered,
    registerBiometric,
  } = useBiometricLogin();
  const profile = useMemo(
    () =>
      dbUser
        ? {
            staffId: dbUser.staff_id,
            name:
              `${dbUser.last_name ?? ""} ${dbUser.first_name ?? ""}`.trim() ||
              "Chưa cập nhật",
            email: dbUser.email || "—",
            phone: dbUser.phone || "—",
            gender: dbUser.gender,
            birthDate: dbUser.birth_date?.slice(0, 10) || "",
            joinDate: dbUser.join_date?.slice(0, 10) || "",
            department: dbUser.department || "Chưa cập nhật",
            position: dbUser.position || "Chưa cập nhật",
            workplace: dbUser.department || "Chưa cập nhật",
            roleName: dbUser.role?.name || "Chưa cập nhật",
            avatarUrl: fullAssetUrl(
              dbUser.avatar_display_url ?? dbUser.avatar_url,
            ),
          }
        : null,
    [dbUser],
  );

  const updateProfile = async (data) => {
    const response = await patchData("/api/user/profile/edit", data);
    if (response.data?.user) dispatch(setUser(response.data.user));
    return response.data;
  };
  const updateAvatar = async (file) => {
    const form = new FormData();
    form.append("avatar", file);
    const response = await postData("/api/user/profile/avatar", form);
    const avatarUrl = response.data.avatarUrl;
    dispatch(
      setUser({
        ...dbUser,
        avatar_url: response.data.avatarKey,
        avatar_display_url: avatarUrl,
      }),
    );
    dispatch(
      setAvatarByUser({
        ...avatarByUser,
        [dbUser.staff_id]: avatarUrl,
      }),
    );
    return response.data;
  };
  const register = async () => {
    const success = await registerBiometric(profile.staffId);
    if (success) setRegCount((value) => value + 1);
  };
  if (!profile) return null;
  return (
    <ProfilePage
      user={profile}
      avatarUrl={profile.avatarUrl}
      canEdit
      canUpdatePassword
      onAvatarChange={updateAvatar}
      onUpdateProfile={updateProfile}
      onChangePassword={() => dispatch(setPasswordModal(true))}
      onNotifications={() => dispatch(setNotificationsOpen(true))}
      unreadCount={notices.filter((item) => !item.read).length}
      biometricSupported={biometricSupported}
      hasBiometricRegistered={hasBiometricRegistered}
      onRegisterBiometric={register}
      key={regCount}
    />
  );
}
