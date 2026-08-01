# Runbook triển khai và vận hành

## Chạy cục bộ

1. Sao chép `.env.local.example` thành `.env.local`.
2. Điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` và khóa AI nếu dùng.
3. Chạy `npm install`, sau đó `npm run dev`.

## Khởi tạo cơ sở dữ liệu

Chạy toàn bộ tệp trong `supabase/migrations` theo thứ tự tên. Migration `202608010002` đến `202608010004` bổ sung quản trị khảo thí, payload thi an toàn và vận hành phúc khảo/đổi điểm.

## Khởi tạo quản trị viên đầu tiên

Đăng ký một tài khoản qua giao diện, rồi trong Supabase SQL Editor chạy lệnh sau sau khi thay email:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email = 'EMAIL_QUAN_TRI_UDA';
```

Không nhúng mật khẩu hoặc service-role key vào mã nguồn.

## Kiểm tra trước phát hành

```text
npm run lint
npm test
npm run build
```

## Triển khai Vercel

- Import repository GitHub.
- Khai báo biến môi trường giống máy cục bộ.
- Deploy nhánh `main`.
- Kiểm tra đăng nhập, nhập đề, tạo phòng QR và trung tâm khảo thí.

## Vận hành kỳ thi

1. Giảng viên hoàn thiện đề và gửi phản biện.
2. Trưởng bộ môn/người có thẩm quyền duyệt; không dùng tài khoản người ra đề.
3. Khảo thí niêm phong và lập ca.
4. Đào tạo/khảo thí xác nhận danh sách đủ điều kiện.
5. Khảo thí mở ca; giám thị theo dõi sự kiện và lập biên bản.
6. Đóng ca, rà soát sự cố, công bố kết quả.
7. Xử lý phúc khảo và thay đổi điểm theo maker–checker.

## Sao lưu và ứng phó

- Bật backup/PITR phù hợp gói Supabase trước khi dùng thật.
- Khi có sự cố, đóng hoặc tạm dừng ca bằng tài khoản khảo thí.
- Không sửa trực tiếp bài làm/điểm trong bảng; dùng RPC nghiệp vụ để giữ audit.
- Xuất nhật ký liên quan trước khi xử lý khiếu nại.

