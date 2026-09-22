import { describe, expect, it } from "vitest";
import { createFriendlyIdGenerator, createSequentialIdGenerator, randomId } from "./id.js";

describe("createSequentialIdGenerator", () => {
  it("produces prefixed, incrementing ids starting at 1", () => {
    const next = createSequentialIdGenerator("L");
    expect(next()).toBe("L1");
    expect(next()).toBe("L2");
    expect(next()).toBe("L3");
  });

  it("keeps separate generators independent", () => {
    const a = createSequentialIdGenerator("A");
    const b = createSequentialIdGenerator("B");
    expect(a()).toBe("A1");
    expect(b()).toBe("B1");
    expect(a()).toBe("A2");
  });
});

describe("randomId", () => {
  it("produces unique values", () => {
    expect(randomId()).not.toBe(randomId());
  });
});

describe("createFriendlyIdGenerator", () => {
  it("produces ids matching prefix + sequence + 4-digit suffix", () => {
    const next = createFriendlyIdGenerator("L");
    expect(next()).toMatch(/^L1-\d{4}$/);
    expect(next()).toMatch(/^L2-\d{4}$/);
    expect(next()).toMatch(/^L3-\d{4}$/);
  });

  it("is always unique via the sequential part, even if suffixes collide", () => {
    const next = createFriendlyIdGenerator("L");
    const ids = Array.from({ length: 50 }, () => next());
    expect(new Set(ids).size).toBe(50);
  });
});
