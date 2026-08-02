"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Download,
  GraduationCap,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { SavedQuiz } from "@/lib/store";
import { listSubmissions } from "@/lib/submissions";
import {
  examWindow,
  exportGradebookExcel,
  importStudentsCsv,
  loadInstitutional,
  makePin,
  questionAnalytics,
  saveInstitutional,
  type InstitutionalState,
  type PortalRole,
} from "@/lib/institutional";

type Tab = "classes" | "exams" | "integrity" | "grades" | "analytics" | "roles";
const TABS: [Tab, string][] = [
  ["classes", "Lớp & sinh viên"],
  ["exams", "Kỳ thi & QR"],
  ["integrity", "Nhật ký thi"],
  ["grades", "Bảng điểm"],
  ["analytics", "Phân tích câu hỏi"],
  ["roles", "Phân quyền"],
];
const CARD =
  "rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(0,90,42,.1)]";
const INPUT =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#018f41]";

export default function InstitutionalHub({
  quizzes,
  onBack,
  onOpenGrading,
}: {
  quizzes: SavedQuiz[];
  onBack: () => void;
  onOpenGrading: () => void;
}) {
  const [state, setState] = useState<InstitutionalState>(() =>
    loadInstitutional(),
  );
  const [tab, setTab] = useState<Tab>(() =>
    loadInstitutional().role === "assessment_officer" ? "exams" : "classes",
  );
  const allowedTabs = TABS.filter(
    ([value]) =>
      value === "roles" ||
      value === "grades" ||
      value === "analytics" ||
      state.role === "admin" ||
      (state.role === "lecturer" && value === "classes") ||
      (state.role === "assessment_officer" &&
        (value === "exams" || value === "integrity")),
  );
  const commit = (next: InstitutionalState) => {
    setState(next);
    saveInstitutional(next);
  };
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-7">
      <header className="rounded-3xl bg-slate-900 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
              UDA · Điều hành học phần
            </p>
            <h1 className="mt-1 text-3xl font-black">
              Lớp học, kỳ thi và chất lượng đánh giá
            </h1>
            <p className="mt-1 text-sm text-white/65">
              Một luồng kiểm soát từ danh sách sinh viên đến khóa và xuất điểm.
            </p>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
          >
            <ArrowLeft size={17} />
            Ngân hàng đề
          </button>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {allowedTabs.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black ${tab === value ? "bg-[#f58220]" : "bg-white/10 text-white/75"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div className="mt-5">
        {tab === "classes" && <Classes state={state} commit={commit} />}{" "}
        {tab === "exams" && (
          <Exams state={state} commit={commit} quizzes={quizzes} />
        )}{" "}
        {tab === "integrity" && <Integrity state={state} commit={commit} />}{" "}
        {tab === "grades" && (
          <Grades state={state} onOpenGrading={onOpenGrading} />
        )}{" "}
        {tab === "analytics" && <Analytics quizzes={quizzes} />}{" "}
        {tab === "roles" && <Roles state={state} commit={commit} />}
      </div>
    </main>
  );
}

function Classes({
  state,
  commit,
}: {
  state: InstitutionalState;
  commit: (s: InstitutionalState) => void;
}) {
  const [selected, setSelected] = useState(state.classes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [csv, setCsv] = useState("");
  const current = state.classes.find((c) => c.id === selected);
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <aside className={CARD}>
        <div className="flex items-center gap-2">
          <Users className="text-[#018f41]" />
          <h2 className="font-black">Danh sách lớp</h2>
        </div>
        {state.classes.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`mt-2 w-full rounded-xl p-3 text-left text-sm ${selected === c.id ? "bg-emerald-50 ring-2 ring-[#018f41]" : "bg-slate-50"}`}
          >
            <b>{c.code}</b>
            <span className="block text-xs text-slate-500">
              {c.name} · {c.students.length} SV
            </span>
          </button>
        ))}
        <div className="mt-4 border-t pt-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Mã lớp"
            className={INPUT}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên lớp"
            className={`${INPUT} mt-2`}
          />
          <button
            disabled={!code || !name}
            onClick={() => {
              const id = crypto.randomUUID();
              commit({
                ...state,
                classes: [...state.classes, { id, code, name, students: [] }],
              });
              setSelected(id);
              setCode("");
              setName("");
            }}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#018f41] p-3 text-sm font-black text-white disabled:opacity-40"
          >
            <Plus size={16} />
            Tạo lớp
          </button>
        </div>
      </aside>
      <section className={CARD}>
        {!current ? (
          <p>Chọn một lớp.</p>
        ) : (
          <>
            <h2 className="text-xl font-black text-[#01823c]">
              {current.name}
            </h2>
            <p className="text-sm text-slate-500">
              {current.code} · {current.students.length} sinh viên
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="p-2">Mã SV</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {current.students.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="p-2 font-mono">{s.code}</td>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label className="mt-5 block text-sm font-bold">
              Nhập danh sách CSV
              <textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                placeholder={
                  "Mã SV,Họ tên,Email\nSV240010,Nguyễn Văn A,a@donga.edu.vn"
                }
                className="mt-2 min-h-28 w-full rounded-xl border p-3 font-mono text-xs"
              />
            </label>
            <button
              disabled={!csv.trim()}
              onClick={() => {
                const students = importStudentsCsv(csv);
                commit({
                  ...state,
                  classes: state.classes.map((c) =>
                    c.id === current.id
                      ? { ...c, students: [...c.students, ...students] }
                      : c,
                  ),
                });
                setCsv("");
              }}
              className="mt-2 rounded-xl bg-[#f58220] px-4 py-3 text-sm font-black text-white disabled:opacity-40"
            >
              Nhập sinh viên
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function Exams({
  state,
  commit,
  quizzes,
}: {
  state: InstitutionalState;
  commit: (s: InstitutionalState) => void;
  quizzes: SavedQuiz[];
}) {
  const [title, setTitle] = useState("");
  const [quizId, setQuizId] = useState(quizzes[0]?.id ?? "");
  const [classId, setClassId] = useState(state.classes[0]?.id ?? "");
  const [opens, setOpens] = useState("");
  const [closes, setCloses] = useState("");
  const [duration, setDuration] = useState(45);
  const [qr, setQr] = useState<Record<string, string>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const opensRef = useRef<HTMLInputElement>(null);
  const closesRef = useRef<HTMLInputElement>(null);
  const selectedQuizId = quizId || quizzes[0]?.id || "";
  const selectedClassId = classId || state.classes[0]?.id || "";
  useEffect(() => {
    if (quizId || !quizzes[0]) return;
    const timer = window.setTimeout(() => setQuizId(quizzes[0].id), 0);
    return () => window.clearTimeout(timer);
  }, [quizId, quizzes]);
  useEffect(() => {
    state.exams.forEach((exam) => {
      QRCode.toDataURL(`${location.origin}/?exam=${exam.id}&pin=${exam.pin}`, {
        width: 220,
        margin: 1,
        color: { dark: "#018f41", light: "#ffffff" },
      }).then((url) => setQr((value) => ({ ...value, [exam.id]: url })));
    });
  }, [state.exams]);
  const create = () => {
    const finalTitle = titleRef.current?.value.trim() || title.trim();
    const finalOpens = opensRef.current?.value || opens;
    const finalCloses = closesRef.current?.value || closes;
    if (
      !finalTitle ||
      !selectedQuizId ||
      !selectedClassId ||
      !finalOpens ||
      !finalCloses ||
      new Date(finalCloses) <= new Date(finalOpens)
    )
      return;
    commit({
      ...state,
      exams: [
        {
          id: crypto.randomUUID(),
          title: finalTitle,
          quizId: selectedQuizId,
          classId: selectedClassId,
          pin: makePin(),
          opensAt: new Date(finalOpens).toISOString(),
          closesAt: new Date(finalCloses).toISOString(),
          durationMinutes: duration,
          attemptsAllowed: 1,
          shuffleQuestions: true,
          status: "scheduled",
        },
        ...state.exams,
      ],
    });
    setTitle("");
  };
  return (
    <>
      <section className={CARD}>
        <div className="flex items-center gap-3">
          <CalendarClock className="text-[#018f41]" />
          <div>
            <h2 className="text-xl font-black text-[#01823c]">
              Lập kỳ thi có lịch mở/đóng
            </h2>
            <p className="text-sm text-slate-500">
              PIN 6 số và QR được tạo tự động.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên kỳ thi"
            className={INPUT}
          />
          <select
            value={selectedQuizId}
            onChange={(e) => setQuizId(e.target.value)}
            className={INPUT}
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
          <select
            value={selectedClassId}
            onChange={(e) => setClassId(e.target.value)}
            className={INPUT}
          >
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
          <label className="text-xs font-bold">
            Mở lúc
            <input
              ref={opensRef}
              type="datetime-local"
              value={opens}
              onChange={(e) => setOpens(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="text-xs font-bold">
            Đóng lúc
            <input
              ref={closesRef}
              type="datetime-local"
              value={closes}
              onChange={(e) => setCloses(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="text-xs font-bold">
            Thời lượng
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={`${INPUT} mt-1`}
            />
          </label>
        </div>
        <button
          onClick={create}
          className="mt-4 rounded-xl bg-[#018f41] px-5 py-3 text-sm font-black text-white"
        >
          Tạo kỳ thi
        </button>
      </section>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {state.exams.map((exam) => (
          <article key={exam.id} className={CARD}>
            <div className="flex gap-4">
              <div className="flex-1">
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black uppercase text-emerald-700">
                  {examWindow(exam)}
                </span>
                <h3 className="mt-2 text-lg font-black">{exam.title}</h3>
                <p className="mt-1 font-mono text-3xl font-black text-[#018f41]">
                  {exam.pin}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(exam.opensAt).toLocaleString("vi-VN")} →{" "}
                  {new Date(exam.closesAt).toLocaleString("vi-VN")} ·{" "}
                  {exam.durationMinutes} phút
                </p>
              </div>
              {qr[exam.id] && (
                <img
                  src={qr[exam.id]}
                  alt={`QR ${exam.title}`}
                  className="h-28 w-28 rounded-xl border"
                />
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() =>
                  commit({
                    ...state,
                    exams: state.exams.map((e) =>
                      e.id === exam.id
                        ? {
                            ...e,
                            status: e.status === "open" ? "closed" : "open",
                          }
                        : e,
                    ),
                  })
                }
                className="rounded-lg bg-[#f58220] px-3 py-2 text-xs font-black text-white"
              >
                {exam.status === "open" ? "Đóng phòng" : "Mở phòng"}
              </button>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${location.origin}/?exam=${exam.id}&pin=${exam.pin}`,
                  )
                }
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black"
              >
                Copy link
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Integrity({
  state,
  commit,
}: {
  state: InstitutionalState;
  commit: (s: InstitutionalState) => void;
}) {
  const [examId, setExamId] = useState(state.exams[0]?.id ?? "");
  const [student, setStudent] = useState("");
  const [detail, setDetail] = useState("");
  return (
    <section className={CARD}>
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-[#f58220]" />
        <div>
          <h2 className="text-xl font-black text-[#01823c]">
            Nhật ký tính toàn vẹn
          </h2>
          <p className="text-sm text-slate-500">
            Chuyển tab, thoát toàn màn hình, mất mạng và biên bản giám thị.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <select
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          className={INPUT}
        >
          <option value="">Chọn kỳ thi</option>
          {state.exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <input
          value={student}
          onChange={(e) => setStudent(e.target.value)}
          placeholder="Mã sinh viên"
          className={INPUT}
        />
        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Nội dung biên bản"
          className={INPUT}
        />
        <button
          disabled={!examId || !student || !detail}
          onClick={() => {
            commit({
              ...state,
              events: [
                {
                  id: crypto.randomUUID(),
                  examId,
                  studentCode: student,
                  type: "manual_note",
                  at: new Date().toISOString(),
                  detail,
                },
                ...state.events,
              ],
            });
            setDetail("");
          }}
          className="rounded-xl bg-[#f58220] px-3 text-sm font-black text-white disabled:opacity-40"
        >
          Ghi biên bản
        </button>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-500">
              <th className="p-2">Thời gian</th>
              <th>Sinh viên</th>
              <th>Sự kiện</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {state.events.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="p-2">
                  {new Date(e.at).toLocaleString("vi-VN")}
                </td>
                <td className="font-mono">{e.studentCode}</td>
                <td className="font-bold text-amber-700">{e.type}</td>
                <td>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!state.events.length && (
          <p className="p-8 text-center text-sm text-slate-500">
            Chưa có sự kiện bất thường.
          </p>
        )}
      </div>
    </section>
  );
}

function Grades({
  state,
  onOpenGrading,
}: {
  state: InstitutionalState;
  onOpenGrading: () => void;
}) {
  const submissions = listSubmissions();
  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-[#018f41]" />
          <div>
            <h2 className="text-xl font-black text-[#01823c]">
              Bảng điểm học phần
            </h2>
            <p className="text-sm text-slate-500">
              Chỉ xuất điểm đã được công bố.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenGrading}
            className="rounded-xl bg-[#018f41] px-4 py-3 text-sm font-black text-white"
          >
            Chấm theo rubric
          </button>
          <button
            onClick={() => exportGradebookExcel(state, submissions)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f58220] px-4 py-3 text-sm font-black text-white"
          >
            <Download size={16} />
            Xuất Excel
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {state.classes.map((c) => (
          <div key={c.id} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-2xl font-black text-[#018f41]">
              {c.students.length}
            </p>
            <p className="font-bold">{c.code}</p>
            <p className="text-xs text-slate-500">
              {submissions.filter((s) => s.status === "published").length} bài
              đã công bố
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Analytics({ quizzes }: { quizzes: SavedQuiz[] }) {
  const rows = useMemo(
    () => questionAnalytics(quizzes, listSubmissions()),
    [quizzes],
  );
  return (
    <section className={CARD}>
      <div className="flex items-center gap-3">
        <BarChart3 className="text-[#018f41]" />
        <div>
          <h2 className="text-xl font-black text-[#01823c]">
            Phân tích chất lượng câu hỏi
          </h2>
          <p className="text-sm text-slate-500">
            Độ khó thực tế, bỏ trống, thời gian và khuyến nghị.
          </p>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-500">
              <th className="p-2">Câu hỏi</th>
              <th>Lượt</th>
              <th>Đúng</th>
              <th>Bỏ trống</th>
              <th>Giây</th>
              <th>Khuyến nghị</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((r, i) => (
              <tr key={`${r.quiz}-${i}`} className="border-b">
                <td className="max-w-md p-2">
                  <b>
                    {r.quiz} · Câu {r.index}
                  </b>
                  <span className="block truncate text-xs text-slate-500">
                    {r.text}
                  </span>
                </td>
                <td>{r.attempts}</td>
                <td>{Math.round(r.correctRate * 100)}%</td>
                <td>{Math.round(r.blankRate * 100)}%</td>
                <td>{Math.round(r.avgSeconds)}</td>
                <td>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">
                    {r.recommendation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Roles({
  state,
  commit,
}: {
  state: InstitutionalState;
  commit: (s: InstitutionalState) => void;
}) {
  const roles: [PortalRole, string, string][] = [
    ["lecturer", "Giảng viên", "Quản lý lớp, nhập đề, chấm và đề nghị công bố"],
    [
      "assessment_officer",
      "Khảo thí",
      "Lập kỳ thi, giám sát, khóa và công bố kết quả",
    ],
    ["admin", "Quản trị", "Cấu hình hệ thống và phân quyền tài khoản"],
  ];
  return (
    <section className={CARD}>
      <h2 className="text-xl font-black text-[#01823c]">
        Phân quyền theo trách nhiệm
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Chọn vai trò demo; Supabase áp dụng quyền thật ở tầng dữ liệu khi đăng
        nhập.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {roles.map(([value, label, desc]) => (
          <button
            key={value}
            onClick={() => commit({ ...state, role: value })}
            className={`rounded-2xl border p-5 text-left ${state.role === value ? "border-[#018f41] bg-emerald-50 ring-2 ring-[#018f41]/20" : "border-slate-200"}`}
          >
            <p className="font-black">{label}</p>
            <p className="mt-2 text-sm text-slate-500">{desc}</p>
            <span className="mt-4 inline-block text-xs font-black text-[#018f41]">
              {state.role === value ? "ĐANG SỬ DỤNG" : "CHUYỂN VAI TRÒ"}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-sm text-white/75">
        <b className="text-white">Maker–checker:</b> người ra đề không tự phê
        duyệt; khảo thí không sửa nội dung; quản trị không tự đổi điểm đã công
        bố.
      </div>
    </section>
  );
}
