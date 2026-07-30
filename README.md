# Kashot

Kashot là web học, ôn, thi và chơi quiz trực tiếp. Giáo viên có thể tạo đề thủ công, nhập marker/CSV, tải PDF/DOCX hoặc dùng AI trên server để nhận diện và tạo câu hỏi có cấu trúc.

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
