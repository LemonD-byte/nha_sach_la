# 🍃 Nhà sách Lá — Ứng dụng thương mại điện tử

Node.js + Express + MongoDB (Mongoose) · ReactJS (Vite) · RESTful API (test bằng Postman).
Giao diện cổ điển, chủ đạo xanh lá. Chưa có chức năng coupons.

## Cấu trúc thư mục
```
nha-sach-la/
├── backend/
│   ├── server.js                 # điểm khởi động
│   ├── .env.example              # PORT, MONGO_URI, JWT_SECRET...
│   └── src/
│       ├── app.js                # gắn middleware + routes
│       ├── config/db.js          # kết nối MongoDB
│       ├── models/               # User, Book, Category, Cart, Order, Review, Counter
│       ├── middleware/           # auth (JWT + phân quyền), error
│       ├── controllers/          # xử lý nghiệp vụ theo từng module
│       ├── routes/               # khai báo endpoint theo từng module
│       ├── utils/helpers.js      # httpError, asyncHandler, nextSeq (sinh mã DH0004, RV0003...)
│       └── scripts/resetPasswords.js
└── frontend/
    ├── vite.config.js            # proxy /api -> http://localhost:5000
    └── src/
        ├── api/                  # axios client, format tiền/ngày, nhãn trạng thái
        ├── context/              # AuthContext (đăng nhập + giỏ), ToastContext
        ├── components/           # layout, BookCard, Modal, Stars, ProtectedRoute...
        ├── pages/                # trang khách hàng
        │   └── admin/            # trang quản trị / nhân viên
        └── styles/global.css     # toàn bộ màu sắc & kiểu chữ (biến CSS ở :root)
```
Thêm tính năng mới (ví dụ coupons): thêm `models/Coupon.js` → `controllers/coupon.controller.js` → `routes/coupon.routes.js` → gắn vào `app.js`; phía giao diện thêm trang trong `pages/`.

## Chạy ứng dụng
1. Mở **MongoDB Compass**, kết nối `mongodb://127.0.0.1:27017`, database `nhasach` (collections: books, carts, categories, counters, orders, reviews, users) — dùng đúng dữ liệu bạn đã import.
2. Backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env        # sửa MONGO_URI / JWT_SECRET nếu cần
   npm run reset-passwords     # đặt mật khẩu mọi tài khoản mẫu về 123456 (chỉ cần chạy 1 lần)
   npm run dev                 # http://localhost:5000
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev                 # http://localhost:5173
   ```

Tài khoản mẫu (sau khi chạy reset-passwords, mật khẩu `123456`):
| Vai trò | Email |
|---|---|
| Admin | admin@nhasach.vn |
| Nhân viên | staff1@nhasach.vn, staff2@nhasach.vn |
| Khách hàng | customer1@gmail.com, customer2@gmail.com, customer3@gmail.com, test@gmail.com |

> Lý do cần reset: file users chỉ chứa mã băm bcrypt nên không thể biết mật khẩu gốc.

## Bộ lọc sản phẩm (trang `/books`)
Nhóm sản phẩm › danh mục (có số lượng), khoảng giá, thương hiệu/tác giả (lấy từ trường `author`), đánh giá từ 3/4 sao, chỉ còn hàng, sắp xếp, số sản phẩm mỗi trang (12/24/48), phân trang. Bộ lọc nằm trên URL nên chia sẻ/quay lại trang được; các “chip” bộ lọc đang áp dụng bấm để bỏ từng cái.

## Phân quyền
- **customer**: xem/mua hàng, giỏ hàng, đặt hàng, hủy đơn đang chờ, đánh giá sản phẩm của đơn đã giao.
- **staff**: xử lý đơn (xác nhận → giao → đã giao, giao thất bại, hủy, xác nhận thanh toán), sửa sản phẩm/tồn kho, phản hồi/ẩn đánh giá.
- **admin**: toàn bộ quyền của staff + xóa sản phẩm, quản lý danh mục, quản lý tài khoản (tạo, khóa, đổi vai trò).

## Danh sách API (gửi header `Authorization: Bearer <token>` nếu cần đăng nhập)
| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| POST | /api/auth/register | — | Đăng ký khách hàng |
| POST | /api/auth/login | — | Đăng nhập, trả `token` |
| GET/PUT | /api/auth/me | đăng nhập | Xem / sửa hồ sơ |
| PUT | /api/auth/password | đăng nhập | Đổi mật khẩu |
| GET | /api/categories | — | Danh sách danh mục |
| POST/PUT/DELETE | /api/categories[/:id] | admin | Quản lý danh mục |
| GET | /api/books?search=&group=&categoryId=&minPrice=&maxPrice=&sort=&page=&limit= | — | Tìm/lọc/sắp xếp/phân trang (sort: newest, price-asc, price-desc, rating, name) |
| GET | /api/books?...&authors=Casio,Thiên Long&prices=0-50000,100000-200000&inStock=true&minRating=4 | — | Lọc nhiều tiêu chí (kiểu Fahasa); `prices` là các khoảng `min-max` (bỏ trống max = không giới hạn) |
| GET | /api/books/facets?(cùng tham số lọc) | — | Số lượng sản phẩm cho từng danh mục, khoảng giá, thương hiệu/tác giả (mỗi nhóm đếm theo các bộ lọc còn lại) |
| GET | /api/books/:id | — | Chi tiết sản phẩm |
| GET | /api/books/:id/reviews | — | Đánh giá đang hiển thị |
| POST/PUT | /api/books[/:id] | admin, staff | Thêm / sửa sản phẩm |
| DELETE | /api/books/:id | admin | Xóa (nếu đã có trong đơn hàng thì chỉ ẩn) |
| GET | /api/cart | customer | Xem giỏ |
| POST | /api/cart/items `{bookId, quantity}` | customer | Thêm vào giỏ |
| PUT/DELETE | /api/cart/items/:bookId | customer | Đổi số lượng / xóa dòng |
| DELETE | /api/cart | customer | Xóa toàn bộ giỏ |
| POST | /api/orders `{shippingInfo:{receiverName,phone,address}, paymentMethod:"COD"\|"BANK"}` | customer | Đặt hàng từ giỏ (trừ kho) |
| GET | /api/orders/my, /api/orders/my/:code | customer | Đơn của tôi |
| PATCH | /api/orders/my/:code/cancel | customer | Hủy đơn đang chờ (hoàn kho) |
| GET | /api/orders?status=&q= , /api/orders/:code | admin, staff | Danh sách / chi tiết đơn |
| PATCH | /api/orders/:code/status `{status, note}` | admin, staff | pending→confirmed→shipping→delivered, hoặc cancelled |
| PATCH | /api/orders/:code/delivery-failed | admin, staff | Ghi nhận giao thất bại (tăng deliveryAttempts) |
| PATCH | /api/orders/:code/pay | admin, staff | Xác nhận đã thanh toán (chuyển khoản) |
| GET/POST | /api/reviews/my, /api/reviews `{bookId, orderCode, rating, comment}` | customer | Xem / gửi đánh giá |
| GET | /api/reviews?status= | admin, staff | Tất cả đánh giá |
| PATCH | /api/reviews/:id/reply `{reply}`, /api/reviews/:id/status `{status}` | admin, staff | Phản hồi / ẩn-hiện |
| GET/POST/PUT | /api/users[/:id] | admin | Quản lý tài khoản |
| GET | /api/stats | admin, staff | Thống kê tổng quan |

## Quy ước dữ liệu (khớp với database hiện có)
- `_id` là chuỗi: sách `SP####`, đơn `DH####`, đánh giá `RV####`, giỏ `GH####`, danh mục `A/B/C####`, khách hàng số `1000###`, nhân viên `stf####`, admin `ad####`.
- Mã tăng tự động lấy từ collection `counters` (`orderCode`, `reviewCode`; các counter `bookCode`, `cartCode`, `userCode`... tự tạo khi cần).
- Đặt hàng trừ `stock`; hủy đơn hoàn lại `stock`. COD: `codAmount = totalAmount`, tự đánh dấu đã thanh toán khi giao thành công. BANK: nhân viên bấm "Xác nhận đã thanh toán".
- `ratingAvg / ratingCount / ratingBreakdown` của sách được tính lại mỗi khi có đánh giá mới hoặc ẩn/hiện đánh giá.
