import { describe, expect, it } from "vitest";
import { validatePhoto } from "./media.js";

describe("photo validation", () => {
  it("accepts supported images up to 5MB", () => {
    expect(() => validatePhoto({ type: "image/jpeg", size: 1024 })).not.toThrow();
    expect(() => validatePhoto({ type: "image/png", size: 5 * 1024 * 1024 })).not.toThrow();
    expect(() => validatePhoto({ type: "image/webp", size: 2048 })).not.toThrow();
  });

  it("rejects unsupported or oversized uploads", () => {
    expect(() => validatePhoto({ type: "image/gif", size: 1024 })).toThrow(/JPG, PNG, or WebP/);
    expect(() => validatePhoto({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toThrow(/5MB/);
  });
});
