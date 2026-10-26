<script lang="ts">
  /**
   * The solid as unit cubes.
   *
   * Exactly as many cubes as the volume are on screen at all times. Each one is
   * either stacked in the solid or lying in the flat arrangement beside it —
   * the solid's layers laid end to end along its length — and filling the solid
   * moves them from the one to the other. A faint outline of the solid, and a
   * faint footprint of the flat arrangement, keep both homes visible while
   * they are empty.
   */
  import Floor from "$lib/components/Floor.svelte";
  import { projectPoint, rotatePoint, type Vec3 } from "$lib/domain/geometry3d";
  import {
    cubeCell,
    cubeCentreAt,
    flatStart,
    playRate,
    sceneLength,
    solidStart,
    type CubeBox,
  } from "$lib/domain/unitCubes";
  import { domainText, t, unitLabels } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";
  import { cubeFill } from "$lib/ui/colors";
  import { floorPlane } from "$lib/ui/floor";
  import { measureBox } from "$lib/ui/measureBox";
  import { stageRise, stageRoom } from "$lib/ui/stage";
  import { untrack } from "svelte";

  let {
    lab,
    box,
    reducedMotion = false,
    animationWindow,
    lift = 0,
    chrome = 0,
    onGrid,
  }: {
    lab: LabState;
    /** The solid in unit cubes: how many run along each edge. */
    box: CubeBox;
    reducedMotion?: boolean;
    animationWindow?: Window;
    /** How far above the middle to hold the scene. See SolidView. */
    lift?: number;
    /** The height the panels over the drawing take. See SolidView. */
    chrome?: number;
    /** Where to report the size of one grid square: always one unit here. */
    onGrid?: (step: number) => void;
  } = $props();

  const LIGHT: Vec3 = [-0.32, 0.66, 0.68];
  const INK = "#0b1a22";
  /** Seconds one cube takes to travel between the flat arrangement and the solid. */
  const FLIGHT = 0.6;
  /** Seconds for every layer to be stacked, or laid flat, in one go. */
  const STACK_TIME = 1.5;
  /** Seconds between layers when playing with reduced motion, which jumps a layer at a time. */
  const LAYER_PAUSE = 0.7;
  /**
   * The most screen a unit may take, in CSS pixels. A one-cube solid would
   * otherwise fill the window, which reads as a picture of a box rather than
   * as a cube that can be counted.
   */
  const MAX_UNIT_PIXELS = 72;
  /** How close a label's middle may come to the side of the window, in CSS pixels. */
  const LABEL_MARGIN = 56;

  let boxWidth = $state(900);
  let boxHeight = $state(650);
  /** Whether the element has been measured yet. See SolidView. */
  let measured = $state(false);
  const halfWidth = $derived(Math.max(boxWidth, 1) / 2);
  const halfHeight = $derived(Math.max(boxHeight, 1) / 2);
  const rise = $derived(stageRise(boxHeight, lift));
  const room = $derived(stageRoom(boxHeight, chrome));
  const centerY = $derived(halfHeight - rise);

  const length = $derived(sceneLength(box));
  /** How far the scene reaches across the floor from its centre, however it is turned. */
  const reach = $derived(Math.hypot(length / 2, box.w / 2));
  /**
   * The scene is long and low, so fitting it inside a sphere, as the solid view
   * does, would leave it a thin strip across the middle of the window. It is
   * fitted to what it can actually reach on screen instead: its full reach
   * across, and up and down only as far as the current tilt shows of it.
   * Spinning it round leaves the fit alone; tipping it changes it smoothly.
   */
  const scale = $derived.by(() => {
    const tall =
      (box.h / 2) * Math.cos(lab.pitch) + reach * Math.abs(Math.sin(lab.pitch));
    return Math.min(
      MAX_UNIT_PIXELS,
      0.78 * Math.min(halfWidth / reach, room / Math.max(tall, 0.5)),
    );
  });

  // The ruling is one unit apart here, whatever the fit, so that every square
  // on the floor is the footprint of exactly one cube.
  $effect(() => {
    onGrid?.(1);
  });

  const FLOOR_INK = 0.55;
  const FLOOR_LAYERS = [{ key: "unit", step: 1, ink: FLOOR_INK }];
  const floor = $derived(floorPlane(lab.yaw, lab.pitch, scale, -box.h / 2));
  const floorRadius = $derived(reach * 1.3);
  const footprint = $derived({ x: solidStart(box), z: -box.w / 2 });

  const linear = $derived(unitLabels(lab.unit).linear);

  /**
   * How far each cube is, as drawn right now, from lying flat (0) to stacked
   * (1). The lab only knows where each cube is going; this is where it has got
   * to on the way.
   */
  let progress = $state.raw<number[]>([]);

  // New dimensions move every cube to a different cell, so there is nothing
  // to animate from: the cubes are simply put where they now belong. The fill
  // is read untracked, since a change of fill alone is a move to animate.
  $effect.pre(() => {
    const total = box.l * box.w * box.h;
    const fill = untrack(() => lab.fill);
    progress = Array.from({ length: total }, (_, index) =>
      index < fill ? 1 : 0,
    );
  });

  /**
   * Moves the cubes towards where the lab says they belong, and drives a run
   * one step at a time. Restarted whenever the fill or the run changes, which
   * each step of a run does.
   */
  $effect(() => {
    const fill = lab.fill;
    const run = lab.cubeRun;
    const total = box.l * box.w * box.h;
    const byLayer = reducedMotion;
    const interval =
      run === "play"
        ? byLayer
          ? LAYER_PAUSE
          : 1 / playRate(total)
        : STACK_TIME / box.h;
    const clock = animationWindow ?? window;
    let frame = 0;
    let previous = clock.performance.now();
    let waited = 0;

    const tick = (now: number) => {
      const elapsed = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      const next = progress.slice();
      let moving = false;
      for (let index = 0; index < next.length; index += 1) {
        const goal = index < fill ? 1 : 0;
        if (next[index] === goal) continue;
        const step = reducedMotion ? 1 : elapsed / FLIGHT;
        next[index] =
          goal > next[index]
            ? Math.min(goal, next[index] + step)
            : Math.max(goal, next[index] - step);
        moving = true;
      }
      if (moving) progress = next;

      if (run) {
        waited += elapsed;
        if (waited >= interval) {
          // Changes the fill, which restarts this loop from the new one.
          lab.advanceCubes(Math.floor(waited / interval), byLayer);
          return;
        }
      }
      if (moving || run) frame = clock.requestAnimationFrame(tick);
    };
    frame = clock.requestAnimationFrame(tick);
    return () => clock.cancelAnimationFrame(frame);
  });

  // Spinning works as it does for the solid, but not once every cube is lying
  // flat: the lab turns it off there.
  $effect(() => {
    if (!lab.autoRotate || reducedMotion || lab.fill === 0) return;
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

  function turn(point: Vec3): Vec3 {
    return rotatePoint(point, lab.yaw, lab.pitch);
  }

  function screen(point: Vec3): [number, number] {
    return projectPoint(turn(point), scale);
  }

  function polygon(points: readonly (readonly [number, number])[]): string {
    return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  }

  /**
   * One face of a unit cube as seen from here: which axis it faces along and
   * which way, how it is lit, and its corners relative to the cube's centre on
   * screen. Every cube is the same box turned the same way, so the faces are
   * worked out once and moved to each cube.
   */
  interface FaceShape {
    axis: number;
    sign: 1 | -1;
    diffuse: number;
    corners: [number, number][];
  }

  const faceShapes = $derived.by<FaceShape[]>(() => {
    const axes = [turn([1, 0, 0]), turn([0, 1, 0]), turn([0, 0, 1])];
    const half = axes.map(
      (axis) => projectPoint(axis, scale / 2) as [number, number],
    );
    const shapes: FaceShape[] = [];
    for (let axis = 0; axis < 3; axis += 1) {
      for (const sign of [1, -1] as const) {
        const normal = axes[axis];
        // A face turned away is hidden behind its own cube.
        if (normal[2] * sign <= 1e-6) continue;
        const diffuse = Math.max(
          0,
          sign *
            (normal[0] * LIGHT[0] +
              normal[1] * LIGHT[1] +
              normal[2] * LIGHT[2]),
        );
        const [u, v] = [half[(axis + 1) % 3], half[(axis + 2) % 3]];
        const out = half[axis];
        const corner = (a: number, b: number): [number, number] => [
          sign * out[0] + a * u[0] + b * v[0],
          sign * out[1] + a * u[1] + b * v[1],
        ];
        shapes.push({
          axis,
          sign,
          diffuse,
          corners: [corner(1, 1), corner(1, -1), corner(-1, -1), corner(-1, 1)],
        });
      }
    }
    return shapes;
  });

  /** A cell in the scene, for telling which cubes sit side by side. */
  function cellKey(point: Vec3): string {
    return point.map((value) => Math.round(value * 2)).join(",");
  }

  interface DrawnFace {
    points: string;
    fill: string;
  }

  /**
   * Every visible cube face, back to front. Cubes are all the same size and
   * turned the same way, so painting them in order of their centres' depth
   * covers correctly. A face pressed against a cube that is at rest beside it
   * can never be seen, and is left out: a full 10 × 10 × 10 solid then draws
   * three hundred faces rather than three thousand.
   */
  const faces = $derived.by<DrawnFace[]>(() => {
    // Read everything reactive once, not once per cube: the rotation is
    // linear, so turning a centre is a sum of the turned axes.
    const shape = box;
    const pixels = scale;
    const [ax, ay, az] = [turn([1, 0, 0]), turn([0, 1, 0]), turn([0, 0, 1])];
    const cubes = progress.map((amount, index) => {
      const centre = cubeCentreAt(index, shape, amount);
      const [x, y, z] = centre;
      const turned: Vec3 = [
        x * ax[0] + y * ay[0] + z * az[0],
        x * ax[1] + y * ay[1] + z * az[1],
        x * ax[2] + y * ay[2] + z * az[2],
      ];
      return {
        centre,
        settled: amount === 0 || amount === 1,
        depth: turned[2],
        at: projectPoint(turned, pixels),
        layer: cubeCell(index, shape).layer,
      };
    });
    const resting = new Set(
      cubes.filter((cube) => cube.settled).map((cube) => cellKey(cube.centre)),
    );
    cubes.sort((a, b) => a.depth - b.depth);

    const shapes = faceShapes;
    const drawn: DrawnFace[] = [];
    for (const cube of cubes) {
      for (const face of shapes) {
        if (cube.settled) {
          const beside = [...cube.centre] as [number, number, number];
          beside[face.axis] += face.sign;
          if (resting.has(cellKey(beside))) continue;
        }
        drawn.push({
          points: polygon(
            face.corners.map(([x, y]) => [cube.at[0] + x, cube.at[1] + y]),
          ),
          fill: cubeFill(cube.layer, face.diffuse),
        });
      }
    }
    return drawn;
  });

  /**
   * The solid's outline, which stays when its cubes have gone. Faces turned
   * away are tinted behind the cubes, and the edges of those faces drawn there
   * too; the edges nearest the viewer go over the cubes, so the outline reads
   * as glass around them rather than as a box they are hidden in.
   */
  const outline = $derived.by(() => {
    const x0 = solidStart(box);
    const lows = [x0, -box.h / 2, -box.w / 2];
    const highs = [x0 + box.l, box.h / 2, box.w / 2];
    const corner = (bits: number[]): [number, number] => {
      const [x, y, z] = bits.map((bit, axis) =>
        bit ? highs[axis] : lows[axis],
      );
      return screen([x, y, z]);
    };
    const facing = [0, 1, 2].map((axis) => {
      const unit = [0, 0, 0] as [number, number, number];
      unit[axis] = 1;
      return turn(unit)[2];
    });
    /** Whether the face on side `bit` of `axis` faces the viewer. */
    const front = (axis: number, bit: number) =>
      (bit ? facing[axis] : -facing[axis]) > 1e-6;

    const back: string[] = [];
    for (let axis = 0; axis < 3; axis += 1) {
      for (const bit of [0, 1]) {
        if (front(axis, bit)) continue;
        const [a, b] = [(axis + 1) % 3, (axis + 2) % 3];
        const at = (p: number, q: number) => {
          const bits = [0, 0, 0];
          bits[axis] = bit;
          bits[a] = p;
          bits[b] = q;
          return corner(bits);
        };
        back.push(polygon([at(0, 0), at(1, 0), at(1, 1), at(0, 1)]));
      }
    }

    const edges: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      near: boolean;
    }[] = [];
    for (let axis = 0; axis < 3; axis += 1) {
      const [a, b] = [(axis + 1) % 3, (axis + 2) % 3];
      for (const p of [0, 1]) {
        for (const q of [0, 1]) {
          const start = [0, 0, 0];
          start[a] = p;
          start[b] = q;
          const end = [...start];
          end[axis] = 1;
          const [x1, y1] = corner(start);
          const [x2, y2] = corner(end);
          edges.push({ x1, y1, x2, y2, near: front(a, p) || front(b, q) });
        }
      }
    }
    return { back, edges };
  });

  /** Where the flat arrangement lies, drawn on the floor while it is empty. */
  const flatFootprint = $derived.by(() => {
    const y = -box.h / 2;
    const [x0, x1] = [flatStart(box), length / 2];
    const [z0, z1] = [-box.w / 2, box.w / 2];
    return polygon([
      screen([x0, y, z0]),
      screen([x1, y, z0]),
      screen([x1, y, z1]),
      screen([x0, y, z1]),
    ]);
  });

  /** The symbol each edge goes by: a cube has only the one. */
  const keys = $derived(
    lab.kind === "cube"
      ? { l: "s", w: "s", h: "s" }
      : { l: "l", w: "w", h: "h" },
  );

  /**
   * The edges of the solid and of the flat arrangement, labelled. The solid's
   * are on its outer end, away from the flat arrangement; the long edges are
   * on whichever side is nearer the viewer. The flat arrangement's length is
   * given as the layers that make it, h × l, and only worked out while the
   * answers are showing: with its width it would give the volume away.
   */
  const labels = $derived.by(() => {
    const x0 = solidStart(box);
    const bottom = -box.h / 2;
    const near = turn([0, 0, 1])[2] >= 0 ? box.w / 2 : -box.w / 2;
    const fx0 = flatStart(box);
    const fx1 = length / 2;
    const long = box.h * box.l;
    const solidMiddle = screen([x0 + box.l / 2, 0, 0]);
    const flatMiddle = screen([(fx0 + fx1) / 2, bottom + 0.5, 0]);
    const place = (point: Vec3, middle: [number, number]) => {
      const [x, y] = screen(point);
      // Off the edge, away from the middle of the shape it belongs to, so the
      // line it labels stays readable and the labels of a small solid spread
      // out round it rather than all leaving on the same side.
      const [dx, dy] = [x - middle[0], y - middle[1]];
      const distance = Math.hypot(dx, dy);
      const push = distance > 1 ? 26 / distance : 0;
      // A long scene on a narrow screen reaches the window's edge, and a label
      // pushed past it would be cut in half: it stops at the edge instead.
      return {
        x: Math.min(
          Math.max(halfWidth + x + dx * push, LABEL_MARGIN),
          boxWidth - LABEL_MARGIN,
        ),
        y: centerY + y + dy * push,
      };
    };
    return [
      {
        id: "cube-label-l",
        text: `${keys.l} = ${box.l} ${linear}`,
        ...place([x0 + box.l / 2, bottom, near], solidMiddle),
      },
      {
        id: "cube-label-w",
        text: `${keys.w} = ${box.w} ${linear}`,
        ...place([x0, bottom, 0], solidMiddle),
      },
      {
        id: "cube-label-h",
        text: `${keys.h} = ${box.h} ${linear}`,
        ...place([x0, 0, near], solidMiddle),
      },
      {
        id: "flat-label-w",
        text: `${keys.w} = ${box.w} ${linear}`,
        ...place([fx1, bottom, 0], flatMiddle),
      },
      {
        id: "flat-label-length",
        text: `${keys.h} × ${keys.l} = ${box.h} × ${box.l}${
          lab.answersVisible ? ` = ${long}` : ""
        } ${linear}`,
        ...place([(fx0 + fx1) / 2, bottom, near], flatMiddle),
      },
    ];
  });

  const description = $derived(
    t("cubes.description", {
      name: domainText(lab.model.name),
      dimensions: lab.definition.dimensions
        .map(
          (spec) =>
            `${domainText(spec.label).toLocaleLowerCase()} ${lab.dimensions[spec.key]}`,
        )
        .join(", "),
      unit: linear,
    }) +
      (lab.answersVisible
        ? ` ${t("cubes.count", { stacked: lab.fill, total: lab.cubeTotal })}`
        : ""),
  );

  let dragging = $state(false);
  let last: { x: number; y: number } | null = null;

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    dragging = true;
    last = { x: event.clientX, y: event.clientY };
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || !last) return;
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

  const STEP = 0.18;

  function onKeyDown(event: KeyboardEvent) {
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
</script>

<!-- A focusable image, like the solid view: screen readers announce the
     description, and the arrow keys turn it. Every action here also has a
     labelled button in the panels. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="relative h-full w-full"
  use:measureBox={(width, height) => {
    boxWidth = width;
    boxHeight = height;
    measured = true;
  }}
>
  <svg
    class="h-full w-full touch-none select-none"
    class:cursor-grab={!dragging}
    class:cursor-grabbing={dragging}
    viewBox="{-halfWidth} {-centerY} {halfWidth * 2} {halfHeight * 2}"
    role="img"
    tabindex="0"
    aria-label={description}
    data-testid="cube-view"
    data-cubes={progress.length}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onkeydown={onKeyDown}
  >
    {#snippet ground()}
      <Floor
        {floor}
        radius={floorRadius}
        layers={FLOOR_LAYERS}
        {footprint}
        view={{
          x: -halfWidth,
          y: -centerY,
          width: halfWidth * 2,
          height: halfHeight * 2,
        }}
      />
    {/snippet}

    {#if !floor.fromBelow}{@render ground()}{/if}

    <g pointer-events="none">
      <polygon
        points={flatFootprint}
        fill="#46606f"
        fill-opacity="0.08"
        stroke={INK}
        stroke-opacity="0.4"
        stroke-width="1.5"
        stroke-dasharray="6 5"
        stroke-linejoin="round"
      />
      {#each outline.back as points, index (index)}
        <polygon {points} fill="#46606f" fill-opacity="0.07" stroke="none" />
      {/each}
      {#each outline.edges.filter((edge) => !edge.near) as edge, index (index)}
        <line
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          stroke={INK}
          stroke-opacity="0.3"
          stroke-width="1.5"
        />
      {/each}

      {#each faces as face, index (index)}
        <polygon
          points={face.points}
          fill={face.fill}
          stroke={INK}
          stroke-width="1"
          stroke-linejoin="round"
        />
      {/each}

      {#each outline.edges.filter((edge) => edge.near) as edge, index (index)}
        <line
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          stroke={INK}
          stroke-opacity="0.45"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      {/each}
    </g>

    {#if floor.fromBelow}{@render ground()}{/if}
  </svg>

  <div
    class="pointer-events-none absolute inset-0 overflow-hidden"
    class:invisible={!measured}
  >
    {#each labels as label (label.id)}
      <span
        data-testid={label.id}
        class="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-rule/70 bg-panel/85 px-2 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-ink shadow-sm backdrop-blur-sm"
        style:left="{label.x}px"
        style:top="{label.y}px">{label.text}</span
      >
    {/each}
  </div>
</div>
