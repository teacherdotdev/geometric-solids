/**
 * A rectangular prism built from unit cubes.
 *
 * The solid is shown as exactly as many unit cubes as its volume, and every one
 * of them is always in one of two places: stacked in the solid, or lying in the
 * flat arrangement beside it, where the solid's layers are laid end to end
 * along its length. Filling the solid moves cubes from the one to the other; no
 * cube is ever created or removed, so the count on screen never stops being the
 * volume.
 *
 * Scene coordinates match the solid's mesh: length along x, height along y and
 * width along z. The whole scene — solid, gap and flat arrangement — is centred
 * on the origin, with the floor at y = −h/2.
 */
import type { Vec3 } from "./geometry3d";
import type { Dimensions, SolidKind } from "./types";

/**
 * The longest edge the cube view takes. The flat arrangement is h layers of
 * length l laid end to end, so the scene is l + 1 + l·h long: past ten, its
 * cubes come out too small on a projector to count.
 */
export const CUBE_EDGE_MAX = 10;

/** Empty floor between the solid and its flat arrangement, in units. */
export const CUBE_GAP = 1;

export const CUBE_EDGE_MESSAGE = `Unit cubes need a whole number from 1 to ${CUBE_EDGE_MAX}`;

/** How many unit cubes run along each edge. */
export interface CubeBox {
  readonly l: number;
  readonly w: number;
  readonly h: number;
}

/** The solid's edges as cube counts, or null for a solid cubes cannot fill. */
export function cubeBox(kind: SolidKind, d: Dimensions): CubeBox | null {
  switch (kind) {
    case "rectangularPrism":
      return { l: d.l, w: d.w, h: d.h };
    case "cube":
      return { l: d.s, w: d.s, h: d.s };
    default:
      return null;
  }
}

export function cubeCount(box: CubeBox): number {
  return box.l * box.w * box.h;
}

/** Cubes in one layer: the base, counted in squares. */
export function layerSize(box: CubeBox): number {
  return box.l * box.w;
}

/** Whether an edge can be shown in unit cubes as it stands. */
export function isCubeEdge(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= CUBE_EDGE_MAX;
}

/**
 * The edge to use on switching to unit cubes: the nearest whole number, halves
 * rounding up, never below one cube or above {@link CUBE_EDGE_MAX}.
 */
export function toCubeEdge(value: number): number {
  return Math.min(CUBE_EDGE_MAX, Math.max(1, Math.round(value)));
}

/** Where cube `index` belongs, in the order cubes are stacked. */
export interface CubeCell {
  /** Position along its row, along the length. */
  readonly col: number;
  /** Which row of its layer, across the width. */
  readonly row: number;
  /** Which layer, counted up from the floor. */
  readonly layer: number;
}

/**
 * Cubes are stacked along a row, then row by row across a layer, then layer by
 * layer upward: the order that turns counting cubes into V = B × h.
 */
export function cubeCell(index: number, box: CubeBox): CubeCell {
  return {
    col: index % box.l,
    row: Math.floor(index / box.l) % box.w,
    layer: Math.floor(index / layerSize(box)),
  };
}

/** The whole scene's length: the solid, the gap and the flat arrangement. */
export function sceneLength(box: CubeBox): number {
  return box.l + CUBE_GAP + box.l * box.h;
}

/** The far-left end of the solid, where the scene starts. */
export function solidStart(box: CubeBox): number {
  return -sceneLength(box) / 2;
}

/** Where the flat arrangement starts along the length. */
export function flatStart(box: CubeBox): number {
  return solidStart(box) + box.l + CUBE_GAP;
}

/** Centre of cube `index` when it is stacked in the solid. */
export function stackedCentre(index: number, box: CubeBox): Vec3 {
  const { col, row, layer } = cubeCell(index, box);
  return [
    solidStart(box) + col + 0.5,
    -box.h / 2 + layer + 0.5,
    -box.w / 2 + row + 0.5,
  ];
}

/**
 * Centre of cube `index` when it lies flat. Each layer keeps its own rows and
 * columns and is laid down whole, after the layers below it, so a cube has the
 * same place in its layer in both arrangements.
 */
export function flatCentre(index: number, box: CubeBox): Vec3 {
  const { col, row, layer } = cubeCell(index, box);
  return [
    flatStart(box) + layer * box.l + col + 0.5,
    -box.h / 2 + 0.5,
    -box.w / 2 + row + 0.5,
  ];
}

/** How high a moving cube lifts over the ones it passes, in units. */
const ARC = 1.5;

/**
 * Where a cube is partway between lying flat (0) and stacked (1). It eases out
 * and in, and lifts as it goes, so it clears the cubes it passes over.
 */
export function cubeCentreAt(
  index: number,
  box: CubeBox,
  progress: number,
): Vec3 {
  const from = flatCentre(index, box);
  const to = stackedCentre(index, box);
  // At rest a cube is exactly in its cell, not a rounding error above it.
  if (progress <= 0) return from;
  if (progress >= 1) return to;
  const t = progress;
  const eased = t * t * (3 - 2 * t);
  const lift = ARC * Math.sin(Math.PI * eased);
  return [
    from[0] + (to[0] - from[0]) * eased,
    from[1] + (to[1] - from[1]) * eased + lift,
    from[2] + (to[2] - from[2]) * eased,
  ];
}

/**
 * The play buttons' pace, in cubes per second, whatever the size of the solid:
 * slow enough to count aloud.
 */
export const CUBES_PER_SECOND = 4;

/**
 * Which way cubes are moving on their own, if they are: into the solid, or out
 * of it into the flat arrangement.
 */
export type CubeRun = "stack" | "flatten";

/**
 * The fill after `steps` steps of a run: one cube a step, unless `byLayer` asks
 * for whole layers. A step by layer finishes the layer under way first, so a
 * part-filled layer is completed or emptied rather than skipped.
 */
export function advanceFill(
  fill: number,
  box: CubeBox,
  run: CubeRun,
  steps = 1,
  byLayer = false,
): number {
  const total = cubeCount(box);
  const size = byLayer ? layerSize(box) : 1;
  if (run === "flatten") {
    const below = (Math.ceil(fill / size) - steps) * size;
    return Math.max(0, below);
  }
  const above = (Math.floor(fill / size) + steps) * size;
  return Math.min(total, above);
}
