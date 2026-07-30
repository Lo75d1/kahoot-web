"use client";

import { useState } from "react";
import {
  dueReviewCount,
  listAttempts,
  listReviewCards,
  type AttemptSummary,
} from "@/lib/learning";

const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";

export default function LearningDashboard({ onBack }: { onBack: () => void }) {
  const [attempts] = useState<AttemptSummary[]>(() => listAttempts());
  const [due] = useState(() => dueReviewCount());
  const [cards] = useState(() => listReviewCards().length);
  const completed = attempts.length;
  const accuracy =
    attempts.reduce((sum, attempt) => sum + attempt.correct, 0) /
    Math.max(
      1,
      attempts.reduce((sum, attempt) => sum + attempt.total, 0),
    );
  const weakTopics = [...new Set(attempts.flatMap((attempt) => attempt.weakTopics))].slice(
    0,
    8,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 text-white sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Tiến độ học</h1>
          <p className="text-white/65">Lưu riêng trên thiết bị này.</p>
        </div>
        <button
          onClick={onBack}
          className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 font-semibold"
        >
          ← Quay lại
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Lượt hoàn thành" value={String(completed)} />
        <Metric label="Độ chính xác" value={`${Math.round(accuracy * 100)}%`} />
        <Metric label="Câu đến hạn ôn" value={`${due}/${cards}`} />
      </div>

      {weakTopics.length > 0 && (
        <section className={`rounded-3xl p-5 ${GLASS}`}>
          <h2 className="font-bold text-amber-100">Chủ đề cần củng cố</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {weakTopics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-amber-200/30 bg-amber-300/15 px-3 py-1 text-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className={`overflow-hidden rounded-3xl ${GLASS}`}>
        <h2 className="p-5 pb-3 font-bold">Lịch sử gần đây</h2>
        {attempts.length === 0 ? (
          <p className="px-5 pb-5 text-white/65">
            Chưa có lượt học hoặc thi nào.
          </p>
        ) : (
          attempts.slice(0, 15).map((attempt) => (
            <div
              key={attempt.id}
              className="flex items-center justify-between border-t border-white/10 px-5 py-3"
            >
              <div>
                <p className="font-semibold">{attempt.quizTitle}</p>
                <p className="text-xs text-white/55">
                  {new Date(attempt.completedAt).toLocaleString("vi-VN")} ·{" "}
                  {attempt.mode === "learn"
                    ? "Học"
                    : attempt.mode === "exam"
                      ? "Thi"
                      : "Ôn"}
                </p>
              </div>
              <p className="font-bold text-emerald-100">
                {attempt.correct}/{attempt.total}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${GLASS}`}>
      <p className="text-2xl font-black text-amber-100">{value}</p>
      <p className="mt-1 text-xs text-white/60">{label}</p>
    </div>
  );
}
