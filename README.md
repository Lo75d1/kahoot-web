# UDA Assessment Hub

> Hồ sơ đồ án: [kiến trúc](docs/ARCHITECTURE.md) · [vận hành](docs/RUNBOOK.md) · [kịch bản bảo vệ](docs/DEMO_SCRIPT.md) · báo cáo Word trong thư mục `docs`.

UDA Assessment Hub là đồ án đề xuất nền tảng học tập, ngân hàng đề và khảo thí thông minh cho Trường Đại học Đông Á. Giảng viên có thể tạo đề thủ công, nhập marker/CSV, tải PDF/DOCX/ảnh hoặc dùng AI trên server để nhận diện và tạo câu hỏi có cấu trúc. Ảnh và PDF scan được gửi thẳng tới model thị giác khi máy chủ có `OPENAI_API_KEY`.

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
