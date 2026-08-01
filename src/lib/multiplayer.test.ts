import { describe, expect, it } from "vitest";
import { liveError } from "./multiplayer";

describe("liveError", () => {
  it("extracts useful Supabase error fields instead of [object Object]", () => {
    const error = liveError({
      message: "function digest does not exist",
      details: "RPC create_live_room failed",
      hint: "Check extensions schema",
    });
    expect(error.message).toContain("function digest does not exist");
    expect(error.message).toContain("Check extensions schema");
    expect(error.message).not.toBe("[object Object]");
  });

  it("uses a readable fallback", () => {
    expect(liveError({}).message).toBe("Live game gặp lỗi. Vui lòng thử lại.");
  });
});
