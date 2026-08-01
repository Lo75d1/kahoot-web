# Phạm vi sản phẩm đã chốt

## Trọng tâm duy nhất

UDA Assessment Hub giải quyết việc biến tài liệu đề thi không đồng nhất thành bộ câu hỏi có cấu trúc với số thao tác tối thiểu.

Luồng chính:

1. Kéo thả PDF, Word, ảnh, CSV/TXT hoặc dán nội dung vào một ô.
2. Trích xuất chữ ngay trên máy chủ.
3. AI nhận diện câu hỏi, lựa chọn, đáp án, độ tin cậy và nguồn tham chiếu.
4. Hiển thị bản nháp; giảng viên duyệt và lưu vào ngân hàng đề.
5. Bộ đề có thể được dùng để học, ôn tập, làm bài hoặc live quiz — đây là đầu ra phụ.

## Tại sao đây là cách nhập nhanh nhất

- Một điểm bắt đầu duy nhất, không bắt người dùng chọn trước “Tạo bằng AI” hay “Nhập tài liệu”.
- PDF/DOCX có chữ được trích xuất trước rồi gửi phần văn bản cho AI, giảm dữ liệu và độ trễ.
- Ảnh/PDF scan được gửi trực tiếp cho model thị giác.
- File có cấu trúc phổ biến được parser cục bộ xử lý khi AI chưa cấu hình.
- AI trả structured output đúng schema nên không cần người dùng copy JSON qua lại.

## Cấu hình bắt buộc cho AI production

```text
OPENAI_API_KEY=<khóa API của dự án>
OPENAI_MODEL=gpt-5.6-terra
```

Khóa chỉ được đặt trong biến môi trường của Vercel, tuyệt đối không commit vào GitHub.

## Những gì không còn là trọng tâm giao diện

Quản trị khảo thí, lớp học, tiến độ và live quiz có thể tiếp tục tồn tại như mô-đun sử dụng bộ đề, nhưng không cạnh tranh vị trí với ô nhập đề AI trên trang chính.
