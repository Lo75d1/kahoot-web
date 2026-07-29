# KASHOT — Master plan sản phẩm và kỹ thuật

Ngày lập: 29/07/2026  
Trạng thái: kế hoạch triển khai sau khi đã đọc code hiện tại và kiểm tra build

## 1. Tầm nhìn sản phẩm

Kashot không chỉ là một bản sao Kahoot. Sản phẩm nên trở thành một hệ thống biến tài liệu lộn xộn thành nội dung học có cấu trúc, rồi dùng cùng một ngân hàng câu hỏi cho ba mục đích:

1. **Học:** học theo chủ đề, flashcard, gợi ý và lời giải.
2. **Ôn:** tự lên lịch theo mức độ nhớ, trộn lại phần yếu, ôn nhanh mỗi ngày.
3. **Thi/chơi:** thi cá nhân nghiêm túc hoặc thi trực tiếp nhiều người bằng PIN.

Lợi thế chính cần bảo vệ là:

> Đưa PDF, Word, ảnh, văn bản hoặc một bộ đề định dạng bất kỳ vào Kashot; hệ thống tự nhận cấu trúc, tìm câu hỏi và đáp án, cảnh báo chỗ không chắc chắn, cho giáo viên duyệt nhanh rồi xuất bản.

## 2. Hiện trạng đã có

### Đã chạy được

- Next.js 16, React 19, TypeScript, Tailwind.
- Ngân hàng đề và trình sửa đề.
- Chơi quiz cá nhân có thời gian và tính điểm.
- Nhập văn bản theo ký hiệu, CSV và regex do AI ngoài tạo.
- Tạo prompt để dùng AI ngoài rồi dán JSON trở lại.
- Lưu localStorage cho khách.
- Supabase Auth và lưu bộ đề theo tài khoản giáo viên.
- Multiplayer qua phòng, PIN và Supabase Realtime.
- Nhân bản, trộn câu/đáp án, xuất JSON, âm thanh và avatar.
- `npm run build` thành công.

### Chưa hoàn chỉnh hoặc có rủi ro

- Chưa có AI chạy trong server Kashot; luồng hiện tại vẫn copy–paste qua AI ngoài.
- Chỉ nhận `.txt`, `.csv`, `.md`, `.tsv` trực tiếp trên web; chưa đọc PDF, DOCX, ảnh/OCR.
- Regex chỉ hợp với tài liệu đều. Bảng đáp án cuối tài liệu, đáp án in đậm, nhiều cột, công thức hoặc ảnh sẽ dễ sai.
- Mô hình câu hỏi chỉ có trắc nghiệm 2–4 lựa chọn.
- Không có lời giải, nguồn trích dẫn, độ khó, chủ đề, chuẩn kiến thức hoặc điểm tin cậy.
- Không có trạng thái bản nháp/duyệt/xuất bản.
- Không lưu lượt học/thi đầy đủ nên chưa có thống kê, phần yếu hay lịch ôn.
- RLS multiplayer đang mở công khai ở mức demo; phép cộng điểm phía client có thể bị gian lận hoặc mất cập nhật đồng thời.
- Chưa có giới hạn dung lượng, chống lạm dụng AI, theo dõi chi phí, hàng đợi hoặc retry.
- Lint hiện có 5 lỗi React Hooks/refs trong `Player`, `SoundToggle`, `HostGame`, `PlayerGame`.
- Chưa có test tự động cho parser, chấm điểm, quyền dữ liệu và luồng multiplayer.
- UI đang dồn phần lớn sản phẩm vào một route và một component điều phối.

## 3. Quyết định phạm vi

### Bản V1 phải có

- Vai trò giáo viên và học sinh.
- Workspace/dashboard rõ ràng.
- Tải PDF/DOCX/TXT/CSV/ảnh hoặc dán văn bản.
- Pipeline nhập đề bằng AI chạy hoàn toàn trong Kashot.
- Màn duyệt kết quả theo lô, nêu rõ dòng/câu nào không chắc chắn.
- Các loại câu:
  - một đáp án;
  - nhiều đáp án;
  - đúng/sai;
  - trả lời ngắn;
  - điền khuyết;
  - ghép cặp;
  - tự luận chấm tay.
- Lời giải, gợi ý, tag chủ đề, độ khó và nguồn trích dẫn.
- Chế độ Học, Ôn tập, Thi cá nhân và Live game.
- Lịch sử lượt làm, thống kê theo chủ đề/câu hỏi và sổ câu sai.
- Lịch ôn cách quãng và bài ôn hằng ngày.
- Chia sẻ bằng link/PIN, giới hạn quyền xem/sao chép.
- Responsive, bàn phím, accessibility cơ bản.

### Để sau V1

- Marketplace bộ đề công khai.
- Thanh toán/gói thuê bao.
- Trường học nhiều tổ/đơn vị, SSO và SIS/LMS sâu.
- Giám sát thi bằng webcam.
- Chấm tự luận hoàn toàn tự động để tính điểm chính thức.
- Ứng dụng mobile native.

## 4. Trải nghiệm lõi

### Luồng giáo viên: nhập đề trong 3–5 thao tác

1. Chọn **Nhập bằng AI**.
2. Thả file hoặc dán nội dung.
3. Chọn mục tiêu: `Giữ nguyên đề` / `Tạo câu từ tài liệu` / `Tạo đề cương học`.
4. Xem màn duyệt: câu hợp lệ được chọn sẵn; câu nghi ngờ được đánh dấu.
5. Bấm **Lưu & xuất bản**.

Không bắt người dùng viết prompt, regex hay JSON.

### Luồng học sinh

1. Mở link hoặc nhập PIN.
2. Chọn Học / Ôn / Thi nếu giáo viên cho phép.
3. Làm bài; nhận phản hồi phù hợp với chế độ.
4. Xem phần yếu, câu sai và phiên ôn tiếp theo.

### Ba chế độ dùng cùng một nội dung

| Chế độ | Phản hồi | Thời gian | Thứ tự | Mục tiêu |
|---|---|---:|---|---|
| Học | Ngay sau mỗi câu, có gợi ý/lời giải | Linh hoạt | Theo bài hoặc thích nghi | Hiểu kiến thức |
| Ôn | Sau khi trả lời, ưu tiên câu sắp quên | Ngắn | Spaced repetition + interleaving | Nhớ lâu |
| Thi | Theo cấu hình, thường cuối bài | Nghiêm ngặt | Cố định hoặc trộn có seed | Đánh giá |
| Live | Host điều khiển hoặc tự chạy | Đếm ngược | Đồng bộ phòng | Tương tác lớp |

## 5. Kiến trúc đề xuất

### Frontend

- Next.js App Router.
- Route rõ theo vai trò và tác vụ:
  - `/` landing;
  - `/dashboard`;
  - `/library`;
  - `/imports/new` và `/imports/[id]/review`;
  - `/sets/[id]/edit`;
  - `/learn/[assignmentId]`;
  - `/exam/[attemptId]`;
  - `/live/host/[roomId]`;
  - `/join`;
  - `/reports/[assignmentId]`.
- Server Components cho đọc dữ liệu; Client Components chỉ ở editor/player/live.
- React Hook Form + schema validation cho form phức tạp.

### Backend

- Supabase Postgres, Auth, Storage và Realtime.
- Next.js Route Handlers/Server Actions cho các thao tác đặc quyền.
- Mọi khóa AI chỉ ở server.
- Dùng service role chỉ trong server và chỉ cho tác vụ cần thiết.
- Chấm điểm, đóng/mở phòng và cộng điểm phải chạy server-side hoặc RPC transaction.

### Pipeline nhập tài liệu

```text
Upload
  -> kiểm tra loại file/dung lượng/virus policy
  -> lưu file gốc
  -> trích xuất theo loại file
  -> chia đoạn có giữ số trang/vị trí
  -> AI phân loại tài liệu
  -> AI trích xuất về JSON Schema chuẩn
  -> validator + bộ sửa lỗi xác định
  -> kiểm tra đáp án và trùng lặp
  -> gắn confidence + cảnh báo
  -> màn duyệt của giáo viên
  -> xuất bản thành question set
```

Không dùng một prompt khổng lồ cho cả tài liệu dài. Pipeline phải chia thành job có tiến độ, có thể chạy lại từng đoạn và không tạo bản sao khi retry.

### Chiến lược AI

- Tạo interface `AiProvider` để không khóa sản phẩm vào một hãng.
- Bản đầu có một provider chính; provider khác là adapter sau.
- Dùng structured output/JSON Schema, sau đó vẫn validate lại bằng code.
- Hai tác vụ AI tách biệt:
  1. `extract`: giữ nguyên câu/đáp án có sẵn;
  2. `generate`: tạo nội dung học mới từ nguồn.
- Mỗi câu lưu:
  - `sourceRefs` (trang/đoạn);
  - `confidence`;
  - `aiWarnings`;
  - `generationRunId`;
  - `reviewStatus`.
- Không tự đoán đáp án khi bằng chứng yếu. Gắn `needs_review`.
- Có bộ eval cố định bằng tài liệu tiếng Việt thật: Word, PDF text, PDF scan, đáp án cuối tài liệu, in đậm, nhiều cột, công thức và câu có ảnh.

## 6. Mô hình dữ liệu V1

### Tổ chức nội dung

- `profiles`
- `workspaces`
- `workspace_members`
- `source_documents`
- `import_jobs`
- `import_chunks`
- `ai_runs`
- `question_sets`
- `questions`
- `question_options`
- `question_source_refs`
- `set_versions`

### Dạy, học và thi

- `classes`
- `class_members`
- `assignments`
- `attempts`
- `attempt_answers`
- `mastery_by_topic`
- `review_cards`
- `review_events`

### Live game

- `live_rooms`
- `live_players`
- `live_rounds`
- `live_answers`

### Trường quan trọng của `questions`

- `type`
- `stem`
- `explanation`
- `hint`
- `difficulty`
- `topic_ids`
- `time_limit_seconds`
- `points`
- `answer_spec` (schema riêng theo loại câu)
- `status`: `draft | needs_review | approved | archived`
- `origin`: `manual | imported | ai_generated`
- `confidence`
- `metadata`

Không tiếp tục lưu toàn bộ câu hỏi trong một cột JSONB của `quizzes`; cách hiện tại khó query, version, thống kê và tái sử dụng câu.

## 7. Cách học hiện đại đưa vào sản phẩm

### Retrieval practice

Học sinh phải tự nhớ và trả lời trước khi xem đáp án. Chế độ học không nên chỉ là đọc slide.

### Spaced repetition

Mỗi câu/chủ đề có lịch ôn riêng. Bản đầu có thể dùng FSRS hoặc thuật toán đơn giản có kiểm thử; nút tự đánh giá `Quên / Khó / Được / Dễ` chỉ dùng trong chế độ học, còn lịch có thể lấy thêm tín hiệu đúng/sai và thời gian.

### Interleaving

Phiên ôn trộn các chủ đề gần nhau thay vì học hết một chương rồi mới sang chương khác.

### Feedback có giải thích

Phản hồi gồm: đúng/sai, vì sao, vì sao phương án nhiễu sai, và liên kết về nguồn. Thi chính thức có thể trì hoãn phản hồi đến cuối.

### Mastery learning

Dashboard không chỉ báo tổng điểm; hiển thị năng lực theo mục tiêu/chủ đề và đề xuất việc tiếp theo.

### Confidence-based learning

Tùy chọn hỏi học sinh mức chắc chắn trước khi chốt đáp án. “Đúng do đoán” sẽ được ôn lại sớm hơn.

### Sổ câu sai và biến thể

Tự gom câu sai. AI có thể tạo biến thể tương đương, nhưng phải gắn nguồn và không thay thế câu gốc trong báo cáo.

## 8. Bảo mật và tính đúng

- RLS theo workspace/class/owner cho mọi bảng.
- Học sinh không được đọc đáp án trước khi được phép.
- Không gửi `correct` xuống client trong chế độ thi trước khi nộp.
- Chấm điểm server-side.
- Rate limit theo user/IP/workspace cho upload, AI và join room.
- Giới hạn MIME, kích thước và số trang; tên file không dùng làm đường dẫn.
- File riêng tư trong bucket private, truy cập bằng signed URL ngắn hạn.
- Xóa file AI theo chính sách retention cấu hình được.
- Audit log cho xuất bản, sửa đáp án, chấm lại và chia sẻ.
- Idempotency key cho import job và submit answer.
- Live score dùng transaction/RPC để tránh lost update.
- Có cơ chế báo nội dung sai và quay về version trước.

## 9. Thứ tự triển khai

### Chặng 0 — Làm nền sạch

Mục tiêu: codebase ổn định trước khi mở rộng.

- Sửa 5 lỗi lint hiện tại.
- Bổ sung test runner và test parser/scoring/store.
- Tách route/layout cơ bản; chuẩn hóa design tokens và encoding UTF-8.
- Tạo migration thống nhất thay cho ba file SQL chạy tay.
- Thêm error boundary, logging và `.env.example` đầy đủ.

Nghiệm thu: build, lint và test đều xanh; chức năng cũ không mất.

### Chặng 1 — Ngân hàng câu hỏi V2

- Tạo schema mới và migration dữ liệu từ `quizzes.questions`.
- Hỗ trợ nhiều loại câu, lời giải, tag, độ khó và trạng thái duyệt.
- Editor mới có autosave, bulk edit, duplicate, filter và version.
- Library có tìm kiếm, folder/tag và xem nhanh.

Nghiệm thu: tạo/sửa/xuất bản mọi loại câu V1; dữ liệu cũ được chuyển an toàn.

### Chặng 2 — AI Import chạy trong Kashot

- Upload private PDF/DOCX/TXT/CSV/ảnh.
- Trích xuất file và OCR khi cần.
- Job queue, progress, retry và cancel.
- Structured extraction + validation + confidence.
- Review theo lô; sửa nhanh đáp án, loại câu và nguồn.
- Chế độ giữ nguyên đề, sinh câu mới, tạo đề cương.

Nghiệm thu: bộ eval tài liệu đạt ngưỡng đã chốt; không có câu mơ hồ tự động được xuất bản.

### Chặng 3 — Học, ôn và thi

- Assignment và attempt.
- Player theo mode.
- Lời giải, hint, sổ câu sai.
- Review queue, spaced repetition, interleaving.
- Báo cáo cá nhân và theo chủ đề.

Nghiệm thu: một học sinh có thể học nhiều phiên, thoát vào lại, và hệ thống đề xuất đúng nội dung cần ôn.

### Chặng 4 — Live game an toàn

- Chuyển state/chấm điểm sang server/RPC.
- Reconnect, host transfer, lock join, kick/mute nickname, rate limit.
- Team mode, tự chạy, bảng xếp hạng ổn định.
- Không lộ đáp án trong payload.

Nghiệm thu: test nhiều client, mất mạng rồi vào lại, gửi đáp án lặp và cố sửa điểm đều được xử lý đúng.

### Chặng 5 — Lớp học và báo cáo

- Lớp, thành viên, giao bài, hạn nộp.
- Dashboard câu khó, chủ đề yếu, tiến bộ theo thời gian.
- Xuất CSV/PDF báo cáo.
- Chia sẻ/copy bộ đề theo quyền.

Nghiệm thu: giáo viên giao bài và xem được ai chưa làm, ai cần hỗ trợ ở chủ đề nào.

### Chặng 6 — Ra mắt

- Onboarding và dữ liệu mẫu.
- Privacy/terms/AI disclosure.
- Accessibility, mobile QA, performance budget.
- Backup/restore, monitoring, alert và runbook.
- Pilot với một nhóm giáo viên/học sinh; sửa theo dữ liệu sử dụng.

## 10. Cách làm để người dùng chỉ cần “nhấn vài lần”

Từ đây nên làm theo ba lần xác nhận lớn, không hỏi từng chi tiết code:

1. **Duyệt master plan và phạm vi V1.**
2. **Duyệt một hướng giao diện tổng thể** sau khi xem ba bản mẫu.
3. **Duyệt bản staging hoàn chỉnh** trước khi đưa production.

Trong mỗi chặng, đội triển khai tự xử lý schema, API, UI, test, migration và tài liệu vận hành theo tiêu chí nghiệm thu đã ghi; chỉ dừng hỏi nếu liên quan chi phí AI, quyền riêng tư hoặc thay đổi lớn phạm vi.

## 11. Kiểm thử bắt buộc

- Unit: parser, validator, scoring, scheduler, permission helpers.
- Fixture: ít nhất 30 tài liệu đại diện và đáp án chuẩn do người kiểm.
- Integration: import job, publish, assignment, submit, review schedule.
- RLS: ma trận giáo viên/học sinh/khách/workspace khác.
- E2E: nhập file → duyệt → giao bài → học sinh làm → giáo viên xem báo cáo.
- Multiplayer: reconnect, duplicate submit, race condition và phòng hết hạn.
- Accessibility: bàn phím, focus, contrast, reduced motion, screen reader labels.
- Performance: tài liệu dài chạy nền; dashboard không tải toàn bộ câu hỏi.

## 12. Chỉ số thành công

- Thời gian từ upload đến bộ đề nháp.
- Tỷ lệ câu được duyệt không cần sửa.
- Tỷ lệ lỗi đáp án nghiêm trọng sau khi xuất bản.
- Số thao tác trung vị để nhập và xuất bản.
- Tỷ lệ hoàn thành bài.
- Tỷ lệ quay lại ôn sau 1/7/30 ngày.
- Mức cải thiện theo chủ đề.
- Chi phí AI trên mỗi trang/câu được chấp nhận.
- Độ ổn định của live room và tỷ lệ reconnect thành công.

## 13. Tài liệu tham khảo dùng để định hướng

- Kahoot hiện hỗ trợ tạo từ chủ đề, PDF, URL/Wikipedia/slides và nhận diện câu hỏi có sẵn trong PDF:  
  https://support.kahoot.com/hc/en-us/articles/40803785990675-How-to-generate-a-kahoot-with-AI
- Wayground/Quizizz AI hỗ trợ tạo assessment từ tài liệu, ảnh, YouTube và nguồn khác:  
  https://support.quizizz.com/hc/en-us/sections/21584420292377-Use-AI-with-Quizizz
- Retrieval Practice về interleaving:  
  https://www.retrievalpractice.org/interleaving
- Nghiên cứu về interleaved retrieval practice:  
  https://www.psychologicalscience.org/journals/psychological-science/09567976211057507/
- OpenAI quickstart mô tả đầu vào ảnh/file/PDF trong Responses API:  
  https://platform.openai.com/docs/quickstart/make-your-first-api-request
- OpenAI API hỗ trợ Evals/Graders để đo chất lượng pipeline AI:  
  https://platform.openai.com/docs/api-reference/evals

## 14. Đề xuất quyết định ngay

Chọn **V1 cân bằng** gồm Chặng 0–4 trước: nền sạch, ngân hàng V2, AI Import, học–ôn–thi và live game an toàn. Chặng 5–6 làm sau pilot.

Đây là đường ngắn nhất để Kashot có khác biệt thật: không chỉ “AI tạo vài câu”, mà là nhập được bộ đề Việt Nam lộn xộn, kiểm soát chất lượng và biến nó thành một chu trình học hoàn chỉnh.
