# Phạm vi sản phẩm đã chốt

## Trọng tâm duy nhất

UDA Assessment Hub giải quyết việc biến tài liệu đề thi không đồng nhất thành bộ câu hỏi có cấu trúc với số thao tác tối thiểu.

Luồng chính:

1. Kéo thả PDF, Word, ảnh, CSV/TXT hoặc dán nội dung vào một ô.
2. Trích xuất chữ ngay trên máy chủ.
3. AI ngoài hoặc AI local của trường trả JSON quy tắc/JSON bộ đề.
4. Code trên web áp dụng quy tắc, tạo bản nháp; giảng viên duyệt và lưu.
5. Bộ đề có thể được dùng để học, ôn tập, làm bài hoặc live quiz — đây là đầu ra phụ.

## Tại sao đây là cách nhập nhanh nhất

- Một điểm bắt đầu duy nhất, không bắt người dùng chọn trước “Tạo bằng AI” hay “Nhập tài liệu”.
- PDF/DOCX có chữ được web trích xuất trước để code có thể xử lý trực tiếp.
- Ảnh/PDF scan có thể đưa cho AI ngoài/AI local; người dùng dán JSON kết quả vào web.
- File có cấu trúc phổ biến được parser cục bộ xử lý ngay, không cần AI.
- JSON quy tắc tái sử dụng được cho nhiều đề cùng mẫu, giúp giảm số lần gọi AI.

## API key cá nhân là tùy chọn

Thầy/cô có thể nhập key trong giao diện để phân tích trực tiếp. Key chỉ tồn tại trong state của trang và header của một request, không được lưu vào localStorage/Supabase.

Luồng chính vẫn là AI ngoài/AI local trả quy tắc để code nhập đề, vì vậy hệ thống không phụ thuộc một nhà cung cấp AI cụ thể.

## Những gì không còn là trọng tâm giao diện

Quản trị khảo thí, lớp học, tiến độ và live quiz có thể tiếp tục tồn tại như mô-đun sử dụng bộ đề, nhưng không cạnh tranh vị trí với ô nhập đề AI trên trang chính.
