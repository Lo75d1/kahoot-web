# Bàn giao dự án — kahoot-web

Tài liệu này để một dev/AI khác (Codex) tiếp nhận dự án: chạy được, deploy được, và biết ý tưởng đã tới đâu.

- **Repo:** https://github.com/Lo75d1/kahoot-web
- **Live:** https://kahoot-web-pi.vercel.app
- **Chủ dự án:** GitHub `Lo75d1` (bác sĩ, làm web học tập; giao tiếp tiếng Việt).
- **Mô tả:** Web quiz kiểu Kahoot: tạo/ nhập bộ đề, chơi solo & nhiều người (realtime), có tài khoản giáo viên.
- **Tầm nhìn đầy đủ & lộ trình chi tiết:** xem [`MASTER_PLAN.md`](MASTER_PLAN.md) — biến tài liệu bất kỳ (PDF/Word/ảnh) thành ngân hàng câu hỏi có cấu trúc, dùng cho Học / Ôn / Thi / Live. File HANDOFF này lo phần "chạy & deploy + hiện trạng"; MASTER_PLAN lo phần "sản phẩm nên đi tới đâu".

---

## 1. Tech stack

| Thành phần | Chi tiết |
|---|---|
| Framework | **Next.js 16** (App Router, TypeScript, Turbopack) |
| UI | React 19 + **Tailwind CSS v4**, font serif **Lora** |
| Backend/DB | **Supabase** (`@supabase/supabase-js`) — Postgres + Realtime + Auth |
| Hosting | **Vercel** (tự deploy mỗi khi push `main`) |
| Máy dev | Node 26, npm 11, Windows |

> ⚠️ `AGENTS.md` trong repo nhắc: Next.js 16 có breaking changes, đọc `node_modules/next/dist/docs/` khi cần. Code hiện tại chủ yếu là client component + Supabase, không đụng nhiều API server của Next.

---

## 2. Chạy local

```bash
git clone https://github.com/Lo75d1/kahoot-web
cd kahoot-web
npm install
cp .env.local.example .env.local     # rồi điền 2 key Supabase (xem mục 4)
npm run dev                          # http://localhost:3000
npm run build                        # kiểm tra biên dịch (Vercel cũng chạy lệnh này)
```

- **Không có `.env.local`** → app tự chạy chế độ **localStorage** (khách, lưu trên máy). Vẫn đầy đủ tính năng solo/tạo đề; multiplayer & đăng nhập cần Supabase.
- ⚠️ **ĐỪNG chạy `npm run build` khi `npm run dev` đang chạy** — làm hỏng thư mục `.next`, giao diện hiện ra nhưng click không ăn. Fix: kill node + `rm -rf .next` + `npm run dev`.
- ⚠️ Turbopack **dev** thỉnh thoảng phun lỗi console `Module not found: @supabase/supabase-js` dù module có thật và `next build` pass — **rác cache dev**, bỏ qua (fix như trên nếu phiền).

---

## 3. Deploy (Vercel)

Đã nối sẵn: push `main` → Vercel tự build & deploy. Nếu dựng lại từ đầu:

1. Vercel → **Add New Project** → import repo `Lo75d1/kahoot-web` → framework tự nhận **Next.js** → **Deploy**.
2. **Settings → Environment Variables** → thêm 2 biến ở mục 4 (Production) → **Redeploy** (env chỉ áp dụng cho deploy mới).

---

## 4. Supabase (DB + Auth + Realtime)

- **Project ref:** `ygymxtifkldfjmhsreue`
- **Project URL:** `https://ygymxtifkldfjmhsreue.supabase.co`

### Biến môi trường (app + Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://ygymxtifkldfjmhsreue.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key: Supabase → Settings → API → "anon/publishable">
```
> Dùng **publishable key** mới (`sb_publishable_...`) — công khai được (nhúng client). Đã cắm trong Vercel env sẵn.
> 🔒 **DB password (kết nối Postgres trực tiếp) là BÍ MẬT — không lưu vào file này / repo.** Chỉ dùng khi chạy migration trực tiếp.

### Chạy schema (SQL)

Với project mới, chạy các file trong `supabase/migrations/` theo thứ tự tên:

1. `202607290001_initial.sql` — baseline ngân hàng đề, auth và multiplayer.
2. `202607300001_question_sets_v2.sql` — metadata bộ đề V2.
3. `202607300002_learning_and_classes.sql` — lớp, giao bài, lượt học và lịch ôn.
4. `202607300003_secure_live.sql` — RPC bảo mật cho Live game.

Ba file SQL cũ ở ngay `supabase/` chỉ còn để tham khảo lịch sử.

### Cấu hình Auth (QUAN TRỌNG)
- **Authentication → Providers → Email → TẮT "Confirm email"** để đăng ký là đăng nhập ngay (nếu bật, mỗi lần đăng ký bị gửi email + dễ dính "email rate limit exceeded"). Hiện đã tắt.
- RLS: bảng `quizzes` policy `to authenticated using (auth.uid() = owner_id)` → khách (anon) không đọc được đề của ai; đã verify.

---

## 5. Kiến trúc & file chính

```
src/
  app/
    layout.tsx        # font Lora (serif), metadata, lang vi
    page.tsx          # nền gradient xanh lá đậm + bong bóng + SoundToggle + <QuizApp/>
    globals.css       # theme tối xanh lá, keyframes (float, fadeInUp)
  lib/
    types.ts          # Quiz, Question, Answer, RoundResult
    parser.ts         # parseQuiz(): validate JSON đề -> Quiz (dùng lại khắp nơi)
    scoring.ts        # điểm kiểu Kahoot (đúng+nhanh) + điểm chuỗi
    store.ts          # interface QuizStore + localStore (localStorage) + ensureSeeded
    supabase.ts       # tạo Supabase client từ env (null nếu chưa cấu hình)
    supabaseStore.ts  # QuizStore chạy trên bảng quizzes (gắn owner_id)
    activeStore.ts    # (cũ) chọn cloud/local theo cấu hình
    auth.ts           # signUp/signIn/signOut/onAuthChange (Supabase Auth)
    quizIo.ts         # export JSON, tải file, trộn (shuffle), format thời gian
    multiplayer.ts    # LÕI realtime: createRoom/join/start/reveal/next/submitAnswer/subscribe
    textFormat.ts     # parseMarkerText (* -) + parseCsv (import tài liệu)
    ruleParser.ts     # parseByRules() engine regex named-group + buildRulesPrompt()
    aiPrompt.ts       # buildPrompt()/extractJson() cho "Tạo bằng AI (ngoài)"
    avatar.ts, sound.ts
  components/
    QuizApp.tsx       # ROOT: state 'mode' (bank/editor/play/host/join/ai/auth/import),
                      #   chọn store theo đăng nhập (user ? supabaseStore : localStore)
    Player.tsx        # chơi solo (timer, chấm điểm, tổng kết)
    QuizEditor.tsx    # soạn đề thủ công + nhập nhanh JSON
    AiCreator.tsx     # tạo đề bằng AI ngoài (prompt + dán JSON, có đính kèm file)
    ImportText.tsx    # "📄 Nhập tài liệu" — 3 chế độ: marker / CSV / theo-quy-tắc
    AuthScreen.tsx    # đăng nhập/đăng ký giáo viên
    SoundToggle.tsx
    multiplayer/
      HostGame.tsx    # chủ phòng: PIN, phòng chờ realtime, điều khiển câu hỏi, bảng xếp hạng
      PlayerGame.tsx  # người chơi: nhập PIN+tên, trả lời đồng bộ, xem hạng
      mpUi.tsx        # avatar, danh sách người chơi, Leaderboard
supabase/*.sql        # 3 file schema (mục 4)
scripts/              # convert_to_quiz.py/.mjs + README (chuyển tài liệu -> JSON, chạy cục bộ)
```

### Ý tưởng kiến trúc cần nắm
- **QuizStore** là interface chung (`list/get/save/remove`). 2 adapter: `localStore` (khách) và `supabaseStore` (đăng nhập, gắn `owner_id`). `QuizApp` chọn adapter theo `user` (Supabase Auth). Đổi backend chỉ cần viết adapter mới.
- **Chấm điểm** ở `scoring.ts`: `điểm = points × (1 − (thời_gian/thời_hạn)/2)` + điểm chuỗi.
- **Multiplayer**: host cập nhật hàng `rooms` (status/current_index/question_started_at) → mọi client nhận qua Supabase Realtime (Postgres Changes). Người chơi ẩn danh (không cần đăng nhập).

---

## 6. Tính năng đã hoàn thành (đều LIVE)

| Mốc | Nội dung |
|---|---|
| M1 | Chơi solo từ JSON: timer đếm ngược, chấm điểm theo tốc độ, tổng kết |
| UI | Đổi sang tông **xanh lá đậm tối + chữ serif (Lora)** cho dễ đọc, hợp học tập |
| M2a | **Ngân hàng đề**: tạo/sửa/xoá/chơi; nhân bản, xuất JSON, trộn câu, đảo thứ tự, tổng thời gian |
| M2b | **Lưu cloud (Supabase)** — đề dùng chung mọi máy |
| M3 | **Multiplayer**: tạo phòng + mã PIN + phòng chờ realtime + chấm điểm + bảng xếp hạng (host/player) |
| M4 | Đánh bóng: **avatar** người chơi, **âm thanh** (Web Audio + toggle 🔊), hoạt ảnh chuyển câu, nút đóng phòng, khoá đáp án sau hết giờ |
| Auth | **Đăng nhập giáo viên** (email+mật khẩu, tuỳ chọn): khách→localStorage, GV→cloud đề riêng (RLS owner) |
| AI ngoài | **✨ Tạo bằng AI**: app sinh prompt (schema cố định) → dán vào ChatGPT/Gemini/Claude (đính kèm file được) → dán JSON về → tự kiểm tra + nhập |
| Nhập tài liệu | **📄 Nhập tài liệu** — 3 chế độ: (1) Văn bản `*`đúng/`-`sai, (2) CSV/Excel, (3) **Theo quy tắc**: AI đọc file → xuất "quy tắc" regex nhỏ gọn → web tự parse tài liệu bất kỳ định dạng (chạy trên trang, không cụt token) |
| Scripts | `scripts/convert_to_quiz.*` + prompt trong `scripts/README.md`: nhờ AI viết code chuyển tài liệu → JSON, chạy cục bộ |

**Triết lý về nhập đề (chủ dự án rất quan tâm):** KHÔNG bắt AI in ra cả cục JSON (cụt token khi đề dài, dễ sai). Thay vào đó: AI chỉ mô tả *cách đọc* (quy tắc/ code ngắn) hoặc chuyển sang định dạng ngắn; **máy (web) chạy phần nặng**. Ưu tiên hướng "Theo quy tắc" trong `ImportText`/`ruleParser`.

---

## 7. V1 mới trên nhánh phát triển

- Question model V2: nhiều đáp án, đúng/sai, trả lời ngắn, điền khuyết, lời giải, gợi ý, chủ đề, độ khó và trạng thái duyệt.
- Đọc trực tiếp PDF/DOCX/CSV/TXT trên server với giới hạn dung lượng.
- AI Import trực tiếp qua Responses API nếu có `OPENAI_API_KEY`; không có key vẫn giữ luồng AI ngoài.
- Chế độ Học / Ôn / Thi, lịch sử trên thiết bị, chủ đề yếu và lịch ôn cách quãng.
- Lớp học, mã tham gia và giao bài cơ bản cho tài khoản Supabase.
- Live game dùng secret-bearing RPC, chấm điểm transaction phía database và không công khai answer key trước khi reveal.

AI trực tiếp dùng hai biến server:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-terra
```

## 8. Roadmap sau V1

- Hoàn thiện UI ghép cặp, sắp thứ tự, tự luận chấm tay và câu có hình ảnh.
- Đồng bộ lịch ôn/attempt local lên cloud khi học sinh đăng nhập.
- Báo cáo lớp nâng cao và xuất CSV/PDF.
- OCR ảnh/PDF scan trực tiếp bằng model thị giác.
- **Trải nghiệm**: avatar tự chọn, lịch sử điểm người chơi, xuất kết quả phòng, chế độ thi tính giờ / thi thử.
- **Đăng nhập Google (1 chạm)** cho giáo viên; chia sẻ đề giữa giáo viên.
- **Nhập tài liệu nâng cao**: đọc trực tiếp `.docx`/`.xlsx`/`.pdf` trong trình duyệt (thêm lib) để khỏi phải dán text; cải thiện engine `ruleParser` cho nhiều mẫu hơn.
- **Đẩy sang server chính** (chủ dự án dự tính deploy host free báo cáo thầy cô trước, sau mới server chính).

---

## 9. Lưu ý cho dev tiếp nhận (gotchas)

- **Build vs dev**: đừng build khi dev đang chạy (hỏng `.next`) — mục 2.
- **Test tự động hoá trình duyệt**: click tổng hợp (automation) KHÔNG kích hoạt onClick của React 19 — khi cần verify bằng script, gọi thẳng handler qua `element[__reactProps$...].onClick(...)`. Thao tác tay của người dùng thì bình thường.
- **Email confirmation** phải TẮT trong Supabase (mục 4) — nếu không, đăng ký kẹt.
- **Publishable key** an toàn để công khai; **DB password** thì không — giữ bí mật.
- Commit message trong repo có Co-Authored-By của trợ lý; cứ giữ hoặc bỏ tuỳ ý.
- Các file test tạm (`.mjs`) đã bị xoá; không có secret trong repo (đã kiểm).

---

## 10. Tóm tắt "muốn deploy ngay thì làm gì"

1. `npm install` → `npm run build` (phải pass).
2. Có Supabase: chạy 4 file trong `supabase/migrations/`, tắt Confirm email, lấy URL + anon key.
3. Vercel: thêm 2 env Supabase; thêm `OPENAI_API_KEY` và `OPENAI_MODEL` nếu bật AI trực tiếp.
4. Xong: mở link, đăng ký GV, tạo/nhập đề, tạo phòng chơi thử.
