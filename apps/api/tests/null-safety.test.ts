import { describe, it, expect } from "vitest";
import { safeCompare } from "../src/utils/crypto.js";

describe("safeCompare", () => {
  it("returns true for identical strings", () => {
    expect(safeCompare("abc", "abc")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(safeCompare("abc", "def")).toBe(false);
  });

  it("returns false for empty strings", () => {
    expect(safeCompare("", "")).toBe(false);
  });

  it("returns false when first argument is undefined", () => {
    expect(safeCompare(undefined as unknown as string, "abc")).toBe(false);
  });

  it("returns false when second argument is undefined", () => {
    expect(safeCompare("abc", undefined as unknown as string)).toBe(false);
  });

  it("returns false when both arguments are undefined", () => {
    expect(
      safeCompare(
        undefined as unknown as string,
        undefined as unknown as string,
      ),
    ).toBe(false);
  });

  it("returns false when first argument is null", () => {
    expect(safeCompare(null as unknown as string, "abc")).toBe(false);
  });

  it("returns false when second argument is null", () => {
    expect(safeCompare("abc", null as unknown as string)).toBe(false);
  });

  it("returns false for strings of different lengths", () => {
    expect(safeCompare("abc", "abcd")).toBe(false);
    expect(safeCompare("abcd", "abc")).toBe(false);
  });

  it("returns true for long matching strings", () => {
    const str = "a".repeat(1000);
    expect(safeCompare(str, str)).toBe(true);
  });
});
