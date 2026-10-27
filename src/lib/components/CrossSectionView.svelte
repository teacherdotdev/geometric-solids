<script lang="ts">
  import GridKey from "$lib/components/GridKey.svelte";
  import MathText from "$lib/components/MathText.svelte";
  import type { CrossSection, Point2 } from "$lib/domain/crossSections";
  import { evalExact, formatExact } from "$lib/domain/exact";
  import { approximateText, formatApproximate } from "$lib/domain/format";
  import { DIMENSION_MAX } from "$lib/domain/types";
  import { domainText, t, unitLabels } from "$lib/i18n/index.svelte";
  import {
    sectionTarget,
    type LabState,
    type Target,
  } from "$lib/state/lab.svelte";
  import { fitFraction, gridLayers, gridScale } from "$lib/ui/grid";
  import { measureBox } from "$lib/ui/measureBox";

  let {
    lab,
    section,
    compact = false,
    room = Infinity,
  }: {
    lab: LabState;
    section: CrossSection;
    /** Shorten the unit words where the window has no room for them. */
    compact?: boolean;
    /** The height there is for the window, its key and its card together. */
    room?: number;
  } = $props();

  /**
   * How wide the round window is: a share of the screen, held to what the
   * panels above and below it leave, less what the key and the card stick out
   * past its rim. It never shrinks below a size the side lengths still fit in.
   */
  const diameter = $derived(
    `min(${compact ? "clamp(7rem,32vmin,13rem)" : "clamp(8.5rem,36vmin,20rem)"}, ${Math.max(96, room - 64)}px)`,
  );

  // One user unit is one CSS pixel, as in the solid view, so the labels over
  // the drawing can be placed straight from the geometry. The box is the
  // round window the drawing is seen through, so it is as tall as it is wide.
  let boxSize = $state(260);
  let measured = $state(false);
  const half = $derived(Math.max(boxSize, 1) / 2);

  /**
   * The drawing is fitted to the whole solid rather than to the cut, so the
   * cross section keeps its size relative to the solid: a slice near the tip
   * of a pyramid comes out small, which is the point. Nothing can be cut out
   * of a solid wider than the ball around it, so on that fit alone every cross
   * section would fit; the second bound only ever bites in a window so small
   * that the side lengths around it would otherwise fall off its rim.
   */
  const scale = $derived.by(() => {
    const solid =
      (half * 0.6 * fitFraction(lab.mesh.extent, DIMENSION_MAX)) /
      lab.mesh.extent;
    const reach = Math.max(
      ...section.outline2d.map(([x, y]) =>
        Math.hypot(x - middle[0], y - middle[1]),
      ),
    );
    return reach > 0
      ? Math.min(solid, Math.max(half - 30, half * 0.4) / reach)
      : solid;
  });

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

  /** Which side each symbol in the area formula names, the other way round. */
  const symbolOf = $derived(
    Object.fromEntries(
      Object.entries(section.symbols).map(([symbol, id]) => [id, symbol]),
    ) as Record<string, string>,
  );

  /** The whole cross section, as one thing to point at. */
  const areaTarget = sectionTarget("area");
  const areaActive = $derived(lab.isActive(areaTarget));

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
        active: lab.isActive(target),
        pinned: lab.isPinned(target),
        symbol: symbolOf[edge.id] ?? null,
        value: formatExact(edge.length),
        approximate: evalExact(edge.length),
        line: { x1, y1, x2, y2 },
        x: half + mid[0] + (away[0] / distance) * 22,
        y: half + mid[1] + (away[1] / distance) * 18,
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

  /** The section target under an event, read straight off the markup. */
  function targetOf(event: Event): Target | null {
    const element = event.target as Element | null;
    return (element?.closest?.("[data-target]")?.getAttribute("data-target") ??
      null) as Target | null;
  }

  const area = $derived(section.area.approximate);
  /** The exact area as text, or null where it can only be shown rounded. */
  const exactArea = $derived(
    section.area.exact ? formatExact(section.area.exact) : null,
  );
  /** Lines shown now: a curved shape's own all the time, a height with the working. */
  const shownHeights = $derived(
    heights.filter((height) => height.always || areaActive),
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
     held up next to the solid to be looked at face-on. The key to its grid sits
     on the rim, since the window is ruled at its own scale rather than the
     solid's; the card naming the cut hangs from the bottom. The whole is
     exactly as wide as the window, so the lab can make room for it: the card
     may be wider, and overhangs both sides evenly rather than push the window
     over as it grows. -->
<div
  class="pointer-events-none flex flex-col items-center"
  style:width={diameter}
  data-testid="section-porthole"
>
  <div class="relative z-10 -mb-3">
    <GridKey step={grid.step} unit={lab.unit} />
  </div>
  <div
    class="pointer-events-auto relative aspect-square w-full overflow-hidden rounded-full border-4 border-panel bg-paper/90 shadow-xl ring-1 shadow-ink/20 ring-rule/70 backdrop-blur-md"
    use:measureBox={(width) => {
      boxSize = width;
      measured = true;
    }}
  >
    <!-- Pointing at a side or at the cross section measures it, exactly as
       pointing at an edge or a face of the solid does. The same measurements
       are reachable without a pointer from the badges over the drawing. -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <svg
      class="h-full w-full select-none"
      viewBox="{-half} {-half} {half * 2} {half * 2}"
      role="img"
      aria-label={description}
      data-testid="section-view"
      onpointerover={(event) => lab.hover(targetOf(event))}
      onpointerleave={() => lab.hover(null)}
      onclick={(event) => {
        const target = targetOf(event);
        if (target) lab.togglePin(target);
      }}
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
          pointer-events="none"
        />
      {/each}

      <polygon
        points={outline}
        fill="#f59e0b"
        fill-opacity={areaActive ? 1 : 0.85}
        stroke="#b45309"
        stroke-width="3"
        stroke-linejoin="round"
        class="cursor-pointer"
        data-target={areaTarget}
        data-testid="section-shape"
      />

      {#if shownHeights.length > 0}
        {#each shownHeights as height (height.id)}
          <line
            x1={height.x1}
            y1={height.y1}
            x2={height.x2}
            y2={height.y2}
            stroke="#7c2d12"
            stroke-width="2"
            stroke-dasharray="6 4"
            pointer-events="none"
            data-testid="section-height"
          />
        {/each}
      {/if}

      {#each sides as side (side.id)}
        {#if side.active}
          <line
            {...side.line}
            stroke="#c2410c"
            stroke-width="6"
            stroke-linecap="round"
            pointer-events="none"
          />
        {/if}
        <!-- A fat invisible line is what the pointer actually has to hit. -->
        <line
          {...side.line}
          stroke="transparent"
          stroke-width="16"
          stroke-linecap="round"
          class="cursor-pointer"
          data-target={side.target}
        />
      {/each}
    </svg>

    <!-- Lengths and the area are text over the drawing, so they read and
       translate like the rest of the page. Placed in CSS pixels, so they wait
       for the measurement. -->
    <div
      class="pointer-events-none absolute inset-0 overflow-hidden"
      class:invisible={!measured}
    >
      {#each sides as side (side.id)}
        <button
          type="button"
          class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-md border px-1.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap shadow-sm {side.active
            ? 'border-flag bg-flag-soft text-flag'
            : 'border-transparent bg-panel/85 text-ink hover:border-accent hover:text-accent'} pointer-events-auto"
          class:ring-2={side.pinned}
          class:ring-flag={side.pinned}
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
          >{#if side.active && side.symbol}{`${side.symbol} = `}{/if}<MathText
            text={side.value}
          />{#if side.active}{` ${linear}`}{#if formatApproximate(side.approximate).rounded}<span
                class="font-normal text-ink-soft"
                >{` (${approximateText(side.approximate)})`}</span
              >{/if}{/if}</button
        >
      {/each}

      {#if shownHeights.length > 0}
        {#each shownHeights as height (height.id)}
          <span
            class="absolute -translate-y-1/2 rounded-md border border-[#7c2d12]/40 bg-panel/90 px-1.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-[#7c2d12] shadow-sm"
            style:left="{height.x}px"
            style:top="{height.y}px"
            data-testid="section-height-label"
            >{height.symbol} = <MathText text={height.value} /></span
          >
        {/each}
      {/if}
    </div>
  </div>

  <!-- The card is the cross section's own badge: pointing at it, focusing
       it or clicking it measures the cross section, opening up its working
       whatever the fx control says, as pointing at the drawing does. Centred
       under the window while it fits; wider than that, it hangs out to the
       left, toward the solid, since the window sits against the right edge:
       auto margins centre it only while there is room left over to share. -->
  <div class="relative -mt-5 flex w-full justify-end">
    <button
      type="button"
      class="relative mx-auto shrink-0 cursor-pointer rounded-xl border px-3 py-2 text-center shadow-lg shadow-ink/10 backdrop-blur-md {areaActive
        ? 'border-flag bg-panel/95'
        : 'border-rule/70 bg-panel/90 hover:border-accent'} pointer-events-auto"
      class:ring-2={lab.isPinned(areaTarget)}
      class:ring-flag={lab.isPinned(areaTarget)}
      aria-pressed={lab.isPinned(areaTarget)}
      aria-label="{t('slice.area')}{lab.answersVisible
        ? `: ${name}, ${exactArea ?? approximateText(area)} ${areaUnit}`
        : ''}"
      data-testid="section-card"
      data-target={areaTarget}
      onpointerenter={() => lab.hover(areaTarget)}
      onpointerleave={() => lab.unhover(areaTarget)}
      onfocus={() => lab.hover(areaTarget)}
      onblur={() => lab.unhover(areaTarget)}
      onclick={() => lab.togglePin(areaTarget)}
    >
      <span class="block text-sm font-bold text-ink" data-testid="section-name">
        {#if lab.answersVisible}{name}{:else}<span
            data-testid="section-name-hidden">?</span
          >{/if}
      </span>
      {#if (areaActive || lab.showFormulas) && section.area.formula}
        <span
          class="block font-mono text-xs text-ink-soft"
          data-testid="section-formula"
        >
          <MathText text={section.area.formula} />
        </span>
        {#if section.area.substitution}
          <span
            class="block font-mono text-xs text-ink-soft"
            data-testid="section-substitution"
          >
            <MathText text={section.area.substitution} />
          </span>
        {/if}
      {/if}
      <span
        class="block font-mono text-base whitespace-nowrap text-ink"
        data-testid="section-area"
      >
        A
        {#if lab.answersVisible && exactArea}
          = <strong><MathText text={exactArea} /></strong>
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
    </button>
  </div>
</div>
