import { describe, expect, it } from "vitest";
import {
  type Slice,
  type SliceHeading,
  SLICE_HEADINGS,
  clampToSpan,
  cutSolid,
  middleOfSpan,
  sliceSpan,
} from "./crossSections";
import { evalExact, formatExact } from "./exact";
import { fromTenths, rational, toNumber } from "./rational";
import { buildSolid } from "./solids";
import type { Dimensions, SolidKind } from "./types";

function horizontal(position: number): Slice {
  return {
    direction: "horizontal",
    heading: "level",
    position: fromTenths(position),
  };
}

function cut(kind: SolidKind, d: Dimensions, slice: Slice) {
  const section = cutSolid(kind, d, slice);
  if (!section) throw new Error("expected a cross section");
  return section;
}

function lengths(kind: SolidKind, d: Dimensions, slice: Slice): string[] {
  return cut(kind, d, slice)
    .edges.map((edge) => formatExact(edge.length))
    .sort();
}

/** The area enclosed by a face-on outline, measured the long way round. */
function enclosed(points: readonly (readonly [number, number])[]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    twice += x1 * y2 - x2 * y1;
  }
  return Math.abs(twice) / 2;
}

const PRISM = { l: 3, w: 4, h: 5 };

describe("horizontal slices of a rectangular prism and a cube", () => {
  it("give a rectangle equal to the bottom face at every height", () => {
    for (const height of [0.1, 1, 2.5, 4.9]) {
      const section = cut("rectangularPrism", PRISM, horizontal(height));
      expect(section.name).toBe("Rectangle");
      expect(lengths("rectangularPrism", PRISM, horizontal(height))).toEqual([
        "3",
        "3",
        "4",
        "4",
      ]);
      expect(formatExact(section.area.exact)).toBe("12");
    }
  });

  it("give a square for a cube", () => {
    const section = cut("cube", { s: 2 }, horizontal(1));
    expect(section.name).toBe("Square");
    expect(section.area.formula).toBe("A = s²");
    expect(section.area.substitution).toBe("A = 2²");
    expect(formatExact(section.area.exact)).toBe("4");
  });

  it("show the working for a rectangle", () => {
    const section = cut("rectangularPrism", PRISM, horizontal(2));
    expect(section.area.formula).toBe("A = lw");
    expect(section.area.substitution).toBe("A = 3 × 4");
  });

  it("never change the solid's surface area or volume", () => {
    const before = buildSolid("rectangularPrism", PRISM);
    cut("rectangularPrism", PRISM, horizontal(2));
    const after = buildSolid("rectangularPrism", PRISM);
    expect(after.surfaceArea.exact).toEqual(before.surfaceArea.exact);
    expect(after.volume.exact).toEqual(before.volume.exact);
  });

  it("sit on the solid, between its bottom and top faces", () => {
    const section = cut("rectangularPrism", PRISM, horizontal(1));
    // The mesh is centred, so height 1 of 5 is 1.5 below the middle.
    for (const [, y] of section.outline3d) expect(y).toBeCloseTo(-1.5);
  });
});

describe("the slice position", () => {
  it("runs strictly between the bottom face and the top", () => {
    const span = sliceSpan("rectangularPrism", PRISM, "level");
    expect(span && toNumber(span)).toBe(5);
    expect(cutSolid("rectangularPrism", PRISM, horizontal(0))).toBeNull();
    expect(cutSolid("rectangularPrism", PRISM, horizontal(5))).toBeNull();
    expect(cutSolid("rectangularPrism", PRISM, horizontal(4.9))).not.toBeNull();
  });

  it("is pulled back inside the solid, never onto an end", () => {
    const span = rational(5);
    expect(clampToSpan(7, span)).toBe(4.9);
    expect(clampToSpan(0, span)).toBe(0.1);
    expect(clampToSpan(2.5, span)).toBe(2.5);
    expect(clampToSpan(3, rational(7, 2))).toBe(3);
    expect(clampToSpan(9, rational(7, 2))).toBe(3.4);
    expect(clampToSpan(9, rational(7, 20))).toBe(0.3);
  });

  it("has nowhere to stand in a solid only a tenth thick", () => {
    expect(clampToSpan(1, rational(1, 10))).toBeNull();
  });

  it("starts half way up", () => {
    expect(middleOfSpan(rational(5))).toBe(2.5);
    expect(middleOfSpan(rational(3))).toBe(1.5);
  });

  it("cannot be taken through a solid that offers no slices", () => {
    expect(
      sliceSpan("logoSlab", { m: 2, r: 1, b: 1, h: 1 }, "level"),
    ).toBeNull();
  });
});

describe("every cross section", () => {
  const solids: Array<[SolidKind, Dimensions]> = [
    ["rectangularPrism", PRISM],
    ["cube", { s: 2 }],
    ["triangularPrism", { a: 3, b: 4, p: 5 }],
    ["squarePyramid", { b: 6, h: 4 }],
  ];
  const headings = Object.values(SLICE_HEADINGS).flat() as SliceHeading[];

  /** A handful of positions through the solid for each heading. */
  function slices(kind: SolidKind, d: Dimensions): Slice[] {
    return headings.flatMap((heading) => {
      const span = sliceSpan(kind, d, heading)!;
      const direction =
        heading === "level"
          ? "horizontal"
          : heading === "frontToBack" || heading === "sideToSide"
            ? "vertical"
            : "diagonal";
      return [0.15, 0.5, 0.8].map((share) => ({
        direction,
        heading,
        position: fromTenths(clampToSpan(toNumber(span) * share, span)!),
      })) as Slice[];
    });
  }

  it("has positive area equal to what its outline encloses", () => {
    for (const [kind, d] of solids) {
      for (const slice of slices(kind, d)) {
        const section = cut(kind, d, slice);
        const area = evalExact(section.area.exact);
        expect(area).toBeGreaterThan(0);
        expect(area).toBeCloseTo(enclosed(section.outline2d), 9);
      }
    }
  });

  it("has sides as long face-on as they are on the solid", () => {
    for (const [kind, d] of solids) {
      for (const slice of slices(kind, d)) {
        for (const edge of cut(kind, d, slice).edges) {
          const flat = Math.hypot(
            edge.to2d[0] - edge.from2d[0],
            edge.to2d[1] - edge.from2d[1],
          );
          const solid = Math.hypot(
            edge.to3d[0] - edge.from3d[0],
            edge.to3d[1] - edge.from3d[1],
            edge.to3d[2] - edge.from3d[2],
          );
          expect(evalExact(edge.length)).toBeCloseTo(flat, 9);
          expect(evalExact(edge.length)).toBeCloseTo(solid, 9);
        }
      }
    }
  });

  it("doubles its lengths and quadruples its area when everything doubles", () => {
    for (const [kind, d] of solids) {
      const doubled = Object.fromEntries(
        Object.entries(d).map(([key, value]) => [key, value * 2]),
      );
      for (const slice of slices(kind, d)) {
        const small = cut(kind, d, slice);
        const large = cut(kind, doubled, {
          ...slice,
          position: fromTenths(toNumber(slice.position) * 2),
        });
        expect(evalExact(large.area.exact)).toBeCloseTo(
          evalExact(small.area.exact) * 4,
          9,
        );
        expect(large.edges.map((edge) => evalExact(edge.length))).toEqual(
          small.edges.map((edge) => evalExact(edge.length) * 2),
        );
      }
    }
  });
});

function sliceOf(heading: SliceHeading, position: number): Slice {
  const direction =
    heading === "level"
      ? "horizontal"
      : heading === "frontToBack" || heading === "sideToSide"
        ? "vertical"
        : "diagonal";
  return { direction, heading, position: fromTenths(position) };
}

describe("vertical and diagonal slices of a rectangular prism and a cube", () => {
  it("cut a cube corner to corner in a 2 by 2√2 rectangle", () => {
    const section = cut("cube", { s: 2 }, sliceOf("right", 2));
    expect(section.name).toBe("Rectangle");
    expect(lengths("cube", { s: 2 }, sliceOf("right", 2))).toEqual([
      "2",
      "2",
      "2√2",
      "2√2",
    ]);
    expect(formatExact(section.area.exact)).toBe("4√2");
    expect(section.area.substitution).toBe("A = 2 × 2√2");
  });

  it("only ever give rectangles and squares", () => {
    const headings = Object.values(SLICE_HEADINGS).flat() as SliceHeading[];
    for (const [kind, d] of [
      ["rectangularPrism", PRISM],
      ["cube", { s: 2 }],
    ] as const) {
      for (const heading of headings) {
        const span = toNumber(sliceSpan(kind, d, heading)!);
        for (let tenths = 1; tenths < span * 10; tenths += 1) {
          const section = cut(kind, d, sliceOf(heading, tenths / 10));
          expect(["Rectangle", "Square"]).toContain(section.name);
        }
      }
    }
  });

  it("measure the position from the left, from the back, or along the slide", () => {
    expect(toNumber(sliceSpan("rectangularPrism", PRISM, "frontToBack")!)).toBe(
      3,
    );
    expect(toNumber(sliceSpan("rectangularPrism", PRISM, "sideToSide")!)).toBe(
      4,
    );
    // A diagonal slides from one top edge to the opposite bottom one: the length
    // plus the height.
    expect(toNumber(sliceSpan("rectangularPrism", PRISM, "right")!)).toBe(8);
    expect(toNumber(sliceSpan("rectangularPrism", PRISM, "front")!)).toBe(9);

    const vertical = cut("rectangularPrism", PRISM, sliceOf("frontToBack", 1));
    expect(
      lengths("rectangularPrism", PRISM, sliceOf("frontToBack", 1)),
    ).toEqual(["4", "4", "5", "5"]);
    // Measured in from the left, which the mesh puts at x = -1.5.
    for (const [x] of vertical.outline3d) expect(x).toBeCloseTo(-0.5);
  });

  it("draw the position as a line as long as it, from where the plane first touched", () => {
    for (const heading of ["level", "frontToBack", "right", "back"] as const) {
      const section = cut("cube", { s: 2 }, sliceOf(heading, 1.5));
      const { from3d, to3d } = section.travel;
      expect(
        Math.hypot(
          to3d[0] - from3d[0],
          to3d[1] - from3d[1],
          to3d[2] - from3d[2],
        ),
      ).toBeCloseTo(1.5);
    }
  });

  it("mark a right angle for a vertical slice, 45° for a diagonal, and none level", () => {
    expect(cut("cube", { s: 2 }, sliceOf("level", 1)).angle).toBeNull();
    expect(cut("cube", { s: 2 }, sliceOf("sideToSide", 1)).angle?.degrees).toBe(
      90,
    );
    const diagonal = cut("cube", { s: 2 }, sliceOf("left", 2)).angle!;
    expect(diagonal.degrees).toBe(45);
    // The mark sits on the bottom face's level, which the mesh puts at y = -1.
    expect(diagonal.at[1]).toBeCloseTo(-1);
    const cosine =
      diagonal.floor[0] * diagonal.rise[0] +
      diagonal.floor[1] * diagonal.rise[1] +
      diagonal.floor[2] * diagonal.rise[2];
    expect(cosine).toBeCloseTo(Math.SQRT1_2);
  });
});
