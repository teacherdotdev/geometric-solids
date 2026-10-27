import { describe, expect, it } from "vitest";
import {
  CUBE_EDGE_MAX,
  advanceFill,
  cubeBox,
  cubeCell,
  cubeCentreAt,
  cubeCount,
  flatCentre,
  isCubeEdge,
  sceneLength,
  stackedCentre,
  toCubeEdge,
  type CubeBox,
} from "./unitCubes";

const PRISM: CubeBox = { l: 3, w: 4, h: 5 };

function cellsOf(centres: readonly (readonly number[])[]): Set<string> {
  return new Set(centres.map((centre) => centre.join(",")));
}

describe("unit cubes", () => {
  it("are offered only for the rectangular prism and the cube", () => {
    expect(cubeBox("rectangularPrism", { l: 3, w: 4, h: 5 })).toEqual(PRISM);
    expect(cubeBox("cube", { s: 2 })).toEqual({ l: 2, w: 2, h: 2 });
    expect(cubeBox("cylinder", { r: 2, h: 3 })).toBeNull();
    expect(cubeBox("triangularPrism", { a: 3, b: 4, p: 5 })).toBeNull();
  });

  it("number exactly the volume", () => {
    expect(cubeCount(PRISM)).toBe(60);
    expect(cubeCount({ l: 2, w: 2, h: 2 })).toBe(8);
  });

  it("round edges to whole numbers from 1 to the cap, halves up", () => {
    expect(toCubeEdge(3.5)).toBe(4);
    expect(toCubeEdge(3.4)).toBe(3);
    expect(toCubeEdge(0.4)).toBe(1);
    expect(toCubeEdge(40)).toBe(CUBE_EDGE_MAX);
    expect(isCubeEdge(4)).toBe(true);
    expect(isCubeEdge(2.5)).toBe(false);
    expect(isCubeEdge(0)).toBe(false);
    expect(isCubeEdge(CUBE_EDGE_MAX + 1)).toBe(false);
  });

  it("stack along a row, then across the layer, then upward", () => {
    expect(cubeCell(0, PRISM)).toEqual({ col: 0, row: 0, layer: 0 });
    expect(cubeCell(2, PRISM)).toEqual({ col: 2, row: 0, layer: 0 });
    expect(cubeCell(3, PRISM)).toEqual({ col: 0, row: 1, layer: 0 });
    expect(cubeCell(11, PRISM)).toEqual({ col: 2, row: 3, layer: 0 });
    expect(cubeCell(12, PRISM)).toEqual({ col: 0, row: 0, layer: 1 });
  });

  it("fill the solid exactly, one cube to a cell", () => {
    const centres = Array.from({ length: 60 }, (_, index) =>
      stackedCentre(index, PRISM),
    );
    expect(cellsOf(centres).size).toBe(60);
    const solidStart = -sceneLength(PRISM) / 2;
    for (const [x, y, z] of centres) {
      expect(x).toBeGreaterThan(solidStart);
      expect(x).toBeLessThan(solidStart + PRISM.l);
      expect(Math.abs(y)).toBeLessThan(PRISM.h / 2);
      expect(Math.abs(z)).toBeLessThan(PRISM.w / 2);
    }
  });

  it("lie flat as one layer, h times as long as the base, beside the solid", () => {
    const centres = Array.from({ length: 60 }, (_, index) =>
      flatCentre(index, PRISM),
    );
    expect(cellsOf(centres).size).toBe(60);
    const xs = centres.map(([x]) => x);
    // Fifteen long (h × l) and four wide, all on the floor.
    expect(Math.max(...xs) - Math.min(...xs) + 1).toBe(15);
    expect(new Set(centres.map(([, , z]) => z)).size).toBe(4);
    expect(new Set(centres.map(([, y]) => y))).toEqual(
      new Set([-PRISM.h / 2 + 0.5]),
    );
    // Clear of the solid, with a one-unit gap, and ending at the scene's end.
    const solidEnd = -sceneLength(PRISM) / 2 + PRISM.l;
    expect(Math.min(...xs) - 0.5).toBe(solidEnd + 1);
    expect(Math.max(...xs) + 0.5).toBe(sceneLength(PRISM) / 2);
  });

  it("keep their place in their layer when laid flat", () => {
    for (const index of [0, 5, 13, 59]) {
      const stacked = stackedCentre(index, PRISM);
      const flat = flatCentre(index, PRISM);
      expect(flat[2]).toBe(stacked[2]);
    }
    // The second layer starts one base-length further along than the first.
    expect(flatCentre(12, PRISM)[0] - flatCentre(0, PRISM)[0]).toBe(PRISM.l);
  });

  it("travel from flat to stacked, lifting on the way", () => {
    expect(cubeCentreAt(7, PRISM, 0)).toEqual(flatCentre(7, PRISM));
    expect(cubeCentreAt(7, PRISM, 1)).toEqual(stackedCentre(7, PRISM));
    const middle = cubeCentreAt(7, PRISM, 0.5);
    expect(middle[1]).toBeGreaterThan(
      Math.max(flatCentre(7, PRISM)[1], stackedCentre(7, PRISM)[1]),
    );
  });

  it("advance one cube at a time either way", () => {
    expect(advanceFill(0, PRISM, "stack")).toBe(1);
    expect(advanceFill(10, PRISM, "stack", 3)).toBe(13);
    expect(advanceFill(59, PRISM, "stack", 5)).toBe(60);
    expect(advanceFill(60, PRISM, "flatten")).toBe(59);
    expect(advanceFill(2, PRISM, "flatten", 5)).toBe(0);
  });

  it("advance by whole layers either way when asked to", () => {
    expect(advanceFill(0, PRISM, "stack", 1, true)).toBe(12);
    // A part-filled layer is finished first, not skipped.
    expect(advanceFill(14, PRISM, "stack", 1, true)).toBe(24);
    expect(advanceFill(55, PRISM, "stack", 1, true)).toBe(60);
    expect(advanceFill(60, PRISM, "flatten", 1, true)).toBe(48);
    expect(advanceFill(14, PRISM, "flatten", 1, true)).toBe(12);
    expect(advanceFill(5, PRISM, "flatten", 3, true)).toBe(0);
  });
});
