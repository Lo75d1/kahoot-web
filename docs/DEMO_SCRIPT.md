# Kịch bản demo bảo vệ đồ án (12–15 phút)

## 1. Bài toán (1 phút)

Nêu hạn chế của nền tảng quiz phổ thông khi dùng cho thi chính thức: khó kiểm soát nguồn đề, người duyệt, điều kiện dự thi, công bố điểm và truy vết thay đổi.

## 2. Nhập đề thông minh (2 phút)

- Dán văn bản không cần JSON hoặc tải tài liệu.
- Cho hệ thống phân tích cấu trúc câu hỏi.
- Kiểm tra/chỉnh sửa bộ đề trước khi lưu.

## 3. Học và ôn tập (2 phút)

- Chọn một bộ đề trong kho mẫu.
- Trình diễn luyện tập, flashcard/ôn lỗi sai và thống kê tiến độ.
- Nêu sự tách biệt giữa luyện tập và thi chính thức.

## 4. Quiz trực tiếp + QR (2 phút)

- Giáo viên tạo phòng.
- Sinh viên quét QR/tham gia bằng mã PIN.
- Trình diễn bảng xếp hạng realtime.

## 5. Quy trình khảo thí UDA (5 phút)

- Giảng viên gửi đề phản biện.
- Tài khoản trưởng bộ môn phê duyệt.
- Tài khoản khảo thí niêm phong, lập ca và xác nhận đủ điều kiện.
- Sinh viên vào thi; chỉ payload đã loại đáp án được gửi xuống máy.
- Chuyển tab để tạo sự kiện; giám thị lập biên bản.
- Nộp bài, công bố điểm, gửi phúc khảo và duyệt thay đổi điểm độc lập.

## 6. Kết luận (1–2 phút)

Nhấn mạnh: kiến trúc web hiện đại, AI giảm thời gian nhập đề, kiểm soát ở tầng dữ liệu, nhật ký truy vết và khả năng mở rộng tích hợp LMS/SSO.

## Câu hỏi phản biện dự kiến

- **AI có tự quyết định đáp án không?** Không. AI hỗ trợ nhập; người dùng kiểm tra và đề chính thức phải qua phản biện/niêm phong.
- **Sinh viên có xem đáp án qua DevTools không?** Payload thi chính thức loại trường `correct`, giải thích và gợi ý; chấm ở máy chủ.
- **Ai có thể sửa điểm?** Một người đề nghị, người khác thuộc khảo thí/đảm bảo chất lượng phê duyệt; mọi hành động có audit.
- **Mất mạng thì sao?** Bài được tự lưu; có ghi nhận kết nối lại. Hướng phát triển là hàng đợi offline có mã hóa.
- **Đã sẵn sàng dùng thật chưa?** Đã có nền tảng kỹ thuật; trước triển khai toàn trường cần SSO, kiểm thử tải, PITR, quy trình pháp lý và đánh giá an toàn thông tin.

