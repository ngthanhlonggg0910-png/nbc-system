# NBC Employee Portal

Frontend cổng thông tin nhân viên NBC, xây dựng bằng React 19, Redux Toolkit, React Router, Axios, Tailwind CSS và Vite.

## 1. Khởi chạy

Yêu cầu khuyến nghị: Node.js 22 và npm 10.

```bash
npm install
npm run dev
```

Ứng dụng development mặc định chạy tại `http://localhost:5173`.

```bash
npm run build    # Build production vào dist/
npm run preview  # Chạy thử bản production
```

## 2. Cấu hình môi trường

File `.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_ENABLE_API=false
```

- `VITE_API_URL`: địa chỉ backend.
- `VITE_ENABLE_API=false`: chạy bằng dữ liệu demo/local storage.
- Chỉ chuyển thành `true` khi backend và các endpoint đồng bộ đã hoạt động.

## 3. Trạng thái đăng nhập và phân quyền

Phiên bản hiện tại là frontend demo chưa áp dụng phân quyền.

- Mọi mã nhân viên và mật khẩu không rỗng đều đăng nhập được.
- Session chỉ xác nhận trạng thái đăng nhập và lưu `staffId`.
- Frontend không suy luận role từ mã nhân viên.
- Tất cả route và menu được hiển thị sau khi đăng nhập.
- `PrivateRouter` hiện chỉ kiểm tra `session.authenticated`.

Khi backend phân quyền sẵn sàng, API đăng nhập nên trả về cấu trúc tương tự:

```json
{
  "token": "access-token",
  "user": {
    "staffId": "NBC012345",
    "name": "Nguyễn Văn An"
  },
  "role": "employee",
  "permissions": [
    "attendance.view",
    "document.create",
    "profile.view"
  ]
}
```

Sau đó cần bổ sung một lớp kiểm soát tập trung để:

1. Lưu `token`, `user`, `role` và `permissions` vào session/Redux.
2. Lọc menu trong `src/layout/index.jsx`.
3. Bảo vệ route trong `src/router/index.jsx` hoặc một `PermissionRoute` riêng.
4. Ẩn/khóa nút thao tác dựa trên permission.
5. Backend vẫn phải kiểm tra quyền; không dựa hoàn toàn vào việc ẩn UI.

Không gán quyền bằng điều kiện cứng như `staffId === "HR0001"` hoặc `staffId.startsWith("ADMIN")`.

## 4. Luồng ứng dụng

```text
index.html
  → src/main.jsx                 Redux Provider
    → src/App.jsx                AppInitializer + HashRouter
      → src/router/index.jsx     Ánh xạ URL
        → PrivateRouter          Kiểm tra đăng nhập
          → src/layout/index.jsx Sidebar, header và Outlet
            → src/page/...       Trang nghiệp vụ
```

## 5. Cấu trúc mã nguồn

```text
src/
├── components/       Component và modal tái sử dụng
├── layout/           Khung giao diện và cấu hình menu
├── page/             Các màn hình nghiệp vụ
├── redux/            Redux store và state toàn cục
├── router/           Khai báo route
├── styles/           CSS chia theo nhóm giao diện
├── utils/            API, helper, dữ liệu demo và persistence
├── App.jsx            Router và khởi tạo ứng dụng
├── App.css            CSS dự phòng
├── index.css          Điểm nhập CSS toàn cục
└── main.jsx           Điểm khởi chạy React
```

Dự án sử dụng JavaScript/JSX. Không tạo thêm file `.ts` hoặc `.tsx` nếu chưa thống nhất chuyển toàn bộ dự án trở lại TypeScript.

## 6. Quy ước trang nghiệp vụ

Mỗi trang thường có hai lớp:

```text
src/page/<TênTrang>/
├── index.jsx          Đọc Redux, chuẩn bị dữ liệu và callback
└── <TênTrang>View.jsx Render giao diện và xử lý tương tác tại trang
```

- Sửa giao diện, bảng, form hoặc nội dung: chỉnh `*View.jsx`.
- Sửa Redux, dữ liệu đầu vào hoặc callback CRUD: chỉnh `index.jsx`.
- Thành phần dùng lại ở nhiều trang: đặt trong `src/components/`.
- Không dồn logic của nhiều màn hình vào `App.jsx`, `layout/index.jsx` hoặc một component chung lớn.

## 7. Bản đồ URL và file

| URL | Màn hình | File dữ liệu/Redux | File giao diện |
|---|---|---|---|
| `/login` | Đăng nhập | `src/page/Login/index.jsx` | `src/page/Login/LoginView.jsx` |
| `/` | Trang chủ | `src/page/Home/index.jsx` | `src/page/Home/HomeView.jsx` |
| `/cham-cong` | Chấm công | `src/page/Attendance/index.jsx` | `src/page/Attendance/AttendanceView.jsx` |
| `/phieu-luong` | Phiếu lương | `src/page/Salary/index.jsx` | `src/page/Salary/SalaryView.jsx` |
| `/van-ban` | Văn bản | `src/page/Document/index.jsx` | `src/page/Document/DocumentView.jsx` |
| `/thong-bao` | Thông báo và tin tức | `src/page/Notification/index.jsx` | `src/page/Notification/NotificationView.jsx` |
| `/ca-nhan` | Hồ sơ cá nhân | `src/page/Profile/index.jsx` | `src/page/Profile/ProfileView.jsx` |
| `/admin-hr` | Tổng quan HR | `src/page/AdminHR/index.jsx` | `src/page/AdminHR/AdminHRView.jsx` |
| `/nhan-su` | Dữ liệu nhân sự | `src/page/Employee/index.jsx` | `src/page/Employee/EmployeeView.jsx` |
| `/nhom-quyen` | Nhóm quyền | `src/page/Role/index.jsx` | Tạm dùng lại trang Permission |
| `/phan-quyen` | Phân quyền | `src/page/Permission/index.jsx` | `src/page/Permission/PermissionView.jsx` |
| `/quan-ly-tin-tuc` | Quản lý tin tức | `src/page/NewsManagement/index.jsx` | `src/page/NewsManagement/NewsManagementView.jsx` |
| `/cau-hinh` | Cấu hình hệ thống | `src/page/SystemConfig/index.jsx` | `src/page/SystemConfig/SystemConfigView.jsx` |

## 8. Component dùng chung

```text
src/components/
├── common/          Brand, Avatar, PageTitle, SensitiveAmount
├── auth/            QR login, đổi mật khẩu, đăng xuất
├── attendance/      Modal phản hồi chấm công
├── document/        Modal xem file đính kèm
├── Notice/          Trung tâm và popup thông báo
├── PrivateRouter/   Bảo vệ đăng nhập
└── AppInitializer.jsx
```

`AppInitializer.jsx` chịu trách nhiệm khôi phục dữ liệu local, khởi tạo effect và đồng bộ trạng thái. Không đặt giao diện trang vào file này.

## 9. Router và layout

| File | Trách nhiệm |
|---|---|
| `src/router/index.jsx` | Khai báo URL và component trang |
| `src/components/PrivateRouter/index.jsx` | Chặn người dùng chưa đăng nhập |
| `src/layout/index.jsx` | Sidebar, user menu, header, logout, notification và Outlet |
| `src/layout/navigation.js` | Danh sách menu nghiệp vụ |

Khi thêm trang:

1. Tạo thư mục mới trong `src/page/`.
2. Thêm `index.jsx` và `*View.jsx`.
3. Khai báo URL tại `src/router/index.jsx`.
4. Thêm menu tại `src/layout/navigation.js` nếu cần.

## 10. Redux

| File | Trách nhiệm |
|---|---|
| `src/redux/store.js` | Tạo Redux store |
| `src/redux/userSlice.js` | Session và trạng thái dùng chung của portal |

Trong component, sử dụng `useSelector` và `useDispatch`. Chỉ import trực tiếp `store` trong mã khởi tạo hoặc persistence thực sự cần truy cập ngoài React.

## 11. API, dữ liệu và helper

| File/thư mục | Trách nhiệm |
|---|---|
| `src/utils/api.js` | Axios client và các hàm HTTP |
| `src/utils/portal-effects.js` | Đồng bộ dữ liệu và notification nền |
| `src/utils/portal-persistence.js` | Lưu/khôi phục trạng thái portal |
| `src/utils/data/` | Dữ liệu demo ban đầu |
| `src/utils/payroll/` | Công thức và dữ liệu bảng lương |
| `src/utils/attendance.js` | Xử lý dữ liệu chấm công |
| `src/utils/articles.js` | Kiểm tra tin tức ưu tiên |
| `src/utils/export-pdf.js` | Xuất PDF |
| `src/utils/employee-qr.js` | Đọc mã nhân viên từ QR |

Khi tích hợp backend, ưu tiên đặt lời gọi HTTP trong `utils/api.js` hoặc service riêng thay vì gọi trực tiếp trong file giao diện.

## 12. CSS

`src/index.css` import các nhóm style trong `src/styles/globals/`:

| File | Phạm vi |
|---|---|
| `01-foundation-shell.css` | Theme, reset, sidebar và layout |
| `02-feature-base.css` | Component nghiệp vụ cơ bản |
| `03-responsive-base.css` | Responsive chung |
| `04-business-workflows.css` | Form và workflow |
| `05-print-accessibility.css` | In ấn và accessibility |
| `06-notifications-news.css` | Thông báo và tin tức |
| `07-reports-print.css` | Báo cáo và bản in |
| `08-auth-hr-payroll.css` | Đăng nhập, HR và bảng lương |
| `09-readability.css` | Cỡ chữ và khả năng đọc |
| `10-attendance-report.css` | Báo cáo chấm công |
| `11-employee-data.css` | Trang dữ liệu nhân sự |

Selector mới nên nằm dưới class gốc của trang, ví dụ `.hr-data-page`, để không ảnh hưởng màn hình khác.

## 13. PWA và tài nguyên tĩnh

`public/` chứa logo, ảnh nền, favicon, `manifest.webmanifest` và `sw.js`.

Service worker chỉ được đăng ký trong production. Không chỉnh trực tiếp `dist/`; thư mục này được tạo lại bằng `npm run build`.

## 14. Checklist trước khi bàn giao

1. Kiểm tra đúng `index.jsx` và `*View.jsx` của trang.
2. Không thêm điều kiện phân quyền cứng theo mã nhân viên.
3. Không import từ cấu trúc cũ `features`, `shared` hoặc `fixtures`.
4. Không tạo file `.ts` hoặc `.tsx`.
5. Chạy `npm run build`.
6. Kiểm tra giao diện desktop/mobile nếu sửa CSS.
7. Không chỉnh trực tiếp file trong `dist/`.
