import { describe, expect, it } from "vitest";
import { compareSize, fits, isSize } from "./size.js";

describe("fits", () => {
  it("allows a package to fit a locker of the same size", () => {
    expect(fits("MEDIUM", "MEDIUM")).toBe(true);
  });

  it("allows a package to fit a larger locker", () => {
    expect(fits("SMALL", "LARGE")).toBe(true);
  });

  it("rejects a package larger than the locker", () => {
    expect(fits("LARGE", "SMALL")).toBe(false);
  });
});

describe("compareSize", () => {
  it("sorts sizes ascending", () => {
    const sizes = ["LARGE", "SMALL", "MEDIUM"] as const;
    expect([...sizes].sort(compareSize)).toEqual(["SMALL", "MEDIUM", "LARGE"]);
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
