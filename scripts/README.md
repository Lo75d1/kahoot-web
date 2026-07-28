# Tạo bộ đề bằng script (không lệ thuộc token AI)

Ý tưởng: **AI chỉ viết code ngắn**, còn *code* mới là thứ chạy trên tài liệu để sinh ra
JSON — nên dù tài liệu 10 hay 500 câu cũng không bị cụt output.

```
Tài liệu của bạn  ──►  [ script chạy trên máy/server ]  ──►  de.json  ──►  Nhập vào app
```

## Cách chạy script mẫu

Script mẫu (`convert_to_quiz.py` / `convert_to_quiz.mjs`) đọc **định dạng chữ ngắn**:

```
# Địa lý Việt Nam
> Mô tả ngắn (không bắt buộc)

Thủ đô của Việt Nam?
* Hà Nội
- TP.HCM
- Huế
- Đà Nẵng

2 + 2 x 2 = ?  [time=15] [points=1200]
- 8
* 6
- 4
```

Quy tắc: `#` = tên đề · `>` = mô tả · `*` (hoặc `+`) = đáp án ĐÚNG · `-` = đáp án sai ·
dòng khác = câu hỏi · `[time=..] [points=..]` tuỳ chọn trên dòng câu hỏi.

Chạy:

```bash
# Node (máy đã có sẵn)
node convert_to_quiz.mjs de.txt de.json

# hoặc Python
python convert_to_quiz.py de.txt de.json
```

→ mở `de.json`, copy toàn bộ → vào app **Tạo đề → ⇪ Nhập nhanh từ JSON** (hoặc ✨ Tạo bằng AI → ô ③) → nhập.

## Khi tài liệu của bạn ở định dạng KHÁC (Word, Excel, PDF, bảng…)

Đừng sửa tay — **nhờ ChatGPT/Claude viết/chỉnh script**. Đính kèm tài liệu (hoặc dán vài dòng
mẫu) vào AI, rồi dán prompt dưới. Vì đầu ra là *code*, AI không bị giới hạn token dù đề dài.

### 📋 PROMPT dán cho AI

````
Viết cho tôi một script (Python, tự chứa, chỉ dùng thư viện chuẩn nếu được) đọc tài liệu
đính kèm và xuất ra file JSON bộ đề trắc nghiệm ĐÚNG schema dưới đây. Chỉ trả về code.

# Schema JSON bắt buộc
{
  "title": "tên bộ đề",
  "description": "mô tả 1 dòng (có thể rỗng)",
  "questions": [
    {
      "text": "nội dung câu hỏi?",
      "timeLimit": 20,          // giây, số nguyên
      "points": 1000,           // điểm, số nguyên
      "answers": [
        { "text": "đáp án", "correct": true },
        { "text": "đáp án", "correct": false }
      ]
    }
  ]
}

# Yêu cầu
- Script nhận đường dẫn tài liệu ở tham số dòng lệnh, ghi ra file .json (UTF-8, indent 2).
- Mỗi câu hỏi: từ 2 đến 4 đáp án, CHỈ 1 đáp án đúng (correct: true).
- Nếu tài liệu không ghi thời gian/điểm thì dùng timeLimit=20, points=1000.
- Bỏ qua dòng trống / tiêu đề thừa; nếu một câu thiếu đáp án đúng thì in cảnh báo kèm số câu.
- In ra "Đã ghi <file> — <N> câu." khi xong.

# Định dạng tài liệu của tôi
(mô tả ngắn cách tài liệu của bạn sắp xếp: ví dụ "mỗi câu 1 đoạn, đáp án đúng in đậm / gạch chân /
đánh dấu (Đ)", hoặc "Excel: cột A=câu, B–E=đáp án, cột F=chữ cái đáp án đúng"...)
````

Gợi ý: nếu là **Word/PDF/ảnh**, đính kèm file thẳng vào ChatGPT/Gemini/Claude — chúng đọc được,
và bảo AI "đọc tài liệu đính kèm". Nếu là **Excel/CSV**, nói rõ cột nào là gì.

## Vì sao cách này ăn đứt kiểu "AI in JSON trực tiếp"
| | AI in JSON trực tiếp | Script (cách này) |
|---|---|---|
| Đề dài (30–500 câu) | dễ cụt giữa chừng | chạy tẹt ga |
| Chính xác | AI có thể bịa/nhầm | code cắt đúng 100% |
| Chi phí | tốn token mỗi lần | chạy free, bao nhiêu lần cũng được |
| Sửa tài liệu | phải hỏi lại AI | sửa file → chạy lại |
