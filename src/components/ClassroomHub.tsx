"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedQuiz } from "@/lib/store";
import {
  createAssignment,
  createClass,
  joinClass,
  listAssignmentResults,
  listAssignments,
  listClasses,
  type Assignment,
  type AssignmentResult,
  type Classroom,
} from "@/lib/classroom";

const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";
const INPUT =
  "w-full rounded-xl border border-white/35 bg-white/90 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-200";

export default function ClassroomHub({
  userId,
  quizzes,
  onBack,
  onPlayAssignment,
}: {
  userId: string;
  quizzes: SavedQuiz[];
  onBack: () => void;
  onPlayAssignment: (assignment: Assignment) => Promise<void>;
}) {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults] = useState<AssignmentResult[]>([]);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [quizId, setQuizId] = useState(quizzes[0]?.id ?? "");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentMode, setAssignmentMode] =
    useState<Assignment["mode"]>("practice");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => classes.find((item) => item.id === selectedId) ?? null,
    [classes, selectedId],
  );
  const isOwner = selected?.owner_id === userId;

  const refresh = async () => {
    const next = await listClasses();
    setClasses(next);
    setSelectedId((current) => current || next[0]?.id || "");
  };

  useEffect(() => {
    listClasses()
      .then((next) => {
        setClasses(next);
        setSelectedId(next[0]?.id || "");
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Không tải được lớp."),
      );
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    listAssignments(selectedId)
      .then(async (nextAssignments) => {
        setAssignments(nextAssignments);
        setResults(
          await listAssignmentResults(
            nextAssignments.map((assignment) => assignment.id),
          ),
        );
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Không tải được bài giao."),
      );
  }, [selectedId]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 text-white sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Lớp học</h1>
          <p className="text-white/65">Tạo lớp, tham gia và giao bộ đề.</p>
        </div>
        <button
          onClick={onBack}
          className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 font-semibold"
        >
          ← Quay lại
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <aside className={`flex flex-col gap-3 rounded-3xl p-4 ${GLASS}`}>
          <h2 className="font-bold text-amber-100">Lớp của tôi</h2>
          {classes.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`rounded-xl border px-3 py-2 text-left ${
                selectedId === item.id
                  ? "border-amber-200/50 bg-amber-300/20"
                  : "border-white/15 bg-white/5"
              }`}
            >
              <span className="block font-semibold">{item.name}</span>
              <span className="text-xs text-white/55">
                {item.owner_id === userId ? "Giáo viên" : "Học sinh"}
              </span>
            </button>
          ))}

          <div className="border-t border-white/15 pt-3">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className={INPUT}
              placeholder="Tên lớp mới"
            />
            <button
              disabled={!newName.trim() || busy}
              onClick={() =>
                run(async () => {
                  await createClass(newName);
                  setNewName("");
                  await refresh();
                })
              }
              className="mt-2 w-full rounded-xl bg-amber-300 px-3 py-2 font-bold text-emerald-950 disabled:opacity-40"
            >
              + Tạo lớp
            </button>
          </div>

          <div className="border-t border-white/15 pt-3">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              className={INPUT}
              placeholder="Mã tham gia"
            />
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className={`${INPUT} mt-2`}
              placeholder="Tên hiển thị"
            />
            <button
              disabled={!joinCode.trim() || busy}
              onClick={() =>
                run(async () => {
                  await joinClass(joinCode, displayName);
                  setJoinCode("");
                  await refresh();
                })
              }
              className="mt-2 w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 font-bold disabled:opacity-40"
            >
              Tham gia lớp
            </button>
          </div>
        </aside>

        <main className={`rounded-3xl p-5 ${GLASS}`}>
          {!selected ? (
            <p className="text-white/65">Chọn hoặc tạo một lớp để bắt đầu.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">{selected.name}</h2>
                  <p className="text-sm text-white/60">
                    Mã lớp:{" "}
                    <b className="tracking-widest text-amber-100">
                      {selected.join_code}
                    </b>
                  </p>
                </div>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                  {isOwner ? "Giáo viên" : "Thành viên"}
                </span>
              </div>

              {isOwner && (
                <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4">
                  <h3 className="font-bold">Giao bài mới</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      value={assignmentTitle}
                      onChange={(event) => setAssignmentTitle(event.target.value)}
                      className={INPUT}
                      placeholder="Tên bài giao"
                    />
                    <select
                      value={quizId}
                      onChange={(event) => setQuizId(event.target.value)}
                      className={INPUT}
                    >
                      {quizzes.map((quiz) => (
                        <option key={quiz.id} value={quiz.id}>
                          {quiz.title}
                        </option>
                      ))}
                    </select>
                    <select
                      value={assignmentMode}
                      onChange={(event) =>
                        setAssignmentMode(event.target.value as Assignment["mode"])
                      }
                      className={INPUT}
                    >
                      <option value="learn">Học</option>
                      <option value="practice">Ôn tập</option>
                      <option value="exam">Thi</option>
                    </select>
                    <button
                      disabled={!quizId || !assignmentTitle.trim() || busy}
                      onClick={() =>
                        run(async () => {
                          await createAssignment({
                            classId: selected.id,
                            quizId,
                            title: assignmentTitle,
                            mode: assignmentMode,
                          });
                          setAssignmentTitle("");
                          setAssignments(await listAssignments(selected.id));
                        })
                      }
                      className="rounded-xl bg-amber-300 px-3 py-2 font-bold text-emerald-950 disabled:opacity-40"
                    >
                      Giao bài
                    </button>
                  </div>
                </div>
              )}

              <h3 className="mt-5 font-bold">Bài đã giao</h3>
              <div className="mt-2 flex flex-col gap-2">
                {assignments.length === 0 ? (
                  <p className="text-sm text-white/55">Chưa có bài nào.</p>
                ) : (
                  assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <span className="font-semibold">{assignment.title}</span>
                        <span className="ml-2 text-xs text-white/60">
                          {assignment.mode === "learn"
                            ? "Học"
                            : assignment.mode === "exam"
                              ? "Thi"
                              : "Ôn"}
                        </span>
                        {isOwner && (
                          <span className="ml-2 text-xs text-emerald-100/70">
                            {(() => {
                              const assignmentResults = results.filter(
                                (result) =>
                                  result.assignment_id === assignment.id,
                              );
                              if (assignmentResults.length === 0) return "0 lượt";
                              const average =
                                assignmentResults.reduce(
                                  (sum, result) =>
                                    sum +
                                    result.correct_count /
                                      Math.max(1, result.total_count),
                                  0,
                                ) / assignmentResults.length;
                              return `${assignmentResults.length} lượt · ${Math.round(
                                average * 100,
                              )}%`;
                            })()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          run(async () => onPlayAssignment(assignment))
                        }
                        disabled={busy}
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-bold"
                      >
                        Mở bài
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {error && (
        <p className="rounded-2xl border border-rose-200/40 bg-rose-500/70 px-4 py-3 text-sm font-semibold">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
