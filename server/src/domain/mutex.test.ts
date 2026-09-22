import { describe, expect, it } from "vitest";
import { Mutex } from "./mutex.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Mutex", () => {
  it("runs exclusive sections one at a time, never interleaved", async () => {
    const mutex = new Mutex();
    const events: string[] = [];

    const task = (label: string, ms: number) =>
      mutex.runExclusive(async () => {
        events.push(`${label}:start`);
        await delay(ms);
        events.push(`${label}:end`);
      });

    await Promise.all([task("a", 20), task("b", 5), task("c", 1)]);

    // Each task's start must be immediately followed by its own end -
    // no other task's start can appear in between.
    expect(events).toEqual(["a:start", "a:end", "b:start", "b:end", "c:start", "c:end"]);
  });

  it("releases the lock even if the guarded function throws", async () => {
    const mutex = new Mutex();

    await expect(
      mutex.runExclusive(() => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    // If the lock weren't released, this would hang forever.
    const result = await mutex.runExclusive(() => "still works");
    expect(result).toBe("still works");
  });

  it("returns each call's own result", async () => {
    const mutex = new Mutex();
    const [a, b] = await Promise.all([
      mutex.runExclusive(() => 1),
      mutex.runExclusive(() => 2),
    ]);
    expect([a, b].sort()).toEqual([1, 2]);
  });
});
