import { describe, expect, it } from "vitest";
import { fits, isSize } from "./size.js";

describe("fits", () => {
  it("allows a package to go in a locker of the same zone/size", () => {
    expect(fits("MEDIUM", "MEDIUM")).toBe(true);
  });

  it("rejects a locker in a different zone, even a larger one", () => {
    expect(fits("SMALL", "LARGE")).toBe(false);
  });

  it("rejects a locker in a different zone, even a smaller one", () => {
    expect(fits("LARGE", "SMALL")).toBe(false);
  });
});

describe("isSize", () => {
  it("accepts valid sizes", () => {
    expect(isSize("SMALL")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isSize("HUGE")).toBe(false);
  });
});
