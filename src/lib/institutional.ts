import type { SavedQuiz } from "./store";
import type { Submission } from "./submissions";

export type PortalRole = "lecturer" | "assessment_officer" | "admin";
export interface Student {
  id: string;
  code: string;
  name: string;
  email: string;
}
export interface CourseClass {
  id: string;
  code: string;
  name: string;
  students: Student[];
}
export interface ScheduledExam {
  id: string;
  title: string;
  quizId: string;
  classId: string;
  pin: string;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  status: "draft" | "scheduled" | "open" | "closed";
}
export interface IntegrityEvent {
  id: string;
  examId: string;
  studentCode: string;
  type:
    | "tab_hidden"
    | "fullscreen_exit"
    | "offline"
    | "reconnected"
    | "manual_note";
  at: string;
  detail: string;
}
export interface RubricCriterion {
  id: string;
  name: string;
  maxPoints: number;
  description: string;
}
export interface InstitutionalState {
  role: PortalRole;
  classes: CourseClass[];
  exams: ScheduledExam[];
  events: IntegrityEvent[];
  rubric: RubricCriterion[];
}

const KEY = "uda-institutional-v1";
const seed: InstitutionalState = {
  role: "lecturer",
  classes: [
    {
      id: "class-demo",
      code: "DHKHMT-24A",
      name: "Khoa học máy tính 24A",
      students: [
        {
          id: "sv1",
          code: "SV240001",
          name: "Nguyễn Minh Anh",
          email: "minhanh@donga.edu.vn",
        },
        {
          id: "sv2",
          code: "SV240002",
          name: "Trần Gia Bảo",
          email: "giabao@donga.edu.vn",
        },
        {
          id: "sv3",
          code: "SV240003",
          name: "Lê Hoài An",
          email: "hoaian@donga.edu.vn",
        },
      ],
    },
  ],
  exams: [],
  events: [],
  rubric: [
    {
      id: "r1",
      name: "Kiến thức",
      maxPoints: 4,
      description: "Nội dung chính xác, đủ ý",
    },
    {
      id: "r2",
      name: "Lập luận",
      maxPoints: 3,
      description: "Lập luận logic và có minh chứng",
    },
    {
      id: "r3",
      name: "Vận dụng",
      maxPoints: 2,
      description: "Liên hệ hoặc giải pháp phù hợp",
    },
    {
      id: "r4",
      name: "Trình bày",
      maxPoints: 1,
      description: "Rõ ràng, đúng quy cách",
    },
  ],
};

export function loadInstitutional(): InstitutionalState {
  if (typeof window === "undefined") return seed;
  try {
    return JSON.parse(localStorage.getItem(KEY) || "") as InstitutionalState;
  } catch {
    return structuredClone(seed);
  }
}
export function saveInstitutional(state: InstitutionalState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("uda-institutional"));
}
export function recordIntegrityEvent(
  examId: string,
  type: IntegrityEvent["type"],
  detail: string,
  studentCode = "THÍ SINH",
) {
  const state = loadInstitutional();
  saveInstitutional({
    ...state,
    events: [
      {
        id: crypto.randomUUID(),
        examId,
        studentCode,
        type,
        at: new Date().toISOString(),
        detail,
      },
      ...state.events,
    ],
  });
}
export function makePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
export function examWindow(exam: ScheduledExam, now = Date.now()) {
  const start = new Date(exam.opensAt).getTime(),
    end = new Date(exam.closesAt).getTime();
  return now < start ? "upcoming" : now > end ? "ended" : "active";
}
export function importStudentsCsv(text: string): Student[] {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  return rows
    .slice(rows[0]?.toLowerCase().includes("mã") ? 1 : 0)
    .map((row, index) => {
      const [code, name, email = ""] = row
        .split(/[,;\t]/)
        .map((value) => value.trim());
      return {
        id: crypto.randomUUID(),
        code: code || `SV${index + 1}`,
        name: name || "Chưa có tên",
        email,
      };
    });
}

export function questionAnalytics(
  quizzes: SavedQuiz[],
  submissions: Submission[],
) {
  return quizzes.flatMap((quiz) =>
    quiz.questions.map((question, index) => {
      const related = submissions.filter(
        (item) => item.quizTitle === quiz.title && item.results[index],
      );
      const correct = related.filter(
        (item) => item.results[index]?.correct,
      ).length;
      const answered = related.filter(
        (item) =>
          item.responses[index] !== null && item.responses[index] !== undefined,
      ).length;
      const correctRate = related.length ? correct / related.length : 0;
      return {
        quiz: quiz.title,
        index: index + 1,
        text: question.text,
        attempts: related.length,
        correctRate,
        blankRate: related.length
          ? (related.length - answered) / related.length
          : 0,
        avgSeconds: related.length
          ? related.reduce(
              (sum, item) => sum + (item.results[index]?.responseMs ?? 0),
              0,
            ) /
            related.length /
            1000
          : 0,
        recommendation:
          related.length < 3
            ? "Cần thêm dữ liệu"
            : correctRate < 0.25
              ? "Quá khó · xem lại"
              : correctRate > 0.9
                ? "Quá dễ · cân nhắc thay"
                : "Đạt",
      };
    }),
  );
}

const xmlEsc = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]!,
  );
export function exportGradebookExcel(
  state: InstitutionalState,
  submissions: Submission[],
) {
  const rows: unknown[][] = [
    ["Mã SV", "Họ tên", "Lớp", "Bộ đề", "Trạng thái", "Điểm", "Ngày nộp"],
  ];
  for (const cls of state.classes)
    for (const student of cls.students) {
      const matched = submissions.filter(
        (item) =>
          item.status === "published" &&
          item.studentCode === student.code.toUpperCase(),
      );
      if (!matched.length)
        rows.push([
          student.code,
          student.name,
          cls.code,
          "",
          "Chưa có điểm",
          "",
          "",
        ]);
      else
        for (const item of matched) {
          const total = item.quiz.questions.reduce(
            (sum, q) => sum + q.points,
            0,
          );
          const auto = item.results.reduce(
            (sum, result) => sum + result.earned,
            0,
          );
          const manual = Object.values(item.grades).reduce(
            (sum, grade) => sum + grade.points,
            0,
          );
          rows.push([
            student.code,
            student.name,
            cls.code,
            item.quizTitle,
            "Đã công bố",
            Math.round(((auto + manual) / Math.max(1, total)) * 1000) / 100,
            new Date(item.submittedAt).toLocaleString("vi-VN"),
          ]);
        }
    }
  const table = rows
    .map(
      (row) =>
        `<Row>${row.map((value) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${xmlEsc(value)}</Data></Cell>`).join("")}</Row>`,
    )
    .join("");
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Bang diem"><Table>${table}</Table></Worksheet></Workbook>`;
  const url = URL.createObjectURL(
    new Blob([xml], { type: "application/vnd.ms-excel" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "bang-diem-UDA.xls";
  anchor.click();
  URL.revokeObjectURL(url);
}
