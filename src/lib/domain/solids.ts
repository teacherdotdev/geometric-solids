/**
 * The solids: their independent dimensions, derived measurements, surface
 * decomposition, and exact surface-area and volume expressions.
 *
 * Everything here is pure. Rendering, highlighting and answer visibility never
 * feed back into these numbers.
 */
import {
  type Exact,
  addExact,
  evalExact,
  exactPi,
  exactRational,
  exactSqrt,
  formatExact,
  mulExact,
  scaleExact,
} from "./exact";
import {
  type Rational,
  add,
  fromTenths,
  mul,
  pow,
  rational,
  toDecimalString,
} from "./rational";
import {
  type Calculation,
  type DimensionSpec,
  type Dimensions,
  type SolidKind,
  type SolidModel,
  type SurfaceTerm,
  type ViewMode,
} from "./types";

export interface SolidDefinition {
  readonly kind: SolidKind;
  readonly name: string;
  /** Compact label for the shape picker, where space is tight. */
  readonly shortName: string;
  /** One-line description shown under the shape picker. */
  readonly summary: string;
  readonly dimensions: readonly DimensionSpec[];
  readonly defaults: Dimensions;
  /** False for the sphere, which has no distortion-free flat net. */
  readonly hasNet: boolean;
  /**
   * True only where whole unit cubes fill the solid exactly: the rectangular
   * prism and the cube. Any other solid would cut them, or be approximated by
   * a staircase of them, and a count of those is not its volume.
   */
  readonly hasCubes: boolean;
  /**
   * A hue this solid is drawn in when nothing is selected, for a solid that is
   * a picture of something and has a colour of its own. Unset means the usual
   * slate blue.
   */
  readonly baseHue?: number;
  build(dimensions: Dimensions): SolidModel;
}

/** Exact decimal text for a dimension, for use inside substitution strings. */
function dec(value: number): string {
  return toDecimalString(fromTenths(value)) ?? String(value);
}

function surfaceId(kind: SolidKind, localId: string): string {
  return `${kind}:${localId}`;
}

function makeSurface(
  kind: SolidKind,
  localId: string,
  name: string,
  code: string,
  formula: string,
  substitution: string,
  exact: Exact,
): SurfaceTerm {
  return {
    id: surfaceId(kind, localId),
    localId,
    name,
    code,
    formula,
    substitution,
    exact,
  };
}

const HALF = rational(1n, 2n);
const THIRD = rational(1n, 3n);
const TWO = rational(2n);
const FOUR = rational(4n);

function r(dimensions: Dimensions, key: string): Rational {
  return fromTenths(dimensions[key]);
}

function rectangularPrism(dimensions: Dimensions): SolidModel {
  const kind: SolidKind = "rectangularPrism";
  const [l, w, h] = [
    r(dimensions, "l"),
    r(dimensions, "w"),
    r(dimensions, "h"),
  ];
  const [ls, ws, hs] = [
    dec(dimensions.l),
    dec(dimensions.w),
    dec(dimensions.h),
  ];
  const lw = exactRational(mul(l, w));
  const lh = exactRational(mul(l, h));
  const wh = exactRational(mul(w, h));

  const surfaces: SurfaceTerm[] = [
    makeSurface(kind, "top", "Top face", "T", "l × w", `${ls} × ${ws}`, lw),
    makeSurface(
      kind,
      "bottom",
      "Bottom face",
      "Bt",
      "l × w",
      `${ls} × ${ws}`,
      lw,
    ),
    makeSurface(kind, "front", "Front face", "F", "l × h", `${ls} × ${hs}`, lh),
    makeSurface(kind, "back", "Back face", "Bk", "l × h", `${ls} × ${hs}`, lh),
    makeSurface(kind, "left", "Left face", "L", "w × h", `${ws} × ${hs}`, wh),
    makeSurface(kind, "right", "Right face", "R", "w × h", `${ws} × ${hs}`, wh),
  ];

  return {
    kind,
    name: "Rectangular prism",
    dimensions,
    derived: [],
    surfaces,
    surfaceArea: {
      formula: "SA = 2(lw + lh + wh)",
      substitution: `SA = 2(${ls} × ${ws} + ${ls} × ${hs} + ${ws} × ${hs})`,
      exact: totalOf(surfaces),
    },
    volume: {
      formula: "V = lwh",
      substitution: `V = ${ls} × ${ws} × ${hs}`,
      exact: exactRational(mul(mul(l, w), h)),
    },
  };
}

function cube(dimensions: Dimensions): SolidModel {
  const kind: SolidKind = "cube";
  const s = r(dimensions, "s");
  const ss = dec(dimensions.s);
  const face = exactRational(pow(s, 2));
  const names: Array<[string, string, string]> = [
    ["top", "Top face", "T"],
    ["bottom", "Bottom face", "Bt"],
    ["front", "Front face", "F"],
    ["back", "Back face", "Bk"],
    ["left", "Left face", "L"],
    ["right", "Right face", "R"],
  ];
  const surfaces = names.map(([localId, name, code]) =>
    makeSurface(kind, localId, name, code, "s²", `${ss}²`, face),
  );

  return {
    kind,
    name: "Cube",
    dimensions,
    derived: [
      {
        key: "edges",
        label: "All edges equal",
        formula: "l = w = h = s",
        substitution: `l = w = h = ${ss}`,
        exact: exactRational(s),
      },
    ],
    surfaces,
    surfaceArea: {
      formula: "SA = 6s²",
      substitution: `SA = 6 × ${ss}²`,
      exact: totalOf(surfaces),
    },
    volume: {
      formula: "V = s³",
      substitution: `V = ${ss}³`,
      exact: exactRational(pow(s, 3)),
    },
  };
}

function triangularPrism(dimensions: Dimensions): SolidModel {
  const kind: SolidKind = "triangularPrism";
  const [a, b, p] = [
    r(dimensions, "a"),
    r(dimensions, "b"),
    r(dimensions, "p"),
  ];
  const [as_, bs, ps] = [
    dec(dimensions.a),
    dec(dimensions.b),
    dec(dimensions.p),
  ];
  // c = √(a² + b²) is kept exact; rounding it here would corrupt every term
  // that uses it.
  const c = exactSqrt(add(pow(a, 2), pow(b, 2)));
  const cText = formatExact(c);

  const triangle = exactRational(mul(mul(a, b), HALF));
  const surfaces: SurfaceTerm[] = [
    makeSurface(
      kind,
      "baseFront",
      "Front triangular base",
      "B1",
      "(a × b) / 2",
      `(${as_} × ${bs}) / 2`,
      triangle,
    ),
    makeSurface(
      kind,
      "baseBack",
      "Back triangular base",
      "B2",
      "(a × b) / 2",
      `(${as_} × ${bs}) / 2`,
      triangle,
    ),
    makeSurface(
      kind,
      "faceA",
      "Rectangle on leg a",
      "Ra",
      "a × p",
      `${as_} × ${ps}`,
      exactRational(mul(a, p)),
    ),
    makeSurface(
      kind,
      "faceB",
      "Rectangle on leg b",
      "Rb",
      "b × p",
      `${bs} × ${ps}`,
      exactRational(mul(b, p)),
    ),
    makeSurface(
      kind,
      "faceC",
      "Rectangle on hypotenuse c",
      "Rc",
      "c × p",
      `${cText} × ${ps}`,
      scaleExact(c, p),
    ),
  ];

  return {
    kind,
    name: "Right-triangular prism",
    dimensions,
    derived: [
      {
        key: "c",
        label: "Hypotenuse c",
        formula: "c = √(a² + b²)",
        substitution: `c = √(${as_}² + ${bs}²)`,
        exact: c,
      },
    ],
    surfaces,
    surfaceArea: {
      formula: "SA = ab + p(a + b + c)",
      substitution: `SA = ${as_} × ${bs} + ${ps} × (${as_} + ${bs} + ${cText})`,
      exact: totalOf(surfaces),
    },
    volume: {
      formula: "V = abp / 2",
      substitution: `V = (${as_} × ${bs} × ${ps}) / 2`,
      exact: exactRational(mul(mul(mul(a, b), p), HALF)),
    },
  };
}

function squarePyramid(dimensions: Dimensions): SolidModel {
  const kind: SolidKind = "squarePyramid";
  const [baseSide, h] = [r(dimensions, "b"), r(dimensions, "h")];
  const [bs, hs] = [dec(dimensions.b), dec(dimensions.h)];
  const halfBase = mul(baseSide, HALF);
  // The slant height runs from the apex to the midpoint of a base edge. It is
  // the altitude of each triangular side, not the sloping corner edge.
  const slant = exactSqrt(add(pow(halfBase, 2), pow(h, 2)));
  const slantText = formatExact(slant);
  const base = exactRational(pow(baseSide, 2));
  const side = scaleExact(slant, mul(baseSide, HALF));

  const surfaces: SurfaceTerm[] = [
    makeSurface(kind, "base", "Square base", "B", "b²", `${bs}²`, base),
    ...[
      ["front", "Front triangular face", "F"],
      ["back", "Back triangular face", "Bk"],
      ["left", "Left triangular face", "L"],
      ["right", "Right triangular face", "R"],
    ].map(([localId, name, code]) =>
      makeSurface(
        kind,
        localId,
        name,
        code,
        "bs / 2",
        `(${bs} × ${slantText}) / 2`,
        side,
      ),
    ),
  ];

  return {
    kind,
    name: "Square pyramid",
    dimensions,
    derived: [
      {
        key: "s",
        label: "Slant height s",
        formula: "s = √(h² + (b/2)²)",
        substitution: `s = √(${hs}² + (${bs}/2)²)`,
        exact: slant,
      },
    ],
    surfaces,
    surfaceArea: {
      formula: "SA = b² + 2bs",
      substitution: `SA = ${bs}² + 2 × ${bs} × ${slantText}`,
      exact: totalOf(surfaces),
    },
    volume: {
      formula: "V = b²h / 3",
      substitution: `V = (${bs}² × ${hs}) / 3`,
      exact: exactRational(mul(mul(pow(baseSide, 2), h), THIRD)),
    },
  };
}

function cylinder(dimensions: Dimensions): SolidModel {
  const kind: SolidKind = "cylinder";
  const [radius, h] = [r(dimensions, "r"), r(dimensions, "h")];
  const [rs, hs] = [dec(dimensions.r), dec(dimensions.h)];
  const disk = exactPi(pow(radius, 2));
  const side = exactPi(mul(mul(TWO, radius), h));

  const surfaces: SurfaceTerm[] = [
    makeSurface(kind, "top", "Top disk", "T", "πr²", `π × ${rs}²`, disk),
    makeSurface(kind, "bottom", "Bottom disk", "Bt", "πr²", `π × ${rs}²`, disk),
    makeSurface(
      kind,
      "side",
      "Curved side",
      "S",
      "2πrh",
      `2π × ${rs} × ${hs}`,
      side,
    ),
  ];

  return {
    kind,
    name: "Cylinder",
    dimensions,
    derived: [
      {
        key: "C",
        label: "Base circumference C",
        formula: "C = 2πr",
        substitution: `C = 2π × ${rs}`,
        exact: exactPi(mul(TWO, radius)),
      },
    ],
    surfaces,
    surfaceArea: {
      formula: "SA = 2πr² + 2πrh",
      substitution: `SA = 2π × ${rs}² + 2π × ${rs} × ${hs}`,
      exact: totalOf(surfaces),
    },
    volume: {
      formula: "V = πr²h",
      substitution: `V = π × ${rs}² × ${hs}`,
      exact: exactPi(mul(pow(radius, 2), h)),
    },
  };
}

function cone(dimensions: Dimensions): SolidModel {
  const kind: SolidKind = "cone";
  const [radius, h] = [r(dimensions, "r"), r(dimensions, "h")];
  const [rs, hs] = [dec(dimensions.r), dec(dimensions.h)];
  // Slant height for the lateral surface; the perpendicular height is what the
  // volume uses. Mixing the two is the classic mistake this app should not make.
  const slant = exactSqrt(add(pow(radius, 2), pow(h, 2)));
  const slantText = formatExact(slant);

  const base = exactPi(pow(radius, 2));
  const side = mulExact(exactPi(radius), slant);

  const surfaces: SurfaceTerm[] = [
    makeSurface(kind, "base", "Base disk", "B", "πr²", `π × ${rs}²`, base),
    makeSurface(
      kind,
      "side",
      "Curved side",
      "S",
      "πrs",
      `π × ${rs} × ${slantText}`,
      side,
    ),
  ];

  return {
    kind,
    name: "Cone",
    dimensions,
    derived: [
      {
        key: "s",
        label: "Slant height s",
        formula: "s = √(r² + h²)",
        substitution: `s = √(${rs}² + ${hs}²)`,
        exact: slant,
      },
    ],
    surfaces,
    surfaceArea: {
      formula: "SA = πr² + πrs",
      substitution: `SA = π × ${rs}² + π × ${rs} × ${slantText}`,
      exact: totalOf(surfaces),
    },
    volume: {
      formula: "V = πr²h / 3",
      substitution: `V = (π × ${rs}² × ${hs}) / 3`,
      exact: exactPi(mul(mul(pow(radius, 2), h), THIRD)),
    },
  };
}

function sphere(dimensions: Dimensions): SolidModel {
  const kind: SolidKind = "sphere";
  const radius = r(dimensions, "r");
  const rs = dec(dimensions.r);
  const surface = exactPi(mul(FOUR, pow(radius, 2)));

  const surfaces: SurfaceTerm[] = [
    makeSurface(
      kind,
      "surface",
      "Curved surface",
      "S",
      "4πr²",
      `4π × ${rs}²`,
      surface,
    ),
  ];

  return {
    kind,
    name: "Sphere",
    dimensions,
    derived: [
      {
        key: "d",
        label: "Diameter d",
        formula: "d = 2r",
        substitution: `d = 2 × ${rs}`,
        exact: exactRational(mul(TWO, radius)),
      },
    ],
    surfaces,
    surfaceArea: {
      formula: "SA = 4πr²",
      substitution: `SA = 4π × ${rs}²`,
      exact: totalOf(surfaces),
    },
    volume: {
      formula: "V = 4πr³ / 3",
      substitution: `V = (4π × ${rs}³) / 3`,
      exact: exactPi(mul(mul(FOUR, pow(radius, 3)), THIRD)),
    },
  };
}

/**
 * The site's logo, taken at its word — and shaped like a keyboard key.
 *
 * The top is a rounded square with straight run m and bezel radius r. The
 * bottom is the parallel rounded square with radius r + b, where b is the
 * outward bevel. Joining matching points makes four slanted rectangles and,
 * across the four corners together, one conical frustum.
 *
 * The side's true edge is t = √(h² + b²). That is the line drawn on the outside
 * of the key; h remains the perpendicular height used by the volume.
 */
function logoSlab(dimensions: Dimensions): SolidModel {
  const kind: SolidKind = "logoSlab";
  const [m, radius, bevel, height] = [
    r(dimensions, "m"),
    r(dimensions, "r"),
    r(dimensions, "b"),
    r(dimensions, "h"),
  ];
  const [ms, rs, bs, hs] = [
    dec(dimensions.m),
    dec(dimensions.r),
    dec(dimensions.b),
    dec(dimensions.h),
  ];
  const bottomRadius = add(radius, bevel);
  const bottomRadiusText = `${rs} + ${bs}`;
  const slant = exactSqrt(add(pow(height, 2), pow(bevel, 2)));
  const slantText = formatExact(slant);

  /** A rounded square is a square, four strips, and four quarter-circles. */
  const face = (corner: Rational): Exact =>
    addExact(
      exactRational(add(pow(m, 2), mul(FOUR, mul(m, corner)))),
      exactPi(pow(corner, 2)),
    );
  const top = face(radius);
  const bottom = face(bottomRadius);
  const topFormula = "m² + 4mr + πr²";
  const topSubstitution = `${ms}² + 4 × ${ms} × ${rs} + π × ${rs}²`;
  const bottomFormula = "m² + 4m(r + b) + π(r + b)²";
  const bottomSubstitution = `${ms}² + 4 × ${ms} × (${bottomRadiusText}) + π × (${bottomRadiusText})²`;

  const surfaces: SurfaceTerm[] = [
    makeSurface(kind, "top", "Top face", "T", topFormula, topSubstitution, top),
    makeSurface(
      kind,
      "bottom",
      "Bottom face",
      "Bt",
      bottomFormula,
      bottomSubstitution,
      bottom,
    ),
    // The four straight sides are separate, so each badge lands on its own
    // face. Each is an m-by-t rectangle tilted out by the bevel.
    ...[1, 2, 3, 4].map((n) =>
      makeSurface(
        kind,
        `flat${n}`,
        `Bevel side ${n}`,
        `S${n}`,
        "m × t",
        `${ms} × ${slantText}`,
        scaleExact(slant, m),
      ),
    ),
    // Four quarter-frusta make one complete conical frustum with top radius r,
    // bottom radius r + b, and slant t.
    makeSurface(
      kind,
      "corners",
      "Four rounded bevel corners",
      "Bz",
      "π(2r + b)t",
      `π × (2 × ${rs} + ${bs}) × ${slantText}`,
      mulExact(exactPi(add(mul(TWO, radius), bevel)), slant),
    ),
  ];

  // At each level the corner radius changes linearly from r + b to r. For
  // A(q) = m² + 4mq + πq², integrating q and q² over the height gives these
  // average coefficients exactly — no mesh approximation enters the volume.
  const averagePlain = add(
    add(pow(m, 2), mul(FOUR, mul(m, radius))),
    mul(TWO, mul(m, bevel)),
  );
  const averagePi = add(
    add(pow(radius, 2), mul(radius, bevel)),
    mul(pow(bevel, 2), THIRD),
  );

  return {
    kind,
    name: "teacher.dev key",
    dimensions,
    derived: [
      {
        key: "t",
        label: "Bevel edge t",
        formula: "t = √(h² + b²)",
        substitution: `t = √(${hs}² + ${bs}²)`,
        exact: slant,
      },
    ],
    surfaces,
    surfaceArea: {
      formula: "SA = A(top) + A(bottom) + 4mt + π(2r + b)t",
      substitution: `SA = (${topSubstitution}) + (${bottomSubstitution}) + 4 × ${ms} × ${slantText} + π × (2 × ${rs} + ${bs}) × ${slantText}`,
      exact: totalOf(surfaces),
    },
    volume: {
      formula: "V = h[m² + 4m(r + b/2) + π(r² + rb + b²/3)]",
      substitution: `V = ${hs}[${ms}² + 4 × ${ms} × (${rs} + ${bs}/2) + π(${rs}² + ${rs} × ${bs} + ${bs}²/3)]`,
      exact: addExact(
        exactRational(mul(height, averagePlain)),
        exactPi(mul(height, averagePi)),
      ),
    },
  };
}

/** Total surface area is always the sum of the listed surfaces, counted once each. */
function totalOf(surfaces: readonly SurfaceTerm[]): Exact {
  return addExact(...surfaces.map((surface) => surface.exact));
}

export const SOLIDS: Record<SolidKind, SolidDefinition> = {
  rectangularPrism: {
    kind: "rectangularPrism",
    name: "Rectangular prism",
    shortName: "Rectangular prism",
    summary: "Six rectangular faces in three matching pairs.",
    dimensions: [
      { key: "l", label: "Length", hint: "Edge running left to right" },
      { key: "w", label: "Width", hint: "Edge running front to back" },
      { key: "h", label: "Height", hint: "Edge running bottom to top" },
    ],
    defaults: { l: 3, w: 4, h: 5 },
    hasNet: true,
    hasCubes: true,
    build: rectangularPrism,
  },
  cube: {
    kind: "cube",
    name: "Cube",
    shortName: "Cube",
    summary: "A prism whose length, width and height are one value.",
    dimensions: [
      { key: "s", label: "Side", hint: "Every edge of a cube is this length" },
    ],
    defaults: { s: 2 },
    hasNet: true,
    hasCubes: true,
    build: cube,
  },
  triangularPrism: {
    kind: "triangularPrism",
    name: "Right-triangular prism",
    shortName: "Triangular prism",
    summary: "Two right-triangle bases joined by three rectangles.",
    dimensions: [
      {
        key: "a",
        label: "Leg a",
        hint: "First perpendicular leg of the right triangle",
      },
      {
        key: "b",
        label: "Leg b",
        hint: "Second perpendicular leg of the right triangle",
      },
      {
        key: "p",
        label: "Prism length",
        hint: "Distance between the two triangular bases",
      },
    ],
    defaults: { a: 3, b: 4, p: 5 },
    hasNet: true,
    hasCubes: false,
    build: triangularPrism,
  },
  squarePyramid: {
    kind: "squarePyramid",
    name: "Square pyramid",
    shortName: "Square pyramid",
    summary: "A square base joined to an apex by four triangular faces.",
    dimensions: [
      {
        key: "b",
        label: "Base side",
        hint: "Length of each side of the square base",
      },
      {
        key: "h",
        label: "Height",
        hint: "Perpendicular height from the base to the apex",
      },
    ],
    defaults: { b: 6, h: 4 },
    hasNet: true,
    hasCubes: false,
    build: squarePyramid,
  },
  cylinder: {
    kind: "cylinder",
    name: "Cylinder",
    shortName: "Cylinder",
    summary: "Two circular disks joined by one curved side.",
    dimensions: [
      { key: "r", label: "Radius", hint: "Radius of each circular base" },
      {
        key: "h",
        label: "Height",
        hint: "Perpendicular distance between the bases",
      },
    ],
    defaults: { r: 2, h: 3 },
    hasNet: true,
    hasCubes: false,
    build: cylinder,
  },
  cone: {
    kind: "cone",
    name: "Cone",
    shortName: "Cone",
    summary: "One circular base and one curved side meeting at a point.",
    dimensions: [
      { key: "r", label: "Radius", hint: "Radius of the circular base" },
      {
        key: "h",
        label: "Height",
        hint: "Perpendicular height from base to apex",
      },
    ],
    defaults: { r: 3, h: 4 },
    hasNet: true,
    hasCubes: false,
    build: cone,
  },
  sphere: {
    kind: "sphere",
    name: "Sphere",
    shortName: "Sphere",
    summary:
      "A single curved surface; every point is the same distance from the centre.",
    dimensions: [
      {
        key: "r",
        label: "Radius",
        hint: "Distance from the centre to the surface",
      },
    ],
    defaults: { r: 3 },
    hasNet: false,
    hasCubes: false,
    build: sphere,
  },
  logoSlab: {
    kind: "logoSlab",
    name: "teacher.dev key",
    shortName: "Logo key",
    summary:
      "The site's own mark as a tapered, rounded keyboard key. Not in the picker.",
    // The logo's own green, so it arrives looking like the mark that summoned
    // it rather than like another slate-blue block.
    baseHue: 79,
    dimensions: [
      {
        key: "m",
        label: "Straight side",
        hint: "The flat run along one side, between two rounded corners",
      },
      {
        key: "r",
        label: "Bezel radius",
        hint: "Radius of each rounded corner on the top face",
      },
      {
        key: "b",
        label: "Bevel",
        hint: "How much farther out the bottom extends on every side",
      },
      {
        key: "h",
        label: "Height",
        hint: "Perpendicular distance from the bottom face to the top face",
      },
    ],
    // h = 2 and b = 1.5 make the visible bevel edge t = 2.5 exactly.
    // These also give pleasantly clean totals: SA = 128 + 16π and
    // V = 88 + 6.5π.
    defaults: { m: 4, r: 1, b: 1.5, h: 2 },
    hasNet: true,
    hasCubes: false,
    build: logoSlab,
  },
};

/**
 * Whether a solid can be shown in a view. Every solid can be shown whole; the
 * other views each hold only for the solids they are exact for, and this is
 * the one place that says which.
 */
export function offersView(kind: SolidKind, view: ViewMode): boolean {
  switch (view) {
    case "solid":
      return true;
    case "cubes":
      return SOLIDS[kind].hasCubes;
    case "net":
      return SOLIDS[kind].hasNet;
  }
}

export function buildSolid(
  kind: SolidKind,
  dimensions: Dimensions,
): SolidModel {
  return SOLIDS[kind].build(dimensions);
}

/** Approximate numeric total, used by tests and by the approximate display. */
export function approximate(calculation: Calculation): number {
  return evalExact(calculation.exact);
}

export function defaultDimensions(): Record<SolidKind, Dimensions> {
  return Object.fromEntries(
    Object.values(SOLIDS).map((definition) => [
      definition.kind,
      { ...definition.defaults },
    ]),
  ) as Record<SolidKind, Dimensions>;
}
