/**
 * Geometric Solids presentation state.
 *
 * Geometry state (solid kind and its last valid dimensions) is kept apart from
 * input drafts and from presentation state. Rotating, highlighting, relabelling
 * units or hiding answers can never change a calculated quantity.
 */
import {
  type CrossSection,
  type SliceDirection,
  type SliceHeading,
  SLICE_HEADINGS,
  clampToRange,
  cutSolid,
  insideRange,
  middleOfRange,
  sliceRange,
} from "$lib/domain/crossSections";
import { type Exact, exactRational } from "$lib/domain/exact";
import { type UnitKey } from "$lib/domain/format";
import { buildEdges, buildMesh } from "$lib/domain/geometry3d";
import { buildNet } from "$lib/domain/nets";
import { add, fromTenths, mul, rational } from "$lib/domain/rational";
import {
  SOLIDS,
  buildSolid,
  defaultDimensions,
  offersView,
} from "$lib/domain/solids";
import type { Dimensions, SolidKind, ViewMode } from "$lib/domain/types";
import {
  CUBE_EDGE_MESSAGE,
  advanceFill,
  cubeBox,
  cubeCount,
  isCubeEdge,
  toCubeEdge,
  type CubeRun,
} from "$lib/domain/unitCubes";
import { dimensionToDraft, parseDimension } from "$lib/domain/validation";
import { surfaceHue } from "$lib/ui/colors";

export type { ViewMode };

/**
 * What the pointer is on, or what has been pinned. A surface target names one
 * external surface; a measure target names a length — every edge that carries
 * that length responds together. A section target names one side of the cross
 * section, or the cross section itself (`section:area`), on the face-on
 * drawing and on the solid at once.
 */
export type Target =
  `surface:${string}` | `measure:${string}` | `section:${string}`;

export function surfaceTarget(surfaceId: string): Target {
  return `surface:${surfaceId}`;
}

export function measureTarget(key: string): Target {
  return `measure:${key}`;
}

/** A side of the cross section by its edge id, or `area` for the whole of it. */
export function sectionTarget(id: string): Target {
  return `section:${id}`;
}

/** A length the solid can show: an independent dimension or a derived one. */
export interface Measure {
  readonly key: string;
  readonly label: string;
  readonly exact: Exact;
  /** Present only for derived lengths, which are worth showing the working for. */
  readonly substitution?: string;
}

/** A three-quarter view that shows three faces of a prism at once. */
const HOME_YAW = -0.62;
const HOME_PITCH = 0.42;

function draftsFor(
  kind: SolidKind,
  dimensions: Dimensions,
): Record<string, string> {
  return Object.fromEntries(
    SOLIDS[kind].dimensions.map((spec) => [
      spec.key,
      dimensionToDraft(dimensions[spec.key]),
    ]),
  );
}

export class LabState {
  // Geometry state.
  kind = $state<SolidKind>("rectangularPrism");
  dimensionsByKind = $state<Record<SolidKind, Dimensions>>(defaultDimensions());

  // Input draft state.
  drafts = $state<Record<string, string>>(
    draftsFor("rectangularPrism", defaultDimensions().rectangularPrism),
  );
  errors = $state<Record<string, string | null>>({});

  // Presentation state.
  view = $state<ViewMode>("solid");
  yaw = $state(HOME_YAW);
  pitch = $state(HOME_PITCH);
  autoRotate = $state(false);
  /** What the pointer or keyboard focus is on right now. */
  hovered = $state<Target | null>(null);
  /** Targets the teacher has clicked, which stay labelled until clicked again. */
  pinned = $state<Target[]>([]);
  unit = $state<UnitKey>("units");
  answersVisible = $state(true);
  showFormulas = $state(false);
  /**
   * How many unit cubes are stacked in the solid; the rest lie in the flat
   * arrangement. Only read in the cube view.
   */
  fill = $state(0);
  /** Which way the cubes are moving on their own, or null while they wait. */
  cubeRun = $state<CubeRun | null>(null);
  sliceDirection = $state<SliceDirection>("horizontal");
  sliceHeading = $state<SliceHeading>("level");
  /**
   * Where the cutting plane is, in the solid's units along its one axis, on a
   * tenth. Null until the slice view is first opened, and for a solid too thin
   * to hold any tenth strictly inside it.
   */
  slicePosition = $state<number | null>(null);

  definition = $derived(SOLIDS[this.kind]);
  dimensions = $derived(this.dimensionsByKind[this.kind]);
  model = $derived(buildSolid(this.kind, this.dimensionsByKind[this.kind]));
  mesh = $derived(buildMesh(this.kind, this.dimensionsByKind[this.kind]));
  net = $derived(buildNet(this.kind, this.dimensionsByKind[this.kind]));
  /** The solid in unit cubes, or null for one that cubes cannot fill. */
  cubes = $derived(cubeBox(this.kind, this.dimensionsByKind[this.kind]));
  cubeTotal = $derived(this.cubes ? cubeCount(this.cubes) : 0);
  /** How far the cutting plane can move: positions strictly inside this. */
  sliceRange = $derived(
    sliceRange(this.kind, this.dimensionsByKind[this.kind], this.sliceHeading),
  );
  /**
   * The cross section on screen, or null for a solid that cannot be sliced. A
   * solid too thin to hold a tenth strictly inside it is cut through its middle.
   */
  section = $derived.by<CrossSection | null>(() => {
    const range = this.sliceRange;
    if (!range) return null;
    const wanted =
      this.slicePosition === null ? null : fromTenths(this.slicePosition);
    const position =
      wanted && insideRange(wanted, range)
        ? wanted
        : mul(add(range.low, range.high), rational(1n, 2n));
    return cutSolid(this.kind, this.dimensions, {
      direction: this.sliceDirection,
      heading: this.sliceHeading,
      position,
    });
  });
  /** Measurement lines follow the view, so a radius is never hidden behind the solid. */
  edges = $derived(
    buildEdges(
      this.kind,
      this.dimensionsByKind[this.kind],
      this.yaw,
      this.pitch,
    ),
  );

  /** Every length this solid can report, keyed by its symbol. */
  measures = $derived.by<Record<string, Measure>>(() => {
    const all: Record<string, Measure> = {};
    for (const spec of this.definition.dimensions) {
      all[spec.key] = {
        key: spec.key,
        label: spec.label,
        exact: exactRational(fromTenths(this.dimensions[spec.key])),
      };
    }
    for (const derived of this.model.derived) {
      all[derived.key] = {
        key: derived.key,
        label: derived.label,
        exact: derived.exact,
        substitution: derived.substitution,
      };
    }
    return all;
  });

  /** Each surface of the current solid gets its own hue, in listed order. */
  huesBySurfaceId = $derived(
    Object.fromEntries(
      this.model.surfaces.map((surface, index) => [
        surface.id,
        surfaceHue(index),
      ]),
    ) as Record<string, number>,
  );

  /** The hue a surface should be drawn in, or null while it is not selected. */
  hueFor(surfaceId: string): number | null {
    return this.isActive(surfaceTarget(surfaceId))
      ? (this.huesBySurfaceId[surfaceId] ?? surfaceHue(0))
      : null;
  }

  isActive(target: Target): boolean {
    return this.hovered === target || this.pinned.includes(target);
  }

  isPinned(target: Target): boolean {
    return this.pinned.includes(target);
  }

  /** Whether the current solid can be shown in a view. */
  offers(view: ViewMode): boolean {
    return offersView(this.kind, view);
  }

  selectKind(kind: SolidKind) {
    if (kind === this.kind) return;
    this.kind = kind;
    this.drafts = draftsFor(kind, this.dimensionsByKind[kind]);
    this.errors = {};
    // Targets belong to one solid kind, so nothing pinned here still applies.
    this.pinned = [];
    this.hovered = null;
    this.resetView();
    if (!offersView(kind, this.view)) this.view = "solid";
    if (this.view === "cubes") this.enterCubes();
    this.fitSlice();
  }

  setView(view: ViewMode) {
    if (!offersView(this.kind, view) || view === this.view) return;
    const leaving = this.view;
    this.view = view;
    // A net is flat; spinning it would be meaningless. A slice holds still so
    // the cut can be talked about.
    if (view === "net" || view === "slice") this.autoRotate = false;
    if (view === "cubes") this.enterCubes();
    if (view === "slice") this.fitSlice();
    // An entry the cube view refused may be fine for the others, but it was
    // never applied: show what the shape actually is rather than apply it now.
    if (leaving === "cubes") {
      this.cubeRun = null;
      this.drafts = draftsFor(this.kind, this.dimensions);
      this.errors = {};
    }
  }

  /**
   * Make the solid one that whole unit cubes fill, and show it full. The edges
   * are rounded and capped where everyone can see it — in the dimension bar —
   * and stay that way after leaving the cube view.
   */
  private enterCubes() {
    const fitted = Object.fromEntries(
      Object.entries(this.dimensions).map(([key, value]) => [
        key,
        toCubeEdge(value),
      ]),
    );
    this.dimensionsByKind = { ...this.dimensionsByKind, [this.kind]: fitted };
    this.drafts = draftsFor(this.kind, fitted);
    this.errors = {};
    this.cubeRun = null;
    this.fill = this.cubeTotal;
  }

  /** Apply a draft. Invalid drafts record an error and leave geometry untouched. */
  setDraft(key: string, raw: string) {
    this.drafts = { ...this.drafts, [key]: raw };
    const parsed = parseDimension(raw);
    if (!parsed.ok) {
      this.errors = { ...this.errors, [key]: parsed.message };
      return;
    }
    if (this.view === "cubes" && !isCubeEdge(parsed.value)) {
      this.errors = { ...this.errors, [key]: CUBE_EDGE_MESSAGE };
      return;
    }
    this.errors = { ...this.errors, [key]: null };
    const wasFull = this.fill >= this.cubeTotal;
    this.dimensionsByKind = {
      ...this.dimensionsByKind,
      [this.kind]: { ...this.dimensionsByKind[this.kind], [key]: parsed.value },
    };
    // A full solid stays full and an empty one empty; a part-filled one keeps
    // its count, which flows into the new rows. Cubes the solid gains lie flat.
    this.fill = wasFull ? this.cubeTotal : Math.min(this.fill, this.cubeTotal);
    this.fitSlice();
  }

  /**
   * Keep the cutting plane where it is, unless the solid no longer reaches
   * there: then pull it back to the nearest tenth inside. The first time, put
   * it half way through.
   */
  private fitSlice() {
    const range = this.sliceRange;
    if (!range) return;
    this.slicePosition =
      this.slicePosition === null
        ? middleOfRange(range)
        : clampToRange(this.slicePosition, range);
  }

  /**
   * Move the cutting plane as near to a position as it can go: onto the
   * nearest tenth, stopping just inside the solid at either end.
   */
  moveSlice(position: number) {
    const range = this.sliceRange;
    if (!range || this.slicePosition === null) return;
    const next = clampToRange(position, range);
    if (next !== null) this.slicePosition = next;
  }

  /** Choose a slice direction, facing the first of its headings. */
  setSliceDirection(direction: SliceDirection) {
    if (direction === this.sliceDirection) return;
    this.sliceDirection = direction;
    this.sliceHeading = SLICE_HEADINGS[direction][0];
    this.fitSlice();
  }

  /** Turn the slice a quarter turn to its direction's next heading. */
  turnSlice() {
    const headings = SLICE_HEADINGS[this.sliceDirection];
    const index = headings.indexOf(this.sliceHeading);
    this.sliceHeading = headings[(index + 1) % headings.length];
    this.fitSlice();
  }

  /** Step a dimension by whole increments, keeping it inside the valid range. */
  nudgeDimension(key: string, delta: number) {
    const current = this.dimensionsByKind[this.kind][key];
    const next = Math.round((current + delta) * 10) / 10;
    this.setDraft(key, dimensionToDraft(next));
  }

  resetView() {
    this.yaw = HOME_YAW;
    this.pitch = HOME_PITCH;
  }

  rotateBy(deltaYaw: number, deltaPitch: number) {
    this.yaw += deltaYaw;
    // Clamping the pitch keeps the solid from tumbling upside down.
    this.pitch = Math.max(
      -Math.PI / 2 + 0.05,
      Math.min(Math.PI / 2 - 0.05, this.pitch + deltaPitch),
    );
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
  }

  hover(target: Target | null) {
    this.hovered = target;
  }

  /** Clear the hover only if it is still the one this element set. */
  unhover(target: Target) {
    if (this.hovered === target) this.hovered = null;
  }

  togglePin(target: Target) {
    this.pinned = this.pinned.includes(target)
      ? this.pinned.filter((pin) => pin !== target)
      : [...this.pinned, target];
  }

  clearPins() {
    this.pinned = [];
  }

  /** Move cubes by hand to a given fill. Stops anything already moving them. */
  placeCubes(fill: number) {
    this.cubeRun = null;
    this.setFill(fill);
  }

  /** Set cubes moving on their own, towards the solid or the flat arrangement. */
  runCubes(run: CubeRun) {
    const goal = run === "flatten" ? 0 : this.cubeTotal;
    if (this.fill === goal) return;
    this.cubeRun = run;
  }

  pauseCubes() {
    this.cubeRun = null;
  }

  /** One tick of a run: `steps` cubes, or `steps` layers when `byLayer`. */
  advanceCubes(steps = 1, byLayer = false) {
    const run = this.cubeRun;
    if (!run || !this.cubes) return;
    this.setFill(advanceFill(this.fill, this.cubes, run, steps, byLayer));
    const goal = run === "flatten" ? 0 : this.cubeTotal;
    if (this.fill === goal) this.cubeRun = null;
  }

  private setFill(fill: number) {
    this.fill = Math.max(0, Math.min(this.cubeTotal, fill));
    // Everything lying flat is a long strip on the floor: like a net, it is
    // there to be read, not spun.
    if (this.fill === 0) this.autoRotate = false;
  }

  toggleAnswers() {
    this.answersVisible = !this.answersVisible;
  }
}
