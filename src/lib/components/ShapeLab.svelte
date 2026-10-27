<script lang="ts">
  import BrandChip from "$lib/components/BrandChip.svelte";
  import CubeControls from "$lib/components/CubeControls.svelte";
  import CrossSectionView from "$lib/components/CrossSectionView.svelte";
  import CubeView from "$lib/components/CubeView.svelte";
  import FloatControl from "$lib/components/FloatControl.svelte";
  import FoldTransition from "$lib/components/FoldTransition.svelte";
  import GridKey from "$lib/components/GridKey.svelte";
  import LanguagePicker from "$lib/components/LanguagePicker.svelte";
  import MeasureBar from "$lib/components/MeasureBar.svelte";
  import NetView from "$lib/components/NetView.svelte";
  import RotationControls from "$lib/components/RotationControls.svelte";
  import ShapeBar from "$lib/components/ShapeBar.svelte";
  import SliceControls from "$lib/components/SliceControls.svelte";
  import SolidView from "$lib/components/SolidView.svelte";
  import TotalsCard from "$lib/components/TotalsCard.svelte";
  import ViewToggle from "$lib/components/ViewToggle.svelte";
  import { UNIT_ORDER } from "$lib/domain/format";
  import type { UnitKey } from "$lib/domain/format";
  import type { SolidKind } from "$lib/domain/types";
  import { t, unitLabels } from "$lib/i18n/index.svelte";
  import type { LabState, ViewMode } from "$lib/state/lab.svelte";
  import { measureBox } from "$lib/ui/measureBox";

  let {
    lab,
    reducedMotion,
    ready,
    floatSupported = false,
    onFloat,
    floatError = null,
    animationWindow,
    floating = false,
  }: {
    lab: LabState;
    reducedMotion: boolean;
    ready: boolean;
    floatSupported?: boolean;
    /**
     * How to send the lab out to a floating window. The copy already floating
     * is given no such handler, and so shows no control: the way back from
     * there is the browser's own back-to-tab button.
     */
    onFloat?: () => void;
    floatError?: string | null;
    animationWindow?: Window;
    /**
     * This copy is the one in the floating window: a small pane where the shape
     * has to keep the room. The controls fold down to their smallest useful
     * form, and everything that is not one — the maker's mark — steps aside.
     */
    floating?: boolean;
  } = $props();

  // A fold belongs to the drawing that is playing it, so it is held here rather
  // than in the lab: the window showing the shape is the one folding it.
  /** Which way the sheet is moving while a fold is running, if one is. */
  let folding = $state<"open" | "close" | null>(null);
  /** Which solid the running fold belongs to; only read while one is running. */
  let foldingKind = $state<SolidKind | null>(null);

  function changeView(view: ViewMode) {
    // Only the net folds; the cubes take over from the solid in place.
    const folds = view === "net" || lab.view === "net";
    if (view === lab.view || reducedMotion || !lab.net || !folds) {
      folding = null;
      lab.setView(view);
      return;
    }
    // Switch the view straight away — the tab, the spin button and the reading
    // panels all belong to where we are going. Only the drawing lags behind,
    // folding from the one to the other.
    const way = view === "net" ? "open" : "close";
    lab.setView(view);
    foldingKind = lab.kind;
    folding = way;
  }

  function finishFolding() {
    folding = null;
  }

  $effect(() => {
    // Picking another solid mid-fold should never leave the old one's faces
    // over the new drawing.
    if (folding && lab.kind !== foldingKind) folding = null;
  });

  $effect(() => {
    if (reducedMotion) folding = null;
  });

  /**
   * The side of one square of the measured grid, in the shape's own units.
   * Whichever drawing is on screen works it out — it falls out of the fit to
   * the window — and reports it here, so the key to the grid can sit with the
   * totals rather than over the drawing. A fold keeps the last one, which is
   * the step both views are about to draw at anyway.
   */
  let gridStep = $state(1);

  // How tall the rows over the drawing are. A floating window is resized to
  // whatever the viewer wants, and its panels then wrap into however many rows
  // they need, so the only honest way to know what room the shape has left is
  // to measure what the panels took.
  let topHeight = $state(0);
  let bottomHeight = $state(0);
  /**
   * Hold the shape in the middle of what is left over rather than the middle of
   * the window: the bottom edge carries more than the top one does, so the two
   * gaps are evened out by lifting the shape half the difference. Only the
   * floating copy asks for this; a full page has room to spare.
   */
  const lift = $derived(
    floating ? Math.max(0, (bottomHeight - topHeight) / 2) : 0,
  );
  /** What the panels cost the drawing altogether, top and bottom. */
  const chrome = $derived(floating ? topHeight + bottomHeight : 0);
  /**
   * A slice shares the screen between two drawings, each half as wide, so on a
   * narrow screen even the full page has to fit them between the panels rather
   * than under them: it measures them the way the floating window does.
   */
  const sliceLift = $derived(Math.max(0, (bottomHeight - topHeight) / 2));
  const sliceChrome = $derived(topHeight + bottomHeight);

  // The widths along the bottom edge, for deciding whether the view controls
  // can keep the row with the panels either side of them.
  let rowWidth = $state(0);
  let leftWidth = $state(0);
  let middleWidth = $state(0);
  let rightWidth = $state(0);
  /** The gap the row keeps between its panels, in pixels: Tailwind's gap-2. */
  const ROW_GAP = 8;
  /** Nothing has been measured on the first frame; assume the row holds. */
  const measured = $derived(rowWidth > 0 && middleWidth > 0);
  /**
   * True while the controls, centred on the window, clear both panels. Centred
   * on the window means each panel has half the leftover width, so it is the
   * wider of the two that decides — which keeps the answer the same as the
   * totals card grows a formula or the dimensions panel gains a row.
   */
  const centred = $derived(
    !measured ||
      Math.max(leftWidth, rightWidth) + ROW_GAP <= (rowWidth - middleWidth) / 2,
  );
  /**
   * True while all three fit across the row somehow. One panel is usually much
   * wider than the other, and holding the controls to the middle of the window
   * then wastes the whole gap on the narrow side while the wide side runs out
   * of room by a few pixels. Rather than drop a line with that gap standing
   * empty, the controls give up the middle of the window and take the middle of
   * what is left over.
   */
  const abreast = $derived(
    !measured || leftWidth + middleWidth + rightWidth + ROW_GAP * 2 <= rowWidth,
  );
</script>

<!-- The shape owns the screen. Everything else is a small panel floating over
     it at a corner, so nothing competes with the solid for attention. -->
<div
  class="relative h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-paper to-accent-soft/50"
  data-ready={ready ? "true" : undefined}
>
  <h1 class="sr-only">{t("app.name")}</h1>

  <div class="absolute inset-0">
    {#if folding && lab.net}
      <!-- While the sheet is moving it is the whole drawing: it starts where the
           view it came from left off and lands exactly where the view taking
           over will draw it. Inert, since it is only a picture of the change. -->
      <div class="pointer-events-none absolute inset-0" inert>
        <FoldTransition
          {lab}
          net={lab.net}
          direction={folding}
          onComplete={finishFolding}
          {animationWindow}
          {lift}
          {chrome}
        />
      </div>
    {:else if lab.view === "net" && lab.net}
      <NetView
        {lab}
        net={lab.net}
        compact={floating}
        {lift}
        {chrome}
        onGrid={(step) => (gridStep = step)}
      />
    {:else if lab.view === "slice" && lab.section}
      <!-- The solid with its cut on one side, the cut itself face-on on the
           other. Always side by side: the panels run along the top and bottom
           edges, so the room they leave is a band across the middle, and the
           lower of two drawings stacked one above the other would sit under
           the bottom row of panels. -->
      <div class="flex h-full w-full">
        <div class="relative min-h-0 min-w-0 flex-1">
          <SolidView
            {lab}
            {reducedMotion}
            {animationWindow}
            compact={floating}
            lift={sliceLift}
            chrome={sliceChrome}
            onGrid={(step) => (gridStep = step)}
          />
        </div>
        <div class="relative min-h-0 min-w-0 flex-1">
          <CrossSectionView
            {lab}
            section={lab.section}
            compact={floating}
            lift={sliceLift}
            chrome={sliceChrome}
          />
        </div>
      </div>
    {:else if lab.view === "cubes" && lab.cubes}
      <CubeView
        {lab}
        box={lab.cubes}
        {reducedMotion}
        {animationWindow}
        {lift}
        {chrome}
        onGrid={(step) => (gridStep = step)}
      />
    {:else}
      <SolidView
        {lab}
        {reducedMotion}
        {animationWindow}
        compact={floating}
        {lift}
        {chrome}
        onGrid={(step) => (gridStep = step)}
      />
    {/if}
  </div>

  <p class="sr-only" aria-live="polite" data-testid="answer-state">
    {lab.answersVisible ? t("lab.answersVisible") : t("lab.answersHidden")}
  </p>

  <!-- Top left: who made this, then which solid. The mark leads the row the way
       a masthead leads a page, and the picker keeps the width it had: three
       icons to a row on a phone, where the view controls opposite need the rest
       of the width; one row on a big screen. -->
  <!-- Above the panels along the bottom edge, not level with them: what opens
       from this corner — the picker's list of solids, the mark's credits — has
       to cover them, and two rows at the same depth are settled by which one
       the markup happens to reach last. -->
  <div
    class="pointer-events-none absolute top-2 left-2 z-30 flex items-start gap-1.5"
  >
    {#if !floating}
      <BrandChip {lab} />
    {/if}
    <div class={floating ? "" : "max-w-[9.5rem] sm:max-w-[20rem]"}>
      <ShapeBar {lab} compact={floating} />
    </div>
  </div>

  <!-- Top right: which view, what the numbers are called, and whether the lab
       floats over other tabs. The row wraps in a small floating window. In the
       cubes view the player for the cubes hangs under it. -->
  <div
    class="pointer-events-none absolute top-2 right-2 z-20 flex flex-col items-end gap-1.5"
    use:measureBox={(_width, height) => (topHeight = height)}
  >
    <div
      class="flex flex-wrap justify-end gap-1.5 sm:max-w-none {floating
        ? 'max-w-[min(22rem,62vw)]'
        : 'max-w-[14rem]'}"
    >
      {#if onFloat}
        <FloatControl supported={floatSupported} onToggle={onFloat} />
      {/if}
      <ViewToggle {lab} onViewChange={changeView} />
      <label class="sr-only" for="unit-select">{t("lab.units")}</label>
      <select
        id="unit-select"
        data-testid="unit-select"
        class="pointer-events-auto cursor-pointer rounded-xl border border-rule/70 bg-panel/85 px-2 py-1 text-xs font-bold shadow-lg shadow-ink/10 backdrop-blur-md"
        value={lab.unit}
        onchange={(event) => (lab.unit = event.currentTarget.value as UnitKey)}
      >
        {#each UNIT_ORDER as key (key)}
          <option value={key}>{unitLabels(key).linear}</option>
        {/each}
      </select>
      {#if !floating}
        <LanguagePicker />
      {/if}
    </div>
    {#if lab.view === "cubes"}
      <CubeControls {lab} />
    {/if}
  </div>

  {#if floatError}
    <p
      role="alert"
      class="absolute top-16 right-2 z-30 max-w-72 rounded-lg border border-flag/40 bg-flag-soft/95 px-3 py-2 text-xs font-semibold text-ink shadow-lg"
    >
      {t("lab.floatError", { error: floatError })}
    </p>
  {/if}

  <!-- Bottom: the dimensions on the left, the answers on the right, and the
       view controls between them, wherever this is running. The controls are
       centred on the window rather than on the gap, so they hold still as the
       panels either side change width — and they keep the row, level with those
       panels, for exactly as long as the row can hold all three. What decides
       that is whether the three measure up, not how wide the device is: a
       floating window is resized by hand, to anything, and a breakpoint meant
       for phones would drop the controls to their own line in a window with
       room to spare either side of them.

       One panel is usually the wider, so when the middle of the window is out
       of reach the controls settle for the middle of the gap instead; only when
       even that is gone do they take a line of their own underneath. Below
       about 21rem a floating window cannot hold two panels abreast either, and
       the dimensions sit above the answers instead. -->
  <div
    class="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex flex-wrap items-end justify-between gap-2 {floating
      ? 'max-[21rem]:flex-col max-[21rem]:items-stretch'
      : ''}"
    use:measureBox={(width, height) => {
      rowWidth = width;
      bottomHeight = height;
    }}
  >
    <div class="min-w-0" use:measureBox={(width) => (leftWidth = width)}>
      <MeasureBar {lab} compact={floating} />
    </div>
    <div
      class={centred
        ? "absolute bottom-0 left-1/2 -translate-x-1/2"
        : abreast
          ? "flex flex-1 justify-center"
          : "order-last flex w-full justify-center"}
    >
      <!-- Measured on the controls themselves: the box around them is a full
           row wide while they are on a line of their own, and would then never
           be found to fit. -->
      <div
        class="flex flex-col items-center gap-1.5"
        use:measureBox={(width) => (middleWidth = width)}
      >
        {#if lab.view === "slice" && lab.section}
          <SliceControls {lab} />
        {/if}
        <RotationControls {lab} {reducedMotion} compact={floating} />
      </div>
    </div>
    <!-- The answers, with the key to the grid over them: what one square of
         the ruling is worth is a measurement of the shape like the others, and
         it belongs with them rather than floating over the drawing. -->
    <div
      class="flex flex-col items-end gap-1.5"
      use:measureBox={(width) => (rightWidth = width)}
    >
      <GridKey step={gridStep} unit={lab.unit} />
      <TotalsCard {lab} compact={floating} />
    </div>
  </div>
</div>
