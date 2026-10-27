<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";
  import type { CrossSection, Point2 } from "$lib/domain/crossSections";
  import { evalExact, formatExact } from "$lib/domain/exact";
  import { approximateText, formatApproximate } from "$lib/domain/format";
  import { DIMENSION_MAX } from "$lib/domain/types";
  import { domainText, t, unitLabels } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";
  import { fitFraction, gridLayers, gridScale } from "$lib/ui/grid";
  import { measureBox } from "$lib/ui/measureBox";
  import { stageRise, stageRoom } from "$lib/ui/stage";

  let {
    lab,
    section,
    compact = false,
    lift = 0,
    chrome = 0,
  }: {
    lab: LabState;
    section: CrossSection;
    /** Shorten the unit words where the window has no room for them. */
    compact?: boolean;
    /** How far above the middle to hold the drawing, in CSS pixels. */
    lift?: number;
    /** The height the panels over the drawing have taken, as the solid view sees it. */
    chrome?: number;
  } = $props();

  // One user unit is one CSS pixel, as in the solid view, so the labels over
  // the drawing can be placed straight from the geometry.
  let boxWidth = $state(900);
  let boxHeight = $state(650);
  let measured = $state(false);
  const halfWidth = $derived(Math.max(boxWidth, 1) / 2);
  const halfHeight = $derived(Math.max(boxHeight, 1) / 2);
  const rise = $derived(stageRise(boxHeight, lift));
  const room = $derived(stageRoom(boxHeight, chrome));
  const centerY = $derived(halfHeight - rise);

  /**
   * The solid view's own scale. The drawing sits beside the solid in a box the
   * same size, so fitting it the same way draws the cross section exactly as
   * big as the cut on the solid: a slice near the tip of a pyramid comes out
   * small, which is the point.
   */
  const scale = $derived(
    (Math.min(halfWidth, room) *
      0.78 *
      fitFraction(lab.mesh.extent, DIMENSION_MAX)) /
      lab.mesh.extent,
  );

  /** The middle of the cross section's box, which goes in the middle of ours. */
  const middle = $derived.by<Point2>(() => {
    const xs = section.outline2d.map(([x]) => x);
    const ys = section.outline2d.map(([, y]) => y);
    return [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2,
    ];
  });

  /** A face-on point on screen. The drawing's y axis points up; the screen's down. */
  function place([x, y]: Point2): Point2 {
    return [(x - middle[0]) * scale, -(y - middle[1]) * scale];
  }

  const outline = $derived(
    section.outline2d
      .map((point) => place(point))
      .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" "),
  );

  /**
   * The grid is ruled from a corner of the cross section, so its squares run
   * along at least one side and can be counted off it, as on the net.
   */
  const grid = $derived(gridScale(scale));
  const gridInk = $derived(gridLayers(0.45, grid.fade));
  const anchor = $derived(place(section.outline2d[0]));
  const lattices = $derived(
    [
      { id: "section-grid-fine", step: grid.fineStep, ink: gridInk.fine },
      { id: "section-grid", step: grid.step, ink: gridInk.coarse },
    ].filter((layer) => layer.ink > 0.004),
  );

  const linear = $derived(unitLabels(lab.unit).linear);
  const areaUnit = $derived(
    compact ? unitLabels(lab.unit).areaShort : unitLabels(lab.unit).area,
  );

  /** Where the cross section's middle sits on screen. */
  const centre = $derived.by<Point2>(() => {
    const points = section.outline2d.map((point) => place(point));
    return [
      points.reduce((sum, [x]) => sum + x, 0) / points.length,
      points.reduce((sum, [, y]) => sum + y, 0) / points.length,
    ];
  });

  /** One length per side, set just outside the side's middle. */
  const sides = $derived(
    section.edges.map((edge) => {
      const [x1, y1] = place(edge.from2d);
      const [x2, y2] = place(edge.to2d);
      const mid: Point2 = [(x1 + x2) / 2, (y1 + y2) / 2];
      const away = [mid[0] - centre[0], mid[1] - centre[1]];
      const distance = Math.hypot(away[0], away[1]) || 1;
      return {
        id: edge.id,
        value: formatExact(edge.length),
        x: halfWidth + mid[0] + (away[0] / distance) * 22,
        y: centerY + mid[1] + (away[1] / distance) * 18,
      };
    }),
  );

  /** The card sits under the cross section, clear of its lowest side label. */
  const cardTop = $derived(
    centerY +
      Math.max(...section.outline2d.map((point) => place(point)[1])) +
      40,
  );

  const area = $derived(evalExact(section.area.exact));
  const name = $derived(domainText(section.name));

  const description = $derived(
    t("slice.drawing", {
      name: lab.answersVisible ? name : t("slice.hiddenName"),
      sides: sides.map((side) => side.value).join(", "),
      unit: linear,
    }),
  );
</script>

<div
  class="relative h-full w-full"
  use:measureBox={(width, height) => {
    boxWidth = width;
    boxHeight = height;
    measured = true;
  }}
>
  <svg
    class="h-full w-full select-none"
    viewBox="{-halfWidth} {-centerY} {halfWidth * 2} {halfHeight * 2}"
    role="img"
    aria-label={description}
    data-testid="section-view"
  >
    <defs>
      {#each lattices as lattice (lattice.id)}
        {@const gap = lattice.step * scale}
        <pattern
          id={lattice.id}
          x={anchor[0]}
          y={anchor[1]}
          width={gap}
          height={gap}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 {gap} V0 H{gap}"
            fill="none"
            stroke="#46606f"
            stroke-width="1"
          />
        </pattern>
      {/each}
    </defs>

    {#each lattices as lattice (lattice.id)}
      <rect
        x={-halfWidth}
        y={-centerY}
        width={halfWidth * 2}
        height={halfHeight * 2}
        fill="url(#{lattice.id})"
        opacity={lattice.ink}
        pointer-events="none"
      />
    {/each}

    <polygon
      points={outline}
      fill="#f59e0b"
      fill-opacity="0.85"
      stroke="#b45309"
      stroke-width="3"
      stroke-linejoin="round"
      data-testid="section-shape"
    />
  </svg>

  <!-- Lengths and the area are text over the drawing, so they read and
       translate like the rest of the page. Placed in CSS pixels, so they wait
       for the measurement. -->
  <div
    class="pointer-events-none absolute inset-0 overflow-hidden"
    class:invisible={!measured}
  >
    {#each sides as side (side.id)}
      <span
        class="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-panel/85 px-1.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-ink shadow-sm"
        style:left="{side.x}px"
        style:top="{side.y}px"
        data-testid="section-side"
        aria-label={t("slice.side", { value: side.value, unit: linear })}
        ><MathText text={side.value} /></span
      >
    {/each}

    <section
      class="pointer-events-auto absolute -translate-x-1/2 rounded-xl border border-rule/70 bg-panel/90 px-3 py-2 text-center shadow-lg shadow-ink/10 backdrop-blur-md"
      style:left="{halfWidth}px"
      style:top="{cardTop}px"
      aria-label={t("slice.area")}
      data-testid="section-card"
    >
      <p class="text-sm font-bold text-ink" data-testid="section-name">
        {#if lab.answersVisible}{name}{:else}<span
            data-testid="section-name-hidden">?</span
          >{/if}
      </p>
      {#if lab.showFormulas && section.area.formula}
        <p
          class="font-mono text-xs text-ink-soft"
          data-testid="section-formula"
        >
          <MathText text={section.area.formula} />
        </p>
        {#if section.area.substitution}
          <p class="font-mono text-xs text-ink-soft">
            <MathText text={section.area.substitution} />
          </p>
        {/if}
      {/if}
      <p
        class="font-mono text-base whitespace-nowrap"
        data-testid="section-area"
      >
        A =
        {#if lab.answersVisible}
          <strong><MathText text={formatExact(section.area.exact)} /></strong>
          <span class="text-xs text-ink-soft">{areaUnit}</span>
          {#if formatApproximate(area).rounded}
            <span class="block text-xs text-ink-soft"
              >{approximateText(area)} {areaUnit}</span
            >
          {/if}
        {:else}
          <span data-testid="section-area-hidden">?</span>
        {/if}
      </p>
    </section>
  </div>
</div>
