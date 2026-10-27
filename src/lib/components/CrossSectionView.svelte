<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";
  import type { CrossSection, Point2 } from "$lib/domain/crossSections";
  import { formatExact } from "$lib/domain/exact";
  import { approximateText, formatApproximate } from "$lib/domain/format";
  import { domainText, t, unitLabels } from "$lib/i18n/index.svelte";
  import { sectionTarget, type LabState } from "$lib/state/lab.svelte";
  import { gridLayers, gridScale } from "$lib/ui/grid";

  let {
    lab,
    section,
    scale,
    diameter,
    compact = false,
  }: {
    lab: LabState;
    section: CrossSection;
    /**
     * Pixels per unit: the solid view's own, so the cut is drawn exactly as big
     * as it is on the solid and the grid behind it is ruled at the same step.
     */
    scale: number;
    /** How wide the round window is, in pixels. The lab sizes it to fit. */
    diameter: number;
    /** Shorten the unit words where the window has no room for them. */
    compact?: boolean;
  } = $props();

  // One user unit is one CSS pixel, so the labels over the drawing can be
  // placed straight from the geometry. The border is drawn inside the box.
  const half = $derived(Math.max(diameter, 1) / 2);

  /**
   * The point of the plane nearest the solid's centre, in the drawing's frame,
   * which goes in the middle of the window. Every point of the solid lies
   * within its extent of the centre, so every cross section lies within that
   * distance of this point: a window that holds the solid's extent at this
   * scale holds every cut, and the cut keeps its place in it as it moves.
   */
  const middle = $derived.by<Point2>(() => {
    const [x, y] = section.outline2d[0];
    const at = section.outline3d[0];
    const dot = (v: readonly number[]) =>
      v[0] * at[0] + v[1] * at[1] + v[2] * at[2];
    return [x - dot(section.plane.across), y - dot(section.plane.up)];
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
   * The grid is ruled at the solid's step, from a corner of the cross section,
   * so its squares run along at least one side and can be counted off it, and
   * the key in the corner holds for both drawings.
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

  /** The whole cross section, as one thing to point at. */
  const areaTarget = sectionTarget("area");
  /**
   * The window holds still whatever is pointed at, here or on the solid; only
   * pointing at the card, focusing it or pinning it opens up the working.
   */
  let cardHovered = $state(false);
  let cardFocused = $state(false);
  const working = $derived(
    cardHovered || cardFocused || lab.isPinned(areaTarget) || lab.showFormulas,
  );

  /** One length per side, set just outside the side's middle. */
  const sides = $derived(
    section.edges.map((edge) => {
      const [x1, y1] = place(edge.from2d);
      const [x2, y2] = place(edge.to2d);
      const mid: Point2 = [(x1 + x2) / 2, (y1 + y2) / 2];
      const away = [mid[0] - centre[0], mid[1] - centre[1]];
      const distance = Math.hypot(away[0], away[1]) || 1;
      const target = sectionTarget(edge.id);
      return {
        id: edge.id,
        target,
        pinned: lab.isPinned(target),
        value: formatExact(edge.length),
        x: half + mid[0] + (away[0] / distance) * 16,
        y: half + mid[1] + (away[1] / distance) * 12,
      };
    }),
  );

  /**
   * The lengths an area formula needs that are not sides, such as a
   * triangle's height. Only drawn while the working is shown.
   */
  const heights = $derived(
    section.lines.map((line) => {
      const [x1, y1] = place(line.from2d);
      const [x2, y2] = place(line.to2d);
      return {
        ...line,
        value: formatExact(line.length),
        x1,
        y1,
        x2,
        y2,
        // The label sits beside the line's middle, off to the side.
        x: half + (x1 + x2) / 2 + 10,
        y: half + (y1 + y2) / 2,
      };
    }),
  );

  const area = $derived(section.area.approximate);
  /** The exact area as text, or null where it can only be shown rounded. */
  const exactArea = $derived(
    section.area.exact ? formatExact(section.area.exact) : null,
  );
  /** Lines shown now: a curved shape's own all the time, a height with the working. */
  const shownHeights = $derived(
    heights.filter((height) => height.always || working),
  );
  const name = $derived(domainText(section.name));

  const description = $derived(
    t("slice.drawing", {
      name: lab.answersVisible ? name : t("slice.hiddenName"),
      sides: [
        ...sides.map((side) => side.value),
        ...heights
          .filter((height) => height.always)
          .map((height) => `${height.symbol} = ${height.value}`),
      ].join(", "),
      unit: linear,
    }),
  );
</script>

<!-- A round window beside the solid, rather than half the stage: the cut is
     held up next to the solid to be looked at face-on, at the solid's own
     scale. The card naming the cut hangs from the bottom, out of the flow, so
     the window never moves as the card opens up its working. -->
<div
  class="pointer-events-none relative"
  style:width="{diameter}px"
  style:height="{diameter}px"
  data-testid="section-porthole"
>
  <div
    class="pointer-events-auto relative h-full w-full overflow-hidden rounded-full bg-paper/90 shadow-xl ring-4 shadow-ink/20 ring-panel backdrop-blur-md"
  >
    <svg
      class="h-full w-full select-none"
      viewBox="{-half} {-half} {half * 2} {half * 2}"
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
          x={-half}
          y={-half}
          width={half * 2}
          height={half * 2}
          fill="url(#{lattice.id})"
          opacity={lattice.ink}
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

      {#each shownHeights as height (height.id)}
        <line
          x1={height.x1}
          y1={height.y1}
          x2={height.x2}
          y2={height.y2}
          stroke="#7c2d12"
          stroke-width="2"
          stroke-dasharray="6 4"
          data-testid="section-height"
        />
      {/each}
    </svg>

    <!-- Lengths are text over the drawing, so they read and translate like the
         rest of the page. Each is a badge that measures its side on the solid
         when pointed at, focused or clicked, so every length is reachable
         without a pointer; the badge itself never changes. -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      {#each sides as side (side.id)}
        <button
          type="button"
          class="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded bg-panel/80 px-1 font-mono text-[11px] leading-4 font-bold whitespace-nowrap text-ink"
          style:left="{side.x}px"
          style:top="{side.y}px"
          data-testid="section-side"
          data-value={side.value}
          data-target={side.target}
          aria-pressed={side.pinned}
          aria-label={t("slice.side", { value: side.value, unit: linear })}
          onpointerenter={() => lab.hover(side.target)}
          onpointerleave={() => lab.unhover(side.target)}
          onfocus={() => lab.hover(side.target)}
          onblur={() => lab.unhover(side.target)}
          onclick={() => lab.togglePin(side.target)}
          ><MathText text={side.value} fractions /></button
        >
      {/each}

      {#each shownHeights as height (height.id)}
        <span
          class="absolute -translate-y-1/2 rounded bg-panel/80 px-1 font-mono text-[11px] leading-4 font-bold whitespace-nowrap text-[#7c2d12]"
          style:left="{height.x}px"
          style:top="{height.y}px"
          data-testid="section-height-label"
          >{height.symbol} = <MathText text={height.value} fractions /></span
        >
      {/each}
    </div>
  </div>

  <!-- The card is the cross section's own badge: pointing at it, focusing it
       or clicking it opens up how the area is worked out, under the area, and
       lights the cut on the solid. Centred under the window while it fits;
       wider than that, it hangs out to the left, toward the solid, since the
       window sits against the right edge: auto margins centre it only while
       there is room left over to share. -->
  <div class="absolute inset-x-0 top-full -mt-5 flex justify-end">
    <button
      type="button"
      class="pointer-events-auto relative mx-auto shrink-0 cursor-pointer rounded-xl border border-rule/70 bg-panel/95 px-3 py-2 text-center shadow-lg shadow-ink/10 backdrop-blur-md"
      class:ring-2={lab.isPinned(areaTarget)}
      class:ring-flag={lab.isPinned(areaTarget)}
      aria-pressed={lab.isPinned(areaTarget)}
      aria-label="{t('slice.area')}{lab.answersVisible
        ? `: ${name}, ${exactArea ?? approximateText(area)} ${areaUnit}`
        : ''}"
      data-testid="section-card"
      data-target={areaTarget}
      onpointerenter={() => {
        cardHovered = true;
        lab.hover(areaTarget);
      }}
      onpointerleave={() => {
        cardHovered = false;
        lab.unhover(areaTarget);
      }}
      onfocus={() => {
        cardFocused = true;
        lab.hover(areaTarget);
      }}
      onblur={() => {
        cardFocused = false;
        lab.unhover(areaTarget);
      }}
      onclick={() => lab.togglePin(areaTarget)}
    >
      <span class="block text-sm font-bold text-ink" data-testid="section-name">
        {#if lab.answersVisible}{name}{:else}<span
            data-testid="section-name-hidden">?</span
          >{/if}
      </span>
      <span
        class="block font-mono text-base whitespace-nowrap text-ink"
        data-testid="section-area"
      >
        A
        {#if lab.answersVisible && exactArea}
          = <strong><MathText text={exactArea} fractions /></strong>
          <span class="text-xs text-ink-soft">{areaUnit}</span>
          {#if formatApproximate(area).rounded}
            <span class="block text-xs text-ink-soft"
              >{approximateText(area)} {areaUnit}</span
            >
          {/if}
        {:else if lab.answersVisible}
          <strong>{approximateText(area)}</strong>
          <span class="text-xs text-ink-soft">{areaUnit}</span>
        {:else}
          =
          <span data-testid="section-area-hidden">?</span>
        {/if}
      </span>
      {#if working && section.area.formula}
        <span
          class="mt-1 block border-t border-rule/60 pt-1 font-mono text-xs text-ink-soft"
          data-testid="section-formula"
        >
          <MathText text={section.area.formula} fractions />
        </span>
        {#if section.area.substitution}
          <span
            class="block font-mono text-xs text-ink-soft"
            data-testid="section-substitution"
          >
            <MathText text={section.area.substitution} fractions />
          </span>
        {/if}
      {/if}
    </button>
  </div>
</div>
