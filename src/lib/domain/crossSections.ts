/**
 * Cross sections: the flat region a cutting plane leaves inside a solid.
 *
 * A slice is horizontal, vertical or at 45° to the bottom face, so every
 * plane here is n · X = c for a small whole-number normal n. Against a solid
 * whose corners sit at decimal coordinates, that makes every corner of a
 * polygonal cross section rational, every side length the square root of a
 * rational, and every area a rational times at most √2 — all of which the exact
 * type already holds. Nothing here is measured off the drawn mesh.
 *
 * Coordinates are the solid's own: the bottom face on y = 0, length along x,
 * height along y and width along z, with the front of the solid at the largest
 * z. {@link CrossSection} converts what it returns into the mesh's frame, which
 * is centred on the solid, so it can be drawn over the solid as it is.
 */
import {
  type Exact,
  addExact,
  divideExact,
  evalExact,
  exactRational,
  exactSqrt,
  formatExact,
  mulExact,
  scaleExact,
} from "./exact";
import type { Vec3 } from "./geometry3d";
import {
  type Rational,
  ZERO,
  add,
  div,
  equals,
  fromTenths,
  isZero,
  mul,
  rational,
  toNumber,
} from "./rational";
import type { Dimensions, SolidKind } from "./types";

export type SliceDirection = "horizontal" | "vertical" | "diagonal";

export const SLICE_DIRECTIONS: readonly SliceDirection[] = [
  "horizontal",
  "vertical",
  "diagonal",
];

/**
 * Which way a slice faces. A vertical slice runs front to back or side to
 * side; a diagonal leans toward one of the four sides, rising toward it. The
 * lists are in the order the turn button steps through them, a quarter turn at
 * a time.
 */
export type SliceHeading =
  "level" | "frontToBack" | "sideToSide" | "right" | "back" | "left" | "front";

export const SLICE_HEADINGS: Record<SliceDirection, readonly SliceHeading[]> = {
  horizontal: ["level"],
  vertical: ["frontToBack", "sideToSide"],
  diagonal: ["right", "back", "left", "front"],
};

export interface Slice {
  readonly direction: SliceDirection;
  readonly heading: SliceHeading;
  /**
   * How far the plane has moved along its one axis from where it first
   * touches the solid: height above the bottom face, distance in from the left
   * or the back, or, for a diagonal, how far it has slid along the line it
   * leans along.
   */
  readonly position: Rational;
}

/** The names a cross section can have, most specific first within a family. */
export type SectionShape =
  | "square"
  | "rectangle"
  | "rhombus"
  | "parallelogram"
  | "trapezoid"
  | "quadrilateral"
  | "equilateralTriangle"
  | "rightIsoscelesTriangle"
  | "isoscelesTriangle"
  | "rightTriangle"
  | "triangle"
  | "pentagon"
  | "hexagon";

/** English names, translated for display like every other domain string. */
export const SECTION_NAMES: Record<SectionShape, string> = {
  square: "Square",
  rectangle: "Rectangle",
  rhombus: "Rhombus",
  parallelogram: "Parallelogram",
  trapezoid: "Trapezoid",
  quadrilateral: "Quadrilateral",
  equilateralTriangle: "Equilateral triangle",
  rightIsoscelesTriangle: "Right isosceles triangle",
  isoscelesTriangle: "Isosceles triangle",
  rightTriangle: "Right triangle",
  triangle: "Triangle",
  pentagon: "Pentagon",
  hexagon: "Hexagon",
};

export type Point2 = readonly [number, number];

/** One side of a cross section, drawn both face-on and on the solid. */
export interface SectionEdge {
  readonly id: string;
  readonly length: Exact;
  /** Ends in the face-on drawing's frame, y pointing up. */
  readonly from2d: Point2;
  readonly to2d: Point2;
  /** The same ends on the solid, in the mesh's frame. */
  readonly from3d: Vec3;
  readonly to3d: Vec3;
}

/**
 * A length an area formula needs that is not a side: the height of a triangle
 * or trapezoid, drawn in only while the working is shown.
 */
export interface SectionLine {
  readonly id: string;
  readonly symbol: string;
  readonly length: Exact;
  readonly from2d: Point2;
  readonly to2d: Point2;
  readonly from3d: Vec3;
  readonly to3d: Vec3;
}

export interface SectionArea {
  /** The general formula, or null for a shape with none at this level. */
  readonly formula: string | null;
  readonly substitution: string | null;
  readonly exact: Exact;
}

export interface CrossSection {
  readonly shape: SectionShape;
  readonly name: string;
  readonly edges: readonly SectionEdge[];
  /** Which edge each symbol in the area formula names, such as b → "e2". */
  readonly symbols: Readonly<Record<string, string>>;
  readonly lines: readonly SectionLine[];
  readonly area: SectionArea;
  /** The outline, in order, face-on. */
  readonly outline2d: readonly Point2[];
  /** The same outline on the solid, in the mesh's frame. */
  readonly outline3d: readonly Vec3[];
  /**
   * The cutting plane on the solid: a point on it, and the two unit directions
   * the face-on drawing uses as its x and y axes.
   */
  readonly plane: {
    readonly origin: Vec3;
    readonly across: Vec3;
    readonly up: Vec3;
  };
}

type RVec3 = readonly [Rational, Rational, Rational];
type IVec3 = readonly [number, number, number];

/** A convex polyhedron in the solid's own frame. */
interface Polyhedron {
  readonly vertices: readonly RVec3[];
  readonly edges: readonly (readonly [number, number])[];
  /** Where the mesh's centre sits in this frame. */
  readonly centre: RVec3;
}

interface PlaneFrame {
  /** The normal. Its component along the slide axis is 1. */
  readonly normal: IVec3;
  /** The drawing's x axis: a unit vector lying in the plane. */
  readonly across: IVec3;
  /** The drawing's y axis: a whole-number vector in the plane, length 1 or √2. */
  readonly up: IVec3;
}

const FRAMES: Record<SliceHeading, PlaneFrame> = {
  // Seen from above, with the back of the solid at the top of the drawing.
  level: { normal: [0, 1, 0], across: [1, 0, 0], up: [0, 0, -1] },
  // Seen from the left side.
  frontToBack: { normal: [1, 0, 0], across: [0, 0, 1], up: [0, 1, 0] },
  // Seen from the front.
  sideToSide: { normal: [0, 0, 1], across: [1, 0, 0], up: [0, 1, 0] },
  // Each diagonal is seen square-on from above it, uphill at the top.
  right: { normal: [1, -1, 0], across: [0, 0, 1], up: [1, 1, 0] },
  left: { normal: [1, 1, 0], across: [0, 0, -1], up: [-1, 1, 0] },
  front: { normal: [0, -1, 1], across: [-1, 0, 0], up: [0, 1, 1] },
  back: { normal: [0, 1, 1], across: [1, 0, 0], up: [0, 1, -1] },
};

const HALF = rational(1n, 2n);
const THIRD = rational(1n, 3n);

function r(d: Dimensions, key: string): Rational {
  return fromTenths(d[key]);
}

function box(l: Rational, h: Rational, w: Rational): Polyhedron {
  const vertices: RVec3[] = [];
  for (const x of [ZERO, l])
    for (const y of [ZERO, h])
      for (const z of [ZERO, w]) vertices.push([x, y, z]);
  // Corners differ in exactly one coordinate along an edge.
  const edges: [number, number][] = [];
  for (let i = 0; i < 8; i += 1)
    for (const bit of [1, 2, 4]) if (!(i & bit)) edges.push([i, i | bit]);
  return {
    vertices,
    edges,
    centre: [mul(l, HALF), mul(h, HALF), mul(w, HALF)],
  };
}

function triangularPrism(a: Rational, b: Rational, p: Rational): Polyhedron {
  const vertices: RVec3[] = [];
  for (const z of [ZERO, p])
    vertices.push([ZERO, ZERO, z], [a, ZERO, z], [ZERO, b, z]);
  return {
    vertices,
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
      [3, 4],
      [4, 5],
      [5, 3],
      [0, 3],
      [1, 4],
      [2, 5],
    ],
    // Matches the mesh, which puts the triangle's centroid on the axis.
    centre: [mul(a, THIRD), mul(b, THIRD), mul(p, HALF)],
  };
}

function squarePyramid(b: Rational, h: Rational): Polyhedron {
  const mid = mul(b, HALF);
  return {
    vertices: [
      [ZERO, ZERO, ZERO],
      [b, ZERO, ZERO],
      [b, ZERO, b],
      [ZERO, ZERO, b],
      [mid, h, mid],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
    ],
    centre: [mid, mul(h, HALF), mid],
  };
}

function polyhedronOf(kind: SolidKind, d: Dimensions): Polyhedron | null {
  switch (kind) {
    case "rectangularPrism":
      return box(r(d, "l"), r(d, "h"), r(d, "w"));
    case "cube":
      return box(r(d, "s"), r(d, "s"), r(d, "s"));
    case "triangularPrism":
      return triangularPrism(r(d, "a"), r(d, "b"), r(d, "p"));
    case "squarePyramid":
      return squarePyramid(r(d, "b"), r(d, "h"));
    default:
      return null;
  }
}

/** The solids a slice can be taken through. */
export function slicesSolid(kind: SolidKind): boolean {
  return kind === "rectangularPrism" || kind === "cube";
}

function dotI(n: IVec3, v: RVec3): Rational {
  return add(
    add(mul(rational(n[0]), v[0]), mul(rational(n[1]), v[1])),
    mul(rational(n[2]), v[2]),
  );
}

function compare(a: Rational, b: Rational): number {
  const difference = add(a, mul(b, rational(-1)));
  return difference.n === 0n ? 0 : difference.n < 0n ? -1 : 1;
}

function lerp(a: RVec3, b: RVec3, t: Rational): RVec3 {
  return [0, 1, 2].map((i) =>
    add(a[i], mul(t, add(b[i], mul(a[i], rational(-1))))),
  ) as unknown as RVec3;
}

/** The lowest and highest the plane's c reaches over the solid. */
function reach(solid: Polyhedron, normal: IVec3): [Rational, Rational] {
  let low = dotI(normal, solid.vertices[0]);
  let high = low;
  for (const vertex of solid.vertices) {
    const value = dotI(normal, vertex);
    if (compare(value, low) < 0) low = value;
    if (compare(value, high) > 0) high = value;
  }
  return [low, high];
}

/**
 * How far the plane can move through the solid: positions strictly between 0
 * and this. Null for a solid that cannot be sliced.
 */
export function sliceSpan(
  kind: SolidKind,
  d: Dimensions,
  heading: SliceHeading,
): Rational | null {
  const solid = polyhedronOf(kind, d);
  if (!solid) return null;
  const [low, high] = reach(solid, FRAMES[heading].normal);
  return add(high, mul(low, rational(-1)));
}

/** True when a position lies strictly inside the span. */
export function insideSpan(position: Rational, span: Rational): boolean {
  return compare(position, ZERO) > 0 && compare(position, span) < 0;
}

/**
 * The nearest position on a tenth that lies strictly inside the span, or null
 * when the span is too thin to hold one.
 */
export function clampToSpan(position: number, span: Rational): number | null {
  const tenths = toNumber(span) * 10;
  // The largest whole number of tenths strictly below the span.
  const top = Number.isInteger(Math.round(tenths * 1e6) / 1e6)
    ? Math.round(tenths) - 1
    : Math.floor(tenths);
  if (top < 1) return null;
  const wanted = Math.round(position * 10);
  return Math.min(top, Math.max(1, wanted)) / 10;
}

/** Half way through, on a tenth. */
export function middleOfSpan(span: Rational): number | null {
  return clampToSpan(toNumber(span) / 2, span);
}

interface Corner {
  readonly at: RVec3;
  /** Face-on coordinates: `a` along `across`, `b` along `up` in units of |up|². */
  readonly a: Rational;
  readonly b: Rational;
}

/** |up|², which is 1 or 2: a face-on y is `b` times √ of this. */
function upScale(frame: PlaneFrame): Rational {
  const [x, y, z] = frame.up;
  return rational(x * x + y * y + z * z);
}

function toMesh(point: RVec3, centre: RVec3): Vec3 {
  return [
    toNumber(point[0]) - toNumber(centre[0]),
    toNumber(point[1]) - toNumber(centre[1]),
    toNumber(point[2]) - toNumber(centre[2]),
  ];
}

function vectorBetween(
  p: Corner,
  q: Corner,
  scale: Rational,
): {
  da: Rational;
  db: Rational;
  scale: Rational;
} {
  return {
    da: add(q.a, mul(p.a, rational(-1))),
    db: add(q.b, mul(p.b, rational(-1))),
    scale,
  };
}

type Vector2 = ReturnType<typeof vectorBetween>;

/** Squared length of a face-on vector: da² + db²·|up|². */
function lengthSquared(v: Vector2): Rational {
  return add(mul(v.da, v.da), mul(mul(v.db, v.db), v.scale));
}

/** Dot product of two face-on vectors, which is rational. */
function dot2(u: Vector2, v: Vector2): Rational {
  return add(mul(u.da, v.da), mul(mul(u.db, v.db), u.scale));
}

/** Zero exactly when two face-on vectors are parallel. */
function cross2(u: Vector2, v: Vector2): Rational {
  return add(mul(u.da, v.db), mul(mul(u.db, v.da), rational(-1)));
}

/** Where the plane cuts the solid, corner by corner, in order around it. */
function cornersOf(
  solid: Polyhedron,
  frame: PlaneFrame,
  c: Rational,
): Corner[] {
  const found: RVec3[] = [];
  const keep = (point: RVec3) => {
    if (
      !found.some((other) => other.every((value, i) => equals(value, point[i])))
    )
      found.push(point);
  };
  const offset = (point: RVec3) =>
    add(dotI(frame.normal, point), mul(c, rational(-1)));
  for (const vertex of solid.vertices) if (isZero(offset(vertex))) keep(vertex);
  for (const [i, j] of solid.edges) {
    const fa = offset(solid.vertices[i]);
    const fb = offset(solid.vertices[j]);
    if (compare(fa, ZERO) * compare(fb, ZERO) < 0)
      keep(
        lerp(
          solid.vertices[i],
          solid.vertices[j],
          div(fa, add(fa, mul(fb, rational(-1)))),
        ),
      );
  }
  const scale = upScale(frame);
  const corners = found.map((at) => ({
    at,
    a: dotI(frame.across, at),
    b: div(dotI(frame.up, at), scale),
  }));
  // A convex polygon's corners, in order, are its corners sorted by angle about
  // any point inside it. The angle is only for sorting; nothing exact depends
  // on it.
  const s = Math.sqrt(toNumber(scale));
  const cx =
    corners.reduce((sum, p) => sum + toNumber(p.a), 0) / corners.length;
  const cy =
    corners.reduce((sum, p) => sum + toNumber(p.b) * s, 0) / corners.length;
  const angle = (p: Corner) =>
    Math.atan2(toNumber(p.b) * s - cy, toNumber(p.a) - cx);
  return corners.sort((p, q) => angle(p) - angle(q));
}

/** A value as it reads inside a product, bracketed when it is not one term. */
function factor(text: string): string {
  return /[+/]/.test(text) ? `(${text})` : text;
}

function classify(sides: Vector2[]): SectionShape {
  const lengths = sides.map(lengthSquared);
  const allEqual = lengths.every((length) => equals(length, lengths[0]));
  const rightAt = (i: number) =>
    isZero(dot2(sides[i], sides[(i + 1) % sides.length]));
  if (sides.length === 3) {
    if (allEqual) return "equilateralTriangle";
    const right = [0, 1, 2].some(rightAt);
    const isosceles = [0, 1, 2].some((i) =>
      equals(lengths[i], lengths[(i + 1) % 3]),
    );
    if (right && isosceles) return "rightIsoscelesTriangle";
    if (right) return "rightTriangle";
    return isosceles ? "isoscelesTriangle" : "triangle";
  }
  if (sides.length === 4) {
    if ([0, 1, 2, 3].every(rightAt)) return allEqual ? "square" : "rectangle";
    const first = isZero(cross2(sides[0], sides[2]));
    const second = isZero(cross2(sides[1], sides[3]));
    if (first && second) return allEqual ? "rhombus" : "parallelogram";
    return first || second ? "trapezoid" : "quadrilateral";
  }
  return sides.length === 5 ? "pentagon" : "hexagon";
}

/**
 * The cross section a slice leaves, or null when the solid cannot be sliced or
 * the position is not strictly inside the solid.
 */
export function cutSolid(
  kind: SolidKind,
  d: Dimensions,
  slice: Slice,
): CrossSection | null {
  const solid = polyhedronOf(kind, d);
  if (!solid) return null;
  const frame = FRAMES[slice.heading];
  const [low, high] = reach(solid, frame.normal);
  if (!insideSpan(slice.position, add(high, mul(low, rational(-1)))))
    return null;
  const corners = cornersOf(solid, frame, add(low, slice.position));
  if (corners.length < 3) return null;

  const scale = upScale(frame);
  const stretch = Math.sqrt(toNumber(scale));
  const flat = (p: Corner): Point2 => [toNumber(p.a), toNumber(p.b) * stretch];
  const onSolid = (point: RVec3): Vec3 => toMesh(point, solid.centre);
  const count = corners.length;
  const sides = corners.map((p, i) =>
    vectorBetween(p, corners[(i + 1) % count], scale),
  );
  const lengths = sides.map((side) => exactSqrt(lengthSquared(side)));
  const edges: SectionEdge[] = corners.map((p, i) => {
    const q = corners[(i + 1) % count];
    return {
      id: `e${i}`,
      length: lengths[i],
      from2d: flat(p),
      to2d: flat(q),
      from3d: onSolid(p.at),
      to3d: onSolid(q.at),
    };
  });

  // Shoelace in face-on coordinates. The b axis is in units of |up|², so the
  // true area is this times √(|up|²).
  let twice = ZERO;
  for (let i = 0; i < count; i += 1) {
    const p = corners[i];
    const q = corners[(i + 1) % count];
    twice = add(twice, add(mul(p.a, q.b), mul(mul(q.a, p.b), rational(-1))));
  }
  const half = mul(twice, HALF);
  const area = mulExact(
    exactRational(half.n < 0n ? mul(half, rational(-1)) : half),
    exactSqrt(scale),
  );

  const shape = classify(sides);
  const worked = working(shape, corners, sides, lengths, area, onSolid, flat);
  const centreAt: RVec3 = [0, 1, 2].map((i) =>
    corners.reduce(
      (sum, p) => add(sum, mul(p.at[i], rational(1n, BigInt(count)))),
      ZERO,
    ),
  ) as unknown as RVec3;
  const unit = (v: IVec3): Vec3 => {
    const length = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / length, v[1] / length, v[2] / length];
  };

  return {
    shape,
    name: SECTION_NAMES[shape],
    edges,
    symbols: worked.symbols,
    lines: worked.lines,
    area: {
      formula: worked.formula,
      substitution: worked.substitution,
      exact: area,
    },
    outline2d: corners.map(flat),
    outline3d: corners.map((p) => onSolid(p.at)),
    plane: {
      origin: onSolid(centreAt),
      across: unit(frame.across),
      up: unit(frame.up),
    },
  };
}

interface Working {
  readonly formula: string | null;
  readonly substitution: string | null;
  readonly symbols: Record<string, string>;
  readonly lines: SectionLine[];
}

/**
 * The area formula for a shape, with each symbol tied to the side it names
 * and any height it needs drawn as a line of its own.
 */
function working(
  shape: SectionShape,
  corners: readonly Corner[],
  sides: readonly Vector2[],
  lengths: readonly Exact[],
  area: Exact,
  onSolid: (point: RVec3) => Vec3,
  flat: (p: Corner) => Point2,
): Working {
  const text = (value: Exact) => factor(formatExact(value));
  const count = corners.length;
  switch (shape) {
    case "square":
      return {
        formula: "A = s²",
        substitution: `A = ${text(lengths[0])}²`,
        symbols: { s: "e0" },
        lines: [],
      };
    case "rectangle":
      return {
        formula: "A = lw",
        substitution: `A = ${text(lengths[0])} × ${text(lengths[1])}`,
        symbols: { l: "e0", w: "e1" },
        lines: [],
      };
    case "trapezoid": {
      // The parallel pair are the two bases; the height runs between them.
      const pair = isZero(cross2(sides[0], sides[2])) ? 0 : 1;
      const [first, second] = [pair, pair + 2];
      const height = divideExact(
        scaleExact(area, rational(2)),
        addExact(lengths[first], lengths[second]),
      );
      if (!height) break;
      const line = heightLine(
        corners,
        first,
        (second + 1) % count,
        sides[0].scale,
        onSolid,
        flat,
      );
      return {
        formula: "A = (b₁ + b₂)h / 2",
        substitution: `A = (${formatExact(lengths[first])} + ${formatExact(lengths[second])}) × ${text(height)} / 2`,
        symbols: { "b₁": `e${first}`, "b₂": `e${second}` },
        lines: [{ ...line, symbol: "h", length: height }],
      };
    }
    case "rightTriangle":
    case "rightIsoscelesTriangle": {
      // The two legs are base and height, and both are sides already.
      const corner = [0, 1, 2].find((i) =>
        isZero(dot2(sides[i], sides[(i + 1) % 3])),
      )!;
      const [base, leg] = [corner, (corner + 1) % 3];
      return {
        formula: "A = bh / 2",
        substitution: `A = ${text(lengths[base])} × ${text(lengths[leg])} / 2`,
        symbols: { b: `e${base}`, h: `e${leg}` },
        lines: [],
      };
    }
    case "equilateralTriangle":
    case "isoscelesTriangle":
    case "triangle": {
      // The base is the odd side out of an isosceles triangle, otherwise the
      // longest, so the height falls inside it.
      let base = 0;
      for (let i = 0; i < 3; i += 1) {
        const others = [0, 1, 2].filter((j) => j !== i);
        if (
          shape === "isoscelesTriangle" &&
          equals(
            lengthSquared(sides[others[0]]),
            lengthSquared(sides[others[1]]),
          )
        )
          base = i;
        else if (
          shape !== "isoscelesTriangle" &&
          evalExact(lengths[i]) > evalExact(lengths[base])
        )
          base = i;
      }
      const height = divideExact(scaleExact(area, rational(2)), lengths[base]);
      if (!height) break;
      const line = heightLine(
        corners,
        base,
        (base + 2) % 3,
        sides[0].scale,
        onSolid,
        flat,
      );
      return {
        formula: "A = bh / 2",
        substitution: `A = ${text(lengths[base])} × ${text(height)} / 2`,
        symbols: { b: `e${base}` },
        lines: [{ ...line, symbol: "h", length: height }],
      };
    }
  }
  return { formula: null, substitution: null, symbols: {}, lines: [] };
}

/**
 * The perpendicular from a corner to the line along side `side`, which runs
 * from corner `side` to the next one. Its foot is rational, like the corners.
 */
function heightLine(
  corners: readonly Corner[],
  side: number,
  apex: number,
  scale: Rational,
  onSolid: (point: RVec3) => Vec3,
  flat: (p: Corner) => Point2,
): Omit<SectionLine, "symbol" | "length"> {
  const p = corners[side];
  const q = corners[(side + 1) % corners.length];
  const top = corners[apex];
  const along = vectorBetween(p, q, scale);
  const t = div(
    dot2(along, vectorBetween(p, top, scale)),
    lengthSquared(along),
  );
  const foot: Corner = {
    at: lerp(p.at, q.at, t),
    a: add(p.a, mul(t, along.da)),
    b: add(p.b, mul(t, along.db)),
  };
  return {
    id: "height",
    from2d: flat(top),
    to2d: flat(foot),
    from3d: onSolid(top.at),
    to3d: onSolid(foot.at),
  };
}
