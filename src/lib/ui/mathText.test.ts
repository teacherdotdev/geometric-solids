import { describe, expect, it } from "vitest";
import { hasRadical, splitFractions, splitMath } from "./mathText";

describe("splitMath", () => {
  it("puts a bare number under the bar", () => {
    expect(splitMath("3 + √2")).toEqual([
      { kind: "text", text: "3 + " },
      { kind: "radical", radicand: "2" },
    ]);
  });

  it("keeps π outside the root of 2√3π", () => {
    expect(splitMath("2√3π")).toEqual([
      { kind: "text", text: "2" },
      { kind: "radical", radicand: "3" },
      { kind: "text", text: "π" },
    ]);
  });

  it("drops the brackets that the bar replaces", () => {
    expect(splitMath("s = √(3² + 4²)")).toEqual([
      { kind: "text", text: "s = " },
      { kind: "radical", radicand: "3² + 4²" },
    ]);
  });

  it("keeps text after a bracketed root", () => {
    expect(splitMath("(1 + √2)π")).toEqual([
      { kind: "text", text: "(1 + " },
      { kind: "radical", radicand: "2" },
      { kind: "text", text: ")π" },
    ]);
  });

  it("leaves a root it cannot read alone", () => {
    expect(splitMath("√x")).toEqual([{ kind: "text", text: "√x" }]);
    expect(splitMath("√(3² + 4²")).toEqual([
      { kind: "text", text: "√(3² + 4²" },
    ]);
    expect(hasRadical("√x")).toBe(false);
  });

  it("reports plain text as having no radical", () => {
    expect(hasRadical("3 × 5 = 15")).toBe(false);
    expect(hasRadical("√2")).toBe(true);
  });
});

describe("splitFractions", () => {
  it("sets a value written against its slash as a fraction", () => {
    expect(splitFractions("5√35/47")).toEqual([
      { kind: "fraction", numerator: "5√35", denominator: "47" },
    ]);
  });

  it("keeps a spaced division on the line, and drops a fraction's own brackets", () => {
    expect(splitFractions("A = 4 × (8√2/7) / 2")).toEqual([
      { kind: "text", text: "A = 4 × " },
      { kind: "fraction", numerator: "8√2", denominator: "7" },
      { kind: "text", text: " / 2" },
    ]);
  });

  it("leaves a sign out of the numerator", () => {
    expect(splitFractions("h = -20/3")).toEqual([
      { kind: "text", text: "h = -" },
      { kind: "fraction", numerator: "20", denominator: "3" },
    ]);
  });

  it("finds every fraction inside a factored π", () => {
    expect(splitFractions("(√2/3 + 1/2)π")).toEqual([
      { kind: "text", text: "(" },
      { kind: "fraction", numerator: "√2", denominator: "3" },
      { kind: "text", text: " + " },
      { kind: "fraction", numerator: "1", denominator: "2" },
      { kind: "text", text: ")π" },
    ]);
  });

  it("returns plain text whole when there is no fraction", () => {
    expect(splitFractions("A = 3 × 4")).toEqual([
      { kind: "text", text: "A = 3 × 4" },
    ]);
  });
});
