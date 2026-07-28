#!/usr/bin/env python3
"""
Chuyển tài liệu câu hỏi (định dạng chữ ngắn) -> JSON bộ đề cho kahoot-web.

Cách dùng:
    python convert_to_quiz.py de.txt              # in ra màn hình
    python convert_to_quiz.py de.txt de.json      # ghi ra file de.json

ĐỊNH DẠNG NGUỒN (de.txt) — ngắn gọn, dễ gõ tay hoặc nhờ AI viết:

    # Tên bộ đề
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

Quy tắc:
  #  đầu dòng  -> tên bộ đề
  >  đầu dòng  -> mô tả
  *  (hoặc +)  -> đáp án ĐÚNG
  -             -> đáp án SAI
  Dòng khác (không rỗng) -> là câu hỏi mới
  [time=..] [points=..] trên dòng câu hỏi -> tuỳ chọn, ghi đè mặc định

Đầu ra khớp đúng schema app dùng (title, description, questions[...]).
"""

import json
import re
import sys

# Mặc định — đổi ở đây nếu muốn
DEFAULT_TIME = 20      # giây / câu
DEFAULT_POINTS = 1000  # điểm / câu


def parse(text: str) -> dict:
    title = "Bộ đề không tên"
    description = ""
    questions = []
    cur = None  # câu hỏi đang xây

    def flush():
        if cur is not None:
            questions.append(cur)

    for lineno, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line:
            continue

        if line.startswith("#"):
            title = line.lstrip("#").strip() or title
            continue
        if line.startswith(">"):
            description = line.lstrip(">").strip()
            continue

        if line[0] in "*+-":
            if cur is None:
                raise ValueError(f"Dòng {lineno}: đáp án nhưng chưa có câu hỏi.")
            correct = line[0] in "*+"
            atext = line[1:].strip()
            if not atext:
                raise ValueError(f"Dòng {lineno}: đáp án rỗng.")
            cur["answers"].append({"text": atext, "correct": correct})
            continue

        # còn lại: câu hỏi mới
        flush()
        time_v, points_v = DEFAULT_TIME, DEFAULT_POINTS
        m = re.search(r"\[time=(\d+)\]", line)
        if m:
            time_v = int(m.group(1))
        m = re.search(r"\[points=(\d+)\]", line)
        if m:
            points_v = int(m.group(1))
        qtext = re.sub(r"\[(time|points)=\d+\]", "", line).strip()
        cur = {
            "text": qtext,
            "timeLimit": time_v,
            "points": points_v,
            "answers": [],
        }

    flush()

    # kiểm tra hợp lệ
    if not questions:
        raise ValueError("Không tìm thấy câu hỏi nào.")
    for i, q in enumerate(questions, 1):
        if not q["text"]:
            raise ValueError(f"Câu {i}: thiếu nội dung.")
        if len(q["answers"]) < 2:
            raise ValueError(f"Câu {i} ('{q['text'][:30]}'): cần ít nhất 2 đáp án.")
        if not any(a["correct"] for a in q["answers"]):
            raise ValueError(f"Câu {i} ('{q['text'][:30]}'): chưa đánh dấu đáp án đúng (dùng *).")

    return {"title": title, "description": description, "questions": questions}


def main():
    # In tiếng Việt ra console Windows không bị lỗi mã.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if len(sys.argv) < 2:
        print("Dùng: python convert_to_quiz.py <nguồn.txt> [ra.json]", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1], encoding="utf-8") as f:
        quiz = parse(f.read())

    out = json.dumps(quiz, ensure_ascii=False, indent=2)
    if len(sys.argv) >= 3:
        with open(sys.argv[2], "w", encoding="utf-8") as f:
            f.write(out)
        print(f"✓ Đã ghi {sys.argv[2]} — {len(quiz['questions'])} câu.")
    else:
        print(out)


if __name__ == "__main__":
    main()
