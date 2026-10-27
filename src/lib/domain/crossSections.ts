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
  exactPi,
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
  | "hexagon"
  | "circle"
  | "ellipse"
  | "partOfEllipse"
  | "parabolaRegion"
  | "hyperbolaRegion";

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
  circle: "Circle",
  ellipse: "Ellipse",
  partOfEllipse: "Part of an ellipse",
  parabolaRegion: "Parabola region",
  hyperbolaRegion: "Hyperbola region",
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
 * A length that is not a side: the height of a triangle or trapezoid, drawn in
 * only while the working is shown, or the radius, axes or height of a curved
 * cross section, which have no sides to carry them and so are always shown.
 */
export interface SectionLine {
  readonly id: string;
  readonly symbol: string;
  readonly length: Exact;
  readonly from2d: Point2;
  readonly to2d: Point2;
  readonly from3d: Vec3;
  readonly to3d: Vec3;
  /** Shown all the time, not only while the working is. */
  readonly always: boolean;
}

export interface SectionArea {
  /** The general formula, or null for a shape with none at this level. */
  readonly formula: string | null;
  readonly substitution: string | null;
  /**
   * The exact area, or null where it takes mathematics beyond the course —
   * part of an ellipse, a hyperbola region — and is only ever shown rounded.
   */
  readonly exact: Exact | null;
  readonly approximate: number;
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
  /**
   * What the slice position measures, drawn on the solid: from the middle of
   * what the plane touches first, along its one axis, to the plane as it is.
   */
  readonly travel: { readonly from3d: Vec3; readonly to3d: Vec3 };
  /**
   * Where the plane meets the bottom face's level, and the two directions the
   * angle between them opens along. Null for a horizontal slice, which is
   * parallel to the bottom face and makes no angle with it.
   */
  readonly angle: {
    readonly at: Vec3;
    readonly floor: Vec3;
    readonly rise: Vec3;
    readonly degrees: 45 | 90;
  } | null;
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
  /** The one axis the plane moves along. */
  readonly slide: IVec3;
  /** The drawing's x axis: a unit vector lying in the plane. */
  readonly across: IVec3;
  /** The drawing's y axis: a whole-number vector in the plane, length 1 or √2. */
  readonly up: IVec3;
}

const FRAMES: Record<SliceHeading, PlaneFrame> = {
  // Seen from above, with the back of the solid at the top of the drawing.
  level: {
    normal: [0, 1, 0],
    slide: [0, 1, 0],
    across: [1, 0, 0],
    up: [0, 0, -1],
  },
  // Seen from the left side.
  frontToBack: {
    normal: [1, 0, 0],
    slide: [1, 0, 0],
    across: [0, 0, 1],
    up: [0, 1, 0],
  },
  // Seen from the front.
  sideToSide: {
    normal: [0, 0, 1],
    slide: [0, 0, 1],
    across: [1, 0, 0],
    up: [0, 1, 0],
  },
  // Each diagonal is seen square-on from above it, uphill at the top. The four
  // are quarter turns of one another: each slides the way it rises, starting
  // from the side it rises away from, so a round solid gives the same cut at
  // the same position whichever way the slice is turned.
  right: {
    normal: [1, -1, 0],
    slide: [1, 0, 0],
    across: [0, 0, 1],
    up: [1, 1, 0],
  },
  left: {
    normal: [-1, -1, 0],
    slide: [-1, 0, 0],
    across: [0, 0, -1],
    up: [-1, 1, 0],
  },
  front: {
    normal: [0, -1, 1],
    slide: [0, 0, 1],
    across: [-1, 0, 0],
    up: [0, 1, 1],
  },
  back: {
    normal: [0, -1, -1],
    slide: [0, 0, -1],
    across: [1, 0, 0],
    up: [0, 1, -1],
  },
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
  return (
    kind === "rectangularPrism" ||
    kind === "cube" ||
    kind === "triangularPrism" ||
    kind === "squarePyramid" ||
    kind === "cylinder" ||
    kind === "cone" ||
    kind === "sphere"
  );
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
  if (!solid) return roundSpan(kind, d, heading);
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
  if (!solid) return cutRound(kind, d, slice);
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
  // Where the plane first touched the solid: the middle of the face, edge or
  // corner it met first. The position is measured from there.
  const touching = solid.vertices.filter((vertex) =>
    equals(dotI(frame.normal, vertex), low),
  );
  const touch: RVec3 = [0, 1, 2].map((i) =>
    touching.reduce(
      (sum, vertex) =>
        add(sum, mul(vertex[i], rational(1n, BigInt(touching.length)))),
      ZERO,
    ),
  ) as unknown as RVec3;
  const shift = (point: RVec3, by: IVec3, times: Rational): RVec3 =>
    point.map((value, i) =>
      add(value, mul(rational(-by[i]), times)),
    ) as unknown as RVec3;
  // Every plane but the level one climbs one unit per |up|, so following `up`
  // down from the middle of the cross section reaches the bottom face's level
  // after as many steps as the middle is high.
  const foot = shift(centreAt, frame.up, centreAt[1]);
  const flatUp: IVec3 = [frame.up[0], 0, frame.up[2]];
  const angle =
    slice.heading === "level"
      ? null
      : {
          at: onSolid(foot),
          floor: unit(
            flatUp[0] === 0 && flatUp[2] === 0 ? frame.normal : flatUp,
          ),
          rise: unit(frame.up),
          degrees: (flatUp[0] === 0 && flatUp[2] === 0 ? 90 : 45) as 45 | 90,
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
      approximate: evalExact(area),
    },
    outline2d: corners.map(flat),
    outline3d: corners.map((p) => onSolid(p.at)),
    plane: {
      origin: onSolid(centreAt),
      across: unit(frame.across),
      up: unit(frame.up),
    },
    travel: {
      from3d: onSolid(touch),
      to3d: onSolid(
        shift(touch, frame.slide, mul(slice.position, rational(-1))),
      ),
    },
    angle,
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
        lines: [{ ...line, symbol: "h", length: height, always: false }],
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
        lines: [{ ...line, symbol: "h", length: height, always: false }],
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
): Omit<SectionLine, "symbol" | "length" | "always"> {
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

// Round solids --------------------------------------------------------------
//
// A cylinder or a sphere cut by one of these planes leaves a circle, an
// ellipse, a rectangle, or part of an ellipse cut off by a straight edge where
// the plane runs through a disk. Their corners are not rational, so they are
// worked out analytically rather than by the polygon cutter above: every
// length is still exact — a radius, an axis, a chord 2√(r² − d²) — and every
// area is too, except part of an ellipse, whose area needs an arcsine and is
// only ever shown rounded.
//
// These work in the mesh's own frame, which for a round solid is centred on its
// axis: the cylinder runs from y = −h/2 to h/2, the sphere is centred on the
// origin.

type F3 = readonly [number, number, number];

const plus = (a: F3, b: F3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const times = (a: F3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dotF = (a: F3, b: F3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unitOf = (v: F3): Vec3 => times(v, 1 / Math.hypot(v[0], v[1], v[2]));

/** Bracket a value raised to a power unless it is a plain number. */
function power(text: string): string {
  return /^[\d.]+$/.test(text) ? text : `(${text})`;
}

function roundSpan(
  kind: SolidKind,
  d: Dimensions,
  heading: SliceHeading,
): Rational | null {
  if (kind === "sphere") return mul(r(d, "r"), rational(2));
  if (kind !== "cylinder" && kind !== "cone") return null;
  const [radius, height] = [r(d, "r"), r(d, "h")];
  const across = mul(radius, rational(2));
  if (heading === "level") return height;
  if (heading === "frontToBack" || heading === "sideToSide") return across;
  if (kind === "cylinder") return add(across, height);
  // A cone's diagonal runs from wherever it first touches — the tip, or the
  // rim of a cone flatter than 45° — to the far side of the rim.
  return compare(height, radius) < 0 ? across : add(radius, height);
}

/**
 * Where a cone's diagonal plane starts, the lowest s − y over the cone: at the
 * tip, or at the rim for a cone flatter than the plane.
 */
function coneStart(radius: Rational, height: Rational) {
  const half = mul(height, HALF);
  const tip = mul(half, rational(-1));
  const rim = add(half, mul(radius, rational(-1)));
  return compare(rim, tip) < 0 ? rim : tip;
}

interface RoundGeometry {
  readonly shape: SectionShape;
  readonly outline: readonly Vec3[];
  readonly edges: readonly {
    readonly from: Vec3;
    readonly to: Vec3;
    readonly length: Exact;
  }[];
  readonly lines: readonly {
    readonly id: string;
    readonly symbol: string;
    readonly from: Vec3;
    readonly to: Vec3;
    readonly length: Exact;
    readonly always: boolean;
  }[];
  readonly symbols: Record<string, string>;
  readonly area: SectionArea;
  /** The middle of the cross section. */
  readonly centre: Vec3;
}

function circleOf(
  centre: Vec3,
  radius: Exact,
  across: Vec3,
  up: Vec3,
): RoundGeometry {
  const size = evalExact(radius);
  const outline = Array.from({ length: 72 }, (_, i) => {
    const angle = (i / 72) * Math.PI * 2;
    return plus(
      centre,
      plus(
        times(across, Math.cos(angle) * size),
        times(up, Math.sin(angle) * size),
      ),
    );
  });
  const area = mulExact(radius, radius, exactPi(rational(1)));
  return {
    shape: "circle",
    outline,
    edges: [],
    lines: [
      {
        id: "radius",
        symbol: "r",
        from: centre,
        to: plus(centre, times(across, size)),
        length: radius,
        always: true,
      },
    ],
    symbols: {},
    area: {
      formula: "A = πr²",
      substitution: `A = π × ${power(formatExact(radius))}²`,
      exact: area,
      approximate: evalExact(area),
    },
    centre,
  };
}

function rectangleOf(
  corners: readonly [Vec3, Vec3, Vec3, Vec3],
  width: Exact,
  height: Exact,
  square: boolean,
): RoundGeometry {
  const area = mulExact(width, height);
  const text = (value: Exact) => factor(formatExact(value));
  const edges = corners.map((from, i) => ({
    from,
    to: corners[(i + 1) % 4],
    length: i % 2 === 0 ? width : height,
  }));
  return {
    shape: square ? "square" : "rectangle",
    outline: corners,
    edges,
    lines: [],
    symbols: square ? { s: "e0" } : { l: "e0", w: "e1" },
    area: {
      formula: square ? "A = s²" : "A = lw",
      substitution: square
        ? `A = ${power(formatExact(width))}²`
        : `A = ${text(width)} × ${text(height)}`,
      exact: area,
      approximate: evalExact(area),
    },
    centre: times(plus(corners[0], corners[2]), 0.5),
  };
}

/**
 * A 45° plane through a cylinder. Seen square-on it cuts the side in an
 * ellipse with semi-axes r across and r√2 uphill; where the plane runs through
 * a disk, the ellipse is cut off there by a straight chord. `t` runs from −1
 * to 1 along the ellipse's long axis, and the disks fall at rational `t`.
 */
function cylinderDiagonal(
  radius: Rational,
  height: Rational,
  rising: Vec3,
  side: Vec3,
  offset: Rational,
): RoundGeometry {
  const rr = toNumber(radius);
  const lift = toNumber(offset);
  // The axis meets the plane here; the plane climbs along `rising`.
  const centre: Vec3 = [0, -lift, 0];
  const uphill = unitOf(plus(rising, [0, 1, 0]));
  const halfHeight = mul(height, HALF);
  const clampT = (value: Rational, low: boolean): Rational => {
    const bound = rational(low ? -1 : 1);
    return low
      ? compare(value, bound) < 0
        ? bound
        : value
      : compare(value, bound) > 0
        ? bound
        : value;
  };
  const tLow = clampT(
    div(add(offset, mul(halfHeight, rational(-1))), radius),
    true,
  );
  const tHigh = clampT(div(add(offset, halfHeight), radius), false);
  const at = (t: number, across: number): Vec3 =>
    plus(
      centre,
      plus(times(uphill, t * rr * Math.SQRT2), times(side, across * rr)),
    );
  const halfChord = (t: number) => Math.sqrt(Math.max(0, 1 - t * t));
  const [low, high] = [toNumber(tLow), toNumber(tHigh)];
  const full = low <= -1 && high >= 1;

  const steps = 36;
  const right = Array.from({ length: steps + 1 }, (_, i) => {
    const t = low + ((high - low) * i) / steps;
    return at(t, halfChord(t));
  });
  const left = Array.from({ length: steps + 1 }, (_, i) => {
    const t = low + ((high - low) * i) / steps;
    return at(t, -halfChord(t));
  });
  const outline = full
    ? Array.from({ length: 72 }, (_, i) => {
        const angle = (i / 72) * Math.PI * 2;
        return at(Math.cos(angle), Math.sin(angle));
      })
    : [...right, ...left.reverse()];

  const minor = exactRational(radius);
  const major = mulExact(exactRational(radius), exactSqrt(rational(2)));
  if (full) {
    const area = mulExact(minor, major, exactPi(rational(1)));
    return {
      shape: "ellipse",
      outline,
      edges: [],
      lines: [
        {
          id: "minor",
          symbol: "a",
          from: centre,
          to: at(0, 1),
          length: minor,
          always: true,
        },
        {
          id: "major",
          symbol: "b",
          from: centre,
          to: at(1, 0),
          length: major,
          always: true,
        },
      ],
      symbols: {},
      area: {
        formula: "A = πab",
        substitution: `A = π × ${factor(formatExact(minor))} × ${factor(formatExact(major))}`,
        exact: area,
        approximate: evalExact(area),
      },
      centre,
    };
  }

  // A chord where the plane runs through a disk: 2r√(1 − t²).
  const chord = (t: Rational) =>
    exactSqrt(
      mul(
        mul(rational(4), mul(radius, radius)),
        add(rational(1), mul(mul(t, t), rational(-1))),
      ),
    );
  const edges = [];
  if (low > -1)
    edges.push({
      from: at(low, -halfChord(low)),
      to: at(low, halfChord(low)),
      length: chord(tLow),
    });
  if (high < 1)
    edges.push({
      from: at(high, halfChord(high)),
      to: at(high, -halfChord(high)),
      length: chord(tHigh),
    });
  const primitive = (t: number) => t * halfChord(t) + Math.asin(t);
  const approximate = rr * rr * Math.SQRT2 * (primitive(high) - primitive(low));
  return {
    shape: "partOfEllipse",
    outline,
    edges,
    lines: [
      {
        id: "height",
        symbol: "h",
        from: at(low, 0),
        to: at(high, 0),
        // (t_high − t_low) × r√2, rational times √2.
        length: mulExact(
          exactRational(mul(add(tHigh, mul(tLow, rational(-1))), radius)),
          exactSqrt(rational(2)),
        ),
        always: true,
      },
    ],
    symbols: {},
    area: { formula: null, substitution: null, exact: null, approximate },
    centre: at((low + high) / 2, 0),
  };
}

/** The cross section of a round solid, in the mesh's frame. */
function roundGeometry(
  kind: SolidKind,
  d: Dimensions,
  heading: SliceHeading,
  position: Rational,
): RoundGeometry | null {
  const frame = FRAMES[heading];
  const across = unitOf(frame.across);
  const up = unitOf(frame.up);
  if (kind === "sphere") {
    // Only level slices: every slice of a sphere is a circle.
    const radius = r(d, "r");
    const fromMiddle = add(position, mul(radius, rational(-1)));
    const size = exactSqrt(
      add(mul(radius, radius), mul(mul(fromMiddle, fromMiddle), rational(-1))),
    );
    const levelUp = unitOf(FRAMES.level.up);
    const levelAcross = unitOf(FRAMES.level.across);
    return circleOf([0, toNumber(fromMiddle), 0], size, levelAcross, levelUp);
  }
  if (kind === "cone") return coneGeometry(d, heading, position);
  if (kind !== "cylinder") return null;
  const [radius, height] = [r(d, "r"), r(d, "h")];
  const halfHeight = mul(height, HALF);
  if (heading === "level") {
    const y = toNumber(add(position, mul(halfHeight, rational(-1))));
    return circleOf([0, y, 0], exactRational(radius), across, up);
  }
  if (heading === "frontToBack" || heading === "sideToSide") {
    // Distance in from the side, as an offset from the axis.
    const offset = add(position, mul(radius, rational(-1)));
    const halfWidthSquared = add(
      mul(radius, radius),
      mul(mul(offset, offset), rational(-1)),
    );
    const width = exactSqrt(mul(halfWidthSquared, rational(4)));
    const halfWidth = Math.sqrt(toNumber(halfWidthSquared));
    const normal = unitOf(frame.normal);
    const base = times(normal, toNumber(offset));
    const top = toNumber(halfHeight);
    const corner = (sideways: number, upward: number) =>
      plus(base, plus(times(across, sideways), [0, upward, 0]));
    return rectangleOf(
      [
        corner(-halfWidth, -top),
        corner(halfWidth, -top),
        corner(halfWidth, top),
        corner(-halfWidth, top),
      ],
      width,
      exactRational(height),
      equals(mul(halfWidthSquared, rational(4)), mul(height, height)),
    );
  }
  // A diagonal rises along its sliding axis s: the plane is s − y = c, and
  // the position carries c up from where it first touches the rim.
  const rising: Vec3 = [frame.slide[0], frame.slide[1], frame.slide[2]];
  // Measured along `rising`, the plane is y = s − offset.
  const offset = add(mul(add(radius, halfHeight), rational(-1)), position);
  // Level and square to `rising`: the ellipse's short axis.
  const sideways: Vec3 = [-rising[2], 0, rising[0]];
  return cylinderDiagonal(radius, height, rising, sideways, offset);
}

/** Where a round solid first meets a plane moving along its normal. */
function roundTouch(kind: SolidKind, d: Dimensions, normal: F3): Vec3 {
  const radius = toNumber(r(d, "r"));
  if (kind === "sphere") return times(unitOf(normal), -radius);
  if (kind === "cone") {
    // The tip, or the nearest point of the rim, or the middle of the line
    // between them when the plane lies along the cone's side.
    const top = toNumber(r(d, "h")) / 2;
    const flat: F3 = [normal[0], 0, normal[2]];
    const level = flat[0] === 0 && flat[2] === 0;
    const rim: Vec3 = level
      ? [0, -top, 0]
      : plus(times(unitOf(flat), -radius), [0, -top, 0]);
    const tip: Vec3 = [0, top, 0];
    const [atTip, atRim] = [dotF(normal, tip), dotF(normal, rim)];
    if (Math.abs(atTip - atRim) < 1e-9) return times(plus(tip, rim), 0.5);
    return atTip < atRim ? tip : rim;
  }
  const flat: F3 = [normal[0], 0, normal[2]];
  const sideways =
    flat[0] === 0 && flat[2] === 0 ? [0, 0, 0] : times(unitOf(flat), -radius);
  const top = toNumber(r(d, "h")) / 2;
  const y = normal[1] > 0 ? -top : normal[1] < 0 ? top : 0;
  return [sideways[0], y, sideways[2]];
}

function cutRound(
  kind: SolidKind,
  d: Dimensions,
  slice: Slice,
): CrossSection | null {
  const heading = kind === "sphere" ? "level" : slice.heading;
  const span = roundSpan(kind, d, heading);
  if (!span || !insideSpan(slice.position, span)) return null;
  const geometry = roundGeometry(kind, d, heading, slice.position);
  if (!geometry) return null;
  const frame = FRAMES[heading];
  const across = unitOf(frame.across);
  const up = unitOf(frame.up);
  const flat = (point: Vec3): Point2 => [dotF(point, across), dotF(point, up)];

  const touch = roundTouch(kind, d, frame.normal);
  const bottom =
    kind === "sphere" ? -toNumber(r(d, "r")) : -toNumber(r(d, "h")) / 2;
  const centre = geometry.centre;
  const flatUp: IVec3 = [frame.up[0], 0, frame.up[2]];
  const level = flatUp[0] === 0 && flatUp[2] === 0;
  return {
    shape: geometry.shape,
    name: SECTION_NAMES[geometry.shape],
    edges: geometry.edges.map((edge, i) => ({
      id: `e${i}`,
      length: edge.length,
      from2d: flat(edge.from),
      to2d: flat(edge.to),
      from3d: edge.from,
      to3d: edge.to,
    })),
    symbols: geometry.symbols,
    lines: geometry.lines.map((line) => ({
      id: line.id,
      symbol: line.symbol,
      length: line.length,
      from2d: flat(line.from),
      to2d: flat(line.to),
      from3d: line.from,
      to3d: line.to,
      always: line.always,
    })),
    area: geometry.area,
    outline2d: geometry.outline.map(flat),
    outline3d: geometry.outline,
    plane: { origin: centre, across, up },
    travel: {
      from3d: touch,
      to3d: plus(touch, times(frame.slide, toNumber(slice.position))),
    },
    angle:
      heading === "level"
        ? null
        : {
            at: plus(centre, times(frame.up, -(centre[1] - bottom))),
            floor: unitOf(level ? frame.normal : flatUp),
            rise: up,
            degrees: level ? 90 : 45,
          },
  };
}

/**
 * A region of a conic, q² ≤ f(s), between two values of s along the plane's
 * uphill direction, drawn on the plane given by `place`. Lengths along s come
 * out √2 longer on the plane than along the floor, since the plane is at 45°;
 * a vertical plane passes `stretch` = 1.
 */
function conicRegion(
  f: (s: Rational) => Rational,
  sampled: (s: number) => number,
  low: Rational,
  high: Rational,
  place: (s: number, q: number) => Vec3,
  stretch: Exact,
): {
  outline: Vec3[];
  base: { from: Vec3; to: Vec3; length: Exact } | null;
  height: { from: Vec3; to: Vec3; length: Exact };
  approximate: number;
} {
  const [lo, hi] = [toNumber(low), toNumber(high)];
  const half = (value: number) => Math.sqrt(Math.max(0, sampled(value)));
  const steps = 48;
  // Bunch the samples toward the ends, where a conic turns fastest.
  const along = Array.from({ length: steps + 1 }, (_, i) => {
    const share = (1 - Math.cos((Math.PI * i) / steps)) / 2;
    return lo + (hi - lo) * share;
  });
  const outline = [
    ...along.map((value) => place(value, half(value))),
    ...along
      .slice()
      .reverse()
      .map((value) => place(value, -half(value))),
  ];
  // The area by the midpoint rule on the same bunched samples, finely.
  let area = 0;
  const fine = 4000;
  for (let i = 0; i < fine; i += 1) {
    const a = lo + ((hi - lo) * i) / fine;
    const b = lo + ((hi - lo) * (i + 1)) / fine;
    area += 2 * half((a + b) / 2) * (b - a);
  }
  const atLow = f(low);
  const base =
    compare(atLow, ZERO) > 0
      ? {
          from: place(lo, -Math.sqrt(toNumber(atLow))),
          to: place(lo, Math.sqrt(toNumber(atLow))),
          length: exactSqrt(mul(atLow, rational(4))),
        }
      : null;
  return {
    outline,
    base,
    height: {
      from: place(lo, 0),
      to: place(hi, 0),
      length: mulExact(
        exactRational(add(high, mul(low, rational(-1)))),
        stretch,
      ),
    },
    approximate: area * evalExact(stretch),
  };
}

function coneGeometry(
  d: Dimensions,
  heading: SliceHeading,
  position: Rational,
): RoundGeometry {
  const frame = FRAMES[heading];
  const across = unitOf(frame.across);
  const up = unitOf(frame.up);
  const [radius, height] = [r(d, "r"), r(d, "h")];
  const half = mul(height, HALF);
  const minus = (a: Rational, b: Rational) => add(a, mul(b, rational(-1)));
  const [rr, hh] = [toNumber(radius), toNumber(height)];

  if (heading === "level") {
    const y = toNumber(minus(position, half));
    const size = div(mul(radius, minus(height, position)), height);
    return circleOf([0, y, 0], exactRational(size), across, up);
  }

  if (heading === "frontToBack" || heading === "sideToSide") {
    const normal = unitOf(frame.normal);
    const offset = minus(position, radius);
    if (isZero(offset)) {
      // Straight down through the tip: an isosceles triangle.
      const slant = exactSqrt(add(mul(radius, radius), mul(height, height)));
      const corners: Vec3[] = [
        plus(times(across, -rr), [0, -hh / 2, 0]),
        plus(times(across, rr), [0, -hh / 2, 0]),
        [0, hh / 2, 0],
      ];
      const base = exactRational(mul(radius, rational(2)));
      const area = exactRational(mul(radius, height));
      const equilateral = equals(
        mul(mul(radius, radius), rational(4)),
        add(mul(radius, radius), mul(height, height)),
      );
      return {
        shape: equilateral ? "equilateralTriangle" : "isoscelesTriangle",
        outline: corners,
        edges: [
          { from: corners[0], to: corners[1], length: base },
          { from: corners[1], to: corners[2], length: slant },
          { from: corners[2], to: corners[0], length: slant },
        ],
        lines: [
          {
            id: "height",
            symbol: "h",
            from: corners[2],
            to: [0, -hh / 2, 0],
            length: exactRational(height),
            always: false,
          },
        ],
        symbols: { b: "e0" },
        area: {
          formula: "A = bh / 2",
          substitution: `A = ${factor(formatExact(base))} × ${factor(formatExact(exactRational(height)))} / 2`,
          exact: area,
          approximate: evalExact(area),
        },
        centre: [0, -hh / 6, 0],
      };
    }
    // Off the tip: |q| ≤ √(k²(h/2 − y)² − d²), from the base up to where the
    // cone has narrowed to the plane, y = h/2 − |d|/k.
    const k = div(radius, height);
    const reach = offset.n < 0n ? mul(offset, rational(-1)) : offset;
    const f = (y: Rational) => {
      const spread = mul(k, minus(half, y));
      return minus(mul(spread, spread), mul(reach, reach));
    };
    const top = minus(half, div(reach, k));
    const [kk, dd] = [toNumber(k), toNumber(reach)];
    const region = conicRegion(
      f,
      (y) => (kk * (hh / 2 - y)) ** 2 - dd * dd,
      mul(half, rational(-1)),
      top,
      (y, q) =>
        plus(
          times(normal, toNumber(offset)),
          plus(times(across, q), [0, y, 0]),
        ),
      exactRational(rational(1)),
    );
    return hyperbolaOf(region);
  }

  // A diagonal. It rises along its sliding axis s, so the plane is
  // y = s − c, and a point on it is inside the cone when
  //   q² ≤ f(s) = k²(m − s)² − s²,  m = h/2 + c,  k = r/h,
  // above the base (s ≥ c − h/2) and below the tip (s ≤ m). That is an
  // ellipse when the cone is steeper than the plane (k < 1), a parabola when
  // it is as steep (k = 1) and a hyperbola when it is flatter (k > 1).
  const c = add(coneStart(radius, height), position);
  const rising: Vec3 = [frame.slide[0], frame.slide[1], frame.slide[2]];
  const sideways: Vec3 = [-rising[2], 0, rising[0]];
  const k = div(radius, height);
  const m = add(half, c);
  const f = (s: Rational) => {
    const spread = mul(k, minus(m, s));
    return minus(mul(spread, spread), mul(s, s));
  };
  const place = (s: number, q: number): Vec3 =>
    plus(times(rising, s), plus(times(sideways, q), [0, s - toNumber(c), 0]));
  const floor = minus(c, half);

  // The region is one interval of s inside [floor, m] where f ≥ 0. Its ends are
  // among the floor, the tip and the roots of f, all rational.
  const ones = rational(1);
  const candidates = [floor, m];
  if (!equals(k, ones)) {
    candidates.push(
      div(mul(k, m), add(k, ones)),
      div(mul(k, m), minus(k, ones)),
    );
  } else {
    candidates.push(mul(m, HALF));
  }
  const inside = candidates
    .filter((value) => compare(value, floor) >= 0 && compare(value, m) <= 0)
    .sort(compare);
  let low = floor;
  let high = floor;
  for (let i = 0; i + 1 < inside.length; i += 1) {
    const middle = mul(add(inside[i], inside[i + 1]), HALF);
    if (compare(f(middle), ZERO) > 0) {
      if (equals(low, high)) low = inside[i];
      high = inside[i + 1];
    }
  }
  const root2 = exactSqrt(rational(2));
  const [kk, mm] = [toNumber(k), toNumber(m)];
  const region = conicRegion(
    f,
    (value) => (kk * (mm - value)) ** 2 - value * value,
    low,
    high,
    place,
    root2,
  );

  if (isZero(m) && compare(k, ones) > 0) {
    // Through the tip of a cone flatter than the plane: two lines of its side
    // and the base, a triangle.
    const tip = place(0, 0);
    const base = region.base!;
    const slant = mulExact(
      exactRational(floor.n < 0n ? mul(floor, rational(-1)) : floor),
      exactSqrt(add(mul(k, k), ones)),
    );
    const area = mulExact(
      base.length,
      region.height.length,
      exactRational(HALF),
    );
    return {
      shape: "isoscelesTriangle",
      outline: [base.from, base.to, tip],
      edges: [
        base,
        { from: base.to, to: tip, length: slant },
        { from: tip, to: base.from, length: slant },
      ],
      lines: [
        {
          id: "height",
          symbol: "h",
          from: tip,
          to: place(toNumber(floor), 0),
          length: region.height.length,
          always: false,
        },
      ],
      symbols: { b: "e0" },
      area: {
        formula: "A = bh / 2",
        substitution: `A = ${factor(formatExact(base.length))} × ${factor(formatExact(region.height.length))} / 2`,
        exact: area,
        approximate: evalExact(area),
      },
      centre: place((2 * toNumber(floor)) / 3, 0),
    };
  }

  if (compare(k, ones) < 0) {
    const ends = [
      div(mul(k, m), add(k, ones)),
      div(mul(k, m), minus(k, ones)),
    ].sort(compare);
    if (compare(ends[0], floor) >= 0) {
      // The whole ellipse, clear of the base.
      const middle = mul(add(ends[0], ends[1]), HALF);
      const long = mulExact(
        exactRational(mul(minus(ends[1], ends[0]), HALF)),
        root2,
      );
      const short = exactSqrt(f(middle));
      const centre = place(toNumber(middle), 0);
      const area = mulExact(long, short, exactPi(rational(1)));
      return {
        shape: "ellipse",
        outline: region.outline,
        edges: [],
        lines: [
          {
            id: "minor",
            symbol: "a",
            from: centre,
            to: place(toNumber(middle), evalExact(short)),
            length: short,
            always: true,
          },
          {
            id: "major",
            symbol: "b",
            from: centre,
            to: place(toNumber(ends[1]), 0),
            length: long,
            always: true,
          },
        ],
        symbols: {},
        area: {
          formula: "A = πab",
          substitution: `A = π × ${factor(formatExact(short))} × ${factor(formatExact(long))}`,
          exact: area,
          approximate: evalExact(area),
        },
        centre,
      };
    }
    return {
      shape: "partOfEllipse",
      outline: region.outline,
      edges: region.base ? [region.base] : [],
      lines: [{ id: "height", symbol: "h", ...region.height, always: true }],
      symbols: {},
      area: {
        formula: null,
        substitution: null,
        exact: null,
        approximate: region.approximate,
      },
      centre: place((toNumber(low) + toNumber(high)) / 2, 0),
    };
  }

  if (equals(k, ones)) {
    // Archimedes: a parabola region is two thirds of the rectangle around it.
    const base = region.base!;
    const area = mulExact(
      base.length,
      region.height.length,
      exactRational(rational(2, 3)),
    );
    return {
      shape: "parabolaRegion",
      outline: region.outline,
      edges: [base],
      lines: [{ id: "height", symbol: "h", ...region.height, always: true }],
      symbols: { w: "e0" },
      area: {
        formula: "A = 2wh / 3",
        substitution: `A = 2 × ${factor(formatExact(base.length))} × ${factor(formatExact(region.height.length))} / 3`,
        exact: area,
        approximate: evalExact(area),
      },
      centre: place((toNumber(low) + toNumber(high)) / 2, 0),
    };
  }
  return hyperbolaOf(region);
}

function hyperbolaOf(region: ReturnType<typeof conicRegion>): RoundGeometry {
  return {
    shape: "hyperbolaRegion",
    outline: region.outline,
    edges: region.base ? [region.base] : [],
    lines: [{ id: "height", symbol: "h", ...region.height, always: true }],
    symbols: {},
    area: {
      formula: null,
      substitution: null,
      exact: null,
      approximate: region.approximate,
    },
    centre: times(plus(region.height.from, region.height.to), 0.5),
  };
}
