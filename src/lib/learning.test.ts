import { describe, expect, it } from "vitest";
import { scheduleReview } from "./learning";

describe("scheduleReview", () => {
  it("spaces a remembered card further into the future", () => {
    const now = 1_000_000;
    const first = scheduleReview(undefined, true, now);
    const second = scheduleReview(first, true, now);

    expect(first.intervalDays).toBe(1);
    expect(second.intervalDays).toBeGreaterThan(first.intervalDays);
    expect(second.dueAt).toBeGreaterThan(first.dueAt);
  });

  it("brings a forgotten card back quickly", () => {
    const card = scheduleReview(
      {
        quizTitle: "Toán",
        questionKey: "2 + 2?",
        dueAt: 0,
        intervalDays: 10,
        ease: 2.3,
        lapses: 0,
      },
      false,
      1_000,
    );

    expect(card.intervalDays).toBeLessThan(1);
    expect(card.lapses).toBe(1);
    expect(card.ease).toBeLessThan(2.3);
  });
});
