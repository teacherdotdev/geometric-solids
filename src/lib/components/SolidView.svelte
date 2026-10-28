<script lang="ts">
  import Floor from "$lib/components/Floor.svelte";
  import MathText from "$lib/components/MathText.svelte";
  import { clampToRange } from "$lib/domain/crossSections";
  import { evalExact, formatExact } from "$lib/domain/exact";
  import { approximateText, formatApproximate } from "$lib/domain/format";
  import {
    centroid,
    normalOf,
    projectPoint,
    rotatePoint,
    type MeasuredEdge,
    type Vec3,
  } from "$lib/domain/geometry3d";
  import { DIMENSION_MAX } from "$lib/domain/types";
  import {
    domainText,
    slicePositionLabel,
    t,
    unitLabels,
  } from "$lib/i18n/index.svelte";
  import {
    measureTarget,
    sectionTarget,
    surfaceTarget,
    type LabState,
    type Target,
  } from "$lib/state/lab.svelte";
  import { HATCH_PATTERN_ID, chipTint, facetFill } from "$lib/ui/colors";
  import {
    LOGO_MARK_INK,
    LOGO_MARK_LOOP,
    LOGO_MARK_STROKE,
    LOGO_MARK_TICK,
    logoMarkTransform,
  } from "$lib/ui/logoMark";
  import { floorPlane } from "$lib/ui/floor";
  import { fitFraction, gridLayers, gridScale } from "$lib/ui/grid";
  import { measureBox } from "$lib/ui/measureBox";
  import { stageRise, stageRoom } from "$lib/ui/stage";

  let {
    lab,
    reducedMotion = false,
    animationWindow,
    compact = false,
    lift = 0,
    chrome = 0,
    shift = 0,
    pixelsPerUnit,
    onGrid,
  }: {
    lab: LabState;
    reducedMotion?: boolean;
    animationWindow?: Window;
    /** Shorten the unit words where the window has no room for them. */
    compact?: boolean;
    /**
     * How far above the middle to hold the shape, in CSS pixels. The panels
     * along the bottom edge take more room than the top row does, so the caller
     * measures the difference and the shape sits in what is left over.
     */
    lift?: number;
    /**
     * How much of the height the panels over the drawing have taken, top and
     * bottom together, in CSS pixels. The shape is fitted to what is left, so a
     * window shrunk around it gives up shape rather than burying it.
     */
    chrome?: number;
    /**
     * How far left of the middle to hold the shape, in CSS pixels, for a
     * drawing that shares the window with something along its right edge. The
     * shape is fitted to what is left of the width beside it.
     */
    shift?: number;
    /**
     * A scale set by the lab rather than fitted here, for a drawing whose size
     * has to agree with another one beside it.
     */
    pixelsPerUnit?: number;
    /**
     * Where to report the size of one grid square, in the shape's own units.
     * The step is settled here, out of the fit to this element, but it is read
     * off a key in the corner of the lab: only the lab knows what room the
     * panels have left in that corner.
     */
    onGrid?: (step: number) => void;
  } = $props();

  const LIGHT: Vec3 = [-0.32, 0.66, 0.68];

  // The viewBox tracks the element's real pixel size, so one user unit is one
  // CSS pixel: the labels overlaid on top can then be positioned in pixels
  // straight from the projected geometry.
  let boxWidth = $state(900);
  let boxHeight = $state(650);
  /**
   * Whether those are the element's own numbers yet, rather than the guess the
   * component starts with. The drawing survives a wrong guess — the viewBox
   * scales it to fit either way — but the labels over it are placed in CSS
   * pixels, so on a prerendered page they would paint somewhere near the top
   * left and jump into place at hydration. They wait for the measurement.
   */
  let measured = $state(false);
  const halfWidth = $derived(Math.max(boxWidth, 1) / 2);
  const halfHeight = $derived(Math.max(boxHeight, 1) / 2);
  /** Never so far up that the shape leaves the top of the window. See stage.ts. */
  const rise = $derived(stageRise(boxHeight, lift));
  /** Half the height the shape may be fitted to, once the panels have theirs. */
  const room = $derived(stageRoom(boxHeight, chrome));
  /** Where the middle of the shape lands, measured down from the top edge. */
  const centerY = $derived(halfHeight - rise);
  /** Where the middle of the shape lands, measured in from the left edge. */
  const centerX = $derived(halfWidth - Math.min(shift, halfWidth / 2));
  /** The extent of the largest solid the sliders reach: a sphere of radius 20. */
  const FULL_EXTENT = DIMENSION_MAX;
  const scale = $derived(
    pixelsPerUnit ??
      // The fit is measured against the clear band, not the window, so the
      // solid grows into the room it actually has.
      (Math.min(centerX, room) *
        0.78 *
        fitFraction(lab.mesh.extent, FULL_EXTENT)) /
        lab.mesh.extent,
  );

  /**
   * The drawing is always fitted to the screen, so growing a cube would change
   * nothing on its own. The floor under it is what shows the size: its ruling
   * is a fixed number of units apart, so the solid straddles more squares as it
   * grows. See floor.ts.
   */
  const grid = $derived(gridScale(scale));
  /** How dark the ruling sits against the backdrop. */
  const FLOOR_INK = 0.55;
  const gridInk = $derived(gridLayers(FLOOR_INK, grid.fade));

  // Report the step rather than draw it: the key to the grid lives with the
  // totals, where the other numbers about the shape are.
  $effect(() => {
    onGrid?.(grid.step);
  });

  /**
   * The foot of the solid. Every mesh is built around its own centre, so this
   * is below the origin, and it is where the floor goes: the solid should stand
   * on the plane rather than hover over it or sink into it.
   */
  const baseY = $derived.by(() => {
    let lowest = 0;
    for (const facet of lab.mesh.facets) {
      for (const [, y] of facet.points) if (y < lowest) lowest = y;
    }
    return lowest;
  });

  /**
   * The near corner of the solid's footprint: the smallest x and z it reaches.
   * The ruling is anchored there rather than on the centre of the floor, so the
   * squares line up with the solid's own edges and can be counted along them.
   * See floorRules.
   */
  const footprint = $derived.by(() => {
    let x = 0;
    let z = 0;
    for (const facet of lab.mesh.facets) {
      for (const [px, , pz] of facet.points) {
        if (px < x) x = px;
        if (pz < z) z = pz;
      }
    }
    return { x, z };
  });

  /**
   * How far the floor reaches, as a multiple of the solid's own size. A fitted
   * solid is always about the same size on screen, so this keeps the floor about
   * the same size on screen too — a patch of ground the solid stands on, not a
   * ruled backdrop. What changes with the shape is how many squares fit on it.
   */
  const FLOOR_REACH = 2.4;
  const floorRadius = $derived(lab.mesh.extent * FLOOR_REACH);
  const floor = $derived(floorPlane(lab.yaw, lab.pitch, scale, baseY));
  // Finer ruling first, so the coarse one fades out over it rather than over
  // the bare floor: see gridLayers. A layer with no ink left in it is dropped
  // rather than drawn invisibly, which is a hundred-odd lines saved.
  const floorLayers = $derived(
    [
      { key: "fine", step: grid.fineStep, ink: gridInk.fine },
      { key: "coarse", step: grid.step, ink: gridInk.coarse },
    ].filter((layer) => layer.ink > 0.004),
  );

  const linear = $derived(unitLabels(lab.unit).linear);
  const areaUnit = $derived(
    compact ? unitLabels(lab.unit).areaShort : unitLabels(lab.unit).area,
  );

  /**
   * In the slice view the solid is drawn see-through, so the cross section can
   * be seen inside it. Every solid here is convex, so the cross section always
   * lies behind the faces turned toward the viewer and in front of the ones
   * turned away: drawing the far faces, then the cross section, then the near
   * faces faintly over it puts everything in the right order without sorting.
   */
  const section = $derived(lab.view === "slice" ? lab.section : null);

  interface DrawnFacet {
    surfaceId: string;
    /** Turned away from the viewer: only drawn while the solid is see-through. */
    far: boolean;
    points: string;
    fill: string;
    stroke: string;
    depth: number;
    area: number;
    center: [number, number];
  }

  const facets = $derived.by<DrawnFacet[]>(() => {
    const drawn: DrawnFacet[] = [];
    for (const facet of lab.mesh.facets) {
      const rotated = facet.points.map((point) =>
        rotatePoint(point, lab.yaw, lab.pitch),
      );
      const normal = normalOf(rotated);
      const length = Math.hypot(normal[0], normal[1], normal[2]);
      if (length === 0) continue;
      // Back faces of a closed convex solid are never visible, unless the
      // solid is see-through.
      const far = normal[2] / length <= 1e-6;
      if (far && !section) continue;

      const unit: Vec3 = [
        normal[0] / length,
        normal[1] / length,
        normal[2] / length,
      ];
      const diffuse = Math.max(
        0,
        unit[0] * LIGHT[0] + unit[1] * LIGHT[1] + unit[2] * LIGHT[2],
      );
      const projected = rotated.map((point) => projectPoint(point, scale));
      // Null hue means "not selected": each selected surface keeps its own.
      const hue = lab.hueFor(facet.surfaceId);

      const fill = facetFill(hue, diffuse, lab.definition.baseHue ?? null);
      drawn.push({
        surfaceId: facet.surfaceId,
        far,
        points: projected
          .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
          .join(" "),
        fill,
        // Tessellation seams are hidden so a curved surface reads as curved;
        // real edges between flat faces keep their outline.
        stroke: facet.curved ? fill : "#0b1a22",
        depth: centroid(rotated)[2],
        area: projectedArea(projected),
        center: projectedCentroid(projected),
      });
    }
    return drawn.sort((a, b) => a.depth - b.depth);
  });

  const nearFacets = $derived(facets.filter((facet) => !facet.far));
  const farFacets = $derived(facets.filter((facet) => facet.far));

  function projectAll(points: readonly Vec3[]): string {
    return points
      .map((point) => {
        const [x, y] = projectPoint(
          rotatePoint(point, lab.yaw, lab.pitch),
          scale,
        );
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }

  /**
   * The cutting plane and where it meets the solid, projected. The plane is
   * drawn as a sheet a little wider than the solid, so it reads as a flat cut
   * running right through it rather than as a face of its own.
   */
  const slicing = $derived.by(() => {
    if (!section) return null;
    const { origin, across, up } = section.plane;
    // The sheet and its arrow hang where the plane crosses the line through
    // the middle of the solid along the way it moves, where the position is
    // measured, not on the middle of the cut: that shifts sideways as the cut
    // changes shape, which would make a diagonal slice look as if it slid
    // along its slope rather than rising straight up.
    const anchor = section.travel.to3d;
    // Wide enough to run right through the solid from wherever it hangs.
    const reachOut =
      lab.mesh.extent * 1.35 +
      Math.hypot(
        anchor[0] - origin[0],
        anchor[1] - origin[1],
        anchor[2] - origin[2],
      );
    const corner = (i: number, j: number): Vec3 => [
      anchor[0] + (across[0] * i + up[0] * j) * reachOut,
      anchor[1] + (across[1] * i + up[1] * j) * reachOut,
      anchor[2] + (across[2] * i + up[2] * j) * reachOut,
    ];
    const at = (point: Vec3) =>
      projectPoint(rotatePoint(point, lab.yaw, lab.pitch), scale);
    const along = (from: Vec3, direction: Vec3, length: number): Vec3 => [
      from[0] + direction[0] * length,
      from[1] + direction[1] * length,
      from[2] + direction[2] * length,
    ];

    // What the position measures: a dashed line up the arrow's line, from
    // where the plane crossed it on first touching the solid to the arrow.
    const from = at(section.travel.from3d);
    const to = at(section.travel.to3d);

    // The angle the plane makes with the bottom face, opening from the floor
    // up the plane: a square for a right angle, an arc for 45°.
    let angle = null;
    if (section.angle) {
      const { at: corner3d, floor, rise, degrees } = section.angle;
      const arm = lab.mesh.extent * 0.32;
      const mark = arm * 0.45;
      const blend = (share: number): Vec3 => {
        const mixed: Vec3 = [
          floor[0] * (1 - share) + rise[0] * share,
          floor[1] * (1 - share) + rise[1] * share,
          floor[2] * (1 - share) + rise[2] * share,
        ];
        const length = Math.hypot(...mixed);
        return [mixed[0] / length, mixed[1] / length, mixed[2] / length];
      };
      const arc =
        degrees === 90
          ? [
              along(corner3d, floor, mark),
              along(along(corner3d, floor, mark), rise, mark),
              along(corner3d, rise, mark),
            ]
          : Array.from({ length: 9 }, (_, i) =>
              along(corner3d, blend(i / 8), mark),
            );
      angle = {
        arms: projectAll([
          along(corner3d, floor, arm),
          corner3d,
          along(corner3d, rise, arm),
        ]),
        arc: projectAll(arc),
        label: at(along(corner3d, blend(0.5), arm * 0.8)),
        degrees,
      };
    }

    // The arrow that moves the plane, pointing the way it moves, so it only
    // ever travels along itself. Seen almost end-on that way is too short on
    // screen to drag along at the pointer's pace, so a drag there takes more
    // pixels.
    const middle = at(anchor);
    const ahead = at(along(anchor, section.slide, 1));
    const step = [ahead[0] - middle[0], ahead[1] - middle[1]];
    const length = Math.hypot(step[0], step[1]);
    const direction: [number, number] =
      length < 1e-6 ? [0, -1] : [step[0] / length, step[1] / length];
    const handle = {
      at: middle,
      direction,
      pixelsPerUnit: Math.max(length, scale * 0.35),
      degrees: (Math.atan2(direction[1], direction[0]) * 180) / Math.PI,
    };

    return {
      handle,
      sheet: projectAll([
        corner(-1, -1),
        corner(1, -1),
        corner(1, 1),
        corner(-1, 1),
      ]),
      outline: projectAll(section.outline3d),
      travel: { from, to }, // Each side of the cut, so it can be pointed at here and light up on the
      // face-on drawing, and the other way round.
      sides: section.edges.map((edge) => {
        const [x1, y1] = at(edge.from3d);
        const [x2, y2] = at(edge.to3d);
        const target = sectionTarget(edge.id);
        return { id: edge.id, target, x1, y1, x2, y2 };
      }),
      heights: section.lines.map((line) => {
        const [x1, y1] = at(line.from3d);
        const [x2, y2] = at(line.to3d);
        return { id: line.id, always: line.always, x1, y1, x2, y2 };
      }),

      angle,
    };
  });

  /**
   * The logo's doodle, placed on the tile's top face. Null whenever there is
   * nothing to place it on: another solid, or this one turned face-away.
   */
  const logoMark = $derived.by(() => {
    if (lab.kind !== "logoSlab") return null;
    const up = rotatePoint([0, 1, 0], lab.yaw, lab.pitch);
    if (up[2] <= 1e-6) return null;

    const { m, r, h } = lab.dimensions;
    // The artwork belongs to the smaller top face. Its own diagonal basis maps
    // to that rounded square, not to the wider footprint below it.
    const reach = (m + 2 * r) / 2;
    const at = (x: number, z: number) =>
      projectPoint(rotatePoint([x, h / 2, z], lab.yaw, lab.pitch), scale);
    // The artwork's first half-diagonal runs to the tile corner that the home
    // view puts on the right, and its second to the one nearest the viewer, so
    // the doodle lands the way round it does on the mark itself.
    return logoMarkTransform(at(0, 0), at(reach, -reach), at(reach, reach));
  });

  // Which drawn edge the pointer is on. The lab only knows which *length* is
  // active; this is purely about where to put the label.
  let hoveredEdgeId = $state<string | null>(null);

  interface DrawnEdge {
    edge: MeasuredEdge;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    mid: [number, number];
    depth: number;
    active: boolean;
  }

  /**
   * An edge of a convex solid is visible exactly when one of the faces meeting
   * along it faces the viewer. Drawn measurement lines carry no normals: they
   * are placed against the current view and always shown.
   */
  const edges = $derived.by<DrawnEdge[]>(() => {
    const drawn: DrawnEdge[] = [];
    for (const edge of lab.edges) {
      const visible =
        edge.normals.length === 0 ||
        edge.normals.some(
          (normal) => rotatePoint(normal, lab.yaw, lab.pitch)[2] > 1e-6,
        );
      if (!visible) continue;

      const a = rotatePoint(edge.a, lab.yaw, lab.pitch);
      const b = rotatePoint(edge.b, lab.yaw, lab.pitch);
      const [x1, y1] = projectPoint(a, scale);
      const [x2, y2] = projectPoint(b, scale);
      drawn.push({
        edge,
        x1,
        y1,
        x2,
        y2,
        mid: [(x1 + x2) / 2, (y1 + y2) / 2],
        depth: (a[2] + b[2]) / 2,
        active: lab.isActive(measureTarget(edge.measure)),
      });
    }
    return drawn;
  });

  /**
   * One badge per visible surface, at the area-weighted centre of everything
   * that surface currently shows. Weighting by area keeps the badge near the
   * middle of a tessellated sphere or cylinder instead of on one stray tile.
   */
  const badges = $derived.by(() => {
    const totals: Record<string, { x: number; y: number; area: number }> = {};
    for (const facet of facets) {
      const running = (totals[facet.surfaceId] ??= { x: 0, y: 0, area: 0 });
      running.x += facet.center[0] * facet.area;
      running.y += facet.center[1] * facet.area;
      running.area += facet.area;
    }
    // A see-through solid is there to show the cut; its faces are not what is
    // being measured.
    if (section) return [];
    return lab.model.surfaces
      .filter((surface) => (totals[surface.id]?.area ?? 0) > 0)
      .map((surface) => {
        const running = totals[surface.id];
        const target = surfaceTarget(surface.id);
        return {
          surface,
          target,
          tint: chipTint(lab.huesBySurfaceId[surface.id] ?? 0),
          active: lab.isActive(target),
          pinned: lab.isPinned(target),
          // A face shows its exact area only: the rounded reading belongs to
          // the totals card, where there is room to explain it.
          value: formatExact(surface.exact),
          x: centerX + running.x / running.area,
          y: centerY + running.y / running.area,
        };
      });
  });

  /**
   * One label per active length. Every edge carrying that length lights up, and
   * the label lands on the edge under the pointer, or on the frontmost one when
   * the length was pinned from the keyboard or the dimension bar.
   */
  const edgeLabels = $derived.by(() => {
    const chosen: Record<string, DrawnEdge> = {};
    for (const drawn of edges) {
      if (!drawn.active) continue;
      const key = drawn.edge.measure;
      const current = chosen[key];
      const preferred = drawn.edge.id === hoveredEdgeId;
      if (
        !current ||
        preferred ||
        (current.edge.id !== hoveredEdgeId && drawn.depth > current.depth)
      ) {
        chosen[key] = drawn;
      }
    }

    return Object.values(chosen).flatMap((drawn) => {
      const measure = lab.measures[drawn.edge.measure];
      if (!measure) return [];
      const target = measureTarget(measure.key);
      const value = evalExact(measure.exact);
      // Nudge the label off the edge so the line it measures stays readable.
      const distance = Math.hypot(drawn.mid[0], drawn.mid[1]);
      const push = distance > 1 ? (distance + 26) / distance : 1;
      return [
        {
          target,
          pinned: lab.isPinned(target),
          working: measure.substitution ?? null,
          text: `${measure.key} = ${formatExact(measure.exact)} ${linear}`,
          approximate: formatApproximate(value).rounded
            ? `${approximateText(value)} ${linear}`
            : null,
          x: centerX + drawn.mid[0] * push,
          y: centerY + drawn.mid[1] * push,
        },
      ];
    });
  });

  function projectedArea(
    points: readonly (readonly [number, number])[],
  ): number {
    let total = 0;
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      total += x1 * y2 - x2 * y1;
    }
    return Math.abs(total) / 2;
  }

  function projectedCentroid(
    points: readonly (readonly [number, number])[],
  ): [number, number] {
    const sum = points.reduce<[number, number]>(
      (acc, p) => [acc[0] + p[0], acc[1] + p[1]],
      [0, 0],
    );
    return [sum[0] / points.length, sum[1] / points.length];
  }

  let dragging = $state(false);
  let dragged = $state(false);
  let last: { x: number; y: number } | null = null;
  let pressed: Target | null = null;

  /** The nearest drawable thing under an event, read straight off the markup. */
  function hitOf(event: Event) {
    const element = event.target as Element | null;
    const node = element?.closest?.("[data-target]") ?? null;
    return {
      target: (node?.getAttribute("data-target") as Target | null) ?? null,
      edgeId: node?.getAttribute("data-edge") ?? null,
    };
  }

  function onPointerOver(event: PointerEvent) {
    if (dragging) return;
    const hit = hitOf(event);
    lab.hover(hit.target);
    hoveredEdgeId = hit.edgeId;
    if ((event.target as Element | null)?.closest?.("[data-slice]"))
      showHandle();
    else hideHandleSoon();
  }

  function clearHover() {
    lab.hover(null);
    hoveredEdgeId = null;
    hideHandleSoon();
  }

  /**
   * Whether the slice's arrow is showing. It appears while the pointer is over
   * the cut on the solid or the arrow itself, and lingers a moment after, long
   * enough to reach an arrow that hangs off the cut.
   */
  let handleShown = $state(false);
  let handleTimer: ReturnType<typeof setTimeout> | undefined;

  function showHandle() {
    clearTimeout(handleTimer);
    handleTimer = undefined;
    handleShown = true;
  }

  function hideHandleSoon() {
    if (!handleShown || handleTimer !== undefined) return;
    handleTimer = setTimeout(() => {
      handleTimer = undefined;
      handleShown = false;
    }, 500);
  }

  $effect(() => () => clearTimeout(handleTimer));

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    dragging = true;
    dragged = false;
    // Capturing the pointer keeps a drag alive outside the drawing, but it also
    // retargets the click that follows to the <svg> itself, so what was pressed
    // has to be remembered from here.
    pressed = hitOf(event).target;
    last = { x: event.clientX, y: event.clientY };
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || !last) return;
    // A few pixels of jitter still counts as a click on the face underneath.
    if (Math.abs(event.clientX - last.x) + Math.abs(event.clientY - last.y) > 3)
      dragged = true;
    lab.rotateBy(
      (event.clientX - last.x) * 0.008,
      (event.clientY - last.y) * 0.008,
    );
    last = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent) {
    dragging = false;
    last = null;
    const target = event.currentTarget as SVGSVGElement;
    if (target.hasPointerCapture(event.pointerId))
      target.releasePointerCapture(event.pointerId);
  }

  function onClick() {
    // A drag that ends on a face is a rotation, not a choice of face.
    if (dragged) {
      dragged = false;
      return;
    }
    if (pressed) lab.togglePin(pressed);
  }

  /** A drag of the slice's arrow: where it started, and the position then. */
  let sliding = $state<{ x: number; y: number; from: number } | null>(null);

  function onHandleDown(event: PointerEvent) {
    if (event.button !== 0 || lab.slicePosition === null) return;
    event.preventDefault();
    sliding = { x: event.clientX, y: event.clientY, from: lab.slicePosition };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onHandleMove(event: PointerEvent) {
    if (!sliding || !slicing) return;
    // Only the part of the drag along the arrow moves the plane.
    const { direction, pixelsPerUnit } = slicing.handle;
    const along =
      (event.clientX - sliding.x) * direction[0] +
      (event.clientY - sliding.y) * direction[1];
    lab.moveSlice(sliding.from + along / pixelsPerUnit);
  }

  function onHandleUp(event: PointerEvent) {
    sliding = null;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId))
      target.releasePointerCapture(event.pointerId);
  }

  /**
   * How far out along the slice's arrow its heads sit, clear of the position
   * written in its middle: as far as the arrow runs inside the label, plus a
   * gap. The label is about 7.2px a character in the mono font, plus its
   * padding, and 20px high.
   */
  const handleReach = $derived.by(() => {
    if (!slicing || lab.slicePosition === null) return 28;
    const width = String(lab.slicePosition).length * 7.2 + 14;
    const [dx, dy] = slicing.handle.direction;
    const inside = Math.min(
      Math.abs(dx) < 1e-6 ? Infinity : width / 2 / Math.abs(dx),
      Math.abs(dy) < 1e-6 ? Infinity : 10 / Math.abs(dy),
    );
    return Math.max(28, inside + 14);
  });

  /** The first and last tenth the plane can stop on, strictly inside. */
  const sliceEnds = $derived.by(() => {
    const range = lab.sliceRange;
    if (!range) return null;
    return {
      lowest: clampToRange(-Infinity, range),
      highest: clampToRange(Infinity, range),
    };
  });

  function onHandleKey(event: KeyboardEvent) {
    if (lab.slicePosition === null || !sliceEnds) return;
    const steps: Record<string, number> = {
      ArrowUp: 0.1,
      ArrowRight: 0.1,
      ArrowDown: -0.1,
      ArrowLeft: -0.1,
      PageUp: 1,
      PageDown: -1,
    };
    let next: number | null = null;
    if (event.key in steps)
      next = Math.round((lab.slicePosition + steps[event.key]) * 10) / 10;
    else if (event.key === "Home") next = sliceEnds.lowest;
    else if (event.key === "End") next = sliceEnds.highest;
    if (next === null) return;
    event.preventDefault();
    lab.moveSlice(next);
  }

  const STEP = 0.18;

  function onKeyDown(event: KeyboardEvent) {
    // Only when the drawing itself has focus: labels above it handle their own keys.
    if (event.target !== event.currentTarget) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-STEP, 0],
      ArrowRight: [STEP, 0],
      ArrowUp: [0, -STEP],
      ArrowDown: [0, STEP],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      lab.rotateBy(move[0], move[1]);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      lab.resetView();
    }
  }

  // Auto-rotation runs only while the solid view is showing, and never when the
  // viewer has asked for reduced motion. Use the floating window's animation
  // clock while the lab is in Picture-in-Picture; a hidden opener tab may pause
  // its own animation frames.
  $effect(() => {
    if (!lab.autoRotate || lab.view !== "solid" || reducedMotion) return;
    const clock = animationWindow ?? window;
    let frame = 0;
    let previous = clock.performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      lab.rotateBy((elapsed / 1000) * 0.5, 0);
      frame = clock.requestAnimationFrame(tick);
    };
    frame = clock.requestAnimationFrame(tick);
    return () => clock.cancelAnimationFrame(frame);
  });

  const description = $derived(
    t("solid.description", {
      name: domainText(lab.model.name),
      dimensions: lab.definition.dimensions
        .map(
          (spec) =>
            `${domainText(spec.label).toLocaleLowerCase()} ${lab.dimensions[spec.key]}`,
        )
        .join(", "),
      unit: linear,
    }),
  );

  // The chip's colours are set per surface, so only the shape of it is shared.
  const chip =
    "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-lg border px-2 py-1 text-left font-mono text-xs leading-tight shadow-lg shadow-ink/20 backdrop-blur-sm";
  const measureChip = `${chip} border-flag bg-flag-soft/95`;

  /**
   * An open label sits over the very thing it measures, so while it is only
   * following the pointer it stays transparent to it — otherwise it would take
   * the hover away from the face underneath and shut itself again. Once pinned
   * it takes the pointer back, so clicking it can unpin it.
   */
  function reach(pinned: boolean): string {
    return pinned ? "pointer-events-auto" : "pointer-events-none";
  }
</script>

<!--
  The drawing is a focusable image: screen readers announce `description`, and
  sighted keyboard users can rotate it with the arrow keys. Dragging and arrow
  keys here are conveniences — every rotation action also exists as a labelled
  button, and every measurement can be reached from the badges above the shape
  or from the dimension bar, which is the accessible path.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="relative h-full w-full"
  use:measureBox={(width, height) => {
    boxWidth = width;
    boxHeight = height;
    measured = true;
  }}
  onpointerleave={clearHover}
>
  <svg
    class="h-full w-full touch-none select-none"
    class:cursor-grab={!dragging}
    class:cursor-grabbing={dragging}
    viewBox="{-centerX} {-centerY} {halfWidth * 2} {halfHeight * 2}"
    role="img"
    tabindex="0"
    aria-label={description}
    data-testid="solid-view"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onpointerover={onPointerOver}
    onclick={onClick}
    onkeydown={onKeyDown}
  >
    <defs>
      <pattern
        id={HATCH_PATTERN_ID}
        width="14"
        height="14"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="14"
          stroke="#1f2937"
          stroke-width="4"
          stroke-opacity="0.45"
        />
      </pattern>
    </defs>

    {#snippet ground()}
      <Floor
        {floor}
        radius={floorRadius}
        layers={floorLayers}
        {footprint}
        view={{
          x: -centerX,
          y: -centerY,
          width: halfWidth * 2,
          height: halfHeight * 2,
        }}
      />
    {/snippet}

    <!-- Seen from above the solid stands on the floor and hides the part it
         covers; seen from below the floor is between the viewer and the solid,
         so it goes on top instead. -->
    {#if !floor.fromBelow}{@render ground()}{/if}

    {#if slicing}
      <!-- The plane first: inside the solid the far faces and the cross
           section cover it, and outside it shows as a faint sheet. -->
      <polygon
        points={slicing.sheet}
        fill="#f59e0b"
        fill-opacity="0.12"
        stroke="#b45309"
        stroke-opacity="0.45"
        stroke-width="1.5"
        stroke-dasharray="6 5"
        pointer-events="none"
        data-testid="cutting-plane"
      />
      {#each farFacets as facet, index (index)}
        <polygon
          points={facet.points}
          fill={facet.fill}
          fill-opacity="0.55"
          stroke={facet.stroke}
          stroke-opacity="0.35"
          stroke-width="1"
          stroke-linejoin="round"
          pointer-events="none"
        />
      {/each}
      <polygon
        points={slicing.outline}
        fill="#f59e0b"
        fill-opacity={lab.isActive(sectionTarget("area")) ? 1 : 0.85}
        stroke="none"
        class="cursor-pointer"
        data-target={sectionTarget("area")}
        data-slice
        data-testid="section-on-solid"
      />
      {#each nearFacets as facet, index (index)}
        <polygon
          points={facet.points}
          fill={facet.fill}
          fill-opacity="0.35"
          stroke={facet.stroke}
          stroke-opacity={facet.stroke === "#0b1a22" ? 0.8 : 0}
          stroke-width="1.5"
          stroke-linejoin="round"
          pointer-events="none"
        />
      {/each}
      <polygon
        points={slicing.outline}
        fill="none"
        stroke="#b45309"
        stroke-width="3"
        stroke-linejoin="round"
        pointer-events="none"
      />
      {#each slicing.heights as height (height.id)}
        {#if height.always || lab.isActive(sectionTarget("area"))}
          <line
            x1={height.x1}
            y1={height.y1}
            x2={height.x2}
            y2={height.y2}
            stroke="#7c2d12"
            stroke-width="2"
            stroke-dasharray="6 4"
            pointer-events="none"
          />
        {/if}
      {/each}
      {#each slicing.sides as side (side.id)}
        {#if lab.isActive(side.target)}
          <line
            x1={side.x1}
            y1={side.y1}
            x2={side.x2}
            y2={side.y2}
            stroke="#c2410c"
            stroke-width="6"
            stroke-linecap="round"
            pointer-events="none"
            data-testid="section-side-on-solid"
          />
        {/if}
        <line
          x1={side.x1}
          y1={side.y1}
          x2={side.x2}
          y2={side.y2}
          stroke="transparent"
          stroke-width="14"
          stroke-linecap="round"
          class="cursor-pointer"
          data-target={side.target}
          data-section-side={side.id}
          data-slice
        />
      {/each}
      <line
        x1={slicing.travel.from[0]}
        y1={slicing.travel.from[1]}
        x2={slicing.travel.to[0]}
        y2={slicing.travel.to[1]}
        stroke="#7c2d12"
        stroke-width="2"
        stroke-dasharray="5 4"
        stroke-linecap="round"
        pointer-events="none"
        data-testid="slice-travel"
      />
      <circle
        cx={slicing.travel.from[0]}
        cy={slicing.travel.from[1]}
        r="3.5"
        fill="#7c2d12"
        pointer-events="none"
      />
      {#if slicing.angle}
        <g
          fill="none"
          stroke="#7c2d12"
          stroke-width="1.8"
          stroke-linejoin="round"
          pointer-events="none"
          data-testid="slice-angle"
        >
          <polyline points={slicing.angle.arms} />
          <polyline points={slicing.angle.arc} />
        </g>
      {/if}
    {:else}
      {#each facets as facet, index (index)}
        <polygon
          points={facet.points}
          fill={facet.fill}
          stroke={facet.stroke}
          stroke-width={facet.stroke === "#0b1a22" &&
          lab.isActive(surfaceTarget(facet.surfaceId))
            ? 4
            : 1.5}
          stroke-linejoin="round"
          data-target={surfaceTarget(facet.surfaceId)}
        />
        {#if lab.isActive(surfaceTarget(facet.surfaceId))}
          <polygon
            points={facet.points}
            fill="url(#{HATCH_PATTERN_ID})"
            stroke="none"
            pointer-events="none"
          />
        {/if}
      {/each}
    {/if}

    <!-- The mark itself, on the face it belongs to. Drawn after the facets, so
         it sits on the top face rather than under it. -->
    {#if logoMark}
      <g transform={logoMark} pointer-events="none" stroke-linejoin="round">
        <path
          d={LOGO_MARK_LOOP}
          fill="none"
          stroke={LOGO_MARK_INK}
          stroke-width={LOGO_MARK_STROKE}
        />
        <path d={LOGO_MARK_TICK} fill={LOGO_MARK_INK} />
      </g>
    {/if}

    {#each edges as drawn (drawn.edge.id)}
      {#if drawn.active || drawn.edge.style === "measure"}
        <line
          x1={drawn.x1}
          y1={drawn.y1}
          x2={drawn.x2}
          y2={drawn.y2}
          stroke={drawn.active ? "#c2410c" : "#0b1a22"}
          stroke-width={drawn.active ? 5 : 2}
          stroke-linecap="round"
          stroke-dasharray={drawn.edge.dashed ? "7 6" : undefined}
          pointer-events="none"
        />
      {/if}
      <!-- A fat invisible line is what the pointer actually has to hit. -->
      <line
        x1={drawn.x1}
        y1={drawn.y1}
        x2={drawn.x2}
        y2={drawn.y2}
        stroke="transparent"
        stroke-width="16"
        stroke-linecap="round"
        class="cursor-pointer"
        data-target={measureTarget(drawn.edge.measure)}
        data-edge={drawn.edge.id}
      />
    {/each}

    {#if floor.fromBelow}{@render ground()}{/if}
  </svg>

  <!-- Measurements live above the drawing as real buttons, so they can be read,
       focused and pinned without a pointer. They are placed in CSS pixels, so
       they stay hidden until the stage has been measured: see `measured`. -->
  <div
    class="pointer-events-none absolute inset-0 overflow-hidden"
    class:invisible={!measured}
  >
    {#if slicing?.angle}
      <span
        class="absolute -translate-x-1/2 -translate-y-1/2 font-mono text-xs font-bold text-[#7c2d12]"
        style:left="{centerX + slicing.angle.label[0]}px"
        style:top="{centerY + slicing.angle.label[1]}px"
        data-testid="slice-angle-label">{slicing.angle.degrees}°</span
      >
    {/if}
    {#each badges as badge (badge.surface.id)}
      <button
        type="button"
        data-testid="surface-{badge.surface.localId}"
        aria-pressed={badge.pinned}
        aria-label="{domainText(badge.surface.name)}{lab.showFormulas
          ? `, ${badge.surface.formula}`
          : ''}{lab.answersVisible ? `, ${badge.value} ${areaUnit}` : ''}"
        class={badge.active
          ? `${chip} max-w-[14rem] ${reach(badge.pinned)}`
          : "pointer-events-auto absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-rule/70 bg-panel/80 text-[11px] font-bold text-ink-soft shadow-sm backdrop-blur-sm hover:border-accent hover:text-accent"}
        style:left="{badge.x}px"
        style:top="{badge.y}px"
        style:border-color={badge.active ? badge.tint.border : undefined}
        style:background={badge.active ? badge.tint.background : undefined}
        style:color={badge.active ? badge.tint.text : undefined}
        style:outline={badge.active && badge.pinned
          ? `2px solid ${badge.tint.border}`
          : undefined}
        style:outline-offset="2px"
        onpointerenter={() => lab.hover(badge.target)}
        onpointerleave={() => lab.unhover(badge.target)}
        onfocus={() => lab.hover(badge.target)}
        onblur={() => lab.unhover(badge.target)}
        onclick={() => lab.togglePin(badge.target)}
      >
        {#if badge.active}
          <span class="block font-sans font-bold"
            >{badge.surface.code} · {domainText(
              badge.surface.name,
            )}{#if lab.showFormulas}
              · <MathText text={badge.surface.formula} />
            {/if}</span
          >
          <span class="block" data-testid="face-value-{badge.surface.localId}">
            <!-- The working only appears while the fx toggle is on, exactly as
                 it does for the totals. -->
            {#if lab.showFormulas}<MathText text={badge.surface.substitution} /> ={:else}={/if}
            {#if lab.answersVisible}
              <strong><MathText text={badge.value} /></strong>
              {areaUnit}
            {:else}
              <span data-testid="face-value-{badge.surface.localId}-hidden"
                >?</span
              >
            {/if}
          </span>
        {:else}
          {badge.surface.code}
        {/if}
      </button>
    {/each}

    {#each edgeLabels as label (label.target)}
      <button
        type="button"
        data-testid="measure-label"
        data-target={label.target}
        aria-pressed={label.pinned}
        aria-label={label.text}
        class="{measureChip} whitespace-nowrap {reach(label.pinned)}"
        class:ring-2={label.pinned}
        class:ring-flag={label.pinned}
        style:left="{label.x}px"
        style:top="{label.y}px"
        onclick={() => lab.togglePin(label.target)}
      >
        {#if label.working}
          <span class="block text-ink-soft"
            ><MathText text={label.working} fractions={!!slicing} /></span
          >
        {/if}
        <!-- In the slice view a cut can make a length such as 5√35/47, which
             is set as one number over the other there. -->
        <span class="block font-bold"
          ><MathText text={label.text} fractions={!!slicing} /></span
        >
        {#if label.approximate}
          <span class="block text-ink-soft">{label.approximate}</span>
        {/if}
      </button>
    {/each}

    {#if slicing && lab.slicePosition !== null && sliceEnds}
      <!-- Dragged along the arrow, the plane moves through the solid; the arrow
           keys move it a tenth at a time. Last, so no badge can cover it. It
           shows only while the cut is pointed at, or the arrow is held or has
           the keyboard, except on a touch screen, which cannot point without
           pressing. Hidden, it still answers the pointer, so it can be found
           where it is. -->
      <div
        role="slider"
        tabindex="0"
        aria-label={t("slice.handle", {
          label: slicePositionLabel(
            lab.kind,
            lab.sliceDirection,
            lab.sliceHeading,
          ),
        })}
        aria-valuemin={sliceEnds.lowest}
        aria-valuemax={sliceEnds.highest}
        aria-valuenow={lab.slicePosition}
        aria-valuetext="{lab.slicePosition} {linear}"
        data-testid="slice-handle"
        class="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 touch-none rounded-full transition-opacity duration-150 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent [@media(hover:none)]:opacity-100"
        class:opacity-0={!handleShown && !sliding}
        class:cursor-grab={!sliding}
        class:cursor-grabbing={sliding}
        style:left="{centerX + slicing.handle.at[0]}px"
        style:top="{centerY + slicing.handle.at[1]}px"
        style:width="{2 * (handleReach + 4)}px"
        style:height="{2 * (handleReach + 4)}px"
        onpointerenter={showHandle}
        onpointerleave={hideHandleSoon}
        onpointerdown={onHandleDown}
        onpointermove={onHandleMove}
        onpointerup={onHandleUp}
        onpointercancel={onHandleUp}
        onkeydown={onHandleKey}
      >
        <svg
          class="h-full w-full overflow-visible"
          viewBox="{-(handleReach + 4)} {-(handleReach + 4)} {2 *
            (handleReach + 4)} {2 * (handleReach + 4)}"
          aria-hidden="true"
        >
          <g
            transform="rotate({slicing.handle.degrees})"
            stroke-linejoin="round"
            stroke-linecap="round"
          >
            <g stroke="white" stroke-width="6" fill="white" opacity="0.9">
              <line x1={-handleReach + 8} y1="0" x2={handleReach - 8} y2="0" />
              <polygon
                points="{handleReach + 2},0 {handleReach - 10},-9 {handleReach -
                  10},9"
              />
              <polygon
                points="{-handleReach - 2},0 {-handleReach +
                  10},-9 {-handleReach + 10},9"
              />
            </g>
            <g stroke="#7c2d12" stroke-width="3" fill="#7c2d12">
              <line x1={-handleReach + 8} y1="0" x2={handleReach - 8} y2="0" />
              <polygon
                points="{handleReach},0 {handleReach - 9},-7 {handleReach -
                  9},7"
                stroke-width="1.5"
              />
              <polygon
                points="{-handleReach},0 {-handleReach + 9},-7 {-handleReach +
                  9},7"
                stroke-width="1.5"
              />
            </g>
          </g>
        </svg>
        <!-- The position, written between the heads, upright however the
             arrow points. -->
        <span
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-[#7c2d12]/40 bg-panel px-1.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-[#7c2d12] shadow-sm"
          aria-hidden="true"
          data-testid="slice-travel-label">{lab.slicePosition}</span
        >
      </div>
    {/if}
  </div>
</div>
