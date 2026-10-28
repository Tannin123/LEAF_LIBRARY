# IXS LIBRARY - HỆ THỐNG QUẢN LÝ THƯ VIỆN

Đồ án môn học xây dựng giao diện Web cho **Hệ thống Quản lý Thư viện IXS (IXS Library Management System)** bằng **HTML5, CSS3 và JavaScript thuần**. Hệ thống được thiết kế tối ưu trải nghiệm UI/UX, phân định rõ ràng 2 phân hệ riêng biệt cho **Bạn đọc** và **Quản trị viên / Thủ thư**.

---

## 🛠️ Công nghệ sử dụng

- **Frontend:** HTML5, CSS3 (Flexbox/Grid, CSS Variables), JavaScript Vanilla (ES6+ Modules).
- **Lưu trữ dữ liệu:** `localStorage` (Giả lập CSDL phía Client).
- **Thiết kế UI:** Khung bo tròn (Border Radius), hệ màu Badge vai trò/trạng thái chuẩn Figma.
- **Fonts & Icons:** Playfair Display (Chữ chào hỏi), Inter/Roboto (Nội dung), SVG Icons.
- **Công cụ chạy:** Live Server (Extension trên VS Code).

---

## 📁 Cấu trúc thư mục dự án

```text
ixs-library/
│
├── login.html               # Màn hình Đăng nhập cho Bạn đọc
├── register.html            # Màn hình Đăng ký tài khoản Bạn đọc
│
├── user/                    # 1. GIAO DIỆN BẠN ĐỌC 
│   ├── index.html           # Trang chủ / Tổng quan bạn đọc (Dashboard)
│   ├── catalog.html         # Tra cứu sách, xem vị trí kho & Gửi đề xuất sách
│   ├── bookshelf.html       # Tủ sách cá nhân (Lưu/Xóa sách)
│   ├── history.html         # Lịch sử mượn trả, Nút Gia hạn & Đăng ký chờ
│   ├── penalties.html       # Phạt 
│   └── profile.html         # Xem & Cập nhật thông tin cá nhân
│
├── admin/                   # 2. GIAO DIỆN ADMIN & THỦ THƯ 
│   ├── index.html           # Quản lý hệ thống (Danh sách nhân viên, Cấp TK, Lọc vai trò)
│   ├── books.html           # Quản lý danh mục, Đầu sách, Mã cuốn & Nhập kho
│   ├── readers.html         # Quản lý bạn đọc (Thêm / Khóa / Mở tài khoản)
│   ├── circulation.html     # Quản lý mượn - trả sách, Quét mã & Lập phiếu phạt
│   └── reports.html         # Báo cáo, thống kê tổng quan
│
├── css/                     # CHỨA CÁC FILE CSS STYLING
│   ├── style.css            # CSS chung (Variables màu sắc, Reset, Font, Modal Popup)
│   ├── user.css             # CSS riêng giao diện Bạn đọc (Cards, Banner nhắc nhở)
│   └── admin.css            # CSS riêng giao diện Admin (Sidebar, Data Tables, Badges)
│
├── js/                      # CHỨA CÁC FILE LOGIC JAVASCRIPT
│   ├── data.js              # Khởi tạo CSDL mẫu & Quản lý dữ liệu localStorage
│   ├── auth.js              # Logic kiểm tra Đăng nhập & Chuyển hướng theo Role
│   ├── user.js              # Logic tương tác UI các trang Bạn đọc
│   └── admin.js             # Logic tương tác UI các trang Admin
│
└── assets/                  # TÀI NGUYÊN TĨNH
    ├── images/              # Logo IXS Library, Avatar, Bìa sách
    └── icons/               # Icons SVG
```

## 📋 Danh sách 10 chức năng chính

1. **Đăng ký & Đăng nhập tài khoản:** Xác thực tài khoản bạn đọc (`login.html`) và admin (`admin/index.html`), phân quyền truy cập thích hợp.
2. **Quản lý tài khoản bạn đọc:** Hỗ trợ Admin/Thủ thư xem, tìm kiếm, thêm mới và khóa/mở khóa tài khoản bạn đọc.
3. **Quản lý nhân viên:** Quản lý danh sách nhân viên, chức vụ, trạng thái làm việc, cấp tài khoản và phân quyền (Admin, Thủ thư kho, Thủ thư quầy).
4. **Quản lý danh mục tài liệu:** Phân loại tài liệu theo thể loại, chủ đề, khoa hoặc chuyên ngành.
5. **Quản lý sách và kho:** Quản lý thông tin đầu sách, mã cuốn sách vật lý riêng, vị trí lưu trữ trên kệ và lập/xác nhận phiếu nhập kho.
6. **Quản lý tủ sách cá nhân:** Bạn đọc có thể lưu tài liệu yêu thích vào tủ sách cá nhân, xem lại hoặc xóa khỏi danh sách.
7. **Tìm kiếm & Đề xuất sách:** Tra cứu sách theo tên, tác giả, ISBN (hiển thị vị trí & số lượng sẵn có trong kho); gửi đề xuất bổ sung sách mới.
8. **Mượn, Trả, Gia hạn & Đăng ký chờ:** Xử lý giao dịch mượn/trả, kiểm tra hạn trả, hỗ trợ bấm nút "Gia hạn ngay" và xếp vị trí hàng chờ khi hết sách.
9. **Khoản phạt & Đền bù:** Ghi nhận vi phạm (trả quá hạn, làm hỏng/mất sách), tính phí đền bù và theo dõi tình trạng thanh toán.
10. **Báo cáo & Thống kê:** Tổng hợp dữ liệu số lượng đầu sách, tồn kho, tình hình mượn trả, sách quá hạn/hư hỏng và doanh thu phí phạt.

## 🚀 Hướng dẫn chạy dự án

1. **Tải / Clone mã nguồn** về máy tính.
2. Mở thư mục `ixs-library/` bằng trình soạn thảo **VS Code**.
3. Cài đặt Extension **Live Server** trong VS Code (nếu chưa có).
4. **Mở ứng dụng:**
   - **Giao diện Bạn đọc:** Click chuột phải vào file `login.html` → chọn `Open with Live Server` (đường dẫn: `http://127.0.0.1:5500/login.html`).
   - **Giao diện Admin:** Mở đường dẫn `http://127.0.0.1:5500/admin/index.html` (hoặc `http://127.0.0.1:5500/admin`).

## 🔑 Tài khoản trải nghiệm mẫu (dữ liệu thử nghiệm)

| Vai trò | Tên đăng nhập | Mật khẩu | Màn hình chuyển hướng |
|---|---|---|---|
| Quản trị viên | `admin` | `123456` | `admin/index.html` |
| Thủ thư | `thuthu` | `123456` | `admin/index.html` |
| Bạn đọc | `tannin` | `123456` | `user/index.html` |

## phân công công việc
team 1 - frontend: hong cuc, huy phat, thanh dat, tan nin
team 2 - backend: tan nin, xuan ly, minh tuan

## Quy chuẩn đặt tên các thành phần giao diện
CÁC BẠN Nên sử dụng tiền tố để phân biệt các thành phần, tránh đặt tên chung chung hoặc trùng nhau giữa giao diện độc giả và quản trị viên.
T ví dụ
Thanh điều hướng	navbar
Thanh bên độc giả	user-sidebar
Thanh bên quản trị	admin-sidebar
Thẻ thống kê	stat-card
Bảng sách	books-table
Biểu mẫu đăng nhập	login-form
Nút thêm sách	btn-add-book
Huy hiệu trạng thái	status-badge
Hộp thoại xác nhận	confirm-modal
Ô tìm kiếm sách	book-search