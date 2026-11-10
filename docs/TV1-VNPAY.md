# TV1 – Thanh toán VNPAY

## Phân tích source hiện tại

- Backend Express/Mongoose: `order.controller.js` tạo đơn từ giỏ, đọc giá từ Book, trừ kho có điều kiện, lưu đơn rồi xóa giỏ. Hủy đơn gọi `restock`. Order dùng `_id` dạng `DH####`.
- Frontend React/Vite: Checkout gửi thông tin nhận hàng và phương thức thanh toán; Orders hiển thị đơn và cho hủy đơn pending. AdminOrders xử lý trạng thái và xác nhận thanh toán tay.
- Trước TV1 chỉ có COD/BANK. Giao thành công tự đánh dấu paid cho mọi phương thức; thay đổi này giới hạn cho COD. VNPAY không được xác nhận tay và phải paid trước khi nhân viên xác nhận đơn.
- Phạm vi triển khai là TV1; TV2/TV3 trong tài liệu không thuộc yêu cầu này.

## Cấu hình và chạy

Trong `backend/.env` điền `VNP_TMN_CODE` và `VNP_HASH_SECRET` do VNPAY sandbox cấp. Các biến còn lại đã có mẫu trong `.env.example`:

```dotenv
CLIENT_URL=http://localhost:5173
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5000/api/orders/vnpay_return
```

Không đưa khóa thật vào Git hoặc frontend. Không dùng giá trị merchant giả để thử giao dịch thật trên sandbox.

```sh
cd backend
npm install
npm test
npm run dev
```

Ở terminal khác:

```sh
cd frontend
npm install
npm run dev
```

Return URL có thể là localhost vì trình duyệt khách gọi về. Để kiểm tra IPN, mở tunnel tới backend (ví dụ `ngrok http 5000`), rồi đăng ký URL công khai `https://<tunnel>/api/orders/vnpay_ipn` với VNPAY sandbox. IPN không cần JWT. Nếu dùng reverse proxy, cấu hình IP phía ứng dụng/proxy theo hạ tầng thực tế; không tin trực tiếp header `X-Forwarded-For` từ nguồn bất kỳ.

## API và xử lý

| API | Quyền | Kết quả |
| --- | --- | --- |
| POST `/api/orders/create_payment_url` | customer | Nhận `{shippingInfo:{receiverName,phone,address}}`; trả 201 `{orderCode,paymentUrl}` |
| POST `/api/orders/my/:code/retry-payment` | customer sở hữu đơn | Trả URL mới cho đơn VNPAY pending/unpaid, không trừ kho hoặc xóa giỏ lần nữa |
| GET `/api/orders/vnpay_return` | Công khai | Xác minh và xử lý, redirect về `/payment/result?code=...&orderCode=...` |
| GET `/api/orders/vnpay_ipn` | Công khai | Trả JSON `{RspCode,Message}` |

Chữ ký HMAC-SHA512 dùng tham số được sắp xếp và form-encode theo giao thức VNPAY 2.1.0. Chỉ thanh toán thành công khi chữ ký và merchant đúng, số tiền bằng tổng đơn × 100, `vnp_ResponseCode` và `vnp_TransactionStatus` đều bằng `00`. Giá và tổng tiền lấy từ database.

Thành công giữ status pending, ghi paid/paidAt/mã giao dịch/ngân hàng và lịch sử. Thất bại/hủy chuyển cancelled và hoàn kho. Return và IPN dùng chung cập nhật có điều kiện nên callback lặp hoặc đồng thời chỉ chuyển trạng thái một lần. IPN trả `00` đã xử lý (kể cả giao dịch thất bại được ghi nhận), `01` không thấy đơn, `02` đã xử lý, `04` sai tiền, `97` sai chữ ký/merchant, `99` lỗi nội bộ.

URL hết hạn sau 15 phút theo `vnp_ExpireDate` (GMT+7). Khách bỏ dở vẫn có đơn pending/unpaid và nút Thanh toán lại. Không có tác vụ tự hủy đơn bỏ dở vì tài liệu yêu cầu giữ đơn để thanh toán lại. Mỗi lần thử lại sinh mã chữ/số mới. Các mã cũ được lưu để vẫn ghi nhận callback thành công đến chậm; callback thất bại của lần cũ không hủy lần mới.

Đơn VNPAY đã paid không được hủy trực tiếp qua giao diện/API hiện tại để tránh hoàn kho mà chưa hoàn tiền; tính năng hoàn tiền qua VNPAY nằm ngoài TV1.

Trang kết quả đọc trạng thái và số tiền qua API đơn hàng có xác thực, không dùng cờ thành công/số tiền từ query string. Khi phải đăng nhập lại, đường dẫn kết quả và query được giữ nguyên.

## Kiểm thử

`npm test` ở backend dùng Node test runner, HTTP Express thật và các model được mô phỏng trong bộ nhớ; không sửa database người dùng. Bao gồm ký độc lập, timestamp/expiry, tạo đơn, thiếu cấu hình, thiếu kho, rollback khi tạo đơn lỗi, phân quyền, callback sai, thành công/thất bại/lặp/đồng thời, retry và giữ hành vi COD/BANK. Đây không phải kiểm thử tích hợp với MongoDB hoặc VNPAY thật.

`npm run build` ở frontend kiểm tra biên dịch React/Vite.

Thử thủ công với MongoDB và merchant sandbox đã cấu hình:

1. Đăng nhập customer, thêm sách vào giỏ, checkout chọn VNPAY. Kiểm tra đơn pending/unpaid, tồn kho giảm và giỏ trống.
2. Trả bằng NCB: số thẻ `9704198526191432198`, tên `NGUYEN VAN A`, ngày phát hành `07/15`, OTP `123456`. Kiểm tra kết quả paid, đơn vẫn pending và chỉ có một dòng lịch sử thanh toán dù cả Return/IPN gọi về.
3. Tạo đơn khác rồi hủy trên VNPAY: đơn cancelled/unpaid và kho hoàn đúng một lần.
4. Đóng trang VNPAY, vào Đơn hàng của tôi và chọn Thanh toán lại. Kiểm tra URL có mã giao dịch mới, tổng không đổi, kho không giảm thêm.
5. Đăng nhập staff: đơn VNPAY không có nút xác nhận thanh toán tay; chỉ đơn paid được tiếp tục xác nhận/giao hàng.
6. Thử lại COD và BANK để xác nhận checkout và quản lý đơn hoạt động như trước.

Tài liệu giao thức: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
