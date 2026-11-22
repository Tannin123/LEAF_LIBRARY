# LEAF LIBRARY

Đồ án quản lý thư viện gồm giao diện bạn đọc, giao diện quản trị/thủ thư và REST API TypeScript kết nối PostgreSQL.

## Công nghệ

- Frontend: HTML, CSS và JavaScript thuần.
- Backend: Node.js 22, TypeScript, Express và `pg`.
- Database: PostgreSQL 17 trong Docker; pgAdmin hỗ trợ xem dữ liệu.
- Giao diện dùng Inter, Playfair Display và icon SVG.

Dữ liệu nghiệp vụ được lưu qua API vào PostgreSQL. Frontend giữ cache trong bộ nhớ trang; storage của trình duyệt dùng cho phiên đăng nhập và tùy chọn giao diện.

## Cấu trúc project

```text
LEAF_LIBRARY/
├── admin/                  # Nhân viên, độc giả, kho, lưu thông, báo cáo
├── user/                   # Tra cứu, tủ sách, lịch sử, phạt, đề xuất
├── js/
│   ├── data.js             # Gọi API, phiên, cache và hàng đợi ghi dữ liệu
│   ├── auth.js             # Đăng nhập, đăng ký và đặt lại mật khẩu
│   ├── admin.js            # Tương tác giao diện quản trị/thủ thư
│   └── user.js             # Tương tác giao diện bạn đọc
├── css/                    # Style chung, admin và user
├── assets/images/          # Logo, ảnh nền, bìa sách
├── backend/
│   ├── src/
│   │   ├── server.ts       # Endpoint và nghiệp vụ
│   │   ├── auth.ts         # Phiên, vai trò, quyền và quyền sở hữu dữ liệu
│   │   ├── db.ts           # PostgreSQL connection pool
│   │   ├── migrations.ts   # Chạy migration chưa áp dụng
│   │   └── sms.ts          # Kết nối nhà cung cấp OTP tùy chọn
│   ├── migrations/         # Lịch sử cập nhật schema/dữ liệu có phiên bản
│   ├── Dockerfile
│   └── package.json
├── database/
│   ├── library_db.sql      # Schema khởi tạo
│   └── reconcile_inventory.sql # Công cụ đối soát tồn kho có chủ đích
├── qa-results/             # Một báo cáo kiểm thử tổng hợp
├── .env.example            # Mẫu cấu hình Docker
├── docker-compose.yml
├── login.html              # Đăng nhập; form đăng ký nằm trong trang này
├── index.html              # Điều hướng vào ứng dụng
└── serve.js                # Static server local, thay cho Live Server
```

## Khởi chạy

### PostgreSQL và API

Mở Docker Desktop. Tạo `.env` từ `.env.example` và cấu hình `DB_PASSWORD`, sau đó chạy tại thư mục gốc:

```powershell
docker compose up -d --build
```

| Thành phần | Địa chỉ mặc định |
|---|---|
| API | `http://localhost:3000/api` |
| Kiểm tra kết nối DB | `http://localhost:3000/api/health` |
| PostgreSQL từ máy host | `localhost:5434` |
| pgAdmin | `http://localhost:5050` |

Tên database và user PostgreSQL nằm trong `docker-compose.yml`. Container API kết nối tới service `db:5432`; cổng `5434` dùng cho công cụ chạy trên máy host.

### Frontend

Chọn một trong hai cách:

- Chạy `node serve.js` ở thư mục gốc.
- Mở `login.html` bằng Live Server, cấu hình cổng `5500`.

Truy cập `http://127.0.0.1:5500/login.html`. API quyết định quyền truy cập; giao diện chuyển hướng theo tài khoản đã đăng nhập.

### Tài khoản được tạo bởi migrations

| Vai trò | Tên đăng nhập | Mật khẩu khởi tạo |
|---|---|---|
| Quản trị viên | `admin` | `admin123` |
| Bạn đọc | `tannin` | `Nin10112006` |

Đây là giá trị cho DB khởi tạo mới. Với DB đã sử dụng, mật khẩu là giá trị đã được thay đổi trong hệ thống. Tài khoản khác được đăng ký hoặc cấp qua giao diện.

Phiên do server cấp có thời hạn 12 giờ và mất hiệu lực khi API khởi động lại; đăng nhập lại sau khi cập nhật/restart API.

## Migrations và dữ liệu

- `database/library_db.sql` được PostgreSQL chạy khi khởi tạo volume mới.
- Trước khi mở cổng, API chạy các file chưa áp dụng trong `backend/migrations/` theo thứ tự tên và ghi vào `ixs_schema_migrations`.
- Thay đổi schema cần một migration đánh số mới. Giữ nguyên các migration đã chạy và kiểm tra cả DB hiện có lẫn DB khởi tạo mới.
- Giữ volume hiện có khi cập nhật code. Lệnh `docker compose up -d --build api` cập nhật API và chạy migration mới; không cần xóa volume để nâng cấp schema.
- `database/reconcile_inventory.sql` là công cụ bảo trì riêng: sao lưu, đọc danh sách mâu thuẫn và kiểm tra trên bản sao trước khi áp dụng vào DB chính. Script này không nằm trong chuỗi migration tự chạy.

Mặc định quyền truy cập và quy định thư viện trong `js/data.js` phục vụ cấu hình giao diện/reset cấu hình. Sách, cuốn sách, độc giả và giao dịch lấy từ PostgreSQL, không có danh sách mẫu thay thế khi API lỗi.

## Chức năng

- Đăng ký, đăng nhập, quản lý phiên và phân quyền.
- Quản lý hồ sơ nhân viên, cấp tài khoản, khóa/mở khóa và reset mật khẩu bởi admin.
- Duyệt đăng ký độc giả, quản lý hồ sơ và thẻ thư viện.
- Quản lý đầu sách, cuốn sách, danh mục, nhà cung cấp và nhập kho.
- Đăng ký mượn, duyệt/lập phiếu, trả sách, gia hạn và danh sách chờ.
- Tủ sách cá nhân, ghi chú và tiến độ đọc.
- Đề xuất mua sách, ghi nhận vi phạm và theo dõi thanh toán phạt.
- Báo cáo thống kê và xuất CSV.

Hồ sơ cá nhân và thẻ được mở bằng modal trong giao diện, không có trang `profile.html` hoặc `register.html` riêng. ISBN chưa phải cột của bảng đầu sách.

## Kiểm tra khi phát triển

Backend có các script:

```powershell
cd backend
npm ci
npm run typecheck
npm run build
```

TypeScript bật kiểm tra biến/tham số không sử dụng. Frontend có thể kiểm tra cú pháp từ thư mục gốc:

```powershell
node --check js/data.js
node --check js/auth.js
node --check js/admin.js
node --check js/user.js
```

Báo cáo tổng hợp: `qa-results/bao-cao-kiem-thu-toan-dien.html`. Kiểm thử CRUD dùng DB sao chép; backup và kết quả tạm được giữ ngoài source chia sẻ, trong `.local-backups/` đã được Git bỏ qua.

## Giới hạn khi clean và bảo trì

1. Lưu mốc source trước khi sửa; giữ các thay đổi chưa commit của thành viên khác.
2. Giữ nguyên schema, migration đã chạy, đường dẫn API, tên field, ID HTML và thứ tự nạp script khi chỉ clean code.
3. Chỉ xóa code đã chứng minh không được dùng hoặc không thể chạy. Chức năng đang ẩn, tích hợp tùy chọn và tài nguyên được DB/migration tham chiếu vẫn được giữ.
4. Không đổi layout, CSS, quy tắc nghiệp vụ hoặc dependency chỉ để chỉnh cách trình bày code.
5. Giữ cấu hình mặc định đang phục vụ giao diện; dữ liệu nghiệp vụ phải đọc/ghi qua API.
6. Sau thay đổi ở code dùng chung, chạy kiểm tra cú pháp/typecheck và hồi quy các luồng liên quan. Lỗi mới phải được xử lý hoặc hoàn tác trước khi tiếp tục.
7. Không chạy bài test tạo/sửa/xóa vào DB chính; không xóa volume dữ liệu để làm sạch môi trường.

## OTP qua SMS

Tích hợp eOTP được giữ dưới dạng tùy chọn trong `backend/src/sms.ts`. Đặt `EOTP_API_KEY` và `EOTP_API_SECRET` trong `.env` sau khi có project được nhà cung cấp phê duyệt; cập nhật API sau khi đổi cấu hình. Khả năng gửi SMS thật phụ thuộc cấu hình dịch vụ và không nằm trong phạm vi kiểm thử gửi thật của báo cáo hiện tại.

## Phân công

- Team frontend: hong cuc, huy phat, thanh dat, tan nin.
- Team backend: tan nin, xuan ly, minh tuan.

Quy ước tên thành phần đang dùng: `navbar`, `user-sidebar`, `admin-sidebar`, `stat-card`, `books-table`, `login-form`, `btn-add-book`, `status-badge`, `confirm-modal`, `book-search`.
