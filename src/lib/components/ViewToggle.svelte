<script lang="ts">
  import type { Snippet } from "svelte";
  import { VIEW_ORDER } from "$lib/domain/types";
  import { t } from "$lib/i18n/index.svelte";
  import type { LabState, ViewMode } from "$lib/state/lab.svelte";

  let {
    lab,
    onViewChange = (view) => lab.setView(view),
  }: { lab: LabState; onViewChange?: (view: ViewMode) => void } = $props();

  // Four tabs only clear the shape picker on a phone once they close up:
  // tighter padding, letters set closer and a point smaller.
  const tab =
    "cursor-pointer rounded-lg px-2.5 py-1 max-sm:px-1 text-xs max-sm:text-[11px] font-bold tracking-wide max-sm:tracking-normal uppercase transition disabled:cursor-not-allowed disabled:opacity-40";
  const reason =
    "absolute top-full right-0 z-30 mt-2 w-60 rounded-lg border border-rule/70 bg-panel/95 px-3 py-1.5 text-center text-xs font-normal normal-case shadow-lg shadow-ink/10 backdrop-blur-md";

  function tabClass(view: ViewMode): string {
    return `${tab} ${lab.view === view ? "bg-accent text-white" : "text-ink-soft"}`;
  }

  /** What each tab is called. */
  const names: Record<ViewMode, () => string> = {
    solid: () => t("view.solid"),
    cubes: () => t("view.cubes"),
    net: () => t("view.net"),
    slice: () => t("view.slice"),
  };

  /**
   * Why a tab is greyed out, for every view some solid cannot be shown in. The
   * Solid tab has none: every solid can be shown whole.
   */
  const reasons: Partial<Record<ViewMode, Snippet>> = {
    cubes: noCubes,
    net: noNet,
    slice: noSlice,
  };

  /** Which greyed-out tab the pointer is on, which is where its excuse lives. */
  let asking = $state<ViewMode | null>(null);
</script>

{#snippet noCubes()}
  {t("view.noCubes")}
{/snippet}

{#snippet noSlice()}
  {t("view.noSlice")}
{/snippet}

{#snippet noNet()}
  {t("view.noNet.before")}<strong>{t("view.noNet.strong")}</strong>{t(
    "view.noNet.after",
  )}
{/snippet}

<div
  class="pointer-events-auto flex rounded-xl border border-rule/70 bg-panel/85 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
  role="radiogroup"
  aria-label={t("view.label")}
>
  {#each VIEW_ORDER as view (view)}
    {@const offered = lab.offers(view)}
    {@const why = reasons[view]}
    <!-- A disabled button dispatches no pointer events of its own, so the
         reason a tab is greyed out has to be hung on something around it. The
         wrapper is scaffolding: the tab inside it keeps the radio role. -->
    <span
      role="presentation"
      class="relative flex"
      onpointerenter={() => (asking = view)}
      onpointerleave={() => (asking = null)}
    >
      <button
        type="button"
        role="radio"
        aria-checked={lab.view === view}
        data-testid="view-{view}"
        class={tabClass(view)}
        disabled={!offered}
        aria-describedby={offered ? undefined : `no-${view}-reason`}
        onclick={() => onViewChange(view)}>{names[view]()}</button
      >
      {#if !offered && why}
        <!-- Always in the document, so the tab keeps something to point its
             aria-describedby at; only laid out on screen when it is asked for. -->
        <p
          id="no-{view}-reason"
          data-testid="no-{view}-reason"
          class={asking === view ? reason : "sr-only"}
        >
          {@render why()}
        </p>
      {/if}
    </span>
  {/each}
</div>
