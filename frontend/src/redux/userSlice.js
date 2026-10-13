import { createSlice } from "@reduxjs/toolkit";
import {
  initialArticles,
  initialEmployees,
  initialFeedbacks,
  initialHrAdminState,
  initialResetRequests,
  initialSystemConfig,
} from "@/utils/data";
import { initialNotices } from "@/components/Notice";
import { salaryMaster } from "@/utils/payroll";

const getInitialSession = () => {
  try {
    const saved =
      localStorage.getItem("nbc-portal-session") ??
      sessionStorage.getItem("nbc-portal-session");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse saved session", e);
  }
  return { authenticated: false, staffId: "" };
};

const initialState = {
  // Dữ liệu tĩnh cho giai đoạn demo. API sẽ thay thế các giá trị này sau.
  session: getInitialSession(),
  currentUser: null,
  authLoading: false,
  authError: null,
  desktopSidebarHidden: false,
  mobileMenu: false,
  notificationsOpen: false,
  avatarByUser: {},
  notices: initialNotices,
  feedbacks: initialFeedbacks,
  resetRequests: initialResetRequests,

  employees: initialEmployees,
  articles: initialArticles,
  // documents: initialDocuments,
  documents: [],
  systemConfig: initialSystemConfig,
  salaryItems: salaryMaster,
  hrAdminData: initialHrAdminState,
  selectedArticleId: undefined,
  attendanceFocusDate: undefined,
  notificationSetup: false,
  notificationDenied: false,
  priorityQueue: [],
  isFullscreen: false,
  accountMenu: false,
  passwordModal: false,
  logoutModal: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setSession(state, action) {
      state.session = action.payload;
    },
    setUser(state, action) {
      state.currentUser = action.payload;
      state.authError = null;
    },
    setAuthLoading(state, action) {
      state.authLoading = action.payload;
    },
    setAuthError(state, action) {
      state.authError = action.payload;
    },
    clearAuth(state) {
      state.currentUser = null;
      state.authLoading = false;
      state.authError = null;
      state.session = { authenticated: false, staffId: "" };
    },
    setDesktopSidebarHidden(state, action) {
      state.desktopSidebarHidden = action.payload;
    },
    setMobileMenu(state, action) {
      state.mobileMenu = action.payload;
    },
    setNotificationsOpen(state, action) {
      state.notificationsOpen = action.payload;
    },
    setAvatarByUser(state, action) {
      state.avatarByUser = action.payload;
    },
    setNotices(state, action) {
      state.notices = action.payload;
    },
    setFeedbacks(state, action) {
      state.feedbacks = action.payload;
    },
    setResetRequests(state, action) {
      state.resetRequests = action.payload;
    },
    setEmployees(state, action) {
      state.employees = action.payload;
    },
    setArticles(state, action) {
      state.articles = action.payload;
    },
    setDocuments(state, action) {
      state.documents = action.payload;
    },
    setSystemConfig(state, action) {
      state.systemConfig = action.payload;
    },
    setSalaryItems(state, action) {
      state.salaryItems = action.payload;
    },
    setHrAdminData(state, action) {
      state.hrAdminData = action.payload;
    },
    mergeHrAdminData(state, action) {
      state.hrAdminData = { ...state.hrAdminData, ...action.payload };
    },
    setSelectedArticleId(state, action) {
      state.selectedArticleId = action.payload;
    },
    setAttendanceFocusDate(state, action) {
      state.attendanceFocusDate = action.payload;
    },
    setNotificationSetup(state, action) {
      state.notificationSetup = action.payload;
    },
    setNotificationDenied(state, action) {
      state.notificationDenied = action.payload;
    },
    setPriorityQueue(state, action) {
      state.priorityQueue = action.payload;
    },
    setIsFullscreen(state, action) {
      state.isFullscreen = action.payload;
    },
    setAccountMenu(state, action) {
      state.accountMenu = action.payload;
    },
    setPasswordModal(state, action) {
      state.passwordModal = action.payload;
    },
    setLogoutModal(state, action) {
      state.logoutModal = action.payload;
    },
  },
});

export const {
  setSession,
  setUser,
  setAuthLoading,
  setAuthError,
  clearAuth,
  setDesktopSidebarHidden,
  setMobileMenu,
  setNotificationsOpen,
  setAvatarByUser,
  setNotices,
  setFeedbacks,
  setResetRequests,
  setEmployees,
  setArticles,
  setDocuments,
  setSystemConfig,
  setSalaryItems,
  setHrAdminData,
  mergeHrAdminData,
  setSelectedArticleId,
  setAttendanceFocusDate,
  setNotificationSetup,
  setNotificationDenied,
  setPriorityQueue,
  setIsFullscreen,
  setAccountMenu,
  setPasswordModal,
  setLogoutModal,
} = userSlice.actions;

export default userSlice.reducer;
