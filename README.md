# UDA Assessment Hub

> Hồ sơ đồ án: [kiến trúc](docs/ARCHITECTURE.md) · [vận hành](docs/RUNBOOK.md) · [kịch bản bảo vệ](docs/DEMO_SCRIPT.md) · báo cáo Word trong thư mục `docs`.

UDA Assessment Hub là đồ án tập trung vào **AI ngoài phân tích cấu trúc, code trên web nhập đề** cho Trường Đại học Đông Á. Giảng viên kéo thả PDF/DOCX/CSV hoặc dán văn bản; đưa tài liệu cho ChatGPT/Claude/Gemini hoặc AI local của trường; sau đó dán JSON quy tắc/JSON bộ đề để hệ thống chạy code, chuẩn hóa và tạo bản nháp. Học, ôn tập, làm bài và live quiz chỉ là đầu ra phụ của bộ đề đã nhập.

Thầy cô có thể nhập API key riêng trong phần tùy chọn để phân tích trực tiếp. Khóa chỉ được gửi cho một yêu cầu, không lưu vào localStorage hoặc Supabase. Luồng mặc định không cần key: AI ngoài/AI local trả quy tắc, còn hệ thống chạy parser cục bộ.

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
