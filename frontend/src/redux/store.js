import { configureStore } from "@reduxjs/toolkit";

import userReducer from "./userSlice";
import payrollReducer from "./payrollSlice";
import payrollDashboardReducer from "./payroll/payrollDashboardSlice";
import payrollPeriodReducer from "./payroll/payrollPeriodSlice";
import payrollImportReducer from "./payroll/payrollImportSlice";
import payrollAdjustmentReducer from "./payroll/payrollAdjustmentSlice";
import roleReducer from "./roleSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    payroll: payrollReducer,

    payrollDashboard:
      payrollDashboardReducer,

    payrollPeriod:
      payrollPeriodReducer,

    payrollImport:
      payrollImportReducer,

    payrollAdjustment:
      payrollAdjustmentReducer,

    roles: roleReducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      /*
       * Giữ false tạm thời vì dữ liệu demo hiện tại có thể chứa
       * một số giá trị hoặc cấu trúc chưa serializable hoàn toàn.
       */
      serializableCheck: false,
    }),

  devTools: import.meta.env.DEV,
});

export default store;
