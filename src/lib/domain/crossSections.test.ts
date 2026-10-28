import { describe, expect, it } from "vitest";
import {
  type Slice,
  type SliceHeading,
  SLICE_HEADINGS,
  type SliceRange,
  clampToRange,
  cutSolid,
  middleOfRange,
  sliceRange,
} from "./crossSections";
import { evalExact, formatExact } from "./exact";
import { fromTenths, rational, toNumber } from "./rational";
import { buildSolid } from "./solids";
import type { Dimensions, SolidKind } from "./types";

/** Where the plane first and last touches the solid, as numbers. */
function rangeOf(
  kind: SolidKind,
  d: Dimensions,
  heading: SliceHeading,
): [number, number] {
  const range = sliceRange(kind, d, heading)!;
  return [toNumber(range.low), toNumber(range.high)];
}

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
      expect(formatExact(section.area.exact!)).toBe("12");
    }
  });

  it("give a square for a cube", () => {
    const section = cut("cube", { s: 2 }, horizontal(1));
    expect(section.name).toBe("Square");
    expect(section.area.formula).toBe("A = s²");
    expect(section.area.substitution).toBe("A = 2²");
    expect(formatExact(section.area.exact!)).toBe("4");
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
    expect(rangeOf("rectangularPrism", PRISM, "level")).toEqual([0, 5]);
    expect(cutSolid("rectangularPrism", PRISM, horizontal(0))).toBeNull();
    expect(cutSolid("rectangularPrism", PRISM, horizontal(5))).toBeNull();
    expect(cutSolid("rectangularPrism", PRISM, horizontal(4.9))).not.toBeNull();
  });

  it("is pulled back inside the solid, never onto an end", () => {
    const upTo = (high: ReturnType<typeof rational>): SliceRange => ({
      low: rational(0),
      high,
    });
    const span = upTo(rational(5));
    expect(clampToRange(7, span)).toBe(4.9);
    expect(clampToRange(0, span)).toBe(0.1);
    expect(clampToRange(2.5, span)).toBe(2.5);
    expect(clampToRange(3, upTo(rational(7, 2)))).toBe(3);
    expect(clampToRange(9, upTo(rational(7, 2)))).toBe(3.4);
    expect(clampToRange(9, upTo(rational(7, 20)))).toBe(0.3);
    // A range that starts below 0, between tenths.
    const below = { low: rational(-33, 20), high: rational(23, 20) };
    expect(clampToRange(-9, below)).toBe(-1.6);
    expect(clampToRange(9, below)).toBe(1.1);
    expect(clampToRange(-1, below)).toBe(-1);
  });

  it("has nowhere to stand in a solid only a tenth thick", () => {
    expect(
      clampToRange(1, { low: rational(0), high: rational(1, 10) }),
    ).toBeNull();
  });

  it("starts half way up", () => {
    expect(middleOfRange({ low: rational(0), high: rational(5) })).toBe(2.5);
    expect(middleOfRange({ low: rational(-1), high: rational(3) })).toBe(1);
  });

  it("cannot be taken through a solid that offers no slices", () => {
    expect(
      sliceRange("logoSlab", { m: 2, r: 1, b: 1, h: 1 }, "level"),
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
      const range = sliceRange(kind, d, heading)!;
      const [low, high] = [toNumber(range.low), toNumber(range.high)];
      const direction =
        heading === "level"
          ? "horizontal"
          : heading === "frontToBack" || heading === "sideToSide"
            ? "vertical"
            : "diagonal";
      return [0.15, 0.5, 0.8].map((share) => ({
        direction,
        heading,
        position: fromTenths(clampToRange(low + (high - low) * share, range)!),
      })) as Slice[];
    });
  }

  it("has positive area equal to what its outline encloses", () => {
    for (const [kind, d] of solids) {
      for (const slice of slices(kind, d)) {
        const section = cut(kind, d, slice);
        const area = evalExact(section.area.exact!);
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
        expect(evalExact(large.area.exact!)).toBeCloseTo(
          evalExact(small.area.exact!) * 4,
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
    const section = cut("cube", { s: 2 }, sliceOf("right", 1));
    expect(section.name).toBe("Rectangle");
    expect(lengths("cube", { s: 2 }, sliceOf("right", 1))).toEqual([
      "2",
      "2",
      "2√2",
      "2√2",
    ]);
    expect(formatExact(section.area.exact!)).toBe("4√2");
    expect(section.area.substitution).toBe("A = 2 × 2√2");
  });

  it("only ever give rectangles and squares", () => {
    const headings = Object.values(SLICE_HEADINGS).flat() as SliceHeading[];
    for (const [kind, d] of [
      ["rectangularPrism", PRISM],
      ["cube", { s: 2 }],
    ] as const) {
      for (const heading of headings) {
        const [low, high] = rangeOf(kind, d, heading);
        for (
          let tenths = Math.round(low * 10) + 1;
          tenths < high * 10;
          tenths += 1
        ) {
          const section = cut(kind, d, sliceOf(heading, tenths / 10));
          expect(["Rectangle", "Square"]).toContain(section.name);
        }
      }
    }
  });

  it("measure the position from the left, from the back, or along the slide", () => {
    expect(rangeOf("rectangularPrism", PRISM, "frontToBack")).toEqual([0, 3]);
    expect(rangeOf("rectangularPrism", PRISM, "sideToSide")).toEqual([0, 4]);
    // A diagonal rises from one bottom edge until it leaves the opposite top
    // one, the length plus the height. It is measured up the middle of the
    // solid, which it first crosses half the length below the bottom face.
    expect(rangeOf("rectangularPrism", PRISM, "right")).toEqual([-1.5, 6.5]);
    expect(rangeOf("rectangularPrism", PRISM, "front")).toEqual([-2, 7]);

    const vertical = cut("rectangularPrism", PRISM, sliceOf("frontToBack", 1));
    expect(
      lengths("rectangularPrism", PRISM, sliceOf("frontToBack", 1)),
    ).toEqual(["4", "4", "5", "5"]);
    // Measured in from the left, which the mesh puts at x = -1.5.
    for (const [x] of vertical.outline3d) expect(x).toBeCloseTo(-0.5);
  });

  it("draw the position as a line as long as it, through the middle of the solid", () => {
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
    // Level, it runs up the middle from the bottom face.
    const level = cut("cube", { s: 2 }, sliceOf("level", 1.5)).travel;
    expect(level.from3d.map((v) => v + 0)).toEqual([0, -1, 0]);
    expect(level.to3d[1]).toBeCloseTo(0.5);
  });

  it("measure a diagonal's height up the middle, where its arrow is", () => {
    for (const heading of ["right", "back", "left", "front"] as const) {
      const section = cut("cube", { s: 2 }, sliceOf(heading, 0.5));
      expect(section.slide).toEqual([0, 1, 0]);
      const { from3d, to3d } = section.travel;
      for (const [x, , z] of [from3d, to3d]) {
        expect(x).toBeCloseTo(0);
        expect(z).toBeCloseTo(0);
      }
      // From the bottom face, which the mesh puts at y = -1, up to the plane.
      expect(from3d[1]).toBeCloseTo(-1);
      expect(to3d[1]).toBeCloseTo(-0.5);
      const { origin, across, up } = section.plane;
      const normal = [
        across[1] * up[2] - across[2] * up[1],
        across[2] * up[0] - across[0] * up[2],
        across[0] * up[1] - across[1] * up[0],
      ];
      expect(
        normal.reduce((sum, n, i) => sum + n * (to3d[i] - origin[i]), 0),
      ).toBeCloseTo(0);
    }
    // Rising toward the right, it first touches the bottom right edge when it
    // crosses the middle a half side below the bottom face, so it crosses the
    // right face a half side higher than the middle.
    const right = cut("cube", { s: 2 }, sliceOf("right", 0.5));
    expect(
      right.outline3d.some(
        ([px, py]) => px > 0.999 && py > 0.499 && py < 0.501,
      ),
    ).toBe(true);
    expect(rangeOf("cube", { s: 2 }, "right")).toEqual([-1, 3]);
    // Below 0 it crosses the middle under the bottom face, and still cuts the
    // solid.
    const under = cut("cube", { s: 2 }, sliceOf("right", -0.5));
    expect(under.travel.to3d[1]).toBeCloseTo(-1.5);
    // A cone's starts at the foot of the rim, a radius out from the middle.
    expect(rangeOf("cone", { r: 3, h: 4 }, "right")).toEqual([-3, 4]);
    const cone = cut("cone", { r: 3, h: 4 }, sliceOf("right", 2)).travel;
    expect(cone.from3d[1]).toBeCloseTo(-2);
    expect(cone.to3d[1]).toBeCloseTo(0);
  });

  it("mark a right angle for a vertical slice, 45° for a diagonal, and none level", () => {
    expect(cut("cube", { s: 2 }, sliceOf("level", 1)).angle).toBeNull();
    expect(cut("cube", { s: 2 }, sliceOf("sideToSide", 1)).angle?.degrees).toBe(
      90,
    );
    const diagonal = cut("cube", { s: 2 }, sliceOf("left", 1)).angle!;
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

describe("the working for a cross section's area", () => {
  it("names the sides its formula uses", () => {
    const section = cut("rectangularPrism", PRISM, sliceOf("right", 1));
    expect(section.area.formula).toBe("A = lw");
    const length = (id: string) =>
      formatExact(section.edges.find((edge) => edge.id === id)!.length);
    expect(length(section.symbols.l)).toBe("4");
    expect(length(section.symbols.w)).toBe("2.5√2");
  });

  it("draws a height that is not a side as a line of its own, square to the base", () => {
    for (const position of [1, 3]) {
      const section = cut(
        "squarePyramid",
        { b: 6, h: 4 },
        sliceOf("frontToBack", position),
      );
      const [height] = section.lines;
      expect(height.symbol).toBe("h");
      const flat = Math.hypot(
        height.to2d[0] - height.from2d[0],
        height.to2d[1] - height.from2d[1],
      );
      const solid = Math.hypot(
        height.to3d[0] - height.from3d[0],
        height.to3d[1] - height.from3d[1],
        height.to3d[2] - height.from3d[2],
      );
      expect(evalExact(height.length)).toBeCloseTo(flat, 9);
      expect(evalExact(height.length)).toBeCloseTo(solid, 9);

      const base = section.edges.find(
        (edge) => edge.id === (section.symbols.b ?? section.symbols["b₁"]),
      )!;
      const along = [
        base.to2d[0] - base.from2d[0],
        base.to2d[1] - base.from2d[1],
      ];
      const up = [
        height.to2d[0] - height.from2d[0],
        height.to2d[1] - height.from2d[1],
      ];
      expect(along[0] * up[0] + along[1] * up[1]).toBeCloseTo(0, 9);
    }
  });
});

describe("slices of a square pyramid", () => {
  const PYRAMID = { b: 6, h: 4 };

  it("give a square half as wide half way up", () => {
    const section = cut("squarePyramid", PYRAMID, horizontal(2));
    expect(section.name).toBe("Square");
    expect(formatExact(section.area.exact!)).toBe("9");
  });

  it("shrink by b(1 − y/h) as they rise", () => {
    for (const height of [0.5, 1, 2.5, 3.9]) {
      const section = cut("squarePyramid", PYRAMID, horizontal(height));
      const side = 6 * (1 - height / 4);
      for (const edge of section.edges)
        expect(evalExact(edge.length)).toBeCloseTo(side, 9);
    }
  });

  it("give an isosceles triangle through the tip, and a trapezoid off it", () => {
    const tip = cut("squarePyramid", PYRAMID, sliceOf("frontToBack", 3));
    expect(tip.name).toBe("Isosceles triangle");
    expect(
      lengths("squarePyramid", PYRAMID, sliceOf("frontToBack", 3)),
    ).toEqual(["5", "5", "6"]);
    expect(formatExact(tip.area.exact!)).toBe("12");
    expect(tip.area.substitution).toBe("A = 6 × 4 / 2");

    const off = cut("squarePyramid", PYRAMID, sliceOf("frontToBack", 1));
    expect(off.name).toBe("Trapezoid");
    expect(
      lengths("squarePyramid", PYRAMID, sliceOf("frontToBack", 1)),
    ).toEqual(["4", "5/3", "5/3", "6"]);
    expect(formatExact(off.area.exact!)).toBe("20/3");
    expect(off.area.formula).toBe("A = (b₁ + b₂)h / 2");
    expect(formatExact(off.lines[0].length)).toBe("4/3");
  });

  it("give a trapezoid on every diagonal", () => {
    for (const heading of ["right", "back", "left", "front"] as const) {
      const [low, high] = rangeOf("squarePyramid", PYRAMID, heading);
      for (
        let tenths = Math.round(low * 10) + 1;
        tenths < high * 10;
        tenths += 7
      ) {
        expect(
          cut("squarePyramid", PYRAMID, sliceOf(heading, tenths / 10)).name,
        ).toBe("Trapezoid");
      }
    }
  });

  it("never call a triangle equilateral unless it exactly is", () => {
    // h = 5.2 is as near as tenths get to b√3/2 for b = 6, and it is not there.
    const near = cut(
      "squarePyramid",
      { b: 6, h: 5.2 },
      sliceOf("sideToSide", 3),
    );
    expect(near.name).toBe("Isosceles triangle");
  });
});

describe("slices of a right-triangular prism", () => {
  const PRISM3 = { a: 3, b: 4, p: 5 };

  it("stand it on its leg-a rectangle, so a horizontal slice is a rectangle", () => {
    const section = cut("triangularPrism", PRISM3, horizontal(2));
    expect(section.name).toBe("Rectangle");
    expect(lengths("triangularPrism", PRISM3, horizontal(2))).toEqual([
      "1.5",
      "1.5",
      "5",
      "5",
    ]);
    expect(formatExact(section.area.exact!)).toBe("7.5");
  });

  it("give the right triangle a, b, c across its length", () => {
    for (const position of [0.5, 2.5, 4.5]) {
      const section = cut(
        "triangularPrism",
        PRISM3,
        sliceOf("sideToSide", position),
      );
      expect(section.name).toBe("Right triangle");
      expect(
        lengths("triangularPrism", PRISM3, sliceOf("sideToSide", position)),
      ).toEqual(["3", "4", "5"]);
      expect(formatExact(section.area.exact!)).toBe("6");
    }
  });

  it("give a rectangle along its length", () => {
    expect(cut("triangularPrism", PRISM3, sliceOf("frontToBack", 1)).name).toBe(
      "Rectangle",
    );
  });

  it("name a right triangle with equal legs as both", () => {
    const section = cut(
      "triangularPrism",
      { a: 4, b: 4, p: 5 },
      sliceOf("sideToSide", 2),
    );
    expect(section.name).toBe("Right isosceles triangle");
  });

  it("lean into a rectangle one way and a trapezoid or triangle the other", () => {
    expect(cut("triangularPrism", PRISM3, sliceOf("right", 2)).name).toBe(
      "Rectangle",
    );
    expect(cut("triangularPrism", PRISM3, sliceOf("front", -0.5)).name).toBe(
      "Trapezoid",
    );
    expect(cut("triangularPrism", PRISM3, sliceOf("front", 3.5)).name).toBe(
      "Right triangle",
    );
  });
});

describe("slices of a cylinder", () => {
  it("give a circle equal to the bottom face at every height", () => {
    for (const height of [0.1, 1.5, 2.9]) {
      const section = cut("cylinder", { r: 2, h: 3 }, horizontal(height));
      expect(section.name).toBe("Circle");
      expect(formatExact(section.area.exact!)).toBe("4π");
      expect(section.lines.map((line) => formatExact(line.length))).toEqual([
        "2",
      ]);
    }
  });

  it("give a rectangle 2√(r² − d²) wide standing up", () => {
    const middle = cut("cylinder", { r: 2, h: 3 }, sliceOf("frontToBack", 2));
    expect(middle.name).toBe("Rectangle");
    expect(
      lengths("cylinder", { r: 2, h: 3 }, sliceOf("frontToBack", 2)),
    ).toEqual(["3", "3", "4", "4"]);
    expect(formatExact(middle.area.exact!)).toBe("12");
    // 1 in from the side, 1 from the axis: 2√(4 − 1) = 2√3 wide.
    expect(
      lengths("cylinder", { r: 2, h: 3 }, sliceOf("sideToSide", 1)),
    ).toEqual(["2√3", "2√3", "3", "3"]);
    // Through the axis of a cylinder as tall as it is wide: a square.
    expect(
      cut("cylinder", { r: 2, h: 4 }, sliceOf("frontToBack", 2)).name,
    ).toBe("Square");
  });

  it("give an ellipse with axes 2r and 2√2·r while the cut misses both disks", () => {
    const section = cut("cylinder", { r: 1, h: 4 }, sliceOf("right", 2));
    expect(section.name).toBe("Ellipse");
    expect(formatExact(section.area.exact!)).toBe("√2π");
    expect(section.area.formula).toBe("A = πab");
    expect(section.lines.map((line) => formatExact(line.length))).toEqual([
      "1",
      "√2",
    ]);
  });

  it("give part of an ellipse, with a rounded area only, once it cuts a disk", () => {
    const section = cut("cylinder", { r: 2, h: 3 }, sliceOf("right", 1.5));
    expect(section.name).toBe("Part of an ellipse");
    expect(section.area.exact).toBeNull();
    expect(section.area.formula).toBeNull();
    // Cut off by both disks, 3/4 of the way out from the middle each way.
    expect(lengths("cylinder", { r: 2, h: 3 }, sliceOf("right", 1.5))).toEqual([
      "√7",
      "√7",
    ]);
    expect(section.area.approximate).toBeCloseTo(
      enclosed(section.outline2d),
      2,
    );
  });

  it("give the same cross section on every diagonal", () => {
    const areas = (["right", "back", "left", "front"] as const).map(
      (heading) =>
        cut("cylinder", { r: 2, h: 3 }, sliceOf(heading, 0.5)).area.approximate,
    );
    for (const area of areas) expect(area).toBeCloseTo(areas[0], 9);
  });

  it("has an area close to what its drawn outline encloses", () => {
    for (const heading of ["level", "frontToBack", "right", "front"] as const) {
      const [low, high] = rangeOf("cylinder", { r: 2, h: 3 }, heading);
      for (
        let tenths = Math.round(low * 10) + 1;
        tenths < high * 10;
        tenths += 3
      ) {
        const section = cut(
          "cylinder",
          { r: 2, h: 3 },
          sliceOf(heading, tenths / 10),
        );
        expect(section.area.approximate).toBeGreaterThan(0);
        expect(
          section.area.approximate / enclosed(section.outline2d),
        ).toBeCloseTo(1, 1);
      }
    }
  });
});

describe("slices of a sphere", () => {
  it("are always circles, of radius √(r² − d²)", () => {
    const section = cut("sphere", { r: 3 }, horizontal(1));
    expect(section.name).toBe("Circle");
    expect(formatExact(section.lines[0].length)).toBe("√5");
    expect(formatExact(section.area.exact!)).toBe("5π");
    expect(section.area.substitution).toBe("A = π × (√5)²");
    // Through the middle: a great circle, as wide as the sphere.
    expect(
      formatExact(cut("sphere", { r: 3 }, horizontal(3)).area.exact!),
    ).toBe("9π");
  });

  it("run from its lowest point to its highest, whatever way the slice faced", () => {
    expect(rangeOf("sphere", { r: 3 }, "right")).toEqual([0, 6]);
    expect(cut("sphere", { r: 3 }, sliceOf("right", 1)).name).toBe("Circle");
    expect(cutSolid("sphere", { r: 3 }, horizontal(6))).toBeNull();
  });
});

describe("slices of a cone", () => {
  const CONE = { r: 3, h: 4 };

  it("give circles of radius r(1 − y/h) as they rise", () => {
    const section = cut("cone", CONE, horizontal(2));
    expect(section.name).toBe("Circle");
    expect(formatExact(section.lines[0].length)).toBe("1.5");
    expect(formatExact(section.area.exact!)).toBe("2.25π");
  });

  it("give an isosceles triangle through the tip, and a hyperbola region off it", () => {
    const tip = cut("cone", CONE, sliceOf("frontToBack", 3));
    expect(tip.name).toBe("Isosceles triangle");
    expect(lengths("cone", CONE, sliceOf("frontToBack", 3))).toEqual([
      "5",
      "5",
      "6",
    ]);
    expect(formatExact(tip.area.exact!)).toBe("12");

    const off = cut("cone", CONE, sliceOf("sideToSide", 1));
    expect(off.name).toBe("Hyperbola region");
    expect(off.area.exact).toBeNull();
    expect(lengths("cone", CONE, sliceOf("sideToSide", 1))).toEqual(["2√5"]);
    expect(formatExact(off.lines[0].length)).toBe("4/3");
  });

  it("name the triangle through the tip right isosceles when the cone is as tall as its radius", () => {
    const tip = cut("cone", { r: 2, h: 2 }, sliceOf("frontToBack", 2));
    expect(tip.name).toBe("Right isosceles triangle");
    expect(lengths("cone", { r: 2, h: 2 }, sliceOf("frontToBack", 2))).toEqual(
      ["2√2", "2√2", "4"],
    );
    expect(formatExact(tip.area.exact!)).toBe("4");
  });

  it("give an ellipse on a diagonal when the cone is steeper than 45°", () => {
    const section = cut("cone", CONE, sliceOf("right", 3));
    expect(section.name).toBe("Ellipse");
    expect(section.lines.map((line) => formatExact(line.length))).toEqual([
      "3√7/7",
      "12√2/7",
    ]);
    expect(formatExact(section.area.exact!)).toBe("36√14π/49");
    // Lower down, the cut runs into the base.
    const part = cut("cone", CONE, sliceOf("right", 1));
    expect(part.name).toBe("Part of an ellipse");
    expect(part.area.exact).toBeNull();
    expect(lengths("cone", CONE, sliceOf("right", 1))).toEqual(["4√2"]);
  });

  it("give a parabola region, worked out exactly, when the cone is at 45°", () => {
    const section = cut("cone", { r: 2, h: 2 }, sliceOf("right", 0));
    expect(section.name).toBe("Parabola region");
    expect(section.area.formula).toBe("A = 2wh / 3");
    expect(section.area.substitution).toBe("A = 2 × 4 × √2 / 3");
    expect(formatExact(section.area.exact!)).toBe("8√2/3");
  });

  it("give a hyperbola region when the cone is flatter, and a triangle through its tip", () => {
    const section = cut("cone", { r: 4, h: 2 }, sliceOf("right", 1));
    expect(section.name).toBe("Hyperbola region");
    expect(section.area.exact).toBeNull();

    const tip = cut("cone", { r: 4, h: 2 }, sliceOf("right", 2));
    expect(tip.name).toBe("Isosceles triangle");
    expect(lengths("cone", { r: 4, h: 2 }, sliceOf("right", 2))).toEqual([
      "2√5",
      "2√5",
      "4√3",
    ]);
    expect(formatExact(tip.area.exact!)).toBe("4√6");
  });

  it("give the same cross section on every diagonal", () => {
    for (const d of [CONE, { r: 2, h: 2 }, { r: 4, h: 2 }]) {
      const areas = (["right", "back", "left", "front"] as const).map(
        (heading) => cut("cone", d, sliceOf(heading, 0.5)).area.approximate,
      );
      for (const area of areas) expect(area).toBeCloseTo(areas[0], 9);
    }
  });

  it("has an area close to what its drawn outline encloses", () => {
    for (const d of [CONE, { r: 2, h: 2 }, { r: 4, h: 2 }]) {
      for (const heading of [
        "level",
        "frontToBack",
        "right",
        "back",
      ] as const) {
        const [low, high] = rangeOf("cone", d, heading);
        for (
          let tenths = Math.round(low * 10) + 1;
          tenths < high * 10;
          tenths += 3
        ) {
          const section = cut("cone", d, sliceOf(heading, tenths / 10));
          expect(section.area.approximate).toBeGreaterThan(0);
          expect(
            section.area.approximate / enclosed(section.outline2d),
          ).toBeCloseTo(1, 1);
        }
      }
    }
  });

  it("never call a rounded area exact", () => {
    for (const d of [CONE, { r: 2, h: 2 }, { r: 4, h: 2 }]) {
      for (const heading of ["frontToBack", "right"] as const) {
        const [low, high] = rangeOf("cone", d, heading);
        for (
          let tenths = Math.round(low * 10) + 1;
          tenths < high * 10;
          tenths += 1
        ) {
          const section = cut("cone", d, sliceOf(heading, tenths / 10));
          const rounded = ["partOfEllipse", "hyperbolaRegion"].includes(
            section.shape,
          );
          expect(section.area.exact === null).toBe(rounded);
          expect(section.area.formula === null).toBe(rounded);
        }
      }
    }
  });
});
