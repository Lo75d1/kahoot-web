# M2b — Nối Supabase (làm khi ngồi máy tính)

Khi chưa cấu hình, app tự chạy bằng localStorage (mỗi máy một kho). Làm xong các bước dưới, đề sẽ lưu trên đám mây và dùng chung mọi máy.

## 1. Tạo project Supabase
1. Vào https://supabase.com → **Sign in** (đăng nhập bằng GitHub cho nhanh).
2. **New project** → đặt tên (vd `kahoot-web`), đặt **Database Password** (lưu lại), chọn Region gần (Singapore), **Create**.
3. Đợi ~1–2 phút cho project khởi tạo xong.

## 2. Tạo bảng
1. Menu trái → **SQL Editor** → **New query**.
2. Mở file `supabase/schema.sql` trong repo, copy toàn bộ, dán vào, bấm **Run**.
3. Kiểm tra: menu **Table Editor** thấy bảng `quizzes`.

## 3. Lấy 2 key
Menu **Project Settings** (bánh răng) → **API**:
- **Project URL** → là `NEXT_PUBLIC_SUPABASE_URL`
- **Project API keys → anon public** → là `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Cắm key

### Chạy ở máy (dev)
Tạo file `.env.local` (xem mẫu `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```
Rồi chạy lại `npm run dev`.

### Trên Vercel (bản live)
Vercel → project **kahoot-web** → **Settings → Environment Variables** → thêm 2 biến trên (cả Production) → **Save** → **Redeploy**.

## 5. Xong
Mở app, thấy badge đổi thành **☁ Lưu trên đám mây (Supabase)**. Tạo đề ở máy này, mở máy khác vẫn thấy.

> Bảo mật: policy hiện để công khai (demo). Khi cần, thêm Đăng nhập (Supabase Auth) rồi siết policy theo user.
