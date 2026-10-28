import type { Exact } from "./exact";

export type SolidKind =
  | "rectangularPrism"
  | "cube"
  | "triangularPrism"
  | "squarePyramid"
  | "cylinder"
  | "cone"
  | "sphere"
  | "logoSlab";

/** The solids the shape picker offers, in the order it shows them. */
export const SOLID_ORDER: readonly SolidKind[] = [
  "rectangularPrism",
  "cube",
  "triangularPrism",
  "squarePyramid",
  "cylinder",
  "cone",
  "sphere",
];

/**
 * Every solid the lab can build. The logo is not in the picker — it is reached
 * by clicking the mark beside it — but it is a solid like any other and has to
 * hold up to the same checks.
 */
export const SOLID_KINDS: readonly SolidKind[] = [...SOLID_ORDER, "logoSlab"];

/** The ways the lab can show a solid, in the order their tabs appear. */
export type ViewMode = "solid" | "cubes" | "net" | "slice";

export const VIEW_ORDER: readonly ViewMode[] = [
  "solid",
  "cubes",
  "net",
  "slice",
];

/** Independent dimensions, keyed by their mathematical symbol. */
export type Dimensions = Readonly<Record<string, number>>;

export interface DimensionSpec {
  /** Symbol used in formulas, and the key into {@link Dimensions}. */
  readonly key: string;
  /** Plain-language name shown next to the input. */
  readonly label: string;
  /** Extra explanation for screen readers and the input hint. */
  readonly hint: string;
}

export interface DerivedValue {
  readonly key: string;
  readonly label: string;
  readonly formula: string;
  readonly substitution: string;
  readonly exact: Exact;
}

/**
 * One external surface. `id` is namespaced by solid kind so a selection can
 * never leak from one solid into another, and `code` is the short badge shown
 * on the solid, on the net and beside the calculation so the link between them
 * does not depend on colour.
 */
export interface SurfaceTerm {
  readonly id: string;
  readonly localId: string;
  readonly name: string;
  readonly code: string;
  readonly formula: string;
  readonly substitution: string;
  readonly exact: Exact;
}

export interface Calculation {
  readonly formula: string;
  readonly substitution: string;
  readonly exact: Exact;
}

export interface SolidModel {
  readonly kind: SolidKind;
  readonly name: string;
  readonly dimensions: Dimensions;
  readonly derived: readonly DerivedValue[];
  readonly surfaces: readonly SurfaceTerm[];
  readonly surfaceArea: Calculation;
  readonly volume: Calculation;
}

export const DIMENSION_MIN = 0.1;
/** The range the drag slider covers: the sizes that read well on screen. */
export const DIMENSION_MAX = 20;
/**
 * Typed entries are allowed far past the slider, so a class can try a
 * warehouse-sized prism. The views scale to whatever they are given.
 */
export const DIMENSION_TYPED_MAX = 100000;
export const DIMENSION_STEP = 0.1;
