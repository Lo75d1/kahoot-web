# UDA Assessment Hub

> Hồ sơ đồ án: [kiến trúc](docs/ARCHITECTURE.md) · [vận hành](docs/RUNBOOK.md) · [kịch bản bảo vệ](docs/DEMO_SCRIPT.md) · báo cáo Word trong thư mục `docs`.

UDA Assessment Hub là đồ án tập trung vào **nhập đề bằng AI từ tài liệu** cho Trường Đại học Đông Á. Giảng viên kéo thả PDF/DOCX/ảnh/CSV hoặc dán văn bản vào một ô duy nhất; hệ thống trích xuất nội dung, nhận diện câu hỏi–đáp án, chuẩn hóa thành bộ đề và đưa về bản nháp cần duyệt. Học, ôn tập, làm bài và live quiz chỉ là các cách sử dụng tiếp theo của bộ đề đã nhập.

Để phân tích tài liệu tự do và ảnh scan trên production, cấu hình `OPENAI_API_KEY` trong Vercel. Khi chưa có khóa, tệp văn bản có cấu trúc marker/CSV hoặc dạng phổ biến `Câu 1 / A / B / Đáp án` vẫn được nhập bằng bộ phân tích cục bộ.

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

Sao chép `.env.local.example` thành `.env.local`. Không có Supabase thì ngân hàng đề vẫn chạy bằng localStorage; đăng nhập, lớp học và multiplayer cần Supabase.

## Kiểm tra

```bash
npm run test
npm run lint
npm run build
```

## Cơ sở dữ liệu

Chạy các migration trong `supabase/migrations/` theo thứ tự tên file. Xem [HANDOFF.md](HANDOFF.md) để biết cấu hình Supabase, Vercel và kiến trúc.

## AI trực tiếp

AI là tùy chọn:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-terra
```

Không có khóa, người dùng vẫn có thể dùng nhập tài liệu thông thường và luồng AI ngoài.
