import { describe, expect, it } from "vitest";
import { computeScore, streakBonus } from "./scoring";

describe("computeScore", () => {
  it("returns zero for a wrong answer", () => {
    expect(computeScore(false, 100, 20, 1000)).toBe(0);
  });

  it("rewards speed and clamps late answers", () => {
    expect(computeScore(true, 0, 20, 1000)).toBe(1000);
    expect(computeScore(true, 10_000, 20, 1000)).toBe(750);
    expect(computeScore(true, 99_000, 20, 1000)).toBe(500);
  });
});

describe("streakBonus", () => {
  it("starts on the second correct answer and is capped", () => {
    expect(streakBonus(1)).toBe(0);
    expect(streakBonus(2)).toBe(100);
    expect(streakBonus(99)).toBe(500);
  });
});
