# Hướng dẫn nhập đề bằng Gemini

## Quy trình nhanh

1. Tải `de-mau-gemini.txt` trong mục **Đề và kết quả mẫu** trên website.
2. Mở Gemini tại <https://gemini.google.com>.
3. Trên UDA Assessment Hub, nhấn **1. Copy prompt cho Gemini**.
4. Dán prompt vào Gemini, đính kèm tài liệu hoặc dán nội dung đề bên dưới prompt.
5. Yêu cầu Gemini chỉ trả về JSON thuần, không dùng khối mã Markdown.
6. Copy toàn bộ kết quả từ dấu `{` đầu tiên đến dấu `}` cuối cùng.
7. Quay lại website, dán vào ô **2. Dán JSON bộ đề do Gemini trả về**.
8. Nhấn **3. Chạy code nhập đề**.
9. Kiểm tra bản xem trước, đặc biệt là đáp án và các câu có trạng thái cần duyệt.
10. Nhấn **Lưu vào ngân hàng đề**, sau đó chọn **Sửa** nếu cần hiệu chỉnh.

## Khi Gemini trả kết quả lỗi

- Có chữ giải thích ngoài JSON: chỉ copy phần từ `{` đến `}`.
- Thiếu dấu ngoặc hoặc dấu phẩy: yêu cầu Gemini “Sửa thành JSON hợp lệ, chỉ trả JSON”.
- Sai đáp án: sửa trực tiếp trong màn hình biên tập trước khi duyệt.
- Câu tự luận: dùng `"type": "essay"`, `"answers": []` và đặt `hintDelaySeconds` nếu muốn mở gợi ý sau một khoảng thời gian.
- Không đưa dữ liệu cá nhân, đề thi mật hoặc API key vào Gemini công khai.
